import { after } from 'next/server';
import { privateJson, readJson } from '@/lib/workspace/http';
import { validateSubmission } from '@/lib/workspace/eligibility/model';
import { EligibilityError, eligibilityReceipt, getWorkspaceUser, recoverSubmission, submitEligibility } from '@/lib/workspace/eligibility/service';
import { consumeEligibilityLimit } from '@/lib/workspace/eligibility/limiter';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { trackEligibilityDecision } from '@/lib/workspace/eligibility/analytics-server';

export async function POST(request: Request) {
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  try {
    const user = await getWorkspaceUser();
    if (!user) return privateJson({ error: 'Please sign in to complete the eligibility check.' }, 401);
    let payload: unknown;
    try { payload = await readJson(request, 16_384); } catch { return privateJson({ error: 'Provide valid JSON smaller than 16 KB.' }, 400); }
    const validated = validateSubmission(payload);
    if (!validated.success) return privateJson({ error: 'Please check your answers.', errors: validated.errors }, 400);
    // Only an owned, complete matching saved submission bypasses the new-write limiter.
    const prior = await recoverSubmission(user.id, validated.data);
    if (prior) return privateJson({ attempt: eligibilityReceipt(prior), created: false });
    const limit = await consumeEligibilityLimit(user.id, request);
    if (limit.status === 'unavailable') return privateJson({ error: 'Eligibility is temporarily unavailable. Your answers are still here.' }, 503);
    if (limit.status === 'limited') return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': String(limit.retryAfter) } });
    const result = await submitEligibility(user.id, validated.data);
    if (result.created) after(() => trackEligibilityDecision(result.attempt.id, result.attempt.result));
    return privateJson({ attempt: eligibilityReceipt(result.attempt), created: result.created }, result.created ? 201 : 200);
  } catch (error) {
    if (error instanceof EligibilityError) {
      if (error.code === 'conflict') return privateJson({ error: 'The form settings changed or this submission key has different answers. Reload to review the latest form.', code: 'conflict' }, 409);
      if (error.code === 'validation') return privateJson({ error: 'Please check your answers.', errors: error.fields }, 400);
      if (error.code === 'authentication') return privateJson({ error: 'Please sign in again.' }, 401);
    }
    return privateJson({ error: 'We could not confirm eligibility. Your answers are still here. Retry the same submission.' }, 503);
  }
}
