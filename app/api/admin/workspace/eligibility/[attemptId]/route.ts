import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson } from '@/lib/workspace/http';
import { UUID } from '@/lib/workspace/eligibility/model';
import { getAdminEligibilityAttempt } from '@/lib/workspace/eligibility/service';
export async function GET(_request: Request, context: { params: Promise<{ attemptId: string }> }) {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ error: 'Forbidden' }, 403);
  const { attemptId } = await context.params;
  if (!UUID.test(attemptId)) return privateJson({ error: 'Invalid attempt identifier.' }, 400);
  try {
    const row = await getAdminEligibilityAttempt(attemptId);
    return row ? privateJson(row) : privateJson({ error: 'Attempt not found.' }, 404);
  } catch { return privateJson({ error: 'This attempt is temporarily unavailable.' }, 503); }
}
