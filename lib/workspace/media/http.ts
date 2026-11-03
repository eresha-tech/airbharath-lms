import 'server-only';
import { getWorkspaceUser } from '../eligibility/service';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { isSameOrigin, privateJson, readJson } from '../http';
import { MediaError, MEDIA_BODY_LIMIT, mediaId, displayName } from './model';
import { assetReceipt } from './service';
import { workspaceMedia, workspaceMediaUploads, workspaceMediaStorage, workspaceMediaProcessing } from './runtime';
import { inspectMedia } from './repository';
import { downloadable, resourceBytes } from './uploads';

export function mediaFailure(error: unknown) {
  const code = error instanceof MediaError ? error.code : 'unavailable';
  const statuses = { authentication: 401, forbidden: 403, not_found: 404, validation: 400, conflict: 409, limit: 409, expired: 410, not_ready: 409, object_missing: 409, verification: 422, too_large: 413, unavailable: 503 };
  const messages = { authentication: 'Please sign in again.', forbidden: 'Media access is unavailable for this account.', not_found: 'Media or course build not found.', validation: 'Check the media request fields and file limits.', conflict: 'Media changed. Reload its saved metadata before retrying.', limit: 'This lesson has reached its media limit.', expired: 'This upload intent expired. Create a new upload intent.', not_ready: 'This resource is not available for download or attachment.', object_missing: 'Upload is not present yet. Retry the conditional upload or finalize after it completes.', verification: 'The uploaded file could not be verified. Detach it and create a new upload intent.', too_large: 'This request is too large.', unavailable: 'Media storage is temporarily unavailable. Your saved course content is retained.' };
  return privateJson({ code, error: messages[code] }, statuses[code]);
}
function origin(request: Request) {
  if (!isSameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') throw new MediaError('forbidden');
}
function query(request: Request, key?: string) {
  const q = new URL(request.url).searchParams;
  if (!key) { if (q.size) throw new MediaError('validation'); return ''; }
  if ([...q.keys()].some(k => k !== key) || q.getAll(key).length !== 1) throw new MediaError('validation');
  return mediaId(q.get(key));
}
async function body(request: Request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new MediaError('validation');
  try { return await readJson(request, MEDIA_BODY_LIMIT); }
  catch (error) { throw new MediaError(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'too_large' : 'validation'); }
}
export function resourceResponse(result: { bytes: Uint8Array; displayName: string; mimeType: string }) {
  const name = displayName(result.displayName), ext = result.mimeType === 'application/pdf' ? 'pdf' : result.mimeType === 'image/png' ? 'png' : 'jpg';
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return new Response(new Uint8Array(result.bytes), { headers: {
    'Content-Type': 'application/octet-stream', 'Content-Length': String(result.bytes.byteLength),
    'Content-Disposition': `attachment; filename="resource.${ext}"; filename*=UTF-8''${encoded}`,
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox",
    'X-Frame-Options': 'DENY', 'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer', Vary: 'Cookie, Authorization',
  } });
}
type Action = 'collection' | 'asset' | 'upload' | 'finalize' | 'access' | 'process' | 'captions';
export async function mediaHttp(request: Request, action: Action, id?: string) {
  try {
    origin(request);
    const allowed = action === 'collection' ? ['GET', 'POST'] : action === 'asset' ? ['GET', 'PATCH'] : action === 'access' ? ['GET'] : ['POST'];
    if (!allowed.includes(request.method)) return privateJson({ error: 'Method not allowed.' }, 405);
    const user = await getWorkspaceUser(); if (!user) throw new MediaError('authentication');
    if (id) mediaId(id);
    if (action === 'collection' && request.method === 'GET') return privateJson(await workspaceMedia().list(user.id, query(request, 'lessonId')));
    query(request);
    if (action === 'asset' && request.method === 'GET') return privateJson(await workspaceMedia().read(user.id, id!));
    if (action === 'access') return resourceResponse(await workspaceMediaUploads().download(user.id, id!));
    const raw = await body(request);
    if (action === 'collection') { const result = await workspaceMediaUploads().intent(user.id, raw); return privateJson(result, result.created ? 201 : 200); }
    if (action === 'asset') return privateJson(await workspaceMedia().mutate(user.id, id!, raw));
    if (action === 'captions') { const result = await workspaceMediaUploads().captionIntent(user.id, id!, raw); return privateJson(result, result.created ? 201 : 200); }
    if (action === 'process') return privateJson(await workspaceMediaProcessing().request(user.id, id!, raw), 202);
    if (action === 'upload') return privateJson(await workspaceMediaUploads().authorize(user.id, id!, raw));
    return privateJson(await workspaceMediaUploads().finalize(user.id, id!, raw));
  } catch (error) { return mediaFailure(error); }
}
export async function adminMediaHttp(request: Request, projectId: string, assetId?: string) {
  try {
    origin(request); if (request.method !== 'GET') return privateJson({ error: 'Method not allowed.' }, 405);
    const admin = await getAuthorizedAdminSession(); if (!admin) throw new MediaError('forbidden');
    mediaId(projectId);
    if (!assetId) return privateJson({ assets: (await inspectMedia(admin.id, projectId, { lessonId: query(request, 'lessonId') })).map(assetReceipt) });
    query(request); mediaId(assetId);
    const [asset] = await inspectMedia(admin.id, projectId, { assetId }); downloadable(asset);
    const bytes = await resourceBytes(workspaceMediaStorage(), asset);
    const [current] = await inspectMedia(admin.id, projectId, { assetId }); downloadable(current);
    if (current.objectVersionId !== asset.objectVersionId || current.checksum !== asset.checksum) throw new MediaError('conflict');
    return resourceResponse({ bytes, displayName: current.displayName, mimeType: current.mimeType });
  } catch (error) { return mediaFailure(error); }
}

export async function deliveryHttp(request: Request, id: string, name: string, admin?: { id: string; project: string }) {
  try {
    origin(request); query(request); mediaId(id);
    const actor = admin ? { admin: admin.id, project: mediaId(admin.project) } : await (async () => { const user = await getWorkspaceUser(); if (!user) throw new MediaError('authentication'); return { creator: user.id }; })();
    const { privateMediaDelivery } = await import('./delivery');
    const base = admin ? `/api/admin/workspace/course-builds/${admin.project}/media/${id}/stream` : `/api/workspace/media/${id}/stream`;
    return await privateMediaDelivery(actor, id, name, base);
  } catch (error) { return mediaFailure(error); }
}
