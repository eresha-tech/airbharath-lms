import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { object, UUID } from '@/lib/workspace/eligibility/model';
import { COUPON_STATUSES, isBoundedInteger, type CouponStatus } from '@/lib/workspace/membership/model';
import { changeWorkspaceCouponStatus } from '@/lib/workspace/membership/service';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  try {
    const admin = await getAuthorizedAdminSession();
    if (!admin) return privateJson({ error: 'Forbidden' }, 403);
    const { id } = await context.params;
    let raw: unknown;
    try { raw = await readJson(request, 1024); } catch { return privateJson({ error: 'Provide valid JSON smaller than 1 KB.' }, 400); }
    if (!UUID.test(id) || !object(raw) || Object.keys(raw).some(key => !['status', 'expectedVersion', 'requestKey'].includes(key)) ||
      !(COUPON_STATUSES as readonly unknown[]).includes(raw.status) || !isBoundedInteger(raw.expectedVersion, 2_147_483_646) || typeof raw.requestKey !== 'string' || !UUID.test(raw.requestKey)) return privateJson({ error: 'Invalid status command.' }, 400);
    return privateJson({ coupon: await changeWorkspaceCouponStatus(admin.id, id, raw.status as CouponStatus, raw.expectedVersion, raw.requestKey) });
  } catch (error) { return membershipFailure(error); }
}
