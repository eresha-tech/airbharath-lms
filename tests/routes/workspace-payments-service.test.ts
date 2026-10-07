import { createHmac, randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ProviderFailure } from '@/lib/workspace/payments/provider';
import { financialHarness, callbackSecret, financeNow } from './workspace-payments-fixtures';
const signature = (orderId: string, paymentId: string) => createHmac('sha256', callbackSecret).update(`${orderId}|${paymentId}`).digest('hex');

describe('accepted orders and conservative coupon holds (transactional adapter, not real PostgreSQL)', () => {
  it('freezes accepted economics/attribution and reserves before provider HTTP', async () => {
    const h = financialHarness(), i = await h.input(); const o = await h.service.acceptOrder(i.userId, i.request);
    expect(o).toMatchObject({ totalPaise: 460082, financialState: 'unpaid', providerRequestCount: 0, commercialPolicyVersion: 'workspace-test-noncommercial-v1', activationState: 'pending_activation' });
    expect(h.provider.createOrder).not.toHaveBeenCalled(); expect(h.state.redemptions[0]).toMatchObject({ status: 'reserved', userId: i.userId, membershipOrderId: o.id });
    await h.service.ensureProviderOrder(i.userId, o.id); expect(o.providerOrderId).toMatch(/^order_/); expect(h.provider.createOrder).toHaveBeenCalledWith({ amountPaise: o.totalPaise, currency: 'INR', receipt: o.providerReceipt });
    h.offer.value.status = 'archived'; expect(o.couponSnapshot?.sourceName).toBe(h.offer.value.sourceName); expect(o.providerReceipt.length).toBeLessThanOrEqual(40);
  });
  it('same key/same payload recovers after expiration; changed payload and different keys conflict', async () => {
    const h = financialHarness(), i = await h.input(); const o = await h.service.acceptOrder(i.userId, i.request); h.eligibleUntil.value = financeNow;
    expect((await h.service.acceptOrder(i.userId, i.request)).id).toBe(o.id);
    await expect(h.service.acceptOrder(i.userId, { ...i.request, couponCode: undefined })).rejects.toMatchObject({ code: 'conflict' });
    await expect(h.service.acceptOrder(i.userId, { ...i.request, requestKey: randomUUID() })).rejects.toMatchObject({ code: 'conflict' }); expect(h.state.orders).toHaveLength(1);
  });
  it.each(['price', 'plan', 'settings', 'policy', 'launch', 'hash'])('requires review when %s changes', async changed => {
    const h = financialHarness(), i = await h.input();
    if (changed === 'price') h.catalog[0].basePricePaise++;
    if (changed === 'plan') h.catalog[0].id = randomUUID();
    if (changed === 'settings') h.settings.configurationHash = 'changed';
    if (changed === 'policy') h.currentPolicy.contentHash = 'changed';
    if (changed === 'launch') h.settings.config.launchAt = '2026-11-09T18:30:00.000Z';
    if (changed === 'hash') i.request.quoteHash = 'a'.repeat(64);
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: 'quote_changed' }); expect(h.state.orders).toHaveLength(0);
  });
  it.each(['paused', 'expired', 'wrong_plan', 'eligibility'])('revalidates %s at acceptance', async changed => {
    const h = financialHarness(), i = await h.input(); if (changed === 'paused') h.offer.value.status = 'paused'; if (changed === 'expired') h.offer.value.expiresAt = financeNow; if (changed === 'wrong_plan') h.offer.value.planCodes = ['yearly']; if (changed === 'eligibility') h.eligibleUntil.value = financeNow;
    await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toMatchObject({ code: changed === 'eligibility' ? 'eligibility_required' : changed }); expect(h.state.orders).toHaveLength(0);
  });
  it('explicit coupon removal requires its new full-price hash and creates no ledger', async () => {
    const h = financialHarness(), i = await h.input(randomUUID(), false), o = await h.service.acceptOrder(i.userId, i.request); expect(o.totalPaise).toBe(589882); expect(o.couponId).toBeNull(); expect(h.state.redemptions).toHaveLength(0);
  });
  it('serializes simulated final-slot requests and unlimited occupancy', async () => {
    const h = financialHarness(), a = await h.input(), b = await h.input(); const out = await Promise.allSettled([h.service.acceptOrder(a.userId, a.request), h.service.acceptOrder(b.userId, b.request)]); expect(out.filter(x => x.status === 'fulfilled')).toHaveLength(1); expect(out.find(x => x.status === 'rejected')).toMatchObject({ reason: { code: 'capacity' } }); expect(h.state.redemptions).toHaveLength(1);
    h.offer.value.usageLimit = null; const c = await h.input(); await h.service.acceptOrder(c.userId, c.request); expect(h.state.redemptions).toHaveLength(2);
  });
  it('releases only never-started holds and permits an unpaid retry', async () => {
    const h = financialHarness(), i = await h.input(), o = await h.service.acceptOrder(i.userId, i.request); await h.service.closeUnsubmittedOrder(i.userId, o.id); expect(h.state.redemptions[0]).toMatchObject({ status: 'released', releaseSource: 'system', releaseReason: 'never_submitted' });
    const j = await h.input(i.userId); await h.service.acceptOrder(i.userId, j.request); expect(h.state.redemptions.map(r => r.status)).toEqual(['released', 'reserved']);
  });
  it('provider timeout/loss/crash marker retains capacity and never blindly recreates', async () => {
    const h = financialHarness(), i = await h.input(), o = await h.service.acceptOrder(i.userId, i.request); vi.mocked(h.provider.createOrder).mockRejectedValue(new ProviderFailure('ambiguous'));
    await h.service.ensureProviderOrder(i.userId, o.id); expect(o.providerSetupState).toBe('recovery_required'); await h.service.ensureProviderOrder(i.userId, o.id); expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
    h.now.value = new Date('2026-12-01'); await expect(h.service.closeUnsubmittedOrder(i.userId, o.id)).rejects.toMatchObject({ code: 'conflict' }); expect(h.state.redemptions[0].status).toBe('reserved');
    await h.service.recoverProviderOrder(i.userId, o.id); expect(h.state.orders[0].providerRecoveryReason).toBe('operational_review_required'); expect(h.state.redemptions[0].status).toBe('reserved');
  });
  it('retains an escaped create for operational review even with one apparent receipt match', async () => {
    const h = financialHarness(), i = await h.input(), o = await h.service.acceptOrder(i.userId, i.request);
    vi.mocked(h.provider.createOrder).mockImplementationOnce(async input => { const result = { ...h.provider.context, id: 'order_ESCAPE15ATEST', receipt: input.receipt, amountPaise: input.amountPaise, currency: input.currency, status: 'created' as const, createdAt: financeNow }; h.externalOrders.push(result, result); throw new ProviderFailure('ambiguous'); });
    // Use a separate deterministic escaped provider entity; the duplicate lookup deliberately stays ambiguous.
    await h.service.ensureProviderOrder(i.userId, o.id); await h.service.recoverProviderOrder(i.userId, o.id); expect(o.providerSetupState).toBe('recovery_required'); expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
    h.externalOrders.splice(1); await h.service.recoverProviderOrder(i.userId, o.id); expect(o.providerSetupState).toBe('recovery_required'); expect(h.provider.createOrder).toHaveBeenCalledTimes(1); expect(h.provider.findOrders).not.toHaveBeenCalled();
  });
  it('definitive input rejection is the only provider-started release path', async () => {
    const h = financialHarness(), i = await h.input(), o = await h.service.acceptOrder(i.userId, i.request); vi.mocked(h.provider.createOrder).mockRejectedValueOnce(new ProviderFailure('definitive_rejection', 'a'.repeat(64))); await h.service.ensureProviderOrder(i.userId, o.id); expect(o.providerSetupState).toBe('closed'); expect(h.state.redemptions[0].status).toBe('released');
  });
  it('rollback cannot leave an accepted order without its coupon hold', async () => {
    const h = financialHarness(), i = await h.input(); h.fail('insertRedemption'); await expect(h.service.acceptOrder(i.userId, i.request)).rejects.toThrow(); expect(h.state.orders).toHaveLength(0); expect(h.state.redemptions).toHaveLength(0); expect(h.provider.createOrder).not.toHaveBeenCalled();
  });
});
describe('shared exact capture finalization', () => {
  it('captures once, redeems once and stores exactly 72 hours without granting access', async () => {
    const h = financialHarness(), o = await h.ready(); h.now.value = new Date(financeNow.getTime()+60000); const p = h.captured(o), sig = signature(o.providerOrderId!, p.id); const a = await h.service.confirmPayment(o.userId, o.id, p.id, sig, callbackSecret); await h.service.confirmPayment(o.userId, o.id, p.id, sig, callbackSecret);
    expect(a).toMatchObject({ financialState: 'captured', activationState: 'pending_activation', winningPaymentId: p.id }); expect(a!.paidAt).toEqual(p.capturedAt); expect(a!.refundEligibleUntil!.getTime()-a!.paidAt!.getTime()).toBe(72*3600000); expect(h.state.payments).toHaveLength(1); expect(h.state.redemptions[0].status).toBe('redeemed'); expect(Object.keys(h.state)).toEqual(['orders','redemptions','payments','events']);
  });
  it('failed attempt leaves the order and reservation open for a later exact capture on the same order', async () => {
    const h = financialHarness(), order = await h.ready();
    h.captured(order, { state: 'failed', capturedAt: null, captureTimeSource: null });
    await h.service.reconcileOrder(order.userId, order.id);
    expect(order).toMatchObject({ financialState: 'unpaid', providerSetupState: 'ready', activationState: 'pending_activation' });
    expect(h.state.redemptions[0].status).toBe('reserved');
    const winner = h.captured(order); await h.service.reconcileOrder(order.userId, order.id);
    expect(order).toMatchObject({ financialState: 'captured', winningPaymentId: winner.id, activationState: 'pending_activation' });
    expect(h.state.payments.filter(p => p.winner)).toHaveLength(1); expect(h.state.redemptions[0].status).toBe('redeemed');
  });
  it.each(['authorized', 'failed'])('%s is evidence without financial capture', async state => { const h = financialHarness(), o = await h.ready(), p = h.captured(o, { state: state as 'authorized' | 'failed', capturedAt: null, captureTimeSource: null }); await h.service.reconcileOrder(o.userId, o.id); expect(o.financialState).toBe('unpaid'); expect(h.state.redemptions[0].status).toBe('reserved'); expect(h.state.payments[0].providerPaymentId).toBe(p.id); });
  it.each(['amount', 'currency', 'order', 'account'])('wrong %s never funds the financial order', async wrong => {
    const h = financialHarness(), o = await h.ready(), p = h.captured(o); if (wrong === 'amount') p.amountPaise--; if (wrong === 'currency') p.currency = 'USD'; if (wrong === 'order') p.orderId = 'order_WRONGORDER'; if (wrong === 'account') p.accountId = 'acc_WRONGACCOUNT';
    await h.service.confirmPayment(o.userId, o.id, p.id, signature(o.providerOrderId!,p.id), callbackSecret); expect(o.financialState).toBe('unpaid'); expect(o.activationState).toBe('held_for_review'); expect(h.state.redemptions[0].status).toBe('reserved');
  });
  it('ownership and signature are checked before provider fetch', async () => { const h = financialHarness(), o = await h.ready(), p = h.captured(o); await expect(h.service.confirmPayment(randomUUID(),o.id,p.id,signature(o.providerOrderId!,p.id),callbackSecret)).rejects.toMatchObject({code:'not_found'}); await expect(h.service.confirmPayment(o.userId,o.id,p.id,'a'.repeat(64),callbackSecret)).rejects.toMatchObject({code:'signature'}); expect(h.provider.fetchPayment).not.toHaveBeenCalled(); });
  it.each(['expired', 'missing_capture_time', 'refund'])('matched capture with %s records monetary truth and holds activation', async reason => { const h = financialHarness(), o = await h.ready(); h.now.value = new Date('2026-12-01'); const p = h.captured(o); if (reason==='missing_capture_time') { p.capturedAt=null;p.captureTimeSource=null; } if(reason==='refund')p.refundedPaise=1; await h.service.reconcileOrder(o.userId,o.id); expect(o.financialState).toBe('captured');expect(o.activationState).toBe('held_for_review');expect(h.state.redemptions[0].status).toBe('redeemed');if(reason==='missing_capture_time')expect(o.paidAt).toBeNull(); });
  it('second capture is retained as an incident, without a second winner', async () => { const h=financialHarness(),o=await h.ready();h.captured(o);h.captured(o);await h.service.reconcileOrder(o.userId,o.id);expect(h.state.payments).toHaveLength(2);expect(h.state.payments.filter(p=>p.winner)).toHaveLength(1);expect(o.reviewReason).toBe('multiple_captures'); });
  it('out-of-order failed observation cannot downgrade capture', async () => { const h=financialHarness(),o=await h.ready(),p=h.captured(o);await h.service.reconcileOrder(o.userId,o.id);p.state='failed';p.capturedAt=null;p.captureTimeSource=null;await h.service.reconcileOrder(o.userId,o.id);expect(o.financialState).toBe('captured');expect(h.state.payments[0].state).toBe('captured'); });
  it('failure during ledger finalization rolls everything back; retry converges', async () => { const h=financialHarness(),o=await h.ready();h.captured(o);h.fail('patchRedemption');await expect(h.service.reconcileOrder(o.userId,o.id)).rejects.toThrow();expect(h.state.orders[0].financialState).toBe('unpaid');expect(h.state.payments).toHaveLength(0);expect(h.state.redemptions[0].status).toBe('reserved');await h.service.reconcileOrder(o.userId,o.id);expect(h.state.orders[0].financialState).toBe('captured');expect(h.state.redemptions[0].status).toBe('redeemed'); });
});

it('worker records a recovery scan before provider failure and preserves capacity', async () => {
  const h = financialHarness(), order = await h.ready();
  vi.spyOn(h.provider, 'fetchOrderPayments').mockRejectedValueOnce(new Error('synthetic provider loss'));
  const result = await h.service.runReconciliationBatch();
  expect(result.ordersVisited).toBe(1);
  expect(order.providerRecoveryCheckedAt).toEqual(h.now.value);
  expect(order.financialState).toBe('unpaid');
  expect(h.state.redemptions[0].status).toBe('reserved');
  expect(h.provider.createOrder).toHaveBeenCalledTimes(1);
});
