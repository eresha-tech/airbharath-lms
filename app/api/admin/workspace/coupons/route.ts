import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { object, UUID } from '@/lib/workspace/eligibility/model';
import { COUPON_STATUSES, validateCouponDefinition } from '@/lib/workspace/membership/model';
import { createWorkspaceCoupon, listWorkspaceCoupons } from '@/lib/workspace/membership/service';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function GET(request: Request) {
  const actor=await getAuthorizedAdminSession();
  if (!actor) return privateJson({ error: 'Forbidden' }, 403);
  const params = new URL(request.url).searchParams;
  if([...params.keys()].some(k=>params.getAll(k).length>1)||!(/^[1-9]\d{0,2}$/.test(params.get('page')||'1')))return privateJson({error:'Invalid filters.'},400);
  const query = (params.get('q') || '').trim().toUpperCase(), status = params.get('status') || 'all', page = Number(params.get('page') || 1),size=Number(params.get('size')||25),sort=params.get('sort')||'newest';
  if ((query && !/^[A-Z0-9_-]{1,32}$/.test(query)) || (status !== 'all' && !(COUPON_STATUSES as readonly string[]).includes(status)) || !Number.isInteger(page) || page < 1 || page > 500 || ![25,50].includes(size) || !['newest','oldest','name'].includes(sort)) return privateJson({ error: 'Invalid filters.' }, 400);
  try { return privateJson(await listWorkspaceCoupons(query, status, page,size,sort as 'newest'|'oldest'|'name',actor.id)); } catch (error) { return membershipFailure(error); }
}
export async function POST(request: Request) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  try {
    const admin = await getAuthorizedAdminSession();
    if (!admin) return privateJson({ error: 'Forbidden' }, 403);
    let raw: unknown;
    try { raw = await readJson(request, 4096); } catch { return privateJson({ error: 'Provide valid JSON smaller than 4 KB.' }, 400); }
    if (!object(raw) || Object.keys(raw).some(key => !['definition', 'requestKey'].includes(key)) || typeof raw.requestKey !== 'string' || !UUID.test(raw.requestKey)) return privateJson({ error: 'Invalid creation command.' }, 400);
    const definition = validateCouponDefinition(raw.definition);
    if (!definition) return privateJson({ error: 'Check the coupon definition, exact dates, discount and applicable plans.' }, 400);
    return privateJson({ coupon: await createWorkspaceCoupon(admin.id, definition, raw.requestKey) }, 201);
  } catch (error) { return membershipFailure(error); }
}
