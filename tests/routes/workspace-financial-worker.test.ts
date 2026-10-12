import { it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { drainFinancialWork } from '@/lib/workspace/payments/worker';
import { financialWorkerAuthorized } from '@/lib/workspace/payments/worker-auth';
import { financialHarness, financeNow, testContext } from './workspace-payments-fixtures';
import { refundHarness } from './workspace-refunds-fixtures';
import { bestEffortRefundNotice } from '@/lib/workspace/refunds/notices';
const active = () => new AbortController().signal;
async function capturedInbox(h: ReturnType<typeof financialHarness>) {
  const order = await h.ready(), payment = h.captured(order, { capturedAt: null, captureTimeSource: null });
  const e = await h.store.receiveEvent(testContext, { eventId: randomUUID(), type: 'payment.captured', hash: 'a'.repeat(64), evidence: { providerOrderId: order.providerOrderId, providerPaymentId: payment.id, receipt: null, eventCreatedAt: financeNow.toISOString() } }, financeNow);
  return { order, e };
}
it('requires explicit strong server header auth; cookie, query string and cron user agent do not authorize', () => {
  const secret = 'synthetic-cron-secret-at-least-thirty-two-chars';
  expect(financialWorkerAuthorized(new Request('https://example.invalid/api/internal/workspace/reconcile', { headers: { authorization: `Bearer ${secret}` } }), { CRON_SECRET: secret })).toBe(true);
  const invalidHeaders: Record<string, string>[] = [{}, { authorization: 'Bearer wrong' }, { cookie: 'ab_session=synthetic', 'user-agent': 'vercel-cron/1.0' }];
  for (const headers of invalidHeaders) expect(financialWorkerAuthorized(new Request('https://example.invalid?secret='+secret, { headers }), { CRON_SECRET: secret })).toBe(false);
  expect(financialWorkerAuthorized(new Request('https://example.invalid', { headers: { authorization: 'Bearer short' } }), { CRON_SECRET: 'short' })).toBe(false);
});
it('two invocations converge on one claimed capture and one full refund without a second provider mutation', async () => {
  const h = financialHarness(), { e } = await capturedInbox(h), r = await refundHarness(); await r.approved(); r.full();
  const tasks = { payments: (n: number) => h.service.runReconciliationBatch(n), refunds: (n: number) => r.service.recoverPrepared(n), activation: vi.fn(async () => undefined) };
  await Promise.all([drainFinancialWork(tasks, active(), 1), drainFinancialWork(tasks, active(), 1)]);
  expect(e.event.attemptCount).toBe(1); expect(h.state.payments).toHaveLength(1); expect(h.state.redemptions[0].status).toBe('redeemed');
  expect(r.state.completion).not.toBeNull(); expect(r.state.notices.filter(n => n === 'completed')).toHaveLength(1); expect(r.provider.createRefund).toHaveBeenCalledTimes(1);
});
it('crash after inbox claim is recovered after persisted lease expiry', async () => {
  const h = financialHarness(), { e } = await capturedInbox(h); await h.store.claimEvent(e.event.id, financeNow, testContext);
  await h.service.processEvent(e.event.id); expect(h.state.payments).toHaveLength(0);
  h.now.value = new Date(financeNow.getTime()+60001); await h.service.processEvent(e.event.id);
  expect(e.event.processingState).toBe('processed'); expect(h.state.payments).toHaveLength(1);
});
it('failure after GET before DB completion leaves a durable retry; later invocation converges', async () => {
  const h = financialHarness(), { e } = await capturedInbox(h); h.fail('insertPayment'); await h.service.processEvent(e.event.id);
  expect(h.state.payments).toHaveLength(0); expect(h.state.events[0].processingState).toBe('retry');
  h.now.value = new Date(financeNow.getTime()+60001); await h.service.processEvent(e.event.id);
  expect(h.state.events[0].processingState).toBe('processed'); expect(h.state.payments).toHaveLength(1);
});
it('response loss after committed financial completion cannot duplicate capture on a later invocation', async () => {
  const h = financialHarness(); await capturedInbox(h);
  const tasks = { payments: async (n: number) => { await h.service.runReconciliationBatch(n); throw Error('response lost'); }, refunds: vi.fn(async () => undefined), activation: vi.fn(async () => undefined) };
  expect((await drainFinancialWork(tasks, active(), 1)).payments).toBe('retry_required'); await drainFinancialWork(tasks, active(), 1);
  expect(h.state.payments).toHaveLength(1); expect(h.state.redemptions.filter(r => r.status === 'redeemed')).toHaveLength(1);
});
it('cooperative deadline and bounded batch stop new work; errors remain retryable', async () => {
  const controller = new AbortController(), tasks = { payments: vi.fn(async () => { controller.abort(); }), refunds: vi.fn(), activation: vi.fn() };
  expect(await drainFinancialWork(tasks, controller.signal)).toEqual({ payments: 'visited', refunds: 'not_started', activation: 'not_started' });
  expect(tasks.refunds).not.toHaveBeenCalled(); await expect(drainFinancialWork(tasks, active(), 4)).rejects.toThrow('worker_invalid_limit');
});
it('notice sender failure is independent from already committed refund truth; no delivery receipt is claimed', async () => {
  const r = await refundHarness(); r.full(); await r.service.reconcile(r.order.id); const state = structuredClone(r.state);
  expect(await bestEffortRefundNotice(async () => { throw Error('sender timeout'); })).toBe(false); expect(r.state).toEqual(state);
});
it('bounded external-observation recovery fetches existing provider truth without issuing a remainder refund', async () => {
  const r = await refundHarness(); r.full();
  r.store.externalPending = vi.fn(async () => [{ membershipOrderId: r.order.id }]);
  r.store.markExternalChecked = vi.fn(async () => undefined);
  await r.service.recoverPrepared(1);
  expect(r.store.externalPending).toHaveBeenCalledWith(r.provider.context, 1);
  expect(r.store.markExternalChecked).toHaveBeenCalledWith(r.order.id);
  expect(r.state.completion).not.toBeNull(); expect(r.provider.createRefund).not.toHaveBeenCalled();
});
