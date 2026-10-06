import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { privateJson, readJson } from '@/lib/workspace/http';
import { UUID, object, validateSettings } from '@/lib/workspace/eligibility/model';
import { EligibilityError, getEligibilityFormConfig, publishSettings } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
export async function GET() {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ error: 'Forbidden' }, 403);
  try { return privateJson(await getEligibilityFormConfig()); }
  catch { return privateJson({ error: 'Settings are temporarily unavailable.' }, 503); }
}
export async function POST(request: Request) {
  const admin = await getAuthorizedAdminSession();
  if (!admin) return privateJson({ error: 'Forbidden' }, 403);
  if (!eligibilitySameOrigin(request)) return privateJson({ error: 'Request origin is not allowed.' }, 403);
  let input: unknown;
  try { input = await readJson(request, 8192); } catch { return privateJson({ error: 'Provide valid JSON smaller than 8 KB.' }, 400); }
  if (!object(input) || Object.keys(input).some(key => !['expectedSettingsId', 'requestKey', 'config'].includes(key)) ||
    typeof input.expectedSettingsId !== 'string' || !UUID.test(input.expectedSettingsId) || typeof input.requestKey !== 'string' || !UUID.test(input.requestKey)) return privateJson({ error: 'Invalid publication request.' }, 400);
  const config = validateSettings(input.config);
  if (!config) return privateJson({ error: 'Check the bounded settings values and launch timestamp.' }, 400);
  try { return privateJson({ settings: await publishSettings(admin.id, { expectedSettingsId: input.expectedSettingsId, requestKey: input.requestKey, config }) }, 201); }
  catch (error) {
    if (error instanceof EligibilityError && error.code === 'authentication') return privateJson({ error: 'Forbidden' }, 403);
    if (error instanceof EligibilityError && error.code === 'conflict') return privateJson({ error: 'Another publication or changed request conflicts with this version. Reload before publishing.', code: 'conflict' }, 409);
    return privateJson({ error: 'Publication could not be confirmed. Retry the same request or reload to check the current version.' }, 503);
  }
}
