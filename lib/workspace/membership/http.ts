import { privateJson } from '../http';
import { COUPON_ERRORS, COUPON_MESSAGES, type CouponError } from './model';
import { MembershipError } from './service';
export function membershipFailure(error: unknown) {
  if (!(error instanceof MembershipError)) return privateJson({ code: 'unavailable', error: 'Workspace preview is temporarily unavailable. Please try again.' }, 503);
  const code = error.code;
  if ((COUPON_ERRORS as readonly string[]).includes(code)) return privateJson({ code, error: COUPON_MESSAGES[code as CouponError] }, code === 'unavailable' ? 503 : 422);
  const messages = { authentication: 'Please sign in again.', forbidden: 'Forbidden', eligibility_required: 'Current eligibility is required. Return to the eligibility check.', stale_plan: 'The selected plan version changed. Reload before reviewing a new quote.', plan_unavailable: 'This plan is not available.', validation: 'Check the request values.', conflict: 'This command conflicts with an existing code or version. Reload and review before trying again.' };
  const status = code === 'authentication' ? 401 : ['forbidden', 'eligibility_required'].includes(code) ? 403 : ['conflict', 'stale_plan'].includes(code) ? 409 : code === 'plan_unavailable' ? 422 : 400;
  return privateJson({ code, error: messages[code as keyof typeof messages], ...(error.destination ? { destination: error.destination } : {}) }, status);
}
