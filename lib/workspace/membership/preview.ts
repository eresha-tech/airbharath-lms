import { COUPON_ERRORS, type Plan } from './model';
import type { MembershipQuote } from './service';

// Only definitive coupon rejections permit a separate, authoritative standard quote.
// Availability/transport/eligibility failures must continue to block checkout.
export function isCouponRejection(code: unknown) {
  return typeof code === 'string' && code !== 'unavailable' && (COUPON_ERRORS as readonly string[]).includes(code);
}
type PreviewReply = { quote?: MembershipQuote; code?: string; error?: string; destination?: string };
export async function requestMembershipPreview(plan: Pick<Plan, 'id' | 'code'>, code: string | undefined, signal: AbortSignal, http: typeof fetch = fetch) {
  async function read(couponCode?: string) {
    const response = await http('/api/workspace/membership/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: plan.code, planVersionId: plan.id, ...(couponCode ? { couponCode } : {}) }), signal, cache: 'no-store' });
    const data: PreviewReply = await response.json();
    signal.throwIfAborted();
    return { response, data };
  }
  let result = await read(code);
  let couponError = '';
  if (code && !result.response.ok && isCouponRejection(result.data.code)) {
    couponError = result.data.error || 'This coupon cannot be applied.';
    result = await read();
  }
  if (!result.response.ok || !result.data.quote) return { quote: null, couponError, error: result.data.error || 'Preview is unavailable. Please try again.', destination: ['/workspace/apply', '/workspace/eligibility-result'].includes(result.data.destination || '') ? result.data.destination : undefined };
  return { quote: result.data.quote, couponError, error: '', destination: undefined };
}
