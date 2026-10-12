import { object, UUID } from '../eligibility/model';
import { digest, refundDeadline, type ProviderContext, type ProviderPayment } from '../payments/model';
import type { Order } from '../payments/repository';
import { REFUND_REASONS } from './reasons';
export { REFUND_REASONS } from './reasons';
export type RefundReason = typeof REFUND_REASONS[number];
export type RefundDecision = 'requested' | 'approved' | 'rejected';
export type RefundExecution = 'prepared' | 'processing' | 'completed' | 'failed' | 'uncertain';
export type RefundCode = 'validation' | 'authentication' | 'forbidden' | 'not_found' | 'conflict' | 'window_ended' | 'not_refundable' | 'unavailable' | 'reconciliation_required';
export class RefundError extends Error { constructor(public code: RefundCode) { super(code); } }
export const REFUND_ID = /^rfnd_[A-Za-z0-9]{6,80}$/;
export const REFUND_EVENTS = ['refund.created', 'refund.processed', 'refund.failed', 'refund.speed_changed'];
export type ProviderRefund = ProviderContext & { id: string; paymentId: string; amountPaise: number; currency: string; status: 'pending' | 'processed' | 'failed'; createdAt: Date };
export type RequestCommand = { requestKey: string; reason: RefundReason; note: string | null };
export function parseRefundRequest(raw: unknown): RequestCommand {
  if (!object(raw) || Object.keys(raw).some(k => !['requestKey', 'reason', 'note'].includes(k)) || typeof raw.requestKey !== 'string' || !UUID.test(raw.requestKey) || !REFUND_REASONS.includes(raw.reason as RefundReason) || (raw.note !== undefined && raw.note !== null && (typeof raw.note !== 'string' || raw.note.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw.note)))) throw new RefundError('validation');
  return { requestKey: raw.requestKey, reason: raw.reason as RefundReason, note: typeof raw.note === 'string' ? raw.note.trim() || null : null };
}
export function parseRefundDecision(raw: unknown) {
  if (!object(raw) || Object.keys(raw).some(k => !['action', 'confirmed', 'reason'].includes(k)) || !['approve', 'reject', 'retry', 'reconcile'].includes(String(raw.action)) || raw.confirmed !== true) throw new RefundError('validation');
  const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
  if ((raw.action === 'reject' && (!reason || reason.length > 2000)) || (raw.action !== 'reject' && raw.reason !== undefined) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(reason)) throw new RefundError('validation');
  return { action: raw.action as 'approve' | 'reject' | 'retry' | 'reconcile', reason };
}
export const requestPayloadHash = (command: RequestCommand) => digest({ reason: command.reason, note: command.note });
export function refundableOrder(order: Order, now: Date, completed: boolean) {
  if (completed || order.financialState !== 'captured' || !['fulfilled', 'pending_activation'].includes(order.activationState) || order.reviewReason || !order.paidAt || !order.refundEligibleUntil || order.refundEligibleUntil.getTime() !== refundDeadline(order.paidAt).getTime() || order.paidAt > now || !order.winningPaymentId || !order.providerOrderId || order.currency !== 'INR' || !Number.isSafeInteger(order.totalPaise) || order.totalPaise < 1) throw new RefundError('not_refundable');
  if (now > order.refundEligibleUntil) throw new RefundError('window_ended'); // inclusive exact deadline
}
export function paymentMatches(order: Order, payment: ProviderPayment, context: ProviderContext) {
  return payment.accountId === context.accountId && payment.mode === context.mode && order.providerAccountId === context.accountId && order.providerMode === context.mode && payment.id === order.winningPaymentId && payment.orderId === order.providerOrderId && payment.state === 'captured' && payment.amountPaise === order.totalPaise && payment.currency === order.currency;
}
export function refundMatches(order: Order, refund: ProviderRefund, context: ProviderContext) {
  return REFUND_ID.test(refund.id) && refund.accountId === context.accountId && refund.mode === context.mode && refund.paymentId === order.winningPaymentId && refund.amountPaise === order.totalPaise && refund.currency === order.currency;
}
export function fullRefundConfirmed(order: Order, payment: ProviderPayment, refund: ProviderRefund, context: ProviderContext) {
  return paymentMatches(order, payment, context) && refundMatches(order, refund, context) && refund.status === 'processed' && payment.refundStatus === 'full' && payment.refundedPaise === order.totalPaise;
}
export const refundEvidenceHash = (payment: ProviderPayment, refund: ProviderRefund) => digest({ payment, refund });
export function refundStatus(decision: RefundDecision, execution?: RefundExecution | null, completed = false) {
  return completed || execution === 'completed' ? 'Refund completed' : decision === 'rejected' ? 'Refund rejected' : execution === 'uncertain' || execution === 'failed' ? 'Refund processing requires review' : decision === 'approved' ? 'Refund approved / being processed' : 'Refund requested — under review';
}
