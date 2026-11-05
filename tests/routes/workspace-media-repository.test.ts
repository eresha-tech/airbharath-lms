import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), access: vi.fn(), grant: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@/lib/workspace/activation/repository', () => ({ readWorkspaceAccess: mocks.access }));
vi.mock('@/lib/workspace/access/repository', () => ({ readGrantEvidence: mocks.grant }));
import { postgresMediaStore } from '@/lib/workspace/media/repository';
import { postgresBuildStore } from '@/lib/workspace/builder/repository';
import { users, workspaceCreatorProfiles as profiles, workspaceMembershipOrders as orders, workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseProjects as projects, workspaceCourseLessons as lessons, workspaceCourseAssets as assets } from '@/lib/db/schema';
import { evidence, owner, other, key, profileId, draftId, now } from './workspace-creator-fixtures';
import type { Asset } from '@/lib/workspace/media/service';

const dialect = new PgDialect();
type Query = { table: unknown; kind: string; where?: SQL; lock?: string; columns?: unknown; patch?: unknown };
let queries: Query[], absent: boolean, approved: boolean, conflict: boolean, hasHistory: boolean;
const project = { id: profileId, userId: owner, creatorProfileId: profileId, draftId, approvedSubmissionId: other, status: 'building' as const, version: 1, createdAt: now, updatedAt: now };
beforeEach(() => {
  queries = []; absent = false; approved = true; conflict = false; hasHistory = false;
  const select = (columns?: Record<string, unknown>) => ({ from: (table: unknown) => {
    const q: Query = { table, columns, kind: 'select' }; queries.push(q);
    const result = () => table === users ? absent ? [] : [{ id: owner, fullName: 'Synthetic' }]
      : table === profiles ? [{ id: profileId, userId: owner }]
      : table === projects ? [project]
      : table === submissions ? [{ status: 'approved', completedAt: now, approved }]
      : table === lessons ? [columns?.lessonId ? { lessonId: key, projectId: profileId } : { id: key, projectId: profileId, userId: owner, mediaRevision: 4 }]
      : table === assets ? columns?.lessonId ? [{ lessonId: key, projectId: profileId }] : hasHistory ? [{ id: other }] : [] : [];
    const b = { where: (where: SQL) => { q.where = where; return b; }, orderBy: () => b, limit: () => b,
      for: async (lock: string) => { q.lock = lock; return result(); }, then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(result()).then(resolve) };
    return b;
  } });
  const update = (table: unknown) => ({ set: (patch: object) => ({ where: (where: SQL) => { queries.push({ kind: 'update', table, patch, where }); return { returning: async () => conflict ? [] : [{ id: other, ...patch }] }; } }) });
  const insert = (table: unknown) => ({ values: (patch: object) => { queries.push({ kind: 'insert', table, patch }); return { returning: async () => [patch] }; } });
  const remove = (table: unknown) => ({ where: (where: SQL) => { queries.push({ kind: 'delete', table, where }); return { returning: async () => [{ id: key }] }; } });
  mocks.transaction.mockImplementation(work => work({ select, update, insert, delete: remove }));
  mocks.access.mockResolvedValue({ row: { profile: { status: 'enabled' }, order: { ...evidence, planSnapshot: { displayName: 'Quarterly' } }, membership: evidence.membership, refund: { confirmedAt: now } }, latestOrder: { activationState: 'fulfilled' } });
  mocks.grant.mockResolvedValue({ id: key, source: 'admin_complimentary' });
});
const params = (q: Query) => dialect.sqlToQuery(q.where!).params;
it('uses current owner locks, refund and complimentary evidence; does not gate owned media on legacy approval', async () => {
  await postgresMediaStore.transaction(owner, { lessonId: key }, async tx => {
    expect(tx.context.grant).toMatchObject({ source: 'admin_complimentary' }); expect(tx.context.evidence?.refundedAt).toEqual(now); await tx.lesson();
  });
  expect(queries.filter(q => q.lock).map(q => [q.table, q.lock])).toEqual([[users, 'update'], [orders, 'update'], [profiles, 'update'], [projects, 'update'], [drafts, 'update'], [lessons, 'update']]);
  expect(mocks.access).toHaveBeenCalledWith(owner, expect.anything()); expect(mocks.grant).toHaveBeenCalledWith(owner, expect.anything());
  expect(queries.some(q=>q.table===submissions)).toBe(false);approved=false;await postgresMediaStore.transaction(owner,{lessonId:key},async()=>null);
});
it('scopes asset identity, list and versioned update to actor/profile/project/lesson', async () => {
  await postgresMediaStore.transaction(owner, { assetId: other }, async tx => {
    await tx.assets(); await tx.update({ id: other, version: 7 } as Asset, { displayName: 'Renamed', updatedAt: now });
  });
  const reads = queries.filter(q => q.table === assets && q.kind === 'select');
  expect(params(reads[0])).toEqual([other, owner, profileId]);
  expect(params(reads[1])).toEqual([key, profileId, owner, profileId]);
  const write = queries.find(q => q.kind === 'update')!;
  expect(write.table).toBe(assets); expect(params(write)).toEqual([key, profileId, owner, profileId, other, 7]); expect(write.patch).toMatchObject({ version: 8 });
  conflict = true; await expect(postgresMediaStore.transaction(owner, { assetId: other }, tx => tx.update({ id: other, version: 7 } as Asset, { status: 'detached' }))).rejects.toMatchObject({ code: 'conflict' });
});
it('does not permit inserts outside the locked ownership chain', async () => {
  await expect(postgresMediaStore.transaction(owner, { lessonId: key }, tx => tx.create({ userId: other } as Asset))).rejects.toMatchObject({ code: 'not_found' });
  expect(queries.some(q => q.kind === 'insert')).toBe(false);
  absent = true; await expect(postgresMediaStore.transaction(owner, { lessonId: key }, async () => null)).rejects.toMatchObject({ code: 'authentication' });
});
it('Builder refuses hard lesson deletion while any media provenance remains; text-only deletion still works', async () => {
  hasHistory = true;
  await expect(postgresBuildStore.transaction(owner, tx => tx.deleteLesson(project, other, key, 1))).rejects.toMatchObject({ code: 'media_exists' });
  expect(queries.some(q => q.kind === 'delete')).toBe(false);
  hasHistory = false; expect(await postgresBuildStore.transaction(owner, tx => tx.deleteLesson(project, other, key, 1))).toBe(true);
  expect(queries.filter(q => q.kind === 'delete').map(q => q.table)).toEqual([lessons]);
});
