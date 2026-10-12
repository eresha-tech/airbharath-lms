import { beforeEach, it, expect, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { liveEnv } from './workspace-live-fixtures';
import { financialHarness, financeNow } from './workspace-payments-fixtures';
import { createWorkspacePaymentService } from '@/lib/workspace/payments/service';
import { LIVE_COMMERCIAL_POLICY, type ProviderPayment } from '@/lib/workspace/payments/model';
const mocks = vi.hoisted(() => ({ receive: vi.fn(), user: vi.fn() }));
vi.mock('@/lib/workspace/payments/repository', () => ({ postgresFinanceStore: { receiveEvent: mocks.receive } }));
vi.mock('@/lib/workspace/refunds/repository', () => ({ postgresRefundStore: {} }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
import { POST as webhook } from '@/app/api/workspace/payments/razorpay/webhook/route';
import { POST as newOrder } from '@/app/api/workspace/membership/orders/route';
const env = { ...liveEnv, WORKSPACE_PAYMENT_ENABLED: 'false' };
beforeEach(() => { for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value); });
it('real raw-body Live webhook intake reaches durable store while the real new-order route refuses charging', async () => {
  mocks.receive.mockResolvedValue({ event: { processingState: 'pending' }, anomaly: false });
  const raw = ` { "account_id":"${env.WORKSPACE_RAZORPAY_ACCOUNT_ID}", "event":"payment.captured", "mode":"live", "payload":{} } `;
  const request = new Request('https://production.example.invalid/api/workspace/payments/razorpay/webhook', { method: 'POST', headers: { 'x-razorpay-signature': createHmac('sha256', env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'), 'x-razorpay-event-id': 'evt_SYNTHETICLIVE001' }, body: raw });
  expect((await webhook(request)).status).toBe(202);
  expect(mocks.receive).toHaveBeenCalledWith(expect.objectContaining({ mode: 'live' }), expect.objectContaining({ type: 'payment.captured' }), expect.any(Date));
  expect((await newOrder(new Request('https://production.example.invalid/api/workspace/membership/orders', { method: 'POST', body: '{}' }))).status).toBe(503);
  expect(mocks.user).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it('wrong account or explicit Test mode cannot enter Live inbox even with a valid synthetic HMAC', async () => {
  for (const body of [{ account_id: 'acc_WRONG001', mode: 'live' }, { account_id: env.WORKSPACE_RAZORPAY_ACCOUNT_ID, mode: 'test' }]) {
    const raw = JSON.stringify({ ...body, event: 'refund.processed', payload: {} });
    const r = new Request('https://production.example.invalid/api/workspace/payments/razorpay/webhook', { method: 'POST', headers: { 'x-razorpay-signature': createHmac('sha256', env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET).update(raw).digest('hex'), 'x-razorpay-event-id': randomUUID() }, body: raw });
    expect((await webhook(r)).status).toBe(409);
  }
  expect(mocks.receive).not.toHaveBeenCalled();
});
it('a signed/scoped Live inbox event establishes capture time on an existing order with charging disabled', async () => {
  const h = financialHarness(), order = await h.ready(false);
  order.providerMode = 'live'; order.commercialPolicyVersion = LIVE_COMMERCIAL_POLICY; order.providerAccountId = env.WORKSPACE_RAZORPAY_ACCOUNT_ID;
  const context = { accountId: order.providerAccountId, mode: 'live' as const };
  const provider = { ...h.provider, context };
  const observed: ProviderPayment = { ...h.captured(order), ...context, capturedAt: null, captureTimeSource: null };
  h.observations.splice(0, h.observations.length, observed);
  const service = createWorkspacePaymentService(h.store, provider, () => h.now.value);
  const event = await h.store.receiveEvent(context, { eventId: randomUUID(), type: 'payment.captured', hash: 'a'.repeat(64), evidence: { providerOrderId: order.providerOrderId, providerPaymentId: observed.id, receipt: null, eventCreatedAt: financeNow.toISOString() } }, financeNow);
  await service.processEvent(event.event.id);
  expect(order.financialState).toBe('captured'); expect(order.paidAt).toEqual(financeNow); expect(event.event.processingState).toBe('processed');
  expect(h.state.payments[0].captureTimeSource).toBe('razorpay_payment_captured_event_v1');
  expect(h.provider.createOrder).toHaveBeenCalledTimes(1); // Fixture setup only; worker never creates another.
});
