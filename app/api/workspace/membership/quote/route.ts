import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { privateJson, readJson } from '@/lib/workspace/http';
import { parseQuoteInput } from '@/lib/workspace/membership/model';
import { getWorkspaceMembershipQuote } from '@/lib/workspace/membership/service';
import { membershipFailure } from '@/lib/workspace/membership/http';
export async function POST(request: Request) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  try {
    const user = await getWorkspaceUser();
    if (!user) return privateJson({ error: 'Please sign in to preview a plan.' }, 401);
    let raw: unknown;
    try { raw = await readJson(request, 2048); } catch { return privateJson({ error: 'Provide valid JSON smaller than 2 KB.' }, 400); }
    const input = parseQuoteInput(raw);
    if (!input) return privateJson({ code: 'validation', error: 'Choose a valid plan version and a coupon code of 3–32 letters, numbers, hyphens or underscores. Do not include price, tax or account fields.' }, 400);
    return privateJson({ quote: await getWorkspaceMembershipQuote(user.id, input) });
  } catch (error) { return membershipFailure(error); }
}
