import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), user: vi.fn(), attempt: vi.fn(), plan: vi.fn(), settings: vi.fn(), policy: vi.fn(), coupon: vi.fn(), applicability: vi.fn(), use: vi.fn(), occupied: vi.fn(), influencer: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { transaction: mocks.transaction, query: { workspaceMembershipPlans: { findMany: vi.fn() } } } }));
import { getWorkspaceMembershipQuote, createWorkspaceCoupon, changeWorkspaceCouponStatus } from '@/lib/workspace/membership/service';
import { users, workspaceMembershipPlans, workspaceCoupons, workspaceCouponPlans, workspaceAuditEvents, workspaceInfluencers } from '@/lib/db/schema';
import { definition, plans, now, actorId, requestKey } from './workspace-membership-fixtures';
import { setting, policy } from './workspace-eligibility-fixtures';
const dialect = new PgDialect();
const input = { planCode: 'quarterly' as const, planVersionId: plans[0].id };
let role: string, currentPlans: typeof plans, couponRows: Record<string, unknown>[], links: Record<string, unknown>[], audits: Record<string, unknown>[], failAudit: boolean, locks: string[];
beforeEach(() => {
  vi.clearAllMocks(); role = 'admin'; currentPlans = structuredClone(plans); couponRows = []; links = []; audits = []; failAudit = false; locks = [];
  mocks.use.mockResolvedValue(undefined); mocks.occupied.mockResolvedValue({ n: 0 }); mocks.influencer.mockResolvedValue({ status: 'active' });
  mocks.user.mockResolvedValue({ id: actorId }); mocks.attempt.mockResolvedValue({ id: requestKey, userId: actorId, result: 'eligible', eligibleUntil: new Date('2026-11-01T12:00:00.000Z'), reapplyAt: null, decidedAt: now, reasons: [], policyId: policy.id });
  mocks.plan.mockResolvedValue(plans[0]); mocks.settings.mockResolvedValue(setting); mocks.policy.mockResolvedValue(policy); mocks.coupon.mockResolvedValue(undefined); mocks.applicability.mockResolvedValue([]);
  const tx = { query: {
    workspaceCouponRedemptions: { findFirst: mocks.use }, workspaceInfluencers: { findFirst: mocks.influencer },
    users: { findFirst: mocks.user }, workspaceEligibilityAttempts: { findFirst: mocks.attempt }, workspaceMembershipPlans: { findFirst: mocks.plan },
    workspaceEligibilitySettings: { findFirst: mocks.settings }, workspacePolicyVersions: { findFirst: mocks.policy }, workspaceCoupons: { findFirst: mocks.coupon }, workspaceCouponPlans: { findMany: mocks.applicability },
    workspaceAuditEvents: { findFirst: async ({ where }: { where: SQL }) => { const values = dialect.sqlToQuery(where).params; return audits.find(row => row.actorId === values[0] && row.requestKey === values[1]); } },
  },
  select: () => ({ from: (table: unknown) => ({ where: ({ queryChunks: _ }: SQL) => ({ then: (resolve: (value: unknown) => void) => mocks.occupied().then((n: unknown) => resolve([n])), for: async (mode: string) => {
    locks.push(`${table === users ? 'user' : table === workspaceMembershipPlans ? 'plan' : 'coupon'}:${mode}`);
    return table === users ? [{ role }] : table === workspaceMembershipPlans ? currentPlans : table === workspaceInfluencers ? [{ id: requestKey, status: 'active' }] : couponRows;
  } }) }) }),
  insert: (table: unknown) => ({ values: (values: Record<string, unknown> | Record<string, unknown>[]) => {
    if (table === workspaceAuditEvents && failAudit) throw new Error('audit unavailable');
    const items = (Array.isArray(values) ? values : [values]).map(value => ({ id: requestKey, status: 'active', version: 1, ...value }));
    (table === workspaceCoupons ? couponRows : table === workspaceCouponPlans ? links : audits).push(...items);
    return { returning: async () => items };
  } }),
  update: () => ({ set: (patch: object) => ({ where: () => ({ returning: async () => { Object.assign(couponRows[0], { ...patch, updatedAt: now }); return [couponRows[0]]; } }) }) }),
  };
  // Mock transactions cover commands/rollback boundaries; not a claim about real PostgreSQL.
  mocks.transaction.mockImplementation(async callback => {
    const snapshot = structuredClone({ couponRows, links, audits });
    try { return await callback(tx); } catch (error) { ({ couponRows, links, audits } = snapshot); throw error; }
  });
});
describe('authoritative advisory quote', () => {
  it('uses owned eligibility, current catalog and a read-only consistent snapshot; writes nothing', async () => {
    const quote = await getWorkspaceMembershipQuote(actorId, input, () => now);
    expect(quote).toMatchObject({ planVersionId: plans[0].id, totalPaise: 589882, reserved: false, advisory: true, couponApplied: false });
    expect(quote.quoteHash).toMatch(/^[a-f0-9]{64}$/); expect(quote.expiresAt).toBe('2026-10-06T12:10:00.000Z');
    expect(dialect.sqlToQuery(mocks.attempt.mock.calls[0][0].where).params).toEqual([actorId]);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'repeatable read', accessMode: 'read only' });
    expect(couponRows).toHaveLength(0); expect(audits).toHaveLength(0);
  });
  it('normalizes coupon lookup within Workspace scope and returns only bounded display economics', async () => {
    mocks.coupon.mockResolvedValue({ ...definition, id: requestKey, status: 'active', version: 1 }); mocks.applicability.mockResolvedValue([{ planCode: 'quarterly' }]);
    const quote = await getWorkspaceMembershipQuote(actorId, { ...input, couponCode: 'synthetic14' }, () => now);
    expect(dialect.sqlToQuery(mocks.coupon.mock.calls[0][0].where).params).toEqual(['workspace_membership', 'SYNTHETIC14']);
    expect(quote).toMatchObject({ couponApplied: true, couponCode: 'SYNTHETIC14', totalPaise: 460082 });
    expect(JSON.stringify(quote)).not.toMatch(/Synthetic campaign|Synthetic source|createdBy|sourceName|userId|eligibilityAttemptId/);
    expect((await getWorkspaceMembershipQuote(actorId, input, () => now)).totalPaise).toBe(589882); // Removing the coupon restores the standard quote.
  });
  it('binds offer changes to the hash and bounds expiry by coupon/eligibility deadlines', async () => {
    const expiring = { ...definition, id: requestKey, status: 'active', version: 1, expiresAt: new Date(now.getTime() + 300000) };
    mocks.coupon.mockResolvedValue(expiring); mocks.applicability.mockResolvedValue([{ planCode: 'quarterly' }]);
    const selected = { ...input, couponCode: definition.code };
    const a = await getWorkspaceMembershipQuote(actorId, selected, () => now); expect(a.expiresAt).toBe(expiring.expiresAt.toISOString());
    mocks.coupon.mockResolvedValue({ ...expiring, version: 2, discountValue: 109900 });
    const b = await getWorkspaceMembershipQuote(actorId, selected, () => now); expect(b.totalPaise).toBe(460200); expect(b.quoteHash).not.toBe(a.quoteHash);
    mocks.plan.mockResolvedValue({ ...plans[0], basePricePaise: 499901 }); expect((await getWorkspaceMembershipQuote(actorId, selected, () => now)).quoteHash).not.toBe(b.quoteHash);
  });
  it('validates identifiers-only inputs at the service boundary too', async () => {
    const forged = { ...input, totalPaise: 1, userId: 'another-account' };
    await expect(getWorkspaceMembershipQuote(actorId, forged, () => now)).rejects.toMatchObject({ code: 'validation' }); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('rejects unknown/paused/archived/wrong-plan/invalid coupons explicitly', async () => {
    const request = { ...input, couponCode: 'SYNTHETIC14' };
    await expect(getWorkspaceMembershipQuote(actorId, request, () => now)).rejects.toMatchObject({ code: 'invalid_code' });
    mocks.applicability.mockResolvedValue([{ planCode: 'quarterly' }]);
    for (const status of ['paused', 'archived']) { mocks.coupon.mockResolvedValue({ ...definition, id: requestKey, status, version: 1 }); await expect(getWorkspaceMembershipQuote(actorId, request, () => now)).rejects.toMatchObject({ code: status }); }
    mocks.coupon.mockResolvedValue({ ...definition, id: requestKey, status: 'active', version: 1 }); mocks.applicability.mockResolvedValue([{ planCode: 'yearly' }]);
    await expect(getWorkspaceMembershipQuote(actorId, request, () => now)).rejects.toMatchObject({ code: 'wrong_plan' });
  });
  it('rejects deleted accounts, forged owners, unavailable catalogs and stale plan IDs', async () => {
    mocks.user.mockResolvedValue(undefined); await expect(getWorkspaceMembershipQuote(actorId, input)).rejects.toMatchObject({ code: 'authentication' }); mocks.user.mockResolvedValue({ id: actorId });
    await expect(getWorkspaceMembershipQuote(actorId, { ...input, planVersionId: requestKey })).rejects.toMatchObject({ code: 'stale_plan' });
    mocks.plan.mockResolvedValue({ ...plans[0], available: false }); await expect(getWorkspaceMembershipQuote(actorId, input)).rejects.toMatchObject({ code: 'plan_unavailable' });
    mocks.plan.mockResolvedValue(plans[0]); mocks.settings.mockResolvedValue(undefined); await expect(getWorkspaceMembershipQuote(actorId, input)).rejects.toMatchObject({ code: 'unavailable' });
  });
  it.each([
    [null, '/workspace/apply'],
    [{ result: 'eligible', eligibleUntil: now }, '/workspace/apply'],
    [{ result: 'ineligible', eligibleUntil: null, reapplyAt: new Date(now.getTime() + 1000) }, '/workspace/eligibility-result'],
  ])('only active eligibility may quote %j', async (attempt, destination) => {
    mocks.attempt.mockResolvedValue(attempt); await expect(getWorkspaceMembershipQuote(actorId, input, () => now)).rejects.toMatchObject({ code: 'eligibility_required', destination });
  });
  it('hash binds offer, price/GST, plan version, policy and launch/start versions', async () => {
    const a = await getWorkspaceMembershipQuote(actorId, input, () => now);
    expect((await getWorkspaceMembershipQuote(actorId, input, () => new Date(now.getTime() + 1000))).quoteHash).toBe(a.quoteHash);
    mocks.plan.mockResolvedValue({ ...plans[0], version: 2 }); expect((await getWorkspaceMembershipQuote(actorId, input, () => now)).quoteHash).not.toBe(a.quoteHash);
    mocks.plan.mockResolvedValue(plans[0]); mocks.policy.mockResolvedValue({ ...policy, contentHash: 'new' }); expect((await getWorkspaceMembershipQuote(actorId, input, () => now)).quoteHash).not.toBe(a.quoteHash);
    mocks.policy.mockResolvedValue(policy); mocks.settings.mockResolvedValue({ ...setting, config: { ...setting.config, launchAt: '2026-11-09T18:30:00.000Z' } }); expect((await getWorkspaceMembershipQuote(actorId, input, () => now)).quoteHash).not.toBe(a.quoteHash);
  });
});
describe('admin definitions and audited status commands', () => {
  it('creates normalized applicability and immutable definition plus audit atomically', async () => {
    const created = await createWorkspaceCoupon(actorId, definition, requestKey);
    expect(created).toMatchObject({ code: definition.code, createdBy: actorId }); expect(links).toHaveLength(3); expect(audits).toHaveLength(1); expect(audits[0]).toMatchObject({ action: 'coupon_created', afterStatus: 'active', actorId });
    expect(locks).toEqual(['user:share', 'plan:share']);
  });
  it('maps a concurrent normalized-code database uniqueness conflict safely', async () => {
    mocks.transaction.mockRejectedValueOnce({ cause: { code: '23505' } });
    await expect(createWorkspaceCoupon(actorId, definition, requestKey)).rejects.toMatchObject({ code: 'conflict' });
  });
  it('rejects fixed discounts invalid for any applicable plan and rechecks persisted admin', async () => {
    await expect(createWorkspaceCoupon(actorId, { ...definition, discountValue: 499900 }, requestKey)).rejects.toMatchObject({ code: 'discount_invalid' }); expect(couponRows).toHaveLength(0);
    role = 'student'; await expect(createWorkspaceCoupon(actorId, definition, requestKey)).rejects.toMatchObject({ code: 'forbidden' }); expect(audits).toHaveLength(0);
  });
  it('rolls back definition/applicability when audit cannot be persisted', async () => {
    failAudit = true; await expect(createWorkspaceCoupon(actorId, definition, requestKey)).rejects.toThrow('audit unavailable'); expect(couponRows).toHaveLength(0); expect(links).toHaveLength(0);
  });
  it('publishes only status changes, denies stale/archived changes, checks demotion, retains audit', async () => {
    couponRows.push({ ...definition, id: requestKey, status: 'active', version: 1 });
    expect(await changeWorkspaceCouponStatus(actorId, requestKey, 'paused', 1, requestKey)).toMatchObject({ status: 'paused', version: 2, discountValue: definition.discountValue });
    expect(audits[0]).toMatchObject({ beforeStatus: 'active', afterStatus: 'paused', createdAt: now });
    expect(await changeWorkspaceCouponStatus(actorId, requestKey, 'paused', 1, requestKey)).toMatchObject({ version: 2 }); expect(audits).toHaveLength(1);
    await expect(changeWorkspaceCouponStatus(actorId, requestKey, 'active', 1, plans[0].id)).rejects.toMatchObject({ code: 'conflict' });
    role = 'student'; await expect(changeWorkspaceCouponStatus(actorId, requestKey, 'active', 2, plans[0].id)).rejects.toMatchObject({ code: 'forbidden' });
    role = 'admin'; couponRows[0].status = 'archived'; await expect(changeWorkspaceCouponStatus(actorId, requestKey, 'active', 2, plans[0].id)).rejects.toMatchObject({ code: 'conflict' });
  });
});

