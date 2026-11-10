import 'server-only';
import { randomUUID } from 'node:crypto';
import { MediaError, emptyMediaCommand } from './model';
import { assetReceipt, mediaTransaction, type Asset, type MediaStore, type MediaTransaction, type MediaJob } from './service';
import { VIDEO_VERIFICATION_POLICY } from './verification';
import { VERIFICATION_PASS_MS, type VerificationPass } from './verification-checkpoint';

export const PROCESSING_POLICY = 'workspace-hls-h264-aac-v1';
export type ProcessingResult = { status: 'pending' } | { status: 'failed' } | { status: 'complete'; manifest: NonNullable<MediaJob['manifest']> };
export interface MediaProcessor {
  dispatch(asset: Asset, job: MediaJob): Promise<string>;
  inspect(asset: Asset, job: MediaJob, providerJobId: string, pass?: VerificationPass): Promise<ProcessingResult>;
}
// Shared atomic outbox insertion used by upload verification and explicit recovery.
export async function enqueueVerifiedVideo(tx: MediaTransaction, a: Asset, now: Date) {
  const jobs=tx.processing; if(!jobs) throw new MediaError('unavailable');
  const existing=await jobs.read(); if(existing) return a;
  if(a.assetKind!=='video'||a.status!=='verified'||!a.objectVersionId||a.verificationPolicy!==VIDEO_VERIFICATION_POLICY)throw new MediaError('not_ready');
  const job:MediaJob={id:randomUUID(),assetId:a.id,state:'queued',sourceVersion:a.objectVersionId,policy:PROCESSING_POLICY,providerJobId:null,dispatchedAt:null,manifest:null,createdAt:now,updatedAt:now};
  await jobs.create(job);
  return tx.update(a,{status:'processing',processingJobId:job.id,processingSourceVersion:job.sourceVersion,processingPolicy:job.policy,updatedAt:now});
}
export function mediaProcessing(store: MediaStore, environment: string | undefined, clock = () => new Date(), provider?: MediaProcessor) {
  const run = <T>(actor: string, id: string, work: (tx: MediaTransaction, permit: () => Date) => Promise<T>) => mediaTransaction(store, environment, clock, actor, { assetId: id }, true, work);
  const observe = <T>(actor: string, id: string, work: (tx: MediaTransaction, permit: () => Date) => Promise<T>) => mediaTransaction(store, environment, clock, actor, { assetId: id }, false, work);
  async function selected(tx: MediaTransaction, id: string) { const a = (await tx.assets()).find(a => a.id === id); if (!a) throw new MediaError('not_found'); return a; }
  const processor = () => { if (!provider) throw new MediaError('unavailable'); return provider; };
  const outbox = (tx: MediaTransaction) => { if (!tx.processing) throw new MediaError('unavailable'); return tx.processing; };
  return {
    request: async (actor: string, id: string, raw: unknown) => {
      emptyMediaCommand(raw); processor();
      // A persisted queued job is the dispatch intent. A concurrent request can never
      // create a second job, even if the first HTTP request dies after committing.
      return run(actor, id, async (tx, permit) => {
        const a=await selected(tx,id),current=await enqueueVerifiedVideo(tx,a,permit());
        return {asset:assetReceipt(current),mediaRevision:(await tx.lesson()).mediaRevision};
      });
    },
    dispatch: async (actor: string, id: string) => {
      processor(); // Refuse missing provider configuration before claiming a dispatch intent.
      const claimed = await observe(actor, id, async (tx, permit) => {
        const a = await selected(tx, id), jobs = outbox(tx), j = await jobs.read();
        if (!j || a.status !== 'processing' || j.state !== 'queued') return null;
        const now = permit(); return { asset: a, job: await jobs.update(j, { state: 'dispatching', dispatchedAt: now, updatedAt: now }) };
      });
      if (!claimed) return;
      // Never redispatch an ambiguous CreateJob after MediaConvert's short token
      // deduplication window. The authenticated callback can recover its exact ID.
      let externalId: string;
      try { externalId = await processor().dispatch(claimed.asset, claimed.job); }
      catch {
        await observe(actor, id, async (tx, permit) => { const jobs = outbox(tx), j = await jobs.read(); if (j?.state === 'dispatching') await jobs.update(j, { state: 'uncertain', updatedAt: permit() }); });
        throw new MediaError('unavailable');
      }
      await observe(actor, id, async (tx, permit) => {
        const jobs = outbox(tx), j = await jobs.read(), a = await selected(tx, id);
        if (!j || a.status !== 'processing' || !['dispatching', 'uncertain'].includes(j.state)) return;
        await jobs.update(j, { state: 'submitted', providerJobId: externalId, updatedAt: permit() });
      });
    },
    reconcile: async (actor: string, id: string, callbackId?: string) => {
      const prior = await observe(actor, id, async tx => {
        const asset = await selected(tx, id), job = await outbox(tx).read();
        if (!job || asset.status !== 'processing' || ['complete', 'failed'].includes(job.state)) return null;
        const externalId = callbackId || job.providerJobId;
        if (!externalId || !/^[a-zA-Z0-9-]{1,100}$/.test(externalId) || job.providerJobId && job.providerJobId !== externalId) throw new MediaError('conflict');
        const checkpoint = await tx.processing?.checkpoint?.(job.id) ?? null;
        return { asset, job, externalId, checkpoint };
      });
      if (!prior) return;
      let checkpoint = prior.checkpoint;
      const signal = AbortSignal.timeout(VERIFICATION_PASS_MS);
      const pass: VerificationPass = {
        checkpoint, signal,
        save: async progress => {
          checkpoint = await observe(actor, id, async tx => {
            if (!tx.processing?.saveCheckpoint) throw new MediaError('unavailable');
            const job = await tx.processing.read();
            if (!job || job.id !== prior.job.id || job.state === 'complete' || job.state === 'failed') throw new MediaError('conflict');
            return tx.processing.saveCheckpoint(job, prior.externalId, checkpoint?.version ?? 0, progress);
          });
        },
      };
      // Legacy in-memory fixtures need not implement checkpoints. Shipping Postgres
      // always does; the real provider refuses unbounded output verification.
      const result = await processor().inspect(prior.asset, prior.job, prior.externalId, pass);
      await observe(actor, id, async (tx, permit) => {
        const asset = await selected(tx, id), jobs = outbox(tx), job = await jobs.read();
        if (!job || job.id !== prior.job.id || asset.status !== 'processing' || ['complete', 'failed'].includes(job.state)) return;
        if (job.providerJobId && job.providerJobId !== prior.externalId || job.sourceVersion !== asset.objectVersionId || job.id !== asset.processingJobId) throw new MediaError('conflict');
        const now = permit();
        if (result.status === 'pending') { await jobs.update(job, { state: 'submitted', providerJobId: prior.externalId, updatedAt: now }); return; }
        if (result.status === 'failed') {
          await jobs.update(job, { state: 'failed', providerJobId: prior.externalId, updatedAt: now });
          await tx.update(asset, { status: 'failed', updatedAt: now }); return;
        }
        const master = result.manifest['master.m3u8'];
        if (!master || !master.version || master.version === 'null' || Object.keys(result.manifest).length < 3) throw new MediaError('verification');
        await jobs.update(job, { state: 'complete', providerJobId: prior.externalId, manifest: result.manifest, updatedAt: now });
        await tx.update(asset, { status: 'ready', outputKey: `workspace/${asset.creatorProfileId}/${asset.projectId}/${asset.id}/processed/master.m3u8`, outputVersionId: master.version, readyAt: now, updatedAt: now });
        // Selecting the new ready attachment remains an explicit, versioned action.
      });
    },
  };
}
