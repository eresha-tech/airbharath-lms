import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), quote: vi.fn(), create: vi.fn(), list: vi.fn(), change: vi.fn(), plans: vi.fn() }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/workspace/membership/service', () => {
  class MembershipError extends Error { constructor(public code: string, public destination?: string) { super(code); } }
  return { MembershipError, getWorkspaceMembershipQuote: mocks.quote, getCurrentPlans: mocks.plans, createWorkspaceCoupon: mocks.create, listWorkspaceCoupons: mocks.list, changeWorkspaceCouponStatus: mocks.change };
});
import { MembershipError } from '@/lib/workspace/membership/service';
import { POST as quote } from '@/app/api/workspace/membership/quote/route';
import { GET as list, POST as create } from '@/app/api/admin/workspace/coupons/route';
import { PATCH as change } from '@/app/api/admin/workspace/coupons/[id]/route';
import { GET as planList } from '@/app/api/admin/workspace/plans/route';
import { plans, definition, actorId, requestKey } from './workspace-membership-fixtures';
const selection = { planCode: 'quarterly', planVersionId: plans[0].id };
function request(body: unknown, origin = 'https://example.test', method = 'POST') { return new Request('https://example.test/api/workspace/membership/quote', { method, headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
const ctx = { params: Promise.resolve({ id: requestKey }) };
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test'); mocks.user.mockResolvedValue({ id: actorId }); mocks.admin.mockResolvedValue({ id: actorId }); mocks.quote.mockResolvedValue({ totalPaise: 589882 }); mocks.create.mockResolvedValue({ id: requestKey }); mocks.list.mockResolvedValue({ coupons: [] }); mocks.change.mockResolvedValue({ status: 'paused' }); mocks.plans.mockResolvedValue(plans); });
it('rejects anonymous, cross-site and forged financial/account/eligibility payloads without calling quote', async () => {
  expect((await quote(request(selection, 'https://attacker.test'))).status).toBe(403);
  const missingOrigin = request(selection); missingOrigin.headers.delete('origin'); expect((await quote(missingOrigin)).status).toBe(403);
  mocks.user.mockResolvedValue(null); expect((await quote(request(selection))).status).toBe(401); mocks.user.mockResolvedValue({ id: actorId });
  for (const key of ['userId', 'eligibilityResult', 'totalPaise', 'taxRateBps', 'discountPaise', 'membershipStartAt']) expect((await quote(request({ ...selection, [key]: 'forged' }))).status).toBe(400);
  expect(mocks.quote).not.toHaveBeenCalled();
});
it('uses persisted account owner, no-store responses and controlled coupon errors without full-price fallback', async () => {
  const response = await quote(request({ ...selection, couponCode: ' synthetic14 ' })); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.quote).toHaveBeenCalledWith(actorId, { ...selection, couponCode: 'SYNTHETIC14' });
  for (const code of ['invalid_code', 'paused', 'archived', 'wrong_plan', 'expired', 'not_started', 'discount_invalid'] as const) {
    mocks.quote.mockRejectedValue(new MembershipError(code)); const response = await quote(request(selection)); expect(response.status).toBe(422); expect(await response.json()).not.toHaveProperty('quote');
  }
});
it('handles stale/blocked/unavailable dependencies without internal details', async () => {
  mocks.quote.mockRejectedValue(new MembershipError('stale_plan')); expect((await quote(request(selection))).status).toBe(409);
  mocks.quote.mockRejectedValue(new MembershipError('eligibility_required', '/workspace/apply')); const response = await quote(request(selection)); expect(response.status).toBe(403); expect(await response.json()).toMatchObject({ destination: '/workspace/apply' });
  mocks.user.mockRejectedValue(new Error('private connection string')); const failed = await quote(request(selection)); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain('private');
});
it('bounds content type/body and returns safe errors for invalid JSON', async () => {
  expect((await quote(new Request('https://example.test/api/workspace/membership/quote', { method: 'POST', headers: { origin: 'https://example.test', 'Content-Type': 'application/json' }, body: '{invalid' }))).status).toBe(400);
  expect((await quote(request({ ...selection, junk: 'x'.repeat(4096) }))).status).toBe(400); expect(mocks.quote).not.toHaveBeenCalled();
});
it('requires persisted admin for list/plan/create/status endpoints and same-origin mutations', async () => {
  mocks.admin.mockResolvedValue(null);
  expect((await list(new Request('https://example.test/api/admin/workspace/coupons'))).status).toBe(403); expect((await planList()).status).toBe(403);
  expect((await create(request({ definition, requestKey }))).status).toBe(403); expect((await change(request({ status: 'paused', expectedVersion: 1, requestKey }, undefined, 'PATCH'), ctx)).status).toBe(403);
  mocks.admin.mockResolvedValue({ id: actorId }); expect((await create(request({ definition, requestKey }, 'https://attacker.test'))).status).toBe(403);
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.change).not.toHaveBeenCalled();
});
it('creates only validated immutable definitions, returns duplicate conflicts, and accepts status-only commands', async () => {
  expect((await create(request({ definition, requestKey }))).status).toBe(201); expect(mocks.create).toHaveBeenCalledWith(actorId, definition, requestKey);
  mocks.create.mockRejectedValue(new MembershipError('conflict')); expect((await create(request({ definition, requestKey }))).status).toBe(409);
  expect((await create(request({ definition: { ...definition, usedCount: 0 }, requestKey }))).status).toBe(400);
  expect((await change(request({ status: 'paused', expectedVersion: 1, requestKey }, undefined, 'PATCH'), ctx)).status).toBe(200);
  expect((await change(request({ status: 'paused', expectedVersion: 1, requestKey, discountValue: 1 }, undefined, 'PATCH'), ctx)).status).toBe(400);
  expect((await list(new Request('https://example.test/api/admin/workspace/coupons?q=%25'))).status).toBe(400);
});
