import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ session: vi.fn(), cookie: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getSession: m.session, setSessionCookie: m.cookie }));
vi.mock('@/lib/db', () => ({ db: { update: m.update } }));
import { POST } from '@/app/api/auth/update-profile/route';
const call = (email: unknown) => POST(new Request('http://localhost:3000/api/auth/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: ' Synthetic Creator ', email }) }));
beforeEach(() => {
    vi.resetAllMocks();
    m.session.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000101', role: 'student' });
    m.update.mockReturnValue({ set: m.set }); m.set.mockReturnValue({ where: m.where }); m.where.mockReturnValue({ returning: m.returning });
    m.returning.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000101', fullName: 'Synthetic Creator', email: 'creator@example.invalid' }]);
});
it.each(['bad', '', 'name@host', 'a..b@example.invalid', { unsafe: true }, null])('rejects malformed contact without changing identity or issuing a session', async email => {
    expect((await call(email)).status).toBe(400); expect(m.update).not.toHaveBeenCalled(); expect(m.cookie).not.toHaveBeenCalled();
});
it('saves a correctable normalized contact without fabricating email verification or changing role', async () => {
    expect((await call(' Creator@Example.invalid ')).status).toBe(200);
    expect(m.set).toHaveBeenCalledWith({ fullName: 'Synthetic Creator', email: 'creator@example.invalid' });
    expect(m.cookie).toHaveBeenCalledWith(expect.objectContaining({ role: 'student', email: 'creator@example.invalid' }));
    expect(m.cookie.mock.calls[0][0]).not.toHaveProperty('verifiedAt');
});
it('denies anonymous contact changes', async () => { m.session.mockResolvedValue(null); expect((await call('creator@example.invalid')).status).toBe(401); expect(m.update).not.toHaveBeenCalled(); });
it('does not disclose private database errors', async () => { m.returning.mockRejectedValue(Error('private database detail')); const r = await call('creator@example.invalid'); expect(r.status).toBe(500); expect(await r.text()).not.toContain('private database detail'); });
