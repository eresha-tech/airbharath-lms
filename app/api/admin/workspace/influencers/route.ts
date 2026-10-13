import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { object, UUID } from '@/lib/workspace/eligibility/model';
import { listInfluencers, saveInfluencer } from '@/lib/workspace/membership/influencers';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function GET() {
  const actor = await getAuthorizedAdminSession();
  if (!actor) return privateJson({ error: 'Forbidden' }, 403);
  try { return privateJson({ influencers: await listInfluencers(actor.id) }); } catch (e) { return membershipFailure(e); }
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
