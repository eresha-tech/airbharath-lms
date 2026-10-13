import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), transaction: vi.fn(), save: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction } }));
import { influencerDefinition, saveInfluencer, listInfluencers } from '@/lib/workspace/membership/influencers';
import { influencerCouponReport } from '@/lib/workspace/membership/reporting';
import { users, workspaceInfluencers } from '@/lib/db/schema';
import { actorId, requestKey } from './workspace-membership-fixtures';
let role: string, rows: Record<string, unknown>[], inserts: number, reportSql: string, reportParams: unknown[];
const definition = { displayName: 'Synthetic aviator', description: 'Internal campaign', status: 'active' };
beforeEach(() => {
  role = 'admin'; rows = []; inserts = 0; reportSql = ''; reportParams = []; mocks.admin.mockResolvedValue({ id: actorId });
  const tx = {
    select: () => ({ from: (table: unknown) => ({ where: () => ({ for: async () => table === users ? [{ role }] : rows, then: (resolve: (value: unknown) => void) => Promise.resolve(resolve(rows)) }), orderBy: () => ({ limit: async () => rows }) }) }),
    insert: () => ({ values: (v: object) => ({ onConflictDoNothing: () => ({ returning: async () => { inserts++; if (rows.length) return []; const row = { ...v, version: 1 }; rows.push(row); return [row]; } }) }) }),
    update: (table: unknown) => ({ set: (v: object) => ({ where: (where: SQL) => ({ returning: async () => { expect(table).toBe(workspaceInfluencers); const params = new PgDialect().sqlToQuery(where).params; if (!rows.length || rows[0].version !== params[1]) return []; Object.assign(rows[0], v); return rows; } }) }) }),
    execute: async (statement: SQL) => { const query = new PgDialect().sqlToQuery(statement); reportSql = query.sql; reportParams = query.params; return [{ code: 'SYNTHETIC', grossCapturedPaise: '589882', confirmedRefundedPaise: '589882', netCapturedPaise: '0' }]; },
  };
  mocks.transaction.mockImplementation(async fn => fn(tx));
});
it.each(['student', 'deleted'])('persisted %s cannot create, edit, list or report', async value => {
  role = value;
  await expect(saveInfluencer(actorId, requestKey, definition)).rejects.toMatchObject({ code: 'forbidden' });
  await expect(saveInfluencer(actorId, requestKey, definition, 1)).rejects.toMatchObject({ code: 'forbidden' });
  await expect(listInfluencers(actorId)).rejects.toMatchObject({ code: 'forbidden' });
  await expect(influencerCouponReport(actorId, requestKey, 'test')).rejects.toMatchObject({ code: 'forbidden' });
  expect(inserts).toBe(0); expect(reportSql).toBe('');
});
it('fake persisted admin creates once for the same UUID and versioned pause/name edits preserve origin', async () => {
  const first = await saveInfluencer(actorId, requestKey, definition);
  expect(first).toMatchObject({ id: requestKey, createdBy: actorId, updatedBy: actorId, version: 1 });
  expect(await saveInfluencer(actorId, requestKey, definition)).toEqual(first); expect(rows).toHaveLength(1);
  await expect(saveInfluencer(actorId, requestKey, { ...definition, displayName: 'Different' })).rejects.toMatchObject({ code: 'conflict' });
  const changed = await saveInfluencer(actorId, requestKey, { ...definition, status: 'inactive' }, 1);
  expect(changed).toMatchObject({ status: 'inactive', createdBy: actorId, version: 2 });
  await expect(saveInfluencer(actorId, requestKey, definition, 1)).rejects.toMatchObject({ code: 'conflict' });
});
it.each([{ displayName: '' }, { displayName: 'x'.repeat(121) }, { description: 'x'.repeat(501) }, { description: '\n' }, { status: 'admin' }, { email: 'synthetic@example.invalid' }])('malformed influencer %j is refused', patch => {
  expect(influencerDefinition({ ...definition, ...patch })).toBeNull();
});
it('report compiles authoritative integer aggregate SQL, full refunds only, no customer/provider identifiers', async () => {
  const result = await influencerCouponReport(actorId, requestKey, 'test');
  expect(result).toMatchObject({ grossCapturedPaise: '589882', confirmedRefundedPaise: '589882', netCapturedPaise: '0' });
  expect(reportSql).toContain('workspace_refund_completions'); expect(reportSql).toContain('workspace_memberships');
  expect(reportSql).toContain("r.status='redeemed'"); expect(reportSql).toContain('p.captured_at=o.paid_at'); expect(reportSql).toContain("o.activation_state<>'held_for_review'");
  expect(reportSql).toContain('sum(total_paise-coalesce(refunded,0))'); expect(reportSql).toContain('::text');
  expect(reportParams).toContain('test'); expect(reportParams).toContain(requestKey);
  expect(reportSql).not.toMatch(/email|phone|posthog|refund_requests/);
  expect(Object.keys(result!)).not.toContain('providerPaymentId');
  expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'repeatable read' });
});
