import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { workspaceCourseAssets as assets, workspaceMediaJobs as jobs } from '@/lib/db/schema';
import { workspaceMediaProcessing } from './runtime';
export function mediaWorkerAuthorized(request: Request, env: Record<string, string | undefined> = process.env) {
  const secret = env.WORKSPACE_MEDIA_WORKER_SECRET, supplied = request.headers.get('authorization') || '';
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
export async function runMediaWorker() {
  const rows = await db.select({ actor: assets.userId, id: assets.id, state: jobs.state, providerJobId: jobs.providerJobId }).from(jobs).innerJoin(assets, eq(jobs.assetId, assets.id)).where(and(eq(assets.status, 'processing'), inArray(jobs.state, ['queued', 'submitted']))).orderBy(asc(jobs.updatedAt)).limit(3);
  let dispatched = 0, reconciled = 0, deferred = 0;
  const service = workspaceMediaProcessing();
  for (const row of rows) {
    try {
      if (row.state === 'queued') { await service.dispatch(row.actor, row.id); dispatched++; }
      else if (row.providerJobId) { await service.reconcile(row.actor, row.id); reconciled++; }
      else deferred++; // Ambiguous dispatch requires its authenticated job callback.
    } catch {
      deferred++;
      // Rotate denied/transient rows so one revoked owner cannot starve the queue.
      await db.update(jobs).set({updatedAt:new Date()}).where(and(eq(jobs.assetId,row.id),eq(jobs.state,row.state))).catch(() => undefined);
    } // Counts only; never log private metadata/provider exceptions.
  }
  const [attention] = await db.select({ uncertainDispatches:sql<number>`count(*) filter (where ${jobs.state} in ('dispatching','uncertain'))::int`, detachedJobs:sql<number>`count(*) filter (where ${assets.status}='detached' and ${jobs.state} not in ('complete','failed'))::int` }).from(jobs).innerJoin(assets,eq(jobs.assetId,assets.id));
  const [abandoned] = await db.select({ expiredUploadIntents:sql<number>`count(*) filter (where ${assets.status}='pending_upload' and ${assets.expiresAt}<=now())::int` }).from(assets);
  return { attention:{...attention,...abandoned}, examined: rows.length, dispatched, reconciled, deferred };
}
