import { privateJson } from '../http';
import { membershipFailure } from '../membership/http';
import { MembershipError } from '../membership/service';
import { PaymentError } from './model';
import type { Order } from './repository';
export function paymentFailure(error: unknown) {
  if (error instanceof MembershipError) return membershipFailure(error);
  if (!(error instanceof PaymentError)) return privateJson({ code: 'unavailable', error: 'Financial processing is temporarily unavailable. Recover the same request; do not start another payment.' }, 503);
  const messages = { terms_required: 'Please accept the current AirBharath Workspace Creator Terms before creating a new order.', disabled: 'Workspace payment is not available.', validation: 'Check the request identifiers.', authentication: 'Please sign in again.', forbidden: 'Forbidden', not_found: 'Order not found.', conflict: 'An existing purchase or request conflicts. Recover the original order.', quote_changed: 'The quote changed. Review a new preview before continuing.', capacity: 'This coupon has no available capacity.', coupon_used: 'This coupon is already reserved or consumed for your account.', recovery_required: 'Provider setup requires reconciliation. Do not start another payment.', unavailable: 'Financial processing is temporarily unavailable.', signature: 'Payment evidence could not be verified.', provider_mismatch: 'Payment evidence requires review.' };
  const status = error.code === 'authentication' ? 401 : ['forbidden', 'signature'].includes(error.code) ? 403 : error.code === 'not_found' ? 404 : ['disabled', 'unavailable', 'recovery_required'].includes(error.code) ? 503 : error.code === 'validation' ? 400 : 409;
  return privateJson({ code: error.code, error: messages[error.code] }, status);
}
export function financialReceipt(order: Order) {
  return { id: order.id, planCode: order.planCode, planVersionId: order.planVersionId, totalPaise: order.totalPaise, currency: order.currency, providerSetupState: order.providerSetupState, financialState: order.financialState, activationState: order.activationState, paidAt: order.paidAt?.toISOString() || null, refundEligibleUntil: order.refundEligibleUntil?.toISOString() || null, hasCreatorAccess: false, hasPaidEntitlement: false };
}
export async function readWebhookBody(request: Request, maximum = 32768) {
  const reader = request.body?.getReader(); if (!reader) throw new PaymentError('validation');
  let size = 0; const chunks: Uint8Array[] = [];
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > maximum) { await reader.cancel(); throw new PaymentError('validation'); } chunks.push(part.value); } } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
