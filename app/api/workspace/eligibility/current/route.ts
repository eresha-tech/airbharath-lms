import { privateJson } from '@/lib/workspace/http';
import { getWorkspaceUser, getWorkspaceJourneyState } from '@/lib/workspace/eligibility/service';
export async function GET() {
  try {
    const user = await getWorkspaceUser();
    if (!user) return privateJson({ error: 'Please sign in.' }, 401);
    return privateJson(await getWorkspaceJourneyState(user.id));
  } catch { return privateJson({ error: 'Your eligibility is temporarily unavailable.' }, 503); }
}
