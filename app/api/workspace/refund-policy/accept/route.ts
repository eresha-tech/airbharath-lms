import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { privateJson, readJson } from '@/lib/workspace/http';
import { RefundPolicyError } from '@/lib/workspace/refund-policy/model';
import { createRefundPolicyService } from '@/lib/workspace/refund-policy/service';
import { postgresRefundPolicyStore } from '@/lib/workspace/refund-policy/repository';

export async function POST(request: Request) {
  try {
    if (!eligibilitySameOrigin(request)) throw new RefundPolicyError('forbidden');
    const user = await getWorkspaceUser();
    if (!user) throw new RefundPolicyError('authentication');
    let raw: unknown;
    try { raw = await readJson(request, 512); } catch { throw new RefundPolicyError('validation'); }
    const row = await createRefundPolicyService(postgresRefundPolicyStore).accept(user.id, raw, request.headers.get('if-match'));
    return privateJson({ acceptance: { policyVersion: row.policyVersion, policyContentHash: row.policyContentHash, acceptedAt: row.acceptedAt.toISOString() } });
  } catch (error) {
    const code = error instanceof RefundPolicyError ? error.code : 'unavailable';
    const messages = { validation: 'Explicitly agree to the Refund Policy using the agreement control.', authentication: 'Please sign in again.', forbidden: 'Forbidden', policy_changed: 'The Refund Policy changed. Reload this page and review the current version before agreeing.', unavailable: 'Your agreement could not be recorded. Please try again. No payment was started.' };
    return privateJson({ code, error: messages[code] }, code === 'authentication' ? 401 : code === 'forbidden' ? 403 : code === 'validation' ? 400 : code === 'policy_changed' ? 409 : 503);
  }
}
