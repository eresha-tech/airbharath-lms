import { randomUUID } from 'node:crypto';
import { digest } from '../payments/model';
import { UUID } from '../eligibility/model';
import { ProviderFailure } from '../payments/provider';
import type { Order } from '../payments/repository';
import type { ProviderContext, ProviderPayment } from '../payments/model';
import { RefundError, parseRefundRequest, parseRefundDecision, requestPayloadHash, refundableOrder, paymentMatches, refundMatches, fullRefundConfirmed, refundEvidenceHash, type ProviderRefund } from './model';
import type { RefundRequest, RefundAttempt, RefundTransaction, RefundStore } from './store';
export interface RefundProvider {
  context: ProviderContext;
  refundMutationAllowed?(): boolean;
  fetchPayment(id: string): Promise<ProviderPayment>;
  fetchRefunds(paymentId: string): Promise<ProviderRefund[]>;
  createRefund(input: { paymentId: string; amountPaise: number; requestId: string; attemptId: string }): Promise<ProviderRefund>;
}
// Every provider call below happens after the store's transaction has committed.
export function createRefundService(store: RefundStore, provider?: RefundProvider) {
  const scoped = (order: Order) => !!provider && order.providerAccountId === provider.context.accountId && order.providerMode === provider.context.mode;
  function admin(tx: RefundTransaction, actor: string) { if (tx.actor?.id !== actor || tx.actor.role !== 'admin') throw new RefundError('forbidden'); }
  async function request(actor: string, orderId: string, raw: unknown) {
    if (!UUID.test(actor)) throw new RefundError('authentication');
    if (!UUID.test(orderId)) throw new RefundError('not_found');
    const input = parseRefundRequest(raw), hash = requestPayloadHash(input);
    return store.transaction(orderId, actor, async tx => {
      if (!tx.actor || tx.order.userId !== actor) throw new RefundError('not_found');
      const keyed = await tx.requestByKey(actor, input.requestKey);
      if (keyed && (keyed.membershipOrderId !== orderId || keyed.payloadHash !== hash)) throw new RefundError('conflict');
      if (tx.request) {
        if (tx.request.requestKey === input.requestKey && tx.request.payloadHash !== hash) throw new RefundError('conflict');
        return tx.request;
      }
      const now = await tx.now();
      refundableOrder(tx.order, now, !!tx.completion);
      if (!tx.payment || !tx.payment.winner || tx.payment.state !== 'captured' || tx.payment.refundedPaise !== 0 || tx.payment.providerPaymentId !== tx.order.winningPaymentId || tx.payment.amountPaise !== tx.order.totalPaise || tx.payment.currency !== tx.order.currency) throw new RefundError('not_refundable');
      const row = await tx.createRequest({ id: randomUUID(), userId: actor, membershipOrderId: orderId, requestKey: input.requestKey, payloadHash: hash, reason: input.reason, note: input.note, requestedAt: now, createdAt: now, eligibilityDeadline: tx.order.refundEligibleUntil!, amountPaise: tx.order.totalPaise, currency: tx.order.currency });
      await tx.notice('received'); return row;
    });
  }
  async function decide(actor: string, orderId: string, raw: unknown) {
    if (!UUID.test(actor) || !UUID.test(orderId)) throw new RefundError('forbidden');
    const command = parseRefundDecision(raw);
    if (command.action === 'reconcile') {
      await store.transaction(orderId, actor, async tx => { admin(tx, actor); });
      return reconcile(orderId);
    }
    const result = await store.transaction(orderId, actor, async tx => {
      admin(tx, actor);
      const row = tx.request; if (!row) throw new RefundError('not_found');
      if (tx.completion) return { request: row, attempt: tx.attempt, execute: false };
      if (command.action === 'retry') {
        if (row.decision !== 'approved' || !tx.attempt || tx.attempt.state !== 'failed') throw new RefundError('reconciliation_required');
        // Definitive failures alone can be retried; execution re-fetches provider state first.
        if (provider?.refundMutationAllowed?.() === false) throw new RefundError('unavailable');
        if (tx.attempt.errorCode !== 'definitive_rejection') throw new RefundError('reconciliation_required');
        return { request: row, attempt: await tx.patchAttempt({ state: 'prepared', startedAt: null, errorCode: null }), execute: true };
      }
      const target = command.action === 'approve' ? 'approved' : 'rejected';
      if (row.decision !== 'requested') {
        if (row.decision !== target || (target === 'rejected' && row.rejectionReason !== command.reason)) throw new RefundError('conflict');
        return { request: row, attempt: tx.attempt, execute: tx.attempt?.state === 'prepared' };
      }
      // No deadline recheck: a durable timely request remains reviewable later.
      const changed = await tx.patchRequest({ decision: target, decidedBy: actor, decidedAt: await tx.now(), rejectionReason: target === 'rejected' ? command.reason : null });
      if (target === 'rejected') { await tx.notice('rejected'); return { request: changed, attempt: null, execute: false }; }
      const order = tx.order;
      if (!scoped(order) || !order.winningPaymentId || provider?.refundMutationAllowed?.() === false) throw new RefundError('unavailable');
      const attempt = await tx.createAttempt({ id: randomUUID(), requestId: row.id, membershipOrderId: orderId, userId: order.userId, providerAccountId: order.providerAccountId, providerMode: order.providerMode, providerPaymentId: order.winningPaymentId, amountPaise: order.totalPaise, currency: order.currency });
      return { request: changed, attempt, execute: true };
    });
    if (result.execute && result.attempt) await execute(orderId, result.attempt.id);
    return store.read(orderId, actor, true);
  }
  async function reconcile(orderId: string, expectedRefundId?: string) {
    if (!provider) throw new RefundError('unavailable');
    const snapshot = await store.read(orderId);
    if (!snapshot || !scoped(snapshot.order) || !snapshot.order.winningPaymentId) throw new RefundError('not_found');
    if (snapshot.completion) return snapshot;
    const [payment, refunds] = await Promise.all([provider.fetchPayment(snapshot.order.winningPaymentId), provider.fetchRefunds(snapshot.order.winningPaymentId)]);
    if (!paymentMatches(snapshot.order, payment, provider.context) || (expectedRefundId && !refunds.some(r => r.id === expectedRefundId))) throw new RefundError('reconciliation_required');
    return store.transaction(orderId, null, async tx => {
      if (tx.completion) return tx;
      await tx.observe(digest({payment,refunds}), payment.refundedPaise > 0 && payment.refundedPaise < tx.order.totalPaise ? 'partial_review' : payment.refundedPaise === tx.order.totalPaise ? 'full' : refunds.some(r => !refundMatches(tx.order,r,provider.context)) ? 'mismatch_review' : refunds.length ? 'processing' : 'none');
      const full = refunds.filter(r => fullRefundConfirmed(tx.order, payment, r, provider.context));
      if (full.length === 1 && refunds.filter(r => r.status !== 'failed').length === 1) {
        const refund = full[0], evidenceHash = refundEvidenceHash(payment, refund);
        await tx.complete({ userId: tx.order.userId, membershipOrderId: orderId, providerAccountId: provider.context.accountId, providerMode: provider.context.mode, providerPaymentId: payment.id, providerRefundId: refund.id, amountPaise: tx.order.totalPaise, currency: tx.order.currency, evidenceHash, confirmedAt: await tx.now(), evidence: { rule: 'razorpay_full_refund_fetch_v1', payment, refund } });
        if (tx.attempt && (!tx.attempt.providerRefundId || tx.attempt.providerRefundId === refund.id)) await tx.patchAttempt({ state: 'completed', providerRefundId: refund.id, evidenceHash, lastCheckedAt: await tx.now(), errorCode: null });
        await tx.notice('completed');
      } else if (tx.attempt && tx.attempt.state !== 'prepared') {
        const match = refunds.find(r => r.id === tx.attempt!.providerRefundId && refundMatches(tx.order, r, provider.context));
        // Partial/external/surprising evidence never triggers a remainder mutation or access revocation.
        const mismatch = payment.refundedPaise > 0 || refunds.some(r => !refundMatches(tx.order, r, provider.context)) || refunds.filter(r => r.status !== 'failed').length > 1;
        await tx.patchAttempt({ state: mismatch ? 'uncertain' : match?.status === 'failed' ? 'failed' : match ? 'processing' : tx.attempt.state, errorCode: mismatch ? 'provider_requires_review' : match?.status === 'failed' ? 'provider_failed_requires_review' : tx.attempt.errorCode, lastCheckedAt: await tx.now() });
      }
      return { order: tx.order, request: tx.request, attempt: tx.attempt, completion: tx.completion };
    });
  }
  async function execute(orderId: string, attemptId: string) {
    if (!provider) throw new RefundError('unavailable');
    if (provider.refundMutationAllowed?.() === false) return;
    // Claim before HTTP. A process crash or timeout leaves uncertain, never a blindly retryable intent.
    const claim = await store.transaction(orderId, null, async tx => {
      if (tx.completion || tx.attempt?.id !== attemptId || tx.attempt.state !== 'prepared' || tx.request?.decision !== 'approved' || !scoped(tx.order)) return null;
      const attempt = await tx.patchAttempt({ state: 'uncertain', startedAt: await tx.now(), errorCode: 'provider_call_pending' });
      return { order: tx.order, attempt };
    });
    if (!claim) return;
    try {
      const [payment, refunds] = await Promise.all([provider.fetchPayment(claim.attempt.providerPaymentId), provider.fetchRefunds(claim.attempt.providerPaymentId)]);
      if (!paymentMatches(claim.order, payment, provider.context) || payment.refundedPaise !== 0 || refunds.some(r => r.status !== 'failed')) { await reconcile(orderId); return; }
      const refund = await provider.createRefund({ paymentId: claim.attempt.providerPaymentId, amountPaise: claim.attempt.amountPaise, requestId: claim.attempt.requestId, attemptId });
      if (!refundMatches(claim.order, refund, provider.context)) throw new RefundError('reconciliation_required');
      await store.transaction(orderId, null, async tx => {
        // Webhook may have completed first; stale HTTP response cannot downgrade it.
        if (!tx.completion && tx.attempt?.id === attemptId && tx.attempt.state !== 'completed') {
          await tx.patchAttempt({ providerRefundId: refund.id, state: 'processing', errorCode: null }); await tx.notice('initiated');
        }
      });
      // A 200/processed response alone is insufficient; independent fetch must prove full aggregate state.
      await reconcile(orderId, refund.id);
    } catch (error) {
      await store.transaction(orderId, null, async tx => {
        if (tx.completion || tx.attempt?.id !== attemptId || tx.attempt.state === 'completed') return;
        const definite = error instanceof ProviderFailure && error.outcome === 'definitive_rejection';
        if (definite && error.evidenceHash) await tx.observe(error.evidenceHash, 'mismatch_review');
        await tx.patchAttempt({ state: definite ? 'failed' : 'uncertain', errorCode: definite ? 'definitive_rejection' : 'provider_requires_reconciliation' });
      });
    }
  }
  async function recoverPrepared(limit = 10) {
    if (!provider) throw new RefundError('unavailable');
    if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new RefundError('validation');
    for (const row of await store.pending(provider.context, limit, provider.refundMutationAllowed?.() !== false)) {
      try {
        if (row.state !== 'prepared') await store.transaction(row.membershipOrderId, null, async tx => {
          if (tx.attempt && !['prepared', 'completed'].includes(tx.attempt.state) && !tx.completion) await tx.patchAttempt({ lastCheckedAt: await tx.now() });
        });
        if (row.state === 'prepared' && provider.refundMutationAllowed?.() !== false) await execute(row.membershipOrderId, row.id); else await reconcile(row.membershipOrderId); } catch { /* Durable intent remains visible for next operator run. */ }
    }
    for (const row of await store.externalPending?.(provider.context, limit) || []) {
      try { await store.markExternalChecked?.(row.membershipOrderId); await reconcile(row.membershipOrderId); }
      catch { /* Persisted observations remain available for a later bounded GET-only scan. */ }
    }
  }
  return { request, decide, reconcile, execute, recoverPrepared };
}
// Public HTTP clients cannot supply trusted provider/completion values.
export type { RefundRequest, RefundAttempt };
