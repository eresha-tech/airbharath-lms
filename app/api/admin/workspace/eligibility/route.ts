import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { listEligibilityAttempts, parseAdminList } from '@/lib/workspace/eligibility/service';
export async function GET(request: Request) {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ error: 'Forbidden' }, 403);
  const input = parseAdminList(new URL(request.url));
  if (!input) return privateJson({ error: 'Invalid filter or page.' }, 400);
  try { return privateJson(await listEligibilityAttempts(input.filter, input.page)); }
  catch { return privateJson({ error: 'Eligibility history is temporarily unavailable.' }, 503); }
}
