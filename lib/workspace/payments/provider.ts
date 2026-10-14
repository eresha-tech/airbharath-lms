import { financialConfiguration, requireFinancialConfiguration, type ProviderConfiguration, type FinancialCapability } from './configuration';
import type { RefundProvider } from '../refunds/service';
import { parseProviderRefund } from '../refunds/provider';
import { createHash } from 'node:crypto';
import { object } from '../eligibility/model';
import { PaymentError, PROVIDER_ORDER_ID, PROVIDER_PAYMENT_ID, type ProviderContext, type ProviderOrder, type ProviderPayment } from './model';

export class ProviderFailure extends Error {
  constructor(public outcome: 'definitive_rejection' | 'ambiguous', public evidenceHash?: string, public diagnostic?: { operation: 'read' | 'checkout' | 'refund'; httpStatus: number; responseHash?: string }) { super(outcome); }
}
export interface WorkspaceProvider {
  readonly context: ProviderContext;
  createOrder(input: { amountPaise: number; currency: 'INR'; receipt: string }): Promise<ProviderOrder>;
  findOrders(receipt: string): Promise<ProviderOrder[]>;
  fetchPayment(id: string): Promise<ProviderPayment>;
  fetchOrder(id: string): Promise<ProviderOrder>;
  fetchOrderPayments(id: string): Promise<ProviderPayment[]>;
}
export type TestProviderConfiguration = ProviderConfiguration & { mode: 'test' };
export function testPaymentConfiguration(env: Record<string, string | undefined> = process.env): TestProviderConfiguration | null {
  const config = financialConfiguration('checkout', env);
  return config?.mode === 'test' ? config as TestProviderConfiguration : null;
}
export function requireTestPaymentConfiguration() { const config = testPaymentConfiguration(); if (!config) throw new PaymentError('disabled'); return config; }
const unixDate = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value < 10_000_000_000 ? new Date(value * 1000) : null;
export function parseProviderOrder(raw: unknown, context: ProviderContext): ProviderOrder {
  if (!object(raw) || typeof raw.id !== 'string' || !PROVIDER_ORDER_ID.test(raw.id) || typeof raw.receipt !== 'string' || raw.receipt.length < 1 || raw.receipt.length > 40 || !Number.isSafeInteger(raw.amount) || Number(raw.amount) < 1 || typeof raw.currency !== 'string' || !['created', 'attempted', 'paid'].includes(String(raw.status)) || !unixDate(raw.created_at)) throw new ProviderFailure('ambiguous');
  return { accountId: context.accountId, mode: context.mode, id: raw.id, receipt: raw.receipt, amountPaise: Number(raw.amount), currency: raw.currency, createdAt: unixDate(raw.created_at)!, status: raw.status as ProviderOrder['status'] };
}
export function parseProviderPayment(raw: unknown, context: ProviderContext): ProviderPayment {
  if (!object(raw) || typeof raw.id !== 'string' || !PROVIDER_PAYMENT_ID.test(raw.id) || typeof raw.order_id !== 'string' || !PROVIDER_ORDER_ID.test(raw.order_id) || !Number.isSafeInteger(raw.amount) || Number(raw.amount) < 1 || typeof raw.currency !== 'string' || !/^[A-Z]{3}$/.test(raw.currency) || !['created', 'authorized', 'failed', 'captured', 'refunded'].includes(String(raw.status)) || !unixDate(raw.created_at) || !Number.isSafeInteger(raw.amount_refunded) || Number(raw.amount_refunded) < 0 || Number(raw.amount_refunded) > Number(raw.amount) || (raw.status === 'captured' && raw.captured !== true) || (raw.status === 'refunded' && (raw.amount_refunded !== raw.amount || raw.refund_status !== 'full')) || ![null, 'partial', 'full'].includes(raw.refund_status === undefined ? null : raw.refund_status as string | null)) throw new ProviderFailure('ambiguous');
  // The documented entity does not provide an exact capture timestamp. Never promote
  // created_at, callback time or a non-contract captured_at field into paidAt.
  return { accountId: context.accountId, mode: context.mode, id: raw.id, orderId: raw.order_id, amountPaise: Number(raw.amount), currency: raw.currency, state: raw.status === 'refunded' ? 'captured' : raw.status as ProviderPayment['state'], providerCreatedAt: unixDate(raw.created_at)!, capturedAt: null, captureTimeSource: null, refundedPaise: Number(raw.amount_refunded), refundStatus: (raw.refund_status || null) as ProviderPayment['refundStatus'] };
}
function createAdapter(config: ProviderConfiguration, http: typeof fetch, allowed: (operation: 'read' | 'checkout' | 'refund') => void, signal?: AbortSignal): WorkspaceProvider & RefundProvider {
  if (!config.keyId.startsWith(config.mode === 'live' ? 'rzp_live_' : 'rzp_test_')) throw new PaymentError('disabled');
  async function request(path: string, body?: unknown, idempotencyKey?: string) {
    allowed(body ? path.endsWith('/refund') ? 'refund' : 'checkout' : 'read');
    try {
      const response = await http(`https://api.razorpay.com/v1/${path}`, { method: body ? 'POST' : 'GET', headers: { ...(idempotencyKey ? { 'X-Refund-Idempotency': idempotencyKey } : {}), Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000), redirect: 'error' });
      // Bound even authenticated provider responses; never log provider bodies/credentials.
      const reader = response.body?.getReader(); if (!reader) throw new ProviderFailure('ambiguous');
      const chunks: Uint8Array[] = []; let size = 0;
      try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 256_000) { await reader.cancel(); throw new ProviderFailure('ambiguous'); } chunks.push(part.value); } } finally { reader.releaseLock(); }
      const raw: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!response.ok) {
        // Only documented create input rejection proves no order escaped; all other failures retain the hold.
        const definitive = !!body && response.status === 400 && object(raw) && object(raw.error) && raw.error.code === 'BAD_REQUEST_ERROR' && raw.error.reason === 'input_validation_failed';
        const responseHash = createHash('sha256').update(Buffer.concat(chunks)).digest('hex');
        throw new ProviderFailure(definitive ? 'definitive_rejection' : 'ambiguous', definitive ? responseHash : undefined, { operation: body ? path.endsWith('/refund') ? 'refund' : 'checkout' : 'read', httpStatus: response.status, responseHash });
      }
      return raw;
    } catch (error) { if (error instanceof ProviderFailure) throw error; throw new ProviderFailure('ambiguous'); }
  }
  // V1 request encoding is shared by creation and explicit recovery. Changing this
  // payload for an existing attempt would violate Razorpay's idempotency contract.
  const createRefund: RefundProvider['createRefund'] = async input => {
      if (!PROVIDER_PAYMENT_ID.test(input.paymentId) || !Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1 || !/^[a-f0-9-]{36}$/.test(input.attemptId) || !/^[a-f0-9-]{36}$/.test(input.requestId)) throw new PaymentError('validation');
      return parseProviderRefund(await request(`payments/${input.paymentId}/refund`, { amount: input.amountPaise, speed: 'normal', notes: { workspace_refund_request: input.requestId, workspace_refund_attempt: input.attemptId } }, input.attemptId), config);
  };
  return { context: { accountId: config.accountId, mode: config.mode },
    refundMutationAllowed: () => { try { allowed('refund'); return true; } catch { return false; } },
    createRefund, replayRefund: createRefund,
    async fetchRefunds(paymentId) {
      if (!PROVIDER_PAYMENT_ID.test(paymentId)) throw new PaymentError('validation');
      const raw = await request(`payments/${paymentId}/refunds?count=100&skip=0`);
      // Fail closed on a saturated page; do not infer absence from truncated provider history.
      if (!object(raw) || !Array.isArray(raw.items) || raw.items.length >= 100) throw new ProviderFailure('ambiguous');
      const refunds = raw.items.map(item => parseProviderRefund(item,config));
      if(refunds.some(r=>r.paymentId!==paymentId))throw new ProviderFailure('ambiguous');return refunds;
    },
    async createOrder(input) { return parseProviderOrder(await request('orders', { amount: input.amountPaise, currency: input.currency, receipt: input.receipt, partial_payment: false, notes: {} }), config); },
    async findOrders(receipt) {
      const raw = await request(`orders?${new URLSearchParams({ receipt, count: '100', skip: '0' })}`);
      if (!object(raw) || !Array.isArray(raw.items) || raw.items.length >= 100) throw new ProviderFailure('ambiguous');
      // Receipt search is not an idempotency guarantee. Exact-match all candidates; never infer closure from zero results.
      return raw.items.filter(item => object(item) && item.receipt === receipt).map(item => parseProviderOrder(item, config));
    },
    async fetchOrder(id) { if (!PROVIDER_ORDER_ID.test(id)) throw new PaymentError('validation'); const order = parseProviderOrder(await request(`orders/${id}`), config); if (order.id !== id) throw new ProviderFailure('ambiguous'); return order; },
    async fetchPayment(id) { if (!PROVIDER_PAYMENT_ID.test(id)) throw new PaymentError('validation'); const payment = parseProviderPayment(await request(`payments/${id}`), config); if (payment.id !== id) throw new ProviderFailure('ambiguous'); return payment; },
    async fetchOrderPayments(id) {
      if (!PROVIDER_ORDER_ID.test(id)) throw new PaymentError('validation');
      const raw = await request(`orders/${id}/payments`);
      if (!object(raw) || !Array.isArray(raw.items) || raw.items.length > 100) throw new ProviderFailure('ambiguous');
      const payments = raw.items.map(item => parseProviderPayment(item, config)); if (payments.some(p => p.orderId !== id)) throw new ProviderFailure('ambiguous'); return payments;
    },
  };
}

