import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { workspaceCourseAssets } from '@/lib/db/schema';
import { privateJson, readJson } from '@/lib/workspace/http';
import { mediaWorkerAuthorized } from '@/lib/workspace/media/worker';
import { workspaceMediaProcessing } from '@/lib/workspace/media/runtime';
import { mediaFailure } from '@/lib/workspace/media/http';
import { mediaId, MediaError } from '@/lib/workspace/media/model';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export async function POST(request: Request) {
  if (!mediaWorkerAuthorized(request)) return privateJson({ error: 'Unauthorized' }, 401);
  try {
    let body: Record<string, unknown>;
    try { body = await readJson(request, 8192) as Record<string, unknown>; }
    catch(error) { throw new MediaError(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'too_large' : 'validation'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !['assetId', 'jobId'].includes(k)) || typeof body.jobId !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(body.jobId)) throw new MediaError('validation');
    const id = mediaId(body.assetId), [asset] = await db.select({ actor: workspaceCourseAssets.userId }).from(workspaceCourseAssets).where(eq(workspaceCourseAssets.id, id));
    if (!asset) throw new MediaError('not_found');
    await workspaceMediaProcessing().reconcile(asset.actor, id, body.jobId);
    return privateJson({ received: true });
  } catch (error) { return mediaFailure(error); }
}
