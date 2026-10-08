import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), access: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@/lib/workspace/activation/repository', () => ({ readWorkspaceAccess: mocks.access }));
import { postgresCreatorStore, inspectDrafts } from '@/lib/workspace/creator/repository';
import { users, workspaceCreatorProfiles as profiles, workspaceMembershipOrders as orders, workspaceCourseDrafts as drafts, workspaceCreatorProfileDetails as details } from '@/lib/db/schema';
import { content, evidence, now, owner, key, draftId, profileId, profile } from './workspace-creator-fixtures';
let role: string; let accountPresent: boolean; let queries: { table: unknown; where?: SQL; lock?: string; kind: string; patch?: object }[]; let tx: unknown;
const dialect = new PgDialect();
beforeEach(() => {
  role = 'admin'; accountPresent = true; queries = [];
  mocks.access.mockResolvedValue({ row: { profile: { id: profileId, status: 'enabled' }, membership: evidence.membership, order: { ...evidence, activationState: 'fulfilled', planSnapshot: { displayName: 'Quarterly' } } }, latestOrder: { activationState: 'fulfilled' } });
  const select = () => ({ from: (table: unknown) => {
    const query: typeof queries[number] = { table, kind: 'select' }; queries.push(query);
    const result = () => table === users ? (accountPresent ? [{ id: owner, role, fullName: 'Account' }] : []) : table === profiles ? [{ id: profileId, userId: owner }] : table === orders ? [{ id: key }] : [];
    const builder = { where: (where: SQL) => { query.where = where; return builder; }, orderBy: () => builder, limit: () => builder, offset: () => builder, innerJoin: () => builder, for: async (lock: string) => { query.lock = lock; return result(); }, then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result()).then(resolve) }; return builder;
  } });
  const update = (table: unknown) => ({ set: (patch: object) => ({ where: (where: SQL) => { queries.push({ table, kind: 'update', patch, where }); return { returning: async () => [] }; } }) });
  tx = { select, update, insert: (table: unknown) => ({ values: (patch: object) => { queries.push({ table, kind: 'insert', patch }); const result = { returning: async () => [], onConflictDoNothing: () => result }; return result; } }) };
  mocks.transaction.mockImplementation(work => work(tx));
});
it('locks persisted user, financial orders, then creator identity before reading joined access in the same transaction', async () => {
  await postgresCreatorStore.transaction(owner, async client => { expect(await client.context()).toMatchObject({ user: { id: owner }, profileId, evidence }); });
  expect(queries.slice(0, 3).map(query => [query.table, query.lock])).toEqual([[users, 'update'], [orders, 'update'], [profiles, 'update']]); expect(mocks.access).toHaveBeenCalledWith(owner, tx);
  accountPresent = false; await expect(postgresCreatorStore.transaction(owner, async () => null)).rejects.toMatchObject({ code: 'authentication' });
});
it('draft reads, idempotency lookup and optimistic writes carry owner predicates in SQL', async () => {
  await postgresCreatorStore.transaction(owner, async client => { await client.draft(draftId); await client.request(key); await client.update(draftId, 5, content, now); await client.saveDetails(profileId, 1, profile, now); });
  const reads = queries.filter(query => query.table === drafts && query.kind === 'select');
  expect(reads.map(query => dialect.sqlToQuery(query.where!).params)).toEqual([[owner, draftId], [owner, key]]);
  const draftUpdate = queries.find(query => query.table === drafts && query.kind === 'update')!;
  expect(dialect.sqlToQuery(draftUpdate.where!).params).toEqual([owner, draftId, 5]); expect(draftUpdate.patch).toMatchObject({ version: 6 });
  const profileUpdate = queries.find(query => query.table === details && query.kind === 'update')!;
  expect(dialect.sqlToQuery(profileUpdate.where!).params).toEqual([owner, profileId, 1]);
});
it('draft/profile inserts derive both identities; no existing LMS or financial table is written', async () => {
  await postgresCreatorStore.transaction(owner, async client => { await client.create(content, profileId, key, 'a'.repeat(64), now); await client.saveDetails(profileId, 0, profile, now); });
  const inserts = queries.filter(query => query.kind === 'insert'); expect(inserts.map(query => query.table)).toEqual([drafts, details]); for (const query of inserts) expect(query.patch).toMatchObject({ userId: owner, creatorProfileId: profileId });
});
it('admin inspection ignores stale token role and denies persisted demotion before querying drafts', async () => {
  role = 'student'; await expect(inspectDrafts(owner, draftId)).rejects.toMatchObject({ code: 'restricted' }); expect(queries.some(query => query.table === drafts)).toBe(false);
  queries = []; role = 'admin'; await expect(inspectDrafts(owner, draftId)).resolves.toEqual([]); expect(queries[0].lock).toBe('share'); expect(dialect.sqlToQuery(queries[1].where!).params).toEqual([draftId]); expect(queries.some(query => query.kind !== 'select')).toBe(false);
});
