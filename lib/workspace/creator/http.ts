import { getWorkspaceUser } from '../eligibility/service';
import { UUID } from '../eligibility/model';
import { isSameOrigin, privateJson, readJson } from '../http';
import { CreatorError, parseCommand } from './model';
import { workspaceContent } from './repository';
import type { Draft, ProfileDetails } from './service';
export function draftReceipt(draft: Draft) {
  const { id, title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise, currency, status, version, createdAt, updatedAt } = draft;
  return { id, title, category, description, targetLearner, learningOutcomes, outline, tentativePricePaise, currency, status, version, createdAt, updatedAt };
}
export function profileReceipt(profile: ProfileDetails | null) {
  if (!profile) return null;
  const { displayName, professionalHeadline, shortBio, primaryAviationCategory, professionalProfileUrl, version } = profile;
  return { displayName, professionalHeadline, shortBio, primaryAviationCategory, professionalProfileUrl, version };
}
export function pageNumber(value: string | null | undefined) {
  if (value && !/^[1-9]\d{0,3}$/.test(value)) throw new CreatorError('validation');
  const page = Number(value || 1); if (page > 500) throw new CreatorError('validation'); return page;
}
export async function creatorHttp(request: Request, action: 'list' | 'read' | 'create' | 'update' | 'profileRead' | 'profileSave', id?: string) {
  try {
    const edit = ['create', 'update', 'profileSave'].includes(action);
    if (edit && !isSameOrigin(request)) return privateJson({ error: 'This request is not allowed.' }, 403);
    const user = await getWorkspaceUser(); if (!user) throw new CreatorError('authentication');
    if (['read', 'update'].includes(action) && (!id || !UUID.test(id))) throw new CreatorError('not_found');
    const service = workspaceContent();
    if (action === 'read') return privateJson({ draft: draftReceipt(await service.read(user.id, id!)) });
    if (action === 'list' || action === 'profileRead') {
      const state = await service.overview(user.id, pageNumber(new URL(request.url).searchParams.get('page')));
      return privateJson(action === 'list' ? { drafts: state.drafts.map(draftReceipt), total: state.total, hasNext: state.hasNext, canEditWorkspace: state.capabilities.canEditWorkspace } : { profile: profileReceipt(state.details), canEditWorkspace: state.capabilities.canEditWorkspace });
    }
    let body: unknown;
    try { body = await readJson(request, 196_608); } catch (error) { throw new CreatorError(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'too_large' : 'validation'); }
    const command = parseCommand(body, action === 'create' ? 'create' : action === 'profileSave' ? 'profile' : 'update');
    if (action === 'profileSave') return privateJson({ profile: profileReceipt(await service.saveProfile(user.id, command.expectedVersion!, command.content)) });
    const draft = action === 'create' ? await service.create(user.id, command.requestKey!, command.content) : await service.update(user.id, id!, command.expectedVersion!, command.content);
    return privateJson({ draft: draftReceipt(draft) });
  } catch (error) {
    if (error instanceof CreatorError) {
      const status = { authentication: 401, restricted: 403, not_found: 404, validation: 400, conflict: 409, review_locked: 409, too_large: 413 }[error.code];
      return privateJson({ code: error.code, error: error.code === 'review_locked' ? 'This course draft is read-only while its review is open or approved.' : error.code === 'conflict' ? 'A newer version exists or this request was already used. Your changes have not overwritten it. Reload to review the saved version.' : error.code === 'restricted' ? 'Workspace editing or viewing is unavailable for your current membership. Your content is retained.' : error.code === 'not_found' ? 'Draft not found.' : error.code === 'validation' ? 'Check the fields and try again.' : error.code === 'too_large' ? 'This request is too large.' : 'Please sign in again.', fields: error.fields }, status);
    }
    return privateJson({ error: 'Workspace is temporarily unavailable. Your answers are still here. Please try again.' }, 503);
  }
}
