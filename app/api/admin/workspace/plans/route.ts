import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { getCurrentPlans } from '@/lib/workspace/membership/service';
export async function GET() {
  if (!await getAuthorizedAdminSession()) return privateJson({ error: 'Forbidden' }, 403);
  try { return privateJson({ plans: await getCurrentPlans() }); }
  catch { return privateJson({ error: 'Plans are temporarily unavailable.' }, 503); }
}
