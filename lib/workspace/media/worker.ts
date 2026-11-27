import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { workspaceCourseAssets as assets, workspaceMediaJobs as jobs } from '@/lib/db/schema';
import { workspaceMediaProcessing } from './runtime';
import {createPostgresMediaStore} from './repository';
import {createFinancialWorkerDatabase} from '../payments/worker-database';
export function mediaWorkerAuthorized(request: Request, env: Record<string, string | undefined> = process.env) {
  const secret = env.WORKSPACE_MEDIA_WORKER_SECRET, supplied = request.headers.get('authorization') || '';
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
export async function runMediaWorker() {
 const target=createFinancialWorkerDatabase(process.env,'workspace_media_worker'),database=target.db,signal=AbortSignal.timeout(230000);
 const cancel=()=>{void target.close().catch(()=>undefined);};signal.addEventListener('abort',cancel,{once:true});
 try {
  const rows = await database.select({ actor: assets.userId, id: assets.id, state: jobs.state, providerJobId: jobs.providerJobId }).from(jobs).innerJoin(assets, eq(jobs.assetId, assets.id)).where(and(eq(assets.status, 'processing'), inArray(jobs.state, ['queued', 'submitted']))).orderBy(asc(jobs.updatedAt)).limit(3);
  let dispatched = 0, reconciled = 0, deferred = 0;
  const deadline=Date.now()+240_000;
  const service = workspaceMediaProcessing(createPostgresMediaStore(database));
  for (const [index,row] of rows.entries()) {
    if(Date.now()>deadline-60_000){deferred+=rows.length-index;break;}
    try {
      if (row.state === 'queued') { await service.dispatch(row.actor, row.id); dispatched++; }
      else if (row.providerJobId) { await service.reconcile(row.actor, row.id); reconciled++; }
      else deferred++; // Ambiguous dispatch requires its authenticated job callback.
    } catch {
      deferred++;
      // Rotate denied/transient rows so one revoked owner cannot starve the queue.
      await database.update(jobs).set({updatedAt:new Date()}).where(and(eq(jobs.assetId,row.id),eq(jobs.state,row.state))).catch(() => undefined);
    } // Counts only; never log private metadata/provider exceptions.
  }
  const [attention] = await database.select({ uncertainDispatches:sql<number>`count(*) filter (where ${jobs.state} in ('dispatching','uncertain'))::int`, detachedJobs:sql<number>`count(*) filter (where ${assets.status}='detached' and ${jobs.state} not in ('complete','failed'))::int` }).from(jobs).innerJoin(assets,eq(jobs.assetId,assets.id));
  const [abandoned] = await database.select({ expiredUploadIntents:sql<number>`count(*) filter (where ${assets.status}='pending_upload' and ${assets.expiresAt}<=now())::int` }).from(assets);
  return { attention:{...attention,...abandoned}, examined: rows.length, dispatched, reconciled, deferred };
 } finally {signal.removeEventListener('abort',cancel);await target.close();}
}
