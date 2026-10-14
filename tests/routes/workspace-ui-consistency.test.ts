import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { WorkspaceLoading, WorkspaceErrorState, WorkspaceLaunchNotice } from '@/components/workspace/ui/WorkspaceUI';
import { WorkspaceAgreement } from '@/components/workspace/WorkspaceAgreement';
import { WorkspaceEmailVerification } from '@/components/workspace/WorkspaceEmailVerification';
const mocks = vi.hoisted(() => ({ user: vi.fn(), access: vi.fn(), grant: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/workspace/activation/repository', () => ({ readWorkspaceAccess: mocks.access }));
vi.mock('@/lib/workspace/access/repository', () => ({ readGrantEvidence: mocks.grant }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: async () => ({ id: 'synthetic-admin' }) }));
vi.mock('@/lib/workspace/admin/lists', () => ({ adminList: mocks.list }));
import MemberPage from '@/app/(workspace)/workspace/(membership)/member/page';
import { WorkspaceCoupons } from '@/components/workspace/WorkspaceCoupons';
import { WorkspaceList } from '@/components/admin/WorkspaceList';
import { commercialPolicy } from '@/lib/workspace/payments/model';
import { adminListFixture } from './workspace-admin-list-fixtures';
const html = (element: React.ReactElement) => renderToStaticMarkup(element);
const id = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.useRealTimers(); vi.stubEnv('DATABASE_ENV', 'development'); vi.stubEnv('NODE_ENV', 'test');
  mocks.user.mockResolvedValue({ id, role: 'student' }); mocks.access.mockResolvedValue({ row: null, latestOrder: null });
  mocks.grant.mockResolvedValue({ id, userId: id, source: 'admin_complimentary', scope: 'creator_workspace', environment: 'development', status: 'active', startsAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 86400000), createdAt: new Date(Date.now() - 1000), closedAt: null, profileStatus: 'enabled', eligibilityValid: true, termsAccepted: true, legalHistory: true });
  mocks.list.mockResolvedValue(adminListFixture());
});
it('named shared skeleton is busy, announced and contains no nested main landmark', () => {
  const result = html(createElement(WorkspaceLoading, { title: 'Workspace refunds' }));
  expect(result).toContain('aria-busy="true"'); expect(result).toContain('Loading Workspace refunds'); expect(result).toContain('aria-hidden="true"'); expect(result).not.toContain('<main');
});
it('load error exposes an actionable retry without inventing an empty financial result', () => {
  const result = html(createElement(WorkspaceErrorState, { title: 'Financial evidence unavailable', href: '/admin/workspace/reports' }));
  expect(result).toContain('role="alert"'); expect(result).toContain('Reload this page'); expect(result).not.toContain('₹0');
});
it('launch notice separates Early Access preparation from planned publication and selling', () => {
  const result = html(createElement(WorkspaceLaunchNotice));
  expect(result).toContain('Full AirBharath Workspace launches 9 November 2026.'); expect(result).toContain('not available during Early Access');
});
it('saved legal history does not pre-check or auto-acknowledge current purchase consent', () => {
  const accepted = vi.fn();
  const result = html(createElement(WorkspaceAgreement, { id: 'creator-terms', label: 'I agree', endpoint: '/api/workspace/creator-terms/accept', hash: 'a'.repeat(64), previouslySaved: true, validate: () => true, onAccepted: accepted }));
  expect(result).toContain('type="checkbox"'); expect(result).toContain('workspace-checkbox'); expect(result).not.toContain('checked=""'); expect(accepted).not.toHaveBeenCalled();
});
it('email code controls start safely disabled until client challenge expiry is evaluated', () => {
  const result = html(createElement(WorkspaceEmailVerification, { initialStatus: { email: 'synthetic@example.invalid', verified: false, verifiedAt: null, challenge: { id, state: 'accepted', expiresAt: new Date(Date.now() - 1000).toISOString(), resendAt: new Date(Date.now() - 1000).toISOString() } }, onVerified: vi.fn() }));
  expect(result).toMatch(/id="workspace-email-code"[^>]*disabled/); expect(result).toContain('workspace-email-challenge-status');
});
it('held payment copy does not deny independent complimentary Creator access', async () => {
  mocks.access.mockResolvedValue({ row: null, latestOrder: { activationState: 'held_for_review', financialState: 'captured' } });
  const result = html(await MemberPage()); expect(result).toContain('Your separate payment remains under review'); expect(result).toContain('Complimentary Creator access'); expect(result).toContain('Open Workspace'); expect(result).not.toContain('Original payment amount');
});
it('expired paid term remains expired while an independent valid grant still permits editing', async () => {
  const date = new Date(Date.now() - 86400000);
  mocks.access.mockResolvedValue({ row: { profile: { status: 'enabled' }, order: { planSnapshot: { displayName: 'Historical quarterly' }, totalPaise: 589882, providerMode: 'test', commercialPolicyVersion: commercialPolicy('test'), activationState: 'fulfilled' }, membership: { startsAt: date, endsAt: date, fulfilledAt: date, accessGrantedAt: date }, refund: null }, latestOrder: null });
  const result = html(await MemberPage()); expect(result).toContain('Membership expired'); expect(result).toContain('independent complimentary grant continues to allow Creator editing'); expect(result).not.toContain('Creator access is no longer active'); expect(result).toContain('₹5,898.82');
});
it('course review list uses established review wording without changing generic refund labels', async () => {
  const result = html(await WorkspaceList({ kind: 'reviews', searchParams: Promise.resolve({}) })); expect(result).toContain('Submitted for Review'); expect(result).toContain('AirBharath Course Review Approved');
  const other = html(await WorkspaceList({ kind: 'refunds', searchParams: Promise.resolve({}) })); expect(other).not.toContain('AirBharath Course Review Approved');
});

it('coupon code constraint remains valid under modern native unicode-set validation', () => {
  const result = html(createElement(WorkspaceCoupons, { initial: { coupons: [], page: 1, hasNext: false }, initialInfluencers: [] }));
  const pattern = result.match(/<input[^>]*name="code"[^>]*>/)?.[0].match(/pattern="([^"]+)"/)?.[1];
  expect(pattern).toBeDefined();
  const native = new RegExp(`^(?:${pattern})$`, 'v');
  for (const code of ['ABC', 'WSF5-UI_OK', 'A_B', 'A'.repeat(32)]) expect(native.test(code)).toBe(true);
  for (const code of ['AB', 'BAD CODE', 'A/B', '_ABC', 'A'.repeat(33)]) expect(native.test(code)).toBe(false);
});