it('coupon preview refuses reserved/redeemed use and capacity without writing, released use is independent', async () => {
  mocks.coupon.mockResolvedValue({ ...definition, id: requestKey, status: 'active', version: 1 }); mocks.applicability.mockResolvedValue([{ planCode: 'quarterly' }]);
  mocks.use.mockResolvedValue({ status: 'redeemed' });
  await expect(getWorkspaceMembershipQuote(actorId, { ...input, couponCode: definition.code }, () => now)).rejects.toMatchObject({ code: 'coupon_used' });
  mocks.use.mockResolvedValue(undefined); mocks.occupied.mockResolvedValue({ n: 100 });
  await expect(getWorkspaceMembershipQuote(actorId, { ...input, couponCode: definition.code }, () => now)).rejects.toMatchObject({ code: 'capacity' });
  mocks.occupied.mockResolvedValue({ n: 99 });
  expect((await getWorkspaceMembershipQuote(actorId, { ...input, couponCode: definition.code }, () => now)).couponApplied).toBe(true);
  expect(couponRows).toHaveLength(0);
});
it('inactive influencer refuses new preview; stable identity is required for new influencer coupons', async () => {
  mocks.coupon.mockResolvedValue({ ...definition, influencerId: requestKey, id: requestKey, status: 'active', version: 1 }); mocks.applicability.mockResolvedValue([{ planCode: 'quarterly' }]); mocks.influencer.mockResolvedValue({ status: 'inactive' });
  await expect(getWorkspaceMembershipQuote(actorId, { ...input, couponCode: definition.code }, () => now)).rejects.toMatchObject({ code: 'paused' });
  await expect(createWorkspaceCoupon(actorId, { ...definition, sourceType: 'influencer' }, requestKey)).rejects.toMatchObject({ code: 'validation' });
  expect(await createWorkspaceCoupon(actorId, { ...definition, sourceType: 'influencer', influencerId: requestKey }, requestKey)).toMatchObject({ influencerId: requestKey });
});
