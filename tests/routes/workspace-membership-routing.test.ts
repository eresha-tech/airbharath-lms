import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user: vi.fn(), journey: vi.fn(), plans: vi.fn(), quote: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user, getWorkspaceJourneyState: mocks.journey }));
vi.mock('@/lib/workspace/membership/service', () => {
  class MembershipError extends Error { constructor(public code: string, public destination?: string) { super(code); } }
  return { MembershipError, getCurrentPlans: mocks.plans, getWorkspaceMembershipQuote: mocks.quote };
});
import ActivatePage from '@/app/(user)/workspace/activate/page';
import { MembershipError } from '@/lib/workspace/membership/service';
import { middleware } from '@/middleware';
import { plans, actorId } from './workspace-membership-fixtures';
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: actorId }); mocks.journey.mockResolvedValue({ state: 'eligibility_active', destination: '/workspace/activate' }); mocks.plans.mockResolvedValue(plans); mocks.quote.mockResolvedValue(null); });
it('anonymous activation retains the fixed eligibility callback and does not trust query eligibility', async () => {
  const response = await middleware(new NextRequest('https://example.test/workspace/activate?eligible=true&callbackUrl=https://attacker.test'));
  expect(new URL(response.headers.get('location')!).searchParams.get('callbackUrl')).toBe('/workspace/apply');
  mocks.user.mockResolvedValue(null); await expect(ActivatePage()).rejects.toThrow('REDIRECT:/login?callbackUrl=%2Fworkspace%2Fapply'); expect(mocks.plans).not.toHaveBeenCalled();
});
it.each([['eligibility_required', '/workspace/apply'], ['eligibility_expired', '/workspace/apply'], ['ineligible_cooldown', '/workspace/eligibility-result']])('routes %s through central journey state', async (state, destination) => {
  mocks.journey.mockResolvedValue({ state, destination }); await expect(ActivatePage()).rejects.toThrow(`REDIRECT:${destination}`); expect(mocks.quote).not.toHaveBeenCalled();
});
it('allows persisted active eligibility and fails closed if it expires during quote generation', async () => {
  await expect(ActivatePage()).resolves.toBeDefined(); expect(mocks.quote).toHaveBeenCalledWith(actorId, { planCode: 'quarterly', planVersionId: plans[0].id });
  mocks.quote.mockRejectedValue(new MembershipError('eligibility_required', '/workspace/apply')); await expect(ActivatePage()).rejects.toThrow('REDIRECT:/workspace/apply');
});
it('renders bounded catalog failure rather than invented price/payment', async () => {
  mocks.plans.mockRejectedValue(new Error('private db details')); const page = await ActivatePage(); expect(page).toBeDefined(); expect(mocks.quote).not.toHaveBeenCalled();
});
