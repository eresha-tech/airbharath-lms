import { currentRefundPolicy, acceptanceMatches as policyMatches } from '../refund-policy/model';
import { REFUND_EVENTS } from '../refunds/model';
import { randomUUID } from 'node:crypto';
import { UUID } from '../eligibility/model';
import { MembershipError } from '../membership/service';
import { QUOTE_VERSION } from '../membership/model';
import { CAPTURE_EVENT_TIME_SOURCE, PaymentError, commercialPolicy, HOLD_POLICY, parseAcceptance, digest, receiptFor, refundDeadline, verifyHmac, PROVIDER_PAYMENT_ID, PROVIDER_ORDER_ID, PAYMENT_EVENTS, HASH, type ProviderOrder, type ProviderPayment, type AcceptInput } from './model';
import { ProviderFailure, type WorkspaceProvider } from './provider';
import type { FinanceStore, FinanceTransaction, Order, InboxEvent } from './repository';
import { acceptanceMatches, currentCreatorTerms } from '../terms/model';

export function createWorkspacePaymentService(store: FinanceStore, provider: WorkspaceProvider, clock = () => new Date(), currentTerms = currentCreatorTerms, refundEvents?: (event: InboxEvent) => Promise<void>) {
  const scoped = (order: Order) => order.providerAccountId === provider.context.accountId && order.providerMode === provider.context.mode;
  async function ownedOrder(userId: string, id: string) {
    if (!UUID.test(userId) || !UUID.test(id)) throw new PaymentError('validation');
    const order = await store.readOrder(id, userId);
    if (!order) throw new PaymentError('not_found');
    if (!scoped(order)) throw new PaymentError('provider_mismatch');
    return order;
  }
  async function acceptOrder(userId: string, raw: AcceptInput) {
    const input = parseAcceptance(raw);
    if (!UUID.test(userId)) throw new PaymentError('authentication');
    if (!input) throw new PaymentError('validation');
    const payloadHash = digest(input);
    return store.transaction({ userId, couponCode: input.couponCode }, async tx => {
      const prior = await tx.findRequest(userId, input.requestKey);
      if (prior) { if (prior.requestPayloadHash !== payloadHash || !scoped(prior)) throw new PaymentError('conflict'); return prior; }
      if (await tx.findUnresolved(userId)) throw new PaymentError('conflict');
      const { quoteHash: expectedHash, requestKey, ...identifiers } = input;
      let selection;
      try { selection = await tx.readQuote(userId, identifiers, clock); } catch (error) {
        if (error instanceof MembershipError && ['stale_plan', 'unavailable'].includes(error.code)) throw new PaymentError('quote_changed');
        throw error;
      }
      const { quote, context } = selection, now = new Date(quote.generatedAt);
      if (quote.quoteHash !== expectedHash) throw new PaymentError('quote_changed');
      const terms = currentTerms(), acceptance = await tx.readCreatorTermsAcceptance(userId, terms);
      if (!acceptanceMatches(acceptance, userId, terms, now)) throw new PaymentError('terms_required');
      const policy = currentRefundPolicy(), policyAcceptance = await tx.readRefundPolicyAcceptance(userId, policy);
      if (!policyMatches(policyAcceptance, userId, policy, now)) throw new PaymentError('refund_policy_required');
      const coupon = context.coupon;
      if (coupon) {
        if (await tx.couponUse(coupon.id, userId)) throw new PaymentError('coupon_used');
        if (coupon.usageLimit !== null && await tx.occupancy(coupon.id) >= coupon.usageLimit) throw new PaymentError('capacity');
      }
      const id = randomUUID();
      const order = await tx.insertOrder({ id, userId, eligibilityAttemptId: context.attempt.id, eligibilityValidUntil: context.attempt.eligibleUntil!, planVersionId: quote.planVersionId, settingsId: context.currentSettings.id, policyId: context.policy.id,
        creatorTermsAcceptanceId: acceptance.id, creatorTermsVersion: acceptance.termsVersion, creatorTermsContentHash: acceptance.termsContentHash, creatorTermsAcceptedAt: acceptance.acceptedAt,
        refundPolicyAcceptanceId: policyAcceptance.id, refundPolicyVersion: policyAcceptance.policyVersion, refundPolicyContentHash: policyAcceptance.policyContentHash, refundPolicyAcceptedAt: policyAcceptance.acceptedAt,
        planCode: quote.planCode, planSnapshot: { version: quote.planVersion, displayName: quote.planName }, purchaseKind: 'initial', basePricePaise: quote.basePricePaise, discountPaise: quote.discountPaise, taxableAmountPaise: quote.taxableAmountPaise, gstRateBps: quote.gstRateBps, gstAmountPaise: quote.gstAmountPaise, totalPaise: quote.totalPaise, currency: quote.currency, durationMonths: quote.durationMonths,
        quoteHash: quote.quoteHash, quoteVersion: quote.quoteVersion, pricingRuleVersion: QUOTE_VERSION, membershipStartRuleVersion: quote.membershipStart.version, launchAt: new Date(quote.membershipStart.launchAt), membershipStartRule: quote.membershipStart.rule,
        contextHash: digest({ settings: context.currentSettings.configurationHash, policy: context.policy.contentHash, attempt: context.attempt.id }),
        couponId: coupon?.id || null, couponCode: coupon?.code || null, couponSnapshot: coupon ? { campaignName: coupon.campaignName, sourceType: coupon.sourceType, sourceName: coupon.sourceName, discountType: coupon.discountType, discountValue: coupon.discountValue, version: coupon.version, usageLimit: coupon.usageLimit } : null,
        requestKey, requestPayloadHash: payloadHash, commercialPolicyVersion: commercialPolicy(provider.context.mode), createdAt: now, providerAccountId: provider.context.accountId, providerMode: provider.context.mode, providerReceipt: receiptFor(id) });
      if (coupon) await tx.insertRedemption({ couponId: coupon.id, userId, membershipOrderId: id, reservedAt: now, checkoutDeadline: new Date(now.getTime() + 600_000), holdPolicyVersion: HOLD_POLICY });
      return order;
    });
  }
  async function release(tx: FinanceTransaction, order: Order, reason: 'never_submitted' | 'provider_definitive_rejection', now: Date, proofHash?: string) {
    if (order.financialState !== 'unpaid' || order.providerOrderId || (reason === 'never_submitted' && order.providerCreateStartedAt) || (reason === 'provider_definitive_rejection' && order.providerRequestCount !== 1)) throw new PaymentError('conflict');
    if (reason === 'provider_definitive_rejection' && (!proofHash || !HASH.test(proofHash))) throw new PaymentError('conflict');
    const changed = await tx.patchOrder(order.id, { providerCreateFailureHash: proofHash || null, providerSetupState: 'closed', closedAt: now, closeReason: reason, providerRecoveryReason: reason });
    const reservation = await tx.getRedemption(order.id);
    if (reservation?.status === 'reserved') await tx.patchRedemption(reservation.id, { status: 'released', releasedAt: now, releaseReason: reason, releaseSource: 'system', releaseEvidenceHash: proofHash || digest({ reason, receipt: order.providerReceipt, startedAt: order.providerCreateStartedAt, providerRequests: order.providerRequestCount }) });
    return changed;
  }
  function exactProviderOrder(order: Order, evidence: ProviderOrder) {
    return evidence.accountId === order.providerAccountId && evidence.mode === order.providerMode && evidence.receipt === order.providerReceipt && evidence.amountPaise === order.totalPaise && evidence.currency === order.currency && PROVIDER_ORDER_ID.test(evidence.id);
  }
  async function attachProviderOrder(order: Order, evidence: ProviderOrder) {
    return store.transaction({ userId: order.userId, couponId: order.couponId, orderId: order.id }, async tx => {
      const current = await tx.getOrder(order.id);
      if (!current || current.providerSetupState === 'closed' || current.providerRequestCount !== 1 || !exactProviderOrder(current, evidence)) throw new PaymentError('provider_mismatch');
      if (current.providerOrderId && current.providerOrderId !== evidence.id) throw new PaymentError('conflict');
      if (current.providerOrderId) return current;
      return tx.patchOrder(current.id, { providerOrderId: evidence.id, providerOrderCreatedAt: evidence.createdAt, providerSetupState: 'ready', providerRecoveryCheckedAt: clock(), providerRecoveryReason: null });
    });
  }
  async function ensureProviderOrder(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    const claim = await store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
      const current = await tx.getOrder(id); if (!current) throw new PaymentError('not_found');
      if (current.providerOrderId || current.providerSetupState === 'closed' || current.financialState === 'captured') return { order: current, claimed: false };
      if (current.providerCreateStartedAt || current.providerRequestCount !== 0) return { order: current, claimed: false };
      const claimed = await tx.patchOrder(id, { providerCreateStartedAt: clock(), providerRequestCount: 1, providerSetupState: 'creating' });
      return { order: claimed, claimed: true };
    });
    if (!claim.claimed) return claim.order;
    // Durable intent is committed before HTTP. A crash after this point requires receipt recovery, never another POST.
    let evidence;
    try { evidence = await provider.createOrder({ amountPaise: claim.order.totalPaise, currency: 'INR', receipt: claim.order.providerReceipt }); }
    catch (error) {
      return store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
        const current = await tx.getOrder(id); if (!current) throw new PaymentError('not_found');
        if (current.providerOrderId || current.financialState === 'captured') return current;
        if (error instanceof ProviderFailure && error.outcome === 'definitive_rejection' && error.evidenceHash && HASH.test(error.evidenceHash)) return release(tx, current, 'provider_definitive_rejection', clock(), error.evidenceHash);
        return tx.patchOrder(id, { providerSetupState: 'recovery_required', providerRecoveryReason: 'ambiguous_creation' });
      });
    }
    try { return await attachProviderOrder(claim.order, evidence); }
    catch { // Successful HTTP but failed/mismatched attachment remains recoverable under the same intent.
      await store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
        const current = await tx.getOrder(id); if (current && !current.providerOrderId && current.providerSetupState !== 'closed') await tx.patchOrder(id, { providerSetupState: 'recovery_required', providerRecoveryReason: 'attachment_unconfirmed' });
      });
      throw new PaymentError('recovery_required');
    }
  }
  async function recoverProviderOrder(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    if (order.providerOrderId || order.providerSetupState === 'closed') return order;
    if (!order.providerCreateStartedAt) return order; // An unstarted order must explicitly enter ensureProviderOrder; recovery never creates.
    // Receipt enumeration did not prove reliable in Test Mode. Escaped intents require operational review; never create again or guess an attachment.
    return store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
      const current = await tx.getOrder(id); if (!current) throw new PaymentError('not_found');
      if (current.providerOrderId) return current;
      return tx.patchOrder(id, { providerSetupState: 'recovery_required', providerRecoveryCheckedAt: clock(), providerRecoveryReason: 'operational_review_required' });
    });
  }
  async function closeUnsubmittedOrder(userId: string, id: string) {
    const order = await ownedOrder(userId, id);
    return store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
      const current = await tx.getOrder(id); if (!current) throw new PaymentError('not_found');
      if (current.providerSetupState === 'closed') return current;
      return release(tx, current, 'never_submitted', clock());
    });
  }
  async function reconcileEvidence(order: Order, evidence: ProviderPayment, event?: InboxEvent) {
    return store.transaction({ userId: order.userId, couponId: order.couponId, orderId: order.id }, async tx => {
      const current = await tx.getOrder(order.id); if (!current) throw new PaymentError('not_found');
      const now = clock();
      const finish = async (state: 'processed' | 'needs_review', reason?: string) => { if (event) await tx.finishEvent(event.id, state, now, current.id, reason); };
      if (!scoped(current) || evidence.accountId !== current.providerAccountId || evidence.mode !== current.providerMode || evidence.orderId !== current.providerOrderId || !PROVIDER_PAYMENT_ID.test(evidence.id)) {
        await tx.patchOrder(current.id, { activationState: 'held_for_review', reviewReason: 'provider_identity_mismatch' }); await finish('needs_review', 'provider_identity_mismatch'); return tx.getOrder(current.id);
      }
      // Only the authenticated durable payment.captured event may supply capture time.
      // Fetch/callback/payment-created timestamps never establish paidAt. Keep this
      // provider evidence rule independent of the public charging enablement gate.
      const eventTime = event?.evidence.eventCreatedAt ? new Date(event.evidence.eventCreatedAt) : null;
      const verifiedCaptureEvent = event && event.eventType === 'payment.captured' && !event.anomalyHash && HASH.test(event.payloadHash)
        && event.providerAccountId === current.providerAccountId && event.providerMode === current.providerMode
        && event.evidence.providerOrderId === current.providerOrderId && event.evidence.providerPaymentId === evidence.id
        && evidence.state === 'captured' && evidence.amountPaise === current.totalPaise && evidence.currency === 'INR' && current.currency === 'INR'
        && eventTime && Number.isFinite(eventTime.getTime()) && eventTime <= event.receivedAt && eventTime <= now
        && eventTime >= current.createdAt && eventTime >= evidence.providerCreatedAt;
      if (verifiedCaptureEvent) evidence = { ...evidence, capturedAt: eventTime, captureTimeSource: CAPTURE_EVENT_TIME_SOURCE };
      if (current.providerMode === 'live' && evidence.captureTimeSource === 'test_authoritative') evidence = { ...evidence, capturedAt: null, captureTimeSource: null };
      const evidenceHash = digest({ payment: evidence, captureEvent: verifiedCaptureEvent ? { id: event.id, eventId: event.eventId, payloadHash: event.payloadHash, rule: CAPTURE_EVENT_TIME_SOURCE } : null });
      let payment = await tx.getPayment(provider.context, evidence.id);
      if (payment && payment.membershipOrderId !== current.id) { await tx.patchOrder(current.id, { activationState: 'held_for_review', reviewReason: 'payment_reuse' }); await finish('needs_review', 'payment_reuse'); return tx.getOrder(current.id); }
      // Provider identity/economics never mutate. Unexpected changes are review incidents, not overwrite.
      if (payment && (payment.amountPaise !== evidence.amountPaise || payment.currency !== evidence.currency || payment.providerCreatedAt.getTime() !== evidence.providerCreatedAt.getTime())) { await tx.patchOrder(current.id, { activationState: 'held_for_review', reviewReason: 'payment_evidence_conflict' }); await finish('needs_review', 'payment_evidence_conflict'); return tx.getOrder(current.id); }
      if (!payment) payment = await tx.insertPayment({ membershipOrderId: current.id, userId: current.userId, providerAccountId: current.providerAccountId, providerMode: current.providerMode, providerOrderId: evidence.orderId, providerPaymentId: evidence.id, amountPaise: evidence.amountPaise, currency: evidence.currency, state: evidence.state, observedAt: now, lastObservedAt: now, providerCreatedAt: evidence.providerCreatedAt, capturedAt: evidence.capturedAt, captureTimeSource: evidence.captureTimeSource, refundedPaise: evidence.refundedPaise, evidenceHash });
      else if (payment.state !== 'captured' || evidence.state === 'captured') payment = await tx.patchPayment(payment.id, { state: evidence.state, lastObservedAt: now, capturedAt: payment.capturedAt || evidence.capturedAt, captureTimeSource: payment.captureTimeSource || evidence.captureTimeSource, refundedPaise: Math.max(payment.refundedPaise, evidence.refundedPaise), evidenceHash });
      // Out-of-order authorized/failed evidence cannot downgrade a known capture.
      if (payment.state !== 'captured') { await finish('processed'); return current; }
      if (payment.amountPaise !== current.totalPaise || payment.currency !== current.currency) { await tx.patchOrder(current.id, { activationState: 'held_for_review', reviewReason: 'payment_amount_currency_mismatch' }); await finish('needs_review', 'payment_amount_currency_mismatch'); return tx.getOrder(current.id); }
      if (current.winningPaymentId && current.winningPaymentId !== payment.providerPaymentId) { await tx.patchOrder(current.id, { activationState: 'held_for_review', reviewReason: 'multiple_captures' }); await finish('needs_review', 'multiple_captures'); return tx.getOrder(current.id); }
      if (current.financialState === 'captured' && current.paidAt && (payment.refundedPaise === 0 || !!current.fulfilledAt)) { await finish('processed'); return current; }
      const paidAt = payment.capturedAt;
      const invalidTiming = !paidAt || paidAt > now || paidAt < current.createdAt || paidAt < payment.providerCreatedAt;
      const businessReason = invalidTiming ? 'capture_time_unverified' : paidAt! >= current.eligibilityValidUntil ? 'eligibility_expired_at_capture' : payment.refundedPaise > 0 ? 'refund_observed' : current.reviewReason === 'capture_time_unverified' ? null : current.reviewReason;
      const reservation = await tx.getRedemption(current.id);
      const reservationConflict = current.couponId && (!reservation || reservation.status === 'released');
      if (!payment.winner) await tx.patchPayment(payment.id, { winner: true });
      const acceptedPaidAt = invalidTiming ? null : paidAt;
      const changed = await tx.patchOrder(current.id, { financialState: 'captured', winningPaymentId: payment.providerPaymentId, paidAt: acceptedPaidAt, refundEligibleUntil: acceptedPaidAt ? refundDeadline(acceptedPaidAt) : null,
        activationState: businessReason || reservationConflict ? 'held_for_review' : 'pending_activation', reviewReason: reservationConflict ? 'reservation_inconsistent' : businessReason || null });
      if (reservation?.status === 'reserved') await tx.patchRedemption(reservation.id, { status: 'redeemed', redeemedAt: now });
      await finish(businessReason || reservationConflict ? 'needs_review' : 'processed', reservationConflict ? 'reservation_inconsistent' : businessReason || undefined);
      return changed;
    });
  }
  async function confirmPayment(userId: string, id: string, paymentId: string, signature: string, callbackSecret: string) {
    const order = await ownedOrder(userId, id);
    if (!order.providerOrderId || !PROVIDER_PAYMENT_ID.test(paymentId) || !verifyHmac(`${order.providerOrderId}|${paymentId}`, signature, callbackSecret)) throw new PaymentError('signature');
    // Signature is not capture evidence. Fetch outside the DB transaction and converge here.
    const evidence = await provider.fetchPayment(paymentId);
    return reconcileEvidence(order, evidence);
  }
  async function reconcileOrder(userId: string, id: string) {
    let order = await ownedOrder(userId, id);
    // Persist a scan marker before HTTP so repeatedly failing old orders do not
    // starve later recovery candidates when the bounded worker is invoked again.
    order = await store.transaction({ userId, couponId: order.couponId, orderId: id }, async tx => {
      const current = await tx.getOrder(id); if (!current) throw new PaymentError('not_found');
      return tx.patchOrder(id, { providerRecoveryCheckedAt: clock() });
    });
    if (!order.providerOrderId && order.providerCreateStartedAt) order = await recoverProviderOrder(userId, id);
    if (!order.providerOrderId) return order;
    const observations = await provider.fetchOrderPayments(order.providerOrderId);
    for (const evidence of observations) { const changed = await reconcileEvidence(order, evidence); if (changed) order = changed; }
    return order;
  }
  async function processEvent(id: string) {
    const event = await store.claimEvent(id, clock(), provider.context);
    if (!event) return;
    try {
      if (REFUND_EVENTS.includes(event.eventType)) { if (!refundEvents) throw new PaymentError('unavailable'); await refundEvents(event); return; }
      if (!PAYMENT_EVENTS.includes(event.eventType)) { await store.finishUnmatchedEvent(event.id, clock(), 'ignored'); return; }
      let order = await store.matchOrder(provider.context, event.evidence.providerOrderId, event.evidence.receipt);
      if (!order && event.evidence.providerOrderId) {
        const externalOrder = await provider.fetchOrder(event.evidence.providerOrderId);
        if (externalOrder.accountId !== provider.context.accountId || externalOrder.mode !== provider.context.mode) throw new PaymentError('provider_mismatch');
        if (!/^wso[a-f0-9]{32}$/.test(externalOrder.receipt)) { await store.finishUnmatchedEvent(event.id, clock(), 'ignored', 'unrelated_order'); return; }
        order = await store.matchOrder(provider.context, externalOrder.id, externalOrder.receipt);
      }
      if (!order) { await store.retryEvent(event.id, clock()); return; } // Candidate Workspace evidence remains durable and retryable.
      if (!order.providerOrderId) order = await recoverProviderOrder(order.userId, order.id);
      if (!order.providerOrderId) { await store.retryEvent(event.id, clock()); return; }
      if (event.evidence.providerPaymentId) await reconcileEvidence(order, await provider.fetchPayment(event.evidence.providerPaymentId), event);
      else {
        const observations = await provider.fetchOrderPayments(order.providerOrderId);
        if (!observations.length) { await store.retryEvent(event.id, clock()); return; }
        // Process all facts; mark the event complete only with the last committed observation.
        for (let i = 0; i < observations.length; i++) await reconcileEvidence(order, observations[i], i === observations.length - 1 ? event : undefined);
      }
    } catch { await store.retryEvent(event.id, clock()); }
  }
  async function runReconciliationBatch(limit = 10) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new PaymentError('validation');
    const pending = await store.pendingEvents(clock(), limit, provider.context);
    for (const event of pending) await processEvent(event.id);
    const orders = await store.recoveryOrders(limit, provider.context);
    for (const order of orders) { if (!scoped(order)) continue; try { await reconcileOrder(order.userId, order.id); } catch { /* Remains durable/visible for the next authorized invocation. */ } }
    return { eventsVisited: pending.length, ordersVisited: orders.length, capturedPendingActivation: orders.filter(order => order.financialState === 'captured' && order.activationState === 'pending_activation').length };
  }
  return { acceptOrder, ensureProviderOrder, recoverProviderOrder, closeUnsubmittedOrder, confirmPayment, reconcileOrder, processEvent, runReconciliationBatch };
}
