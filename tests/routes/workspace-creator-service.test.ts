import { beforeEach, expect, it } from 'vitest';
import { creatorService, type CreatorStore, type CreatorContext, type Draft, type ProfileDetails } from '@/lib/workspace/creator/service';
import { content, evidence, now, owner, other, key, draftId, profileId, profile } from './workspace-creator-fixtures';
let drafts: Draft[]; let details: ProfileDetails[]; let context: CreatorContext; let clock: Date; let accounts: Set<string>; let store: CreatorStore;
beforeEach(() => {
  drafts = []; details = []; accounts = new Set([owner, other]); clock = now; context = { user: { id: owner, fullName: 'Account suggestion' }, profileId, evidence: structuredClone(evidence), financialReview: false, planName: 'Quarterly' };
  let tail = Promise.resolve();
  store = { transaction: (userId, work) => {
    const result = tail.then(async () => {
      if (!accounts.has(userId)) throw Object.assign(new Error('authentication'), { code: 'authentication' });
      const snapshot = structuredClone({ drafts, details });
      try { return await work({ context: async () => ({ ...context, user: { ...context.user, id: userId } }), draft: async id => drafts.find(row => row.id === id && row.userId === userId) || null, request: async requestKey => drafts.find(row => row.requestKey === requestKey && row.userId === userId) || null, list: async () => ({ drafts: drafts.filter(row => row.userId === userId), total: drafts.filter(row => row.userId === userId).length, hasNext: false }), details: async () => details.find(row => row.userId === userId) || null,
        create: async (value, creatorProfileId, requestKey, creationHash, at) => { const row: Draft = { ...value, id: draftId, userId, creatorProfileId, requestKey, creationHash, version: 1, createdAt: at, updatedAt: at, status: 'draft', currency: 'INR' }; drafts.push(row); return structuredClone(row); },
        update: async (id, expected, value, at) => { const row = drafts.find(row => row.id === id && row.userId === userId && row.version === expected); if (!row) return null; Object.assign(row, value, { version: expected + 1, updatedAt: at }); return structuredClone(row); },
        saveDetails: async (creatorProfileId, expected, value, at) => { const row = details.find(row => row.userId === userId); if (row ? row.version !== expected : expected !== 0) return null; if (row) { Object.assign(row, value, { version: expected + 1, updatedAt: at }); return structuredClone(row); } const created: ProfileDetails = { ...value, id: profileId, creatorProfileId, userId, version: 1, createdAt: at, updatedAt: at }; details.push(created); return structuredClone(created); },
      }); } catch (error) { drafts = snapshot.drafts; details = snapshot.details; throw error; }
    }); tail = result.then(() => undefined, () => undefined); return result;
  } };
});
function service() { return creatorService(store, 'test', () => clock); }
it('derives owner and creates one private draft for concurrent identical create requests', async () => {
  const result = await Promise.all([service().create(owner, key, content), service().create(owner, key, content)]);
  expect(result.map(row => row.id)).toEqual([draftId, draftId]); expect(drafts).toHaveLength(1); expect(drafts[0]).toMatchObject({ userId: owner, creatorProfileId: profileId, status: 'draft', currency: 'INR', version: 1 });
  await expect(service().create(owner, key, { ...content, title: 'Different content' })).rejects.toMatchObject({ code: 'conflict' });
});
it('concurrent v5 edits have one winner v6 and a controlled stale conflict', async () => {
  await service().create(owner, key, content); drafts[0].version = 5;
  const results = await Promise.allSettled([service().update(owner, draftId, 5, { ...content, title: 'First editor' }), service().update(owner, draftId, 5, { ...content, title: 'Second editor' })]);
  expect(results.map(row => row.status)).toEqual(['fulfilled', 'rejected']); expect((results[1] as PromiseRejectedResult).reason.code).toBe('conflict'); expect(drafts[0]).toMatchObject({ version: 6, title: 'First editor' });
});
it('cross-owner list/read/update cannot expose or change private content', async () => {
  await service().create(owner, key, content); expect((await service().overview(other)).drafts).toEqual([]);
  await expect(service().read(other, draftId)).rejects.toMatchObject({ code: 'not_found' });
  await expect(service().update(other, draftId, 1, content)).rejects.toMatchObject({ code: 'not_found' }); expect(drafts[0].version).toBe(1);
});
it('expired content is retained/readable; create, edit and profile saves fail closed', async () => {
  await service().create(owner, key, content); await service().saveProfile(owner, 0, profile); clock = evidence.membership.endsAt;
  const snapshot = structuredClone({ drafts, details }); expect(await service().read(owner, draftId)).toMatchObject({ title: content.title }); expect((await service().overview(owner)).details).toMatchObject(profile);
  await expect(service().update(owner, draftId, 1, content)).rejects.toMatchObject({ code: 'restricted' }); await expect(service().create(owner, key, content)).rejects.toMatchObject({ code: 'restricted' }); await expect(service().saveProfile(owner, 1, profile)).rejects.toMatchObject({ code: 'restricted' }); expect({ drafts, details }).toEqual(snapshot);
});
it('profile saves are deliberate, separate and versioned with a single winner', async () => {
  expect((await service().overview(owner)).details).toBeNull(); expect(details).toHaveLength(0);
  const results = await Promise.allSettled([service().saveProfile(owner, 0, profile), service().saveProfile(owner, 0, { ...profile, displayName: 'Another editor' })]);
  expect(results.map(row => row.status)).toEqual(['fulfilled', 'rejected']); expect(details).toHaveLength(1); await service().saveProfile(owner, 1, { ...profile, shortBio: 'Updated bio' }); expect(details[0].version).toBe(2);
  await expect(service().saveProfile(owner, 1, profile)).rejects.toMatchObject({ code: 'conflict' }); expect(context.evidence).toEqual(evidence); expect((await service().overview(other)).details).toBeNull();
});
it.each(['suspended', 'terminated'] as const)('rechecks %s after a previously valid screen was opened', async status => {
  await service().create(owner, key, content); context.evidence!.profileStatus = status;
  await expect(service().update(owner, draftId, 1, content)).rejects.toMatchObject({ code: 'restricted' }); await expect(service().saveProfile(owner, 0, profile)).rejects.toMatchObject({ code: 'restricted' }); await expect(service().read(owner, draftId)).rejects.toMatchObject({ code: 'restricted' }); expect(drafts).toHaveLength(1);
});
it('held review, pending activation, eligibility-only and deleted persisted accounts cannot write', async () => {
  context.financialReview = true; await expect(service().create(owner, key, content)).rejects.toMatchObject({ code: 'restricted' }); context.financialReview = false;
  context.evidence!.activationState = 'pending_activation'; await expect(service().create(owner, key, content)).rejects.toMatchObject({ code: 'restricted' }); context.evidence = null; await expect(service().saveProfile(owner, 0, profile)).rejects.toMatchObject({ code: 'restricted' }); accounts.delete(owner); await expect(service().overview(owner)).rejects.toMatchObject({ code: 'authentication' }); expect(drafts).toHaveLength(0);
});
it('samples expiry after transaction entry rather than trusting an earlier capability', async () => {
  await service().create(owner, key, content); const original = store.transaction;
  store.transaction = (userId, work) => { clock = evidence.membership.endsAt; return original(userId, work); };
  await expect(service().update(owner, draftId, 1, content)).rejects.toMatchObject({ code: 'restricted' }); expect(drafts[0].version).toBe(1);
});
