import { beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mediaService, type Asset, type MediaLesson, type MediaStore } from '@/lib/workspace/media/service';
import { MediaError } from '@/lib/workspace/media/model';
import type { CreatorContext } from '@/lib/workspace/creator/service';
import { evidence, now, owner, other, key, profileId } from './workspace-creator-fixtures';

const copy = <T>(v: T): T => structuredClone(v);
let rows: Asset[], lessons: MediaLesson[], context: CreatorContext, clock: Date, store: MediaStore;
let afterRead: (() => void) | undefined, failUpdate: boolean;
beforeEach(() => {
  rows = []; lessons = [key, other].map(id => ({ id, projectId: profileId, userId: owner, mediaRevision: 0 })); clock = now; afterRead = undefined; failUpdate = false;
  context = { user: { id: owner, fullName: 'Synthetic' }, profileId, evidence: copy(evidence), financialReview: false, planName: null };
  let tail = Promise.resolve();
  store = { transaction: (actor, reference, work) => {
    const result = tail.then(async () => {
      if (actor !== owner) throw new MediaError('not_found');
      const lessonId = 'lessonId' in reference ? reference.lessonId : 'projectId' in reference ? undefined : rows.find(r => r.id === reference.assetId)?.lessonId;
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) throw new MediaError('not_found');
      const before = copy({ rows, lessons });
      const scoped = () => rows.filter(r => r.lessonId === lesson.id);
      try { return await work({ context,
        lesson: async () => copy(lesson),
        assets: async () => { const result = copy(scoped()); afterRead?.(); return result; },
        request: async requestKey => copy(rows.find(r => r.requestKey === requestKey) || null),
        create: async row => { rows.push(copy(row)); lesson.mediaRevision++; return copy(row); },
        update: async (asset, patch) => { if (failUpdate) throw new Error('synthetic failure'); const row = scoped().find(r => r.id === asset.id && r.version === asset.version); if (!row) throw new MediaError('conflict'); Object.assign(row, patch, { version: row.version + 1 }); lesson.mediaRevision++; return copy(row); },
      }); } catch (error) { rows = before.rows; lessons = before.lessons; throw error; }
    }); tail = result.then(() => undefined, () => undefined); return result;
  } };
});
const service = () => mediaService(store, 'test', () => clock, { provider: 's3', container: 'synthetic-private', accountId: '123456789012' });
const intent = (change = {}) => ({ lessonId: key, assetKind: 'video', filename: 'lesson.mp4', mimeType: 'video/mp4', byteSize: 1024, requestKey: randomUUID(), expectedMediaRevision: lessons[0].mediaRevision, ...change });
const reserve = (change = {}) => service().reserve(owner, intent(change));
const mutate = (id: string, action: string, change = {}) => {
  const asset = rows.find(r => r.id === id)!;
  return service().mutate(owner, id, { action, expectedVersion: asset.version, expectedMediaRevision: lessons.find(l => l.id === asset.lessonId)!.mediaRevision, ...change });
};
// Simulate future trusted provider verification/processing. 1.9A intentionally exposes no finalize or callback API.
function ready(id: string) {
  const row = rows.find(r => r.id === id)!;
  Object.assign(row, { status: 'ready', objectVersionId: `source-${id}`, checksum: 'a'.repeat(64), verificationPolicy: 'verified-v1', uploadedAt: now, verifiedAt: now, readyAt: now,
    ...(row.assetKind === 'video' ? { processingJobId: `job-${id}`, processingSourceVersion: `source-${id}`, processingPolicy: 'hls-v1', outputKey: 'private-output', outputVersionId: 'output-v1' } : {}), version: row.version + 1 });
  lessons.find(l => l.id === row.lessonId)!.mediaRevision++;
}
async function video() { const r = await reserve(); ready(r.asset.id); await mutate(r.asset.id, 'attach'); return rows.find(a => a.id === r.asset.id)!; }
async function resource() { const r = await reserve({ assetKind: 'resource', filename: 'notes.pdf', mimeType: 'application/pdf' }); ready(r.asset.id); await mutate(r.asset.id, 'attach'); return rows.find(a => a.id === r.asset.id)!; }

