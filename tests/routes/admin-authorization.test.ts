import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({
  db: { query: { users: { findFirst: mocks.findUser } } },
}));

import { getAuthorizedAdminSession } from '@/lib/admin-authorization';

const session = {
  id: '00000000-0000-4000-8000-000000000031',
  phone: '919999999999',
  role: 'admin',
};

describe('persisted administrator authorization', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue(session);
    mocks.findUser.mockResolvedValue({ id: session.id, role: 'admin' });
  });

  it('rejects an invalid session without querying authorization state', async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(getAuthorizedAdminSession()).resolves.toBeNull();
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it('accepts a valid session when the persisted user is an exact admin', async () => {
    await expect(getAuthorizedAdminSession()).resolves.toEqual(session);
  });

  it.each([
    ['student', { id: session.id, role: 'student' }],
    ['deleted user', null],
    ['unexpected role', { id: session.id, role: 'owner' }],
  ])('rejects a stale admin JWT for a persisted %s', async (_label, user) => {
    mocks.findUser.mockResolvedValue(user);

    await expect(getAuthorizedAdminSession()).resolves.toBeNull();
  });

  it('fails closed when the authorization lookup fails', async () => {
    mocks.findUser.mockRejectedValue(new Error('synthetic database failure'));

    await expect(getAuthorizedAdminSession()).resolves.toBeNull();
  });

  it('uses persisted admin state even when the JWT role is stale student', async () => {
    mocks.getSession.mockResolvedValue({ ...session, role: 'student' });

    await expect(getAuthorizedAdminSession()).resolves.toEqual({ ...session, role: 'admin' });
  });
});
