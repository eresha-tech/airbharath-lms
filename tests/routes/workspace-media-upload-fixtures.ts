import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import type { CreatorContext } from '@/lib/workspace/creator/service';
import { mediaService, type Asset, type MediaLesson, type MediaStore, type MediaJob } from '@/lib/workspace/media/service';
import { mediaUploads } from '@/lib/workspace/media/uploads';
import { MediaError } from '@/lib/workspace/media/model';
import type { MediaStorage, ObjectInspection } from '@/lib/workspace/media/provider';
import { evidence, owner, other, key, profileId, now } from './workspace-creator-fixtures';

export const checksum = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const mp4 = new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);
export function uploadFixture() {
  const state = { rows: [] as Asset[], jobs: [] as MediaJob[], lesson: { id: key, projectId: profileId, userId: owner, mediaRevision: 0 } as MediaLesson, clock: now,
    context: { user: { id: owner, fullName: 'Synthetic' }, profileId, evidence: structuredClone(evidence), financialReview: false, planName: null } as CreatorContext,
    inTransaction: false, providerCalls: 0, onProvider: () => {}, object: { versionId: 'source-v1', checksum: checksum(mp4), prefix: mp4 } as ObjectInspection,
    downloaded: mp4 as Uint8Array, failure: undefined as unknown, storeFailure: false };
  const transactionContext = new AsyncLocalStorage<boolean>();
  let tail = Promise.resolve();
  const store: MediaStore = { transaction: (actor, ref, work) => {
    const task = tail.then(async () => {
      const id = 'lessonId' in ref ? ref.lessonId : 'projectId' in ref ? undefined : state.rows.find(a => a.id === ref.assetId)?.lessonId;
      if (actor !== owner || id !== key) throw new MediaError('not_found');
      const before = structuredClone({ rows: state.rows, jobs: state.jobs, lesson: state.lesson }); state.inTransaction = true;
      try { return await transactionContext.run(true, () => work({ processing: { read: async () => structuredClone(state.jobs.find(j => 'assetId' in ref && j.assetId === ref.assetId) || null), create: async j => { state.jobs.push(structuredClone(j)); return structuredClone(j); }, update: async (j,p) => { const row=state.jobs.find(r => r.id===j.id)!; Object.assign(row,p); return structuredClone(row); } }, context: state.context, lesson: async () => structuredClone(state.lesson), assets: async () => structuredClone(state.rows), request: async requestKey => structuredClone(state.rows.find(a => a.requestKey === requestKey) || null),
        create: async a => { state.rows.push(structuredClone(a)); state.lesson.mediaRevision++; return structuredClone(a); },
        update: async (a, patch) => { if (state.storeFailure) throw new Error('rollback'); const row = state.rows.find(r => r.id === a.id && r.version === a.version); if (!row) throw new MediaError('conflict'); Object.assign(row, patch, { version: row.version + 1 }); state.lesson.mediaRevision++; return structuredClone(row); },
      })); } catch (e) { state.rows = before.rows; state.jobs = before.jobs; state.lesson = before.lesson; throw e; } finally { state.inTransaction = false; }
    }); tail = task.then(() => undefined, () => undefined); return task;
  } };
  const external = () => { if (transactionContext.getStore()) throw new Error('provider called inside database transaction'); state.providerCalls++; state.onProvider(); if (state.failure) throw state.failure; };
  const provider: MediaStorage = { identity: { provider: 's3', container: 'synthetic-private', accountId: '123456789012' },
    authorize: async (_a, _hash, ttl) => { external(); return { url: 'https://uploads.invalid/temporary?signature=synthetic', method: 'PUT', headers: {}, expiresAt: new Date(state.clock.getTime() + ttl * 1000).toISOString() }; },
    inspect: async () => { external(); return structuredClone(state.object); }, download: async () => { external(); return state.downloaded; } };
  const uploads = mediaUploads(store, 'test', () => state.clock, provider), domain = mediaService(store, 'test', () => state.clock, provider.identity);
  const intent = (change = {}) => ({ lessonId: key, assetKind: 'video', filename: 'lesson.mp4', mimeType: 'video/mp4', byteSize: mp4.length, requestKey: randomUUID(), expectedMediaRevision: state.lesson.mediaRevision, ...change });
  const reserve = async (change = {}) => uploads.intent(owner, intent(change));
  const mutate = (id: string, action: string, change = {}) => domain.mutate(owner, id, { action, expectedVersion: state.rows.find(a => a.id === id)!.version, expectedMediaRevision: state.lesson.mediaRevision, ...change });
  return { state, store, provider, uploads, domain, intent, reserve, mutate, owner, other, key };
}
