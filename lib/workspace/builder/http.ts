import { getWorkspaceUser } from '../eligibility/service';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { readJson, isSameOrigin, privateJson } from '../http';
import { BuildError, BUILDER_BODY_LIMIT, buildId } from './model';
import { workspaceBuilder, inspectBuild, inspectLesson } from './repository';
export function buildFailure(error: unknown) {
  if (!(error instanceof BuildError)) return privateJson({ error: 'Course Builder is temporarily unavailable. Your unsaved text is still here. Please try again.' }, 503);
  const messages = { authentication: 'Please sign in again.', forbidden: 'Creator access has changed. Your content is retained; editing is unavailable.', not_found: 'Course build or item not found.', not_approved: 'An approved course submission is required before building.', conflict: 'A newer version exists. Your text has not overwritten it. Copy your unsaved text, then reload to review the saved version.', validation: 'Check the fields. Titles and lesson content must be plain text.', too_large: 'This request is too large.', not_empty: 'This module contains lessons. Delete its lessons first.', limit: 'This course has reached its module or lesson limit.' };
  const statuses = { authentication: 401, forbidden: 403, not_found: 404, not_approved: 409, conflict: 409, validation: 400, too_large: 413, not_empty: 409, limit: 409 };
  return privateJson({ code: error.code, error: messages[error.code] }, statuses[error.code]);
}
function selected(request: Request) {
  const query = new URL(request.url).searchParams;
  if ([...query.keys()].some(k => !['moduleId', 'lessonId'].includes(k)) || query.getAll('moduleId').length > 1 || query.getAll('lessonId').length > 1) throw new BuildError('validation');
  if (!query.size) return null;
  return { moduleId: buildId(query.get('moduleId')), lessonId: buildId(query.get('lessonId')) };
}
export async function builderHttp(request: Request, draftId: string) {
  try {
    const edit = request.method !== 'GET'; if (edit && !isSameOrigin(request)) return privateJson({ error: 'This request is not allowed.' }, 403);
    const user = await getWorkspaceUser(); if (!user) throw new BuildError('authentication'); buildId(draftId);
    const service = workspaceBuilder();
    if (!edit) { const selection = selected(request); return privateJson(selection ? { lesson: await service.lesson(user.id, draftId, selection.moduleId, selection.lessonId) } : { tree: await service.read(user.id, draftId) }); }
    let body: unknown; try { body = await readJson(request, BUILDER_BODY_LIMIT); } catch (error) { throw new BuildError(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'too_large' : 'validation'); }
    if (request.method === 'POST') { const result = await service.start(user.id, draftId, body); return privateJson(result, result.created ? 201 : 200); }
    if (request.method === 'PATCH') return privateJson({ tree: await service.mutate(user.id, draftId, body) });
    return privateJson({ error: 'Method not allowed.' }, 405);
  } catch (error) { return buildFailure(error); }
}
export async function adminBuilderHttp(request: Request, projectId: string) {
  try {
    const admin = await getAuthorizedAdminSession(); if (!admin) throw new BuildError('forbidden'); buildId(projectId);
    const selection = selected(request);
    return privateJson(selection ? { lesson: await inspectLesson(admin.id, projectId, selection.moduleId, selection.lessonId) } : { tree: await inspectBuild(admin.id, projectId) });
  } catch (error) { return buildFailure(error); }
}
