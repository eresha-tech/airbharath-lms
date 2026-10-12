import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { UUID, object } from '../eligibility/model';
import { parseQuoteInput, type QuoteInput } from '../membership/model';

export const FINANCIAL_VERSION = 'workspace-financial-v1';
export const TEST_COMMERCIAL_POLICY = 'workspace-test-noncommercial-v1';
export const LIVE_COMMERCIAL_POLICY = 'workspace-live-commercial-v1';
export const commercialPolicy = (mode: string) => mode === 'live' ? LIVE_COMMERCIAL_POLICY : TEST_COMMERCIAL_POLICY;
export const HOLD_POLICY = 'conservative-v1';
export const REFUND_HOURS = 72;
export const PROVIDER_ORDER_ID = /^order_[A-Za-z0-9]{6,80}$/;
export const PROVIDER_PAYMENT_ID = /^pay_[A-Za-z0-9]{6,80}$/;
export const HASH = /^[a-f0-9]{64}$/;
export type SetupState = 'creating' | 'ready' | 'recovery_required' | 'closed';
export type FinancialState = 'unpaid' | 'captured';
export type ActivationState = 'pending_activation' | 'held_for_review' | 'fulfilled';
export type ReservationState = 'reserved' | 'redeemed' | 'released';
export type PaymentState = 'created' | 'authorized' | 'failed' | 'captured';
export type EventState = 'pending' | 'processing' | 'retry' | 'processed' | 'needs_review' | 'ignored';
export type PaymentCode = 'disabled' | 'validation' | 'authentication' | 'forbidden' | 'not_found' | 'conflict' | 'quote_changed' | 'capacity' | 'coupon_used' | 'recovery_required' | 'unavailable' | 'signature' | 'provider_mismatch' | 'terms_required' | 'refund_policy_required';
export class PaymentError extends Error { constructor(public code: PaymentCode) { super(code); } }
export const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const receiptFor = (id: string) => `wso${id.replaceAll('-', '')}`;
export type AcceptInput = QuoteInput & { quoteHash: string; requestKey: string };
export function parseAcceptance(raw: unknown): AcceptInput | null {
  if (!object(raw) || Object.keys(raw).some(k => !['planCode', 'planVersionId', 'couponCode', 'quoteHash', 'requestKey'].includes(k)) || typeof raw.quoteHash !== 'string' || !HASH.test(raw.quoteHash) || typeof raw.requestKey !== 'string' || !UUID.test(raw.requestKey)) return null;
  const { quoteHash, requestKey, ...identifiers } = raw;
  const input = parseQuoteInput(identifiers);
  return input ? { ...input, quoteHash, requestKey } : null;
}
export function verifyHmac(message: string | Uint8Array, signature: unknown, secret: string) {
  if (!secret || typeof signature !== 'string' || !HASH.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(message).digest(), Buffer.from(signature, 'hex'));
}
export function refundDeadline(paidAt: Date) { return new Date(paidAt.getTime() + REFUND_HOURS * 3_600_000); }
export type ProviderContext = { accountId: string; mode: 'test' | 'live' };
export type ProviderOrder = ProviderContext & { id: string; receipt: string; amountPaise: number; currency: string; createdAt: Date; status: 'created' | 'attempted' | 'paid' };
export const CAPTURE_EVENT_TIME_SOURCE = 'razorpay_payment_captured_event_v1';
export type CaptureTimeSource = 'test_authoritative' | typeof CAPTURE_EVENT_TIME_SOURCE;
export type ProviderPayment = ProviderContext & { id: string; orderId: string; amountPaise: number; currency: string; state: PaymentState; providerCreatedAt: Date; capturedAt: Date | null; captureTimeSource: CaptureTimeSource | null; refundedPaise: number; refundStatus?: 'partial' | 'full' | null };
export type WebhookEvidence = { providerOrderId: string | null; providerPaymentId: string | null; receipt: string | null; eventCreatedAt: string | null; providerRefundId?: string | null };
// Keep only routing identifiers. Provider facts are fetched through the scoped adapter before finalization.
export function minimizeWebhook(raw: unknown, expectedAccount: string, expectedMode: ProviderContext['mode'] = 'test'): { type: string; evidence: WebhookEvidence } | null {
  if (!object(raw) || ('mode' in raw && raw.mode !== expectedMode) || raw.account_id !== expectedAccount || typeof raw.event !== 'string' || !/^[a-z][a-z._]{1,79}$/.test(raw.event)) return null;
  const payload = object(raw.payload) ? raw.payload : {};
  const payment = object(payload.payment) && object(payload.payment.entity) ? payload.payment.entity : {};
  const order = object(payload.order) && object(payload.order.entity) ? payload.order.entity : {};
  const refund = object(payload.refund) && object(payload.refund.entity) ? payload.refund.entity : {};
  const orderId = payment.order_id || order.id;
  return { type: raw.event, evidence: {
    providerOrderId: typeof orderId === 'string' && PROVIDER_ORDER_ID.test(orderId) ? orderId : null,
    providerRefundId: typeof refund.id === 'string' && /^rfnd_[A-Za-z0-9]{6,80}$/.test(refund.id) ? refund.id : null,
    providerPaymentId: typeof (payment.id || refund.payment_id) === 'string' && PROVIDER_PAYMENT_ID.test(String(payment.id || refund.payment_id)) ? String(payment.id || refund.payment_id) : null,
    receipt: typeof order.receipt === 'string' && /^wso[a-f0-9]{32}$/.test(order.receipt) ? order.receipt : null,
    eventCreatedAt: typeof raw.created_at === 'number' && Number.isSafeInteger(raw.created_at) && raw.created_at > 0 && raw.created_at < 10_000_000_000 ? new Date(raw.created_at * 1000).toISOString() : null,
  } };
}
export const PAYMENT_EVENTS = ['payment.captured', 'payment.authorized', 'payment.failed', 'order.paid'];