// Runtime factory validates every operation before HTTP, including GETs after a kill-switch change.
export function createRazorpayAdapter(env: Record<string, string | undefined> = process.env, http: typeof fetch = fetch, signal?: AbortSignal) {
  const get = (capability: FinancialCapability) => financialConfiguration(capability, env);
  const config = get('checkout') || get('refund') || get('reconciliation') || get('webhook');
  if (!config) throw new PaymentError('disabled');
  return createAdapter(config, http, operation => {
    const current = operation === 'read' ? get('reconciliation') || get('refund') || get('checkout') : get(operation);
    if (!current || current.accountId !== config.accountId || current.mode !== config.mode || current.keyId !== config.keyId || current.keySecret !== config.keySecret) throw new PaymentError('disabled');
  }, signal);
}
// Compatibility for opt-in Test verification. All methods retain explicit runtime authorization.
export function createRazorpayTestAdapter(config: ProviderConfiguration, http: typeof fetch = fetch) {
  if (config.mode !== 'test' || !config.keyId.startsWith('rzp_test_')) throw new PaymentError('disabled');
  return createAdapter(config, http, operation => {
    const cap = operation === 'read' ? 'reconciliation' : operation;
    const authorized = requireFinancialConfiguration(cap);
    if (authorized.mode !== 'test' || authorized.accountId !== config.accountId || authorized.keyId !== config.keyId || authorized.keySecret !== config.keySecret) throw new PaymentError('disabled');
  });
}
