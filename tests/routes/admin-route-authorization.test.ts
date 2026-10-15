import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  findUser: vi.fn(),
  findEnrollment: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: { findFirst: mocks.findUser },
      enrollments: { findFirst: mocks.findEnrollment },
    },
    update: mocks.update,
  },
}));

import { POST } from '@/app/api/admin/extend-access/route';

describe('POST /api/admin/extend-access authorization', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000041',
      phone: '919999999999',
      role: 'admin',
    });
    mocks.findUser.mockResolvedValue({
      id: '00000000-0000-4000-8000-000000000041',
      role: 'student',
    });
  });

  it('rejects a stale admin JWT after demotion without reading or mutating enrollment data', async () => {
    const response = await POST(new Request('http://test.invalid/api/admin/extend-access', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        enrollmentId: '00000000-0000-4000-8000-000000000042',
        additionalDays: 30,
      }),
    }));

    expect(response.status).toBe(403);
    expect(mocks.findUser).toHaveBeenCalledTimes(1);
    expect(mocks.findEnrollment).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
