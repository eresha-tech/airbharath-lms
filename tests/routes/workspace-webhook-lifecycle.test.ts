import { createHmac } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ runtime: vi.fn(), receive: vi.fn(), after: vi.fn(), worker: vi.fn() }));
vi.mock('@/lib/workspace/payments/runtime', () => ({ workspacePaymentRuntime: mocks.runtime }));
vi.mock('next/server', async original => ({ ...await original<typeof import('next/server')>(), after: mocks.after }));
vi.mock('@/lib/workspace/payments/worker', () => ({ runWorkspaceFinancialWorker: mocks.worker }));
import { POST } from '@/app/api/workspace/payments/razorpay/webhook/route';

const config = { accountId: 'acc_SYNTHETICCLOSURE', mode: 'test', webhookSecret: 'synthetic-lifecycle-only' };
const raw = ' { "account_id":"acc_SYNTHETICCLOSURE", "event":"payment.captured", "payload":{} } ';
function request(signature = createHmac('sha256', config.webhookSecret).update(raw).digest('hex')) {
  return new Request('https://synthetic.invalid/api/workspace/payments/razorpay/webhook', {
    method: 'POST', body: raw,
    headers: { 'x-razorpay-signature': signature, 'x-razorpay-event-id': 'evt_CLOSURE001' },
  });
}
beforeEach(() => {
  mocks.runtime.mockReset().mockReturnValue({ config, store: { receiveEvent: mocks.receive } });
  mocks.receive.mockReset().mockResolvedValue({ event: { processingState: 'pending' }, anomaly: false });
  mocks.after.mockReset().mockImplementation(() => { throw new Error('synthetic scheduler unavailable'); });
  mocks.worker.mockReset();
});

it('acknowledges a signed durable pending receipt when scheduling throws', async () => {
  const response = await POST(request());
  expect(response.status).toBe(202);
  expect(await response.json()).toEqual({ received: true, state: 'pending' });
  expect(mocks.receive.mock.invocationCallOrder[0]).toBeLessThan(mocks.after.mock.invocationCallOrder[0]);
  expect(mocks.worker).not.toHaveBeenCalled();
});

it('acknowledges an already processed replay even when scheduling throws', async () => {
  mocks.receive.mockResolvedValue({ event: { processingState: 'processed' }, anomaly: false });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.worker).not.toHaveBeenCalled();
});

it('waits for receipt persistence before scheduling or acknowledging', async () => {
  let commit!: (value: unknown) => void;
  mocks.receive.mockImplementation(() => new Promise(resolve => { commit = resolve; }));
  let acknowledged = false;
  const response = POST(request()).then(value => { acknowledged = true; return value; });
  await vi.waitFor(() => expect(mocks.receive).toHaveBeenCalledOnce());
  expect(acknowledged).toBe(false);
  expect(mocks.after).not.toHaveBeenCalled();
  commit({ event: { processingState: 'pending' }, anomaly: false });
  expect((await response).status).toBe(202);
});

it('does not acknowledge a failed receipt transaction', async () => {
  mocks.receive.mockRejectedValue(new Error('synthetic database unavailable'));
  expect((await POST(request())).status).toBe(503);
  expect(mocks.after).not.toHaveBeenCalled();
});

it('does not persist or schedule an invalid signature', async () => {
  expect((await POST(request('0'.repeat(64)))).status).toBe(403);
  expect(mocks.receive).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
});

it('does not schedule a conflicting event identity', async () => {
  mocks.receive.mockResolvedValue({ event: { processingState: 'needs_review' }, anomaly: true });
  expect((await POST(request())).status).toBe(409);
  expect(mocks.after).not.toHaveBeenCalled();
});

it('retains a pending receipt when the registered background worker fails', async () => {
  mocks.after.mockImplementation(() => undefined);
  mocks.worker.mockRejectedValue(new Error('synthetic worker interrupted'));
  expect((await POST(request())).status).toBe(202);
  await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined();
  expect(mocks.worker).toHaveBeenCalledOnce();
});

it('handles the actual Next after request-context error without a global lifecycle no-op', async () => {
  const native = await vi.importActual<typeof import('next/server')>('next/server');
  let failure = '';
  mocks.after.mockImplementation(callback => {
    try { native.after(callback); } catch (error) { failure = (error as Error).message; throw error; }
  });
  expect((await POST(request())).status).toBe(202);
  expect(failure).toContain('outside a request scope');
});

it('does not hide a runtime configuration failure', async () => {
  mocks.runtime.mockImplementation(() => { throw new Error('synthetic configuration unavailable'); });
  expect((await POST(request())).status).toBe(503);
  expect(mocks.receive).not.toHaveBeenCalled();
  expect(mocks.after).not.toHaveBeenCalled();
});

it('does not hide errors outside the scheduling boundary', async () => {
  mocks.receive.mockResolvedValue({ anomaly: false, get event() { throw new Error('synthetic receipt projection failure'); } });
  expect((await POST(request())).status).toBe(503);
});
