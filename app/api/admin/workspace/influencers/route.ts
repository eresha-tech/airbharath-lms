import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { object, UUID } from '@/lib/workspace/eligibility/model';
import { listInfluencers, saveInfluencer } from '@/lib/workspace/membership/influencers';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function GET(request: Request) {
  const actor = await getAuthorizedAdminSession();
  if (!actor) return privateJson({ error: 'Forbidden' }, 403);
  const params=new URL(request.url).searchParams,q=(params.get('q')||'').trim(),page=Number(params.get('page')||1),size=Number(params.get('size')||25),status=params.get('status')||'all';
  if(q.length>120||!Number.isInteger(page)||page<1||page>500||![25,50].includes(size)||!['all','active','inactive'].includes(status))return privateJson({error:'Invalid filters.'},400);
  try { const rows=await listInfluencers(actor.id,q,page,size,status);return privateJson({ influencers:rows.slice(0,size),hasNext:rows.length>size,page,size }); } catch (e) { return membershipFailure(e); }
}
async function command(request: Request, edit: boolean, actor: { id: string } | null) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  if (!actor) return privateJson({ error: 'Forbidden' }, 403);
  let raw: unknown;
  try { raw = await readJson(request, 4096); } catch { return privateJson({ error: 'Invalid JSON.' }, 400); }
  if (!object(raw) || Object.keys(raw).some(k => !['id', 'definition', 'expectedVersion'].includes(k)) || typeof raw.id !== 'string' || !UUID.test(raw.id) || (edit ? typeof raw.expectedVersion !== 'number' : raw.expectedVersion !== undefined)) return privateJson({ error: 'Invalid influencer command.' }, 400);
  try { const row = await saveInfluencer(actor.id, raw.id, raw.definition, raw.expectedVersion as number | undefined); return privateJson({ influencer: { id: row.id, displayName: row.displayName, description: row.description, status: row.status, version: row.version } }, edit ? 200 : 201); } catch (e) { return membershipFailure(e); }
}
export async function POST(request: Request) { return command(request, false, await getAuthorizedAdminSession()); }
export async function PATCH(request: Request) { return command(request, true, await getAuthorizedAdminSession()); }
