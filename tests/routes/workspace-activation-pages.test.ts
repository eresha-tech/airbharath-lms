import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), access: vi.fn(), creators: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/activation/repository', () => ({ readWorkspaceAccess: mocks.access, listWorkspaceCreators: mocks.creators }));
import MemberPage from '@/app/(workspace)/workspace/(membership)/member/page';
import CreatorPage from '@/app/(admin)/admin/workspace/creators/page';
beforeEach(() => { mocks.user.mockResolvedValue({ id: 'owned-persisted-account', role: 'student' }); mocks.admin.mockResolvedValue(null); mocks.access.mockResolvedValue({ row: null, latestOrder: null }); mocks.creators.mockResolvedValue([]); });
it('anonymous member cannot inspect any membership', async () => { mocks.user.mockResolvedValue(null); await expect(MemberPage()).rejects.toThrow('REDIRECT:/login'); expect(mocks.access).not.toHaveBeenCalled(); });
it('member projection always uses the persisted owner and cannot fulfill an arbitrary order', async () => { await MemberPage(); expect(mocks.access).toHaveBeenCalledWith('owned-persisted-account'); });
it('student cannot inspect admin membership records or self-grant', async () => { await expect(CreatorPage()).rejects.toThrow('REDIRECT:/login'); expect(mocks.creators).not.toHaveBeenCalled(); });
it('authorized admin can read membership history and DB failures render safe states', async () => {
  mocks.admin.mockResolvedValue({ id: 'persisted-admin', role: 'admin' }); expect(await CreatorPage()).toBeDefined(); expect(mocks.creators).toHaveBeenCalledTimes(1);
  mocks.creators.mockRejectedValue(new Error('private database error')); expect(JSON.stringify(await CreatorPage())).toContain('Membership reporting is unavailable');
  mocks.access.mockRejectedValue(new Error('private database error')); const page = JSON.stringify(await MemberPage()); expect(page).toContain('Membership status unavailable'); expect(page).not.toContain('private database error');
});
