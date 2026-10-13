import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { UUID } from '@/lib/workspace/eligibility/model';
import { privateJson } from '@/lib/workspace/http';
import { influencerCouponReport } from '@/lib/workspace/membership/reporting';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAuthorizedAdminSession();
  if (!actor) return privateJson({ error: 'Forbidden' }, 403);
  const { id } = await context.params; if (!UUID.test(id)) return privateJson({ error: 'Invalid coupon identifier.' }, 400);
  const mode = new URL(request.url).searchParams.get('mode') || 'live';
  if (mode !== 'live' && mode !== 'test') return privateJson({ error: 'Invalid reporting mode.' }, 400);
  try { return privateJson(await influencerCouponReport(actor.id, id, mode)); } catch (error) { return membershipFailure(error); }
}
