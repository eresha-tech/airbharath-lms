import { beforeEach, expect, it, vi } from 'vitest';
import { safeCallbackPath } from '@/lib/auth-navigation';
const m = vi.hoisted(() => ({ user: vi.fn(), session: vi.fn(), revalidate: vi.fn(), journey: vi.fn(), config: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }));
vi.mock('next/navigation', () => ({ RedirectType: { replace: 'replace' }, redirect: (path: string) => { throw new Error('REDIRECT:' + path); } }));
vi.mock('@/lib/auth', () => ({ getSession: m.session }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: m.user, getWorkspaceJourneyState: m.journey, getEligibilityFormConfig: m.config }));
import { completeLoginNavigation, completeLogoutNavigation } from '@/app/(auth)/login/actions';
import { continueAfterEligibility } from '@/app/(user)/workspace/apply/actions';
import EligibilityPage from '@/app/(user)/workspace/apply/page';
beforeEach(() => { vi.clearAllMocks(); m.user.mockResolvedValue({ id: 'student', fullName: 'Synthetic Student', role: 'student' }); m.session.mockResolvedValue(null); });
it.each(['//attacker.invalid','https://attacker.invalid','/\\attacker.invalid','/\t/attacker.invalid','/%2f%2fattacker.invalid','/%5cattacker.invalid','/javascript:alert(1)','/%0d%0aLocation:evil','/%invalid'])('rejects unsafe callback %s', value => expect(safeCallbackPath(value)).toBeNull());
it.each(['/workspace/apply', '/dashboard/courses?sort=recent#progress', '/courses/combo-pack'])('preserves safe intended callback %s', value => expect(safeCallbackPath(value)).toBe(value));
it('invalidates anonymous router state before one server-confirmed sign-in redirect', async () => {
  await expect(completeLoginNavigation('/workspace/apply')).rejects.toThrow('REDIRECT:/workspace/apply');
  expect(m.revalidate).toHaveBeenCalledExactlyOnceWith('/', 'layout');
});
it('keeps learner intent and uses persisted role for the default destination', async () => {
  await expect(completeLoginNavigation(null)).rejects.toThrow('REDIRECT:/dashboard');
  await expect(completeLoginNavigation('https://attacker.invalid')).rejects.toThrow('REDIRECT:/dashboard');
  m.user.mockResolvedValue({ fullName: 'Synthetic Admin', role: 'admin' });
  await expect(completeLoginNavigation(null)).rejects.toThrow('REDIRECT:/admin');
  await expect(completeLoginNavigation('/dashboard/courses')).rejects.toThrow('REDIRECT:/dashboard/courses');
});
it('does not navigate before session or profile confirmation', async () => {
  m.user.mockResolvedValue(null); expect(await completeLoginNavigation('/workspace/apply')).toHaveProperty('error');
  m.user.mockResolvedValue({ fullName: '', role: 'student' }); expect(await completeLoginNavigation(null)).toHaveProperty('error');
  expect(m.revalidate).not.toHaveBeenCalled();
});
it('invalidates logout state only after the existing secure cookie-clearing flow', async () => {
  m.session.mockResolvedValue({ id: 'still-signed-in' }); expect(await completeLogoutNavigation()).toHaveProperty('error'); expect(m.revalidate).not.toHaveBeenCalled();
  m.session.mockResolvedValue(null); await expect(completeLogoutNavigation()).rejects.toThrow('REDIRECT:/login');
  expect(m.revalidate).toHaveBeenCalledExactlyOnceWith('/', 'layout');
});
it('navigates saved eligibility once after invalidating its mutable route state', async () => {
  await expect(continueAfterEligibility()).rejects.toThrow('REDIRECT:/workspace/eligibility-result');
  expect(m.revalidate.mock.calls.map(c => c[0])).toEqual(['/workspace/apply', '/workspace/eligibility-result', '/workspace/activate']);
});
it.each([
  ['active','/workspace/dashboard'],['early_access','/workspace/dashboard'],['complimentary','/workspace/dashboard'],
  ['refunded','/workspace/dashboard'],['expired','/workspace/dashboard'],['grant_expired','/workspace/member'],
  ['eligibility_active','/workspace/activate'],['ineligible_cooldown','/workspace/eligibility-result'],['financial_review','/workspace/member'],
])('Creator entry delegates %s to the existing authoritative destination', async (state, destination) => {
  m.journey.mockResolvedValue({ state, destination });
  await expect(EligibilityPage()).rejects.toThrow('REDIRECT:' + destination);
  expect(m.config).not.toHaveBeenCalled();
});
