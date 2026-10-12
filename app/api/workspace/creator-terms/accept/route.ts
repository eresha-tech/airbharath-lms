import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { privateJson, readJson } from '@/lib/workspace/http';
import { CreatorTermsError } from '@/lib/workspace/terms/model';
import { createCreatorTermsService } from '@/lib/workspace/terms/service';
import { postgresCreatorTermsStore } from '@/lib/workspace/terms/repository';

export async function POST(request: Request) {
  try {
    if (!eligibilitySameOrigin(request)) throw new CreatorTermsError('forbidden');
    const user = await getWorkspaceUser();
    if (!user) throw new CreatorTermsError('authentication');
    let raw: unknown;
    try { raw = await readJson(request, 512); } catch { throw new CreatorTermsError('validation'); }
    const row = await createCreatorTermsService(postgresCreatorTermsStore).accept(user.id, raw, request.headers.get('if-match'));
    return privateJson({ acceptance: { termsVersion: row.termsVersion, termsContentHash: row.termsContentHash, acceptedAt: row.acceptedAt.toISOString() } });
  } catch (error) {
    const code = error instanceof CreatorTermsError ? error.code : 'unavailable';
    const messages = { validation: 'Explicitly agree to the Creator Terms using the agreement control.', authentication: 'Please sign in again.', forbidden: 'Forbidden', terms_changed: 'The Creator Terms changed. Reload this page and review the current version before agreeing.', unavailable: 'Your agreement could not be recorded. Please try again. No payment was started.' };
    return privateJson({ code, error: messages[code] }, code === 'authentication' ? 401 : code === 'forbidden' ? 403 : code === 'validation' ? 400 : code === 'terms_changed' ? 409 : 503);
  }
}