it('empty text-only lessons read without storage configuration and allocate no LMS identity', async () => {
  expect(await mediaService(store, 'test', () => clock).list(owner, key)).toEqual({ assets: [], mediaRevision: 0 });
  await expect(mediaService(store, 'test', () => clock).reserve(owner, intent())).rejects.toMatchObject({ code: 'unavailable' });
  expect(rows).toEqual([]);
});
it('binds idempotency to full request context and parent; replay creates one asset', async () => {
  const c = intent(); const result = await Promise.all([service().reserve(owner, c), service().reserve(owner, c)]);
  expect(result.map(r => r.created)).toEqual([true, false]); expect(rows).toHaveLength(1);
  for (const change of [{ filename: 'other.mp4' }, { lessonId: other }, { byteSize: 2048 }, { expectedMediaRevision: 1 }]) await expect(service().reserve(owner, { ...c, ...change })).rejects.toMatchObject({ code: 'conflict' });
});
it('never returns private storage or processing evidence in ordinary metadata', async () => {
  await video(); const response = JSON.stringify(await service().list(owner, key));
  for (const value of ['storageKey', 'storageContainer', 'storageAccountId', 'objectVersionId', 'checksum', 'contextHash', 'processingJobId', 'outputKey', 'source-', 'private-output', 'signedUrl']) expect(response).not.toContain(value);
});
it('competing replacements have one winner; current video stays selected until ready attach', async () => {
  const original = await video(), c = intent({ replacesAssetId: original.id });
  const result = await Promise.allSettled([service().reserve(owner, c), service().reserve(owner, { ...c, requestKey: randomUUID() })]);
  expect(result.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  const replacement = rows.find(a => a.replacesAssetId === original.id)!;
  expect(replacement.replacementVersion).toBe(2); expect(rows.find(a => a.id === original.id)?.isAttached).toBe(true);
  await expect(mutate(replacement.id, 'attach')).rejects.toMatchObject({ code: 'not_ready' });
  ready(replacement.id); await mutate(replacement.id, 'attach');
  expect(rows.filter(a => a.isAttached).map(a => a.id)).toEqual([replacement.id]);
  expect(rows.find(a => a.id === original.id)?.status).toBe('detached');
});
it('stale video replacement and wrong-parent asset mutations fail without writes', async () => {
  const v = await video(); const before = copy(rows);
  await expect(reserve({ replacesAssetId: other })).rejects.toMatchObject({ code: 'conflict' });
  await expect(service().list(other, key)).rejects.toMatchObject({ code: 'not_found' });
  await expect(service().mutate(owner, other, { action: 'detach', expectedVersion: 1, expectedMediaRevision: lessons[0].mediaRevision })).rejects.toMatchObject({ code: 'not_found' });
  await expect(mutate(v.id, 'detach', { expectedVersion: 1 })).rejects.toMatchObject({ code: 'conflict' }); expect(rows).toEqual(before);
});
it('stale media revisions prevent a second selection/edit and leave metadata intact', async () => {
  const a = await resource(); const rev = lessons[0].mediaRevision; await mutate(a.id, 'rename', { displayName: 'Saved notes' });
  await expect(mutate(a.id, 'rename', { displayName: 'Stale notes', expectedMediaRevision: rev })).rejects.toMatchObject({ code: 'conflict' });
  expect(rows[0].displayName).toBe('Saved notes'); expect(lessons[0].mediaRevision).toBeGreaterThan(rev);
});
it('resource swaps and detach preserve contiguous positions; detach retains immutable identity', async () => {
  const a = await resource(), b = await resource(), c = await resource();
  await mutate(a.id, 'move', { direction: 'down' }); expect(rows.filter(a => a.isAttached).sort((a,b) => a.resourcePosition!-b.resourcePosition!).map(a => a.id)).toEqual([b.id, a.id, c.id]);
  const identity = rows.find(r => r.id === a.id)!.storageKey;
  await mutate(a.id, 'detach'); expect(rows.filter(a => a.isAttached).map(a => a.resourcePosition).sort()).toEqual([0, 1]);
  expect(rows.find(r => r.id === a.id)).toMatchObject({ status: 'detached', resourcePosition: null, storageKey: identity });
  await expect(mutate(a.id, 'attach')).rejects.toMatchObject({ code: 'conflict' });
});
it('replacement failure or cancellation preserves the previous video', async () => {
  const v = await video(), r = await reserve({ replacesAssetId: v.id });
  await expect(mutate(v.id, 'detach')).rejects.toMatchObject({ code: 'conflict' });
  await mutate(r.asset.id, 'detach'); expect(rows.find(a => a.id === v.id)?.isAttached).toBe(true);
  const next = await reserve({ replacesAssetId: v.id }); expect(next.asset.replacementVersion).toBe(3);
});
it('captions bind selected video source and are retired atomically with its replacement', async () => {
  const v = await video();
  const fields = { assetKind: 'caption', filename: 'english.vtt', mimeType: 'text/vtt', captionVideoId: v.id, captionSourceVersion: v.objectVersionId, language: 'en' };
  await expect(reserve({ ...fields, captionSourceVersion: 'wrong-source' })).rejects.toMatchObject({ code: 'conflict' });
  const cap = await reserve(fields); ready(cap.asset.id); await mutate(cap.asset.id, 'attach');
  const next = await reserve({ replacesAssetId: v.id }); ready(next.asset.id); await mutate(next.asset.id, 'attach');
  expect(rows.find(a => a.id === cap.asset.id)?.status).toBe('detached');
});
it('transaction failure rolls back ordering, attachment and revisions', async () => {
  const a = await resource(); const before = copy({ rows, lessons }); failUpdate = true;
  await expect(mutate(a.id, 'detach')).rejects.toThrow('synthetic failure'); expect({ rows, lessons }).toEqual(before);
});
it('bounded reservations release expired slots without deleting provenance', async () => {
  const c = intent(); await service().reserve(owner, c); clock = new Date(clock.getTime() + 86400000);
  await expect(service().reserve(owner, c)).rejects.toMatchObject({ code: 'expired' });
  const next = await reserve(); expect(next.asset.replacementVersion).toBe(2); expect(rows[0].status).toBe('failed');
});
it('bounds active resource reservations, not just attached resources', async () => {
  for (let i = 0; i < 10; i++) await reserve({ assetKind: 'resource', filename: 'notes.pdf', mimeType: 'application/pdf' });
  await expect(reserve({ assetKind: 'resource', filename: 'notes.pdf', mimeType: 'application/pdf' })).rejects.toMatchObject({ code: 'limit' });
});
it.each(['expired', 'refunded', 'suspended', 'terminated', 'held', 'pending', 'unpaid'])('%s follows current Builder access policy', async state => {
  const a = await resource(); const before = copy(rows);
  if (state === 'expired') clock = evidence.membership.endsAt;
  else if (state === 'refunded') context.evidence!.refundedAt = now;
  else if (state === 'suspended' || state === 'terminated') context.evidence!.profileStatus = state;
  else if (state === 'held') context.financialReview = true;
  else if (state === 'pending') context.evidence!.activationState = 'pending_activation';
  else context.evidence = null;
  await expect(mutate(a.id, 'detach')).rejects.toMatchObject({ code: 'forbidden' });
  if (state === 'expired' || state === 'refunded') expect((await service().list(owner, key)).assets).toHaveLength(1);
  else await expect(service().list(owner, key)).rejects.toMatchObject({ code: 'forbidden' });
  expect(rows).toEqual(before);
});
it('complimentary-only creators can mutate and revocation retains readable history', async () => {
  context.evidence = null; context.grant = { id: key, userId: owner, source: 'admin_complimentary', scope: 'creator_workspace', environment: 'test', status: 'active', startsAt: now, expiresAt: new Date(now.getTime() + 86400000), createdAt: now, closedAt: null, profileStatus: 'enabled', eligibilityValid: true, termsAccepted: true, legalHistory: true };
  const a = await resource(); context.grant.status = 'revoked';
  await expect(mutate(a.id, 'detach')).rejects.toMatchObject({ code: 'forbidden' }); expect((await service().list(owner, key)).assets).toHaveLength(1);
});
it.each(['expiry', 'revocation'])('rechecks %s after awaited reads and rolls back changes', async state => {
  const before = copy({ rows, lessons }); afterRead = () => { if (state === 'expiry') clock = evidence.membership.endsAt; else context.evidence!.profileStatus = 'suspended'; };
  await expect(reserve()).rejects.toMatchObject({ code: 'forbidden' }); expect({ rows, lessons }).toEqual(before);
});
it('production and unknown runtimes reject test entitlement', async () => {
  for (const env of ['production', 'unclassified']) await expect(mediaService(store, env, () => clock).list(owner, key)).rejects.toMatchObject({ code: 'forbidden' });
});
