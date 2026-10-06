import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { UUID } from '@/lib/workspace/eligibility/model';
import { privateJson } from '@/lib/workspace/http';
import { financialCouponCounts } from '@/lib/workspace/payments/repository';
import { paymentFailure } from '@/lib/workspace/payments/http';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await getAuthorizedAdminSession()) return privateJson({ error: 'Forbidden' }, 403);
  const { id } = await context.params; if (!UUID.test(id)) return privateJson({ error: 'Invalid coupon identifier.' }, 400);
  try { return privateJson(await financialCouponCounts(id)); } catch (error) { return paymentFailure(error); }
}
