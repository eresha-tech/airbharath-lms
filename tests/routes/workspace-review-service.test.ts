import { beforeEach, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { creatorService, type CreatorStore, type Draft, type CreatorContext } from '@/lib/workspace/creator/service';
import { reviewService, type Submission, type ReviewEvent, type AdminReviewStore } from '@/lib/workspace/review/service';
import { ReviewError } from '@/lib/workspace/review/model';
import { snapshot } from '@/lib/workspace/review/snapshot';
import { content, evidence, owner, other, draftId, profileId, now, key } from './workspace-creator-fixtures';
let draft: Draft; let rows: Submission[]; let events: ReviewEvent[]; let context: CreatorContext; let clock: Date; let role: string; let fail: boolean;
let creators: CreatorStore; let admins: AdminReviewStore;
// Shared serial transaction/rollback harness models the draft mutex used by both repositories.
beforeEach(() => {
  draft = { ...structuredClone(content), id: draftId, userId: owner, creatorProfileId: profileId, version: 1, status: 'draft', currency: 'INR', requestKey: key, creationHash: 'a'.repeat(64), createdAt: now, updatedAt: now };
  rows = []; events = []; role = 'admin'; fail = false; clock = now;
  context = { user: { id: owner, fullName: 'Synthetic' }, profileId, evidence: structuredClone(evidence), financialReview: false, planName: 'Quarterly' };
  let tail = Promise.resolve();
  function transaction<T>(work: () => Promise<T>) { const result = tail.then(async () => { const before = structuredClone({ draft, rows, events }); try { return await work(); } catch (error) { draft = before.draft; rows = before.rows; events = before.events; throw error; } }); tail = result.then(() => undefined, () => undefined); return result; }
  creators = { transaction: (id, work) => transaction(async () => {
    if (!id) throw new ReviewError('authentication');
    return work({ context: async () => context, draft: async requested => id === owner && requested === draftId ? structuredClone(draft) : null,
      reviews: { latest: async () => structuredClone(rows.at(-1) || null), request: async request => structuredClone(rows.find(row => row.userId === id && row.requestKey === request) || null), statuses: async () => Object.fromEntries(rows.slice(-1).map(row => [draftId, row.reviewStatus])),
        create: async row => { const created: Submission = { reviewStatus: 'submitted', version: 1, reviewStartedAt: null, reviewCompletedAt: null, ...row, id: randomUUID() } as Submission; rows.push(created); return structuredClone(created); },
        history: async () => ({ submissions: rows.toReversed().map(submission => ({ submission: structuredClone(submission), events: events.filter(event => event.submissionId === submission.id).map(event => structuredClone(event)) })), hasNext: false }),
      }, request: async () => null, list: async () => ({ drafts: [draft], total: 1, hasNext: false }), details: async () => null, create: async () => draft,
      update: async (_id, expected, value, at) => { if (draft.version !== expected) return null; Object.assign(draft, value, { version: expected + 1, updatedAt: at }); return structuredClone(draft); }, saveDetails: async () => null,
    });
  }) };
  admins = { transaction: (actorId, id, work) => transaction(async () => {
    if (role !== 'admin') throw new ReviewError('forbidden');
    return work({ submission: async () => structuredClone(rows.find(row => row.id === id) || null), request: async request => structuredClone(events.find(event => event.actorAdminUserId === actorId && event.requestKey === request) || null),
      append: async row => { const created = { ...row, id: randomUUID() } as ReviewEvent; events.push(created); return structuredClone(created); },
      transition: async (prior, reviewStatus, at) => { if (fail) throw new Error('synthetic rollback'); const row = rows.find(row => row.id === prior.id && row.version === prior.version)!; Object.assign(row, { reviewStatus, version: prior.version + 1, updatedAt: at, ...(reviewStatus === 'under_review' ? { reviewStartedAt: at } : { reviewCompletedAt: at }) }); return structuredClone(row); },
    });
  }) };
});
function service() { return reviewService(creators, admins, 'test', () => clock); }
function submit(requestKey = randomUUID(), expectedDraftVersion = draft.version) { return service().submit(owner, draftId, { requestKey, expectedDraftVersion }); }
function review(id: string, action: 'start_review' | 'request_changes' | 'approve', requestKey = randomUUID(), actorId = other) { return service().review(actorId, id, { action, expectedStatus: action === 'start_review' ? 'submitted' : 'under_review', requestKey, ...(action === 'request_changes' ? { feedback: 'Please add specific learning outcomes.' } : {}) }); }
it('creates the saved complete normalized snapshot, freezes it and exposes no mutable-content command', async () => {
  const row = await submit(); expect(row).toMatchObject({ ...content, draftId, userId: owner, creatorProfileId: profileId, submissionNumber: 1, draftVersion: 1, currency: 'INR', reviewStatus: 'submitted', contentHash: snapshot(draft).contentHash });
  draft.title = 'Later unrelated memory'; expect(rows[0].title).toBe(content.title);
  expect(() => service().submit(owner, draftId, { requestKey: key, expectedDraftVersion: 1, content })).toThrowError('validation'); expect(() => service().submit(owner, draftId, { requestKey: key, expectedDraftVersion: 1, userId: other })).toThrowError('validation');
});
it('same submission key/context converges, changed context conflicts, different keys cannot double-submit', async () => {
  const result = await Promise.all([submit(key), submit(key)]); expect(result[0].id).toBe(result[1].id); expect(rows).toHaveLength(1);
  await expect(submit(key, 2)).rejects.toMatchObject({ code: 'conflict' }); await expect(submit()).rejects.toMatchObject({ code: 'review_in_progress' });
  await expect(service().submit(owner, randomUUID(), { requestKey: key, expectedDraftVersion: 1 })).rejects.toMatchObject({ code: 'not_found' });
});
it('different-key initial race has exactly one submitted row', async () => { const result = await Promise.allSettled([submit(), submit()]); expect(result.map(row => row.status)).toEqual(['fulfilled', 'rejected']); expect(rows).toHaveLength(1); });
it('stale, invalid and cross-owner drafts fail without evidence', async () => {
  await expect(submit(key, 2)).rejects.toMatchObject({ code: 'stale_draft' }); draft.description = 'too short'; await expect(submit()).rejects.toMatchObject({ code: 'validation' });
  await expect(service().submit(other, draftId, { requestKey: key, expectedDraftVersion: 1 })).rejects.toMatchObject({ code: 'not_found' }); expect(rows).toEqual([]);
});
it.each(['expired', 'suspended', 'terminated', 'held', 'pending', 'eligibility-only'])('%s cannot submit/resubmit; expired historical feedback is readable', async state => {
  const row = await submit(); await review(row.id, 'start_review'); await review(row.id, 'request_changes');
  if (state === 'expired') clock = evidence.membership.endsAt;
  else if (state === 'suspended' || state === 'terminated') context.evidence!.profileStatus = state;
  else if (state === 'held') context.financialReview = true;
  else if (state === 'pending') context.evidence!.activationState = 'pending_activation'; else context.evidence = null;
  await expect(submit()).rejects.toMatchObject({ code: 'forbidden' });
  if (state === 'expired') expect((await service().history(owner, draftId)).submissions[0].events[1].feedback).toBe('Please add specific learning outcomes.'); else await expect(service().history(owner, draftId)).rejects.toMatchObject({ code: 'forbidden' }); expect(rows).toHaveLength(1);
});
it('rechecks expiry after waiting for the owned draft lock', async () => {
  const original = creators.transaction; creators.transaction = (id, work) => original(id, tx => work({ ...tx, draft: async id => { const row = await tx.draft(id); clock = evidence.membership.endsAt; return row; } }));
  await expect(submit()).rejects.toMatchObject({ code: 'forbidden' }); expect(rows).toEqual([]);
});
it.each(['submitted', 'under_review', 'approved'] as const)('service blocks draft editing in %s', async status => {
  const row = await submit(); if (status !== 'submitted') await review(row.id, 'start_review'); if (status === 'approved') await review(row.id, 'approve');
  await expect(creatorService(creators, 'test', () => clock).update(owner, draftId, 1, { ...content, title: 'Changed title' })).rejects.toMatchObject({ code: 'review_locked' }); expect(draft.version).toBe(1);
});
it('changes-requested unlocks editing; identical content cannot resubmit; new version preserves history', async () => {
  const row = await submit(); await review(row.id, 'start_review'); await review(row.id, 'request_changes'); const historical = structuredClone({ row: rows[0], events });
  await expect(submit()).rejects.toMatchObject({ code: 'no_changes_to_resubmit' });
  await creatorService(creators, 'test', () => clock).update(owner, draftId, 1, content); await expect(submit()).rejects.toMatchObject({ code: 'no_changes_to_resubmit' });
  await creatorService(creators, 'test', () => clock).update(owner, draftId, 2, { ...content, title: 'Improved course title' });
  const results = await Promise.all([submit(key), submit(key)]); expect(results[0].id).toBe(results[1].id); expect(rows).toHaveLength(2); expect(rows[1]).toMatchObject({ submissionNumber: 2, draftVersion: 3, reviewStatus: 'submitted' }); expect({ row: rows[0], events }).toEqual(historical);
});
it('different-key resubmission race creates only N+1', async () => { const row = await submit(); await review(row.id, 'start_review'); await review(row.id, 'request_changes'); draft.title = 'Edited saved course'; draft.version++;
  const result = await Promise.allSettled([submit(), submit()]); expect(result.map(row => row.status)).toEqual(['fulfilled', 'rejected']); expect(rows.map(row => row.submissionNumber)).toEqual([1, 2]); });
it('admin idempotency recovers without duplicate evidence; changed command/key conflicts', async () => {
  const row = await submit(); await review(row.id, 'start_review', key); await review(row.id, 'start_review', key); expect(events).toHaveLength(1);
  await expect(review(row.id, 'approve', key)).rejects.toMatchObject({ code: 'conflict' }); await expect(review(row.id, 'start_review')).rejects.toMatchObject({ code: 'conflict' });
  await review(row.id, 'approve'); await review(row.id, 'start_review', key); expect(events).toHaveLength(2); expect(rows[0].reviewStatus).toBe('approved'); await expect(submit()).rejects.toMatchObject({ code: 'already_approved' });
});
it.each([['start_review','start_review'], ['request_changes','approve'], ['approve','approve'], ['request_changes','request_changes']] as const)('admin %s/%s race commits one authoritative transition/event', async (a,b) => {
  const row = await submit(); if (a !== 'start_review') await review(row.id, 'start_review'); const count = events.length;
  const result = await Promise.allSettled([review(row.id,a,randomUUID(),owner), review(row.id,b,randomUUID(),other)]); expect(result.map(row => row.status)).toEqual(['fulfilled','rejected']); expect(events).toHaveLength(count+1); expect(rows[0].reviewStatus).toBe(a === 'start_review' ? 'under_review' : a === 'approve' ? 'approved' : 'changes_requested');
});
it('same-key admin race recovers one event', async () => { const row = await submit(); const result = await Promise.all([review(row.id,'start_review',key),review(row.id,'start_review',key)]); expect(result[0].id).toBe(result[1].id); expect(events).toHaveLength(1); });
it('persisted demotion denies commands; admin can continue after creator expiry/suspension', async () => {
  const row = await submit(); role = 'student'; await expect(review(row.id,'start_review')).rejects.toMatchObject({ code: 'forbidden' }); expect(events).toEqual([]);
  role = 'admin'; clock = evidence.membership.endsAt; context.evidence!.profileStatus = 'suspended'; await review(row.id,'start_review'); await review(row.id,'approve'); expect(rows[0].reviewStatus).toBe('approved'); expect(context.evidence!.membership).toEqual(evidence.membership);
});
it('rejects direct approval, wrong expected state, missing/HTML feedback and unknown mutations', async () => {
  const row = await submit(); await expect(review(row.id,'approve')).rejects.toMatchObject({ code: 'conflict' });
  for (const feedback of ['', 'short', '<b>Change this course</b>', 'x'.repeat(2001)]) expect(() => service().review(other,row.id,{action:'request_changes',expectedStatus:'under_review',requestKey:key,feedback})).toThrow('validation');
  expect(() => service().review(other,row.id,{action:'approve',expectedStatus:'submitted',requestKey:key})).toThrow('invalid_transition'); expect(() => service().review(other,row.id,{action:'approve',expectedStatus:'under_review',requestKey:key,title:'rewrite'})).toThrow('validation'); expect(events).toEqual([]);
});
it('precommit failure rolls back appended evidence and status, retry safely succeeds', async () => { const row = await submit(); fail = true; await expect(review(row.id,'start_review',key)).rejects.toThrow('synthetic rollback'); expect(events).toEqual([]); expect(rows[0].reviewStatus).toBe('submitted'); fail = false; await review(row.id,'start_review',key); expect(events).toHaveLength(1); });
it('reads owner history only and does not expose historical snapshots through cross-owner access', async () => { await submit(); await expect(service().history(other,draftId)).rejects.toMatchObject({code:'not_found'}); await expect(service().history('',draftId)).rejects.toMatchObject({code:'authentication'}); });
