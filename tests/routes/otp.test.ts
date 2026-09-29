import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  insertUser: vi.fn(),
  insertValues: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    query: { users: { findFirst: mocks.findUser } },
    insert: mocks.insertUser,
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: mocks.cookieSet,
    delete: mocks.cookieDelete,
  })),
}));

import { POST as sendOtp } from '@/app/api/auth/send-otp/route';
import { POST as verifyOtp } from '@/app/api/auth/verify-otp/route';
import { verifySessionToken } from '@/lib/auth';

const phone = '9876543210';
const formattedPhone = `91${phone}`;
const otp = '246810';
const jwtSecret = 'synthetic-jwt-secret-that-is-long-enough-for-tests';
const providerKey = 'synthetic-provider-key';

function request(path: string, body: unknown) {
  return new Request(`http://test.invalid${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function providerResponse(type: 'success' | 'error', status = 200) {
  return new Response(JSON.stringify({ type }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function rateLimitResponse(results: number[]) {
  return new Response(JSON.stringify(results.map((result) => ({ result }))), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function persistedUser(role: string): {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  role: string;
} {
  return {
    id: '00000000-0000-4000-8000-000000000021',
    phone: formattedPhone,
    email: null,
    fullName: 'Synthetic User',
    role,
  };
}

function insertReturning(user: ReturnType<typeof persistedUser>) {
  return {
    values: mocks.insertValues.mockImplementation(() => ({
      returning: vi.fn().mockResolvedValue([user]),
    })),
  };
}

function successfulProvider() {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(rateLimitResponse([1, 1]))
    .mockResolvedValueOnce(providerResponse('success')));
}

async function sessionFromCookie() {
  expect(mocks.cookieSet).toHaveBeenCalledTimes(1);
  const token = mocks.cookieSet.mock.calls[0][1] as string;
  return await verifySessionToken(token);
}

describe('OTP route security boundaries', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', jwtSecret);
    vi.stubEnv('OTP_PROVIDER_AUTHKEY', providerKey);
    vi.stubEnv('MSG91_TEMPLATE_ID', 'synthetic-template-id');
    vi.stubEnv('OTP_PROVIDER_URL', 'https://provider.invalid');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.invalid');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'synthetic-redis-token');
    mocks.findUser.mockResolvedValue(null);
    mocks.insertUser.mockImplementation(() => insertReturning(persistedUser('student')));
  });

  it('fails closed when send-provider configuration is missing', async () => {
    delete process.env.OTP_PROVIDER_AUTHKEY;
    delete process.env.MSG91_AUTH_KEY;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rateLimitResponse([1, 1, 1, 1])));

    const response = await sendOtp(request('/api/auth/send-otp', { phone }));

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the send provider rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(rateLimitResponse([1, 1, 1, 1]))
      .mockResolvedValueOnce(providerResponse('error', 401)));

    const response = await sendOtp(request('/api/auth/send-otp', { phone }));

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fails closed when verification-provider configuration is missing in every runtime mode', async () => {
    delete process.env.OTP_PROVIDER_AUTHKEY;
    delete process.env.MSG91_AUTH_KEY;
    vi.stubGlobal('fetch', vi.fn()
      .mockImplementation(() => Promise.resolve(rateLimitResponse([1, 1]))));

    for (const mode of ['development', 'test', 'production']) {
      vi.stubEnv('NODE_ENV', mode);
      const response = await verifyOtp(request('/api/auth/verify-otp', { phone, otp }));
      expect(response.status).toBe(400);
    }

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.insertUser).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it('does not create a user or session when provider verification fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(rateLimitResponse([1, 1]))
      .mockResolvedValueOnce(providerResponse('error')));

    const response = await verifyOtp(request('/api/auth/verify-otp', { phone, otp }));

    expect(response.status).toBe(400);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.insertUser).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it('creates a provider-verified new user with the student role and a student session', async () => {
    successfulProvider();
    const newUser = persistedUser('student');
    mocks.insertUser.mockImplementation(() => insertReturning(newUser));

    const response = await verifyOtp(request('/api/auth/verify-otp', { phone, otp }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.isNewUser).toBe(true);
    expect(mocks.findUser).toHaveBeenCalledTimes(1);
    expect(mocks.insertUser).toHaveBeenCalledTimes(1);
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      phone: formattedPhone,
      role: 'student',
    }));
    expect((await sessionFromCookie())?.role).toBe('student');
  });

  it.each([
    ['student', 'student'],
    ['admin', 'admin'],
    ['unexpected-role', 'student'],
  ])('derives the %s persisted role as a %s session role', async (persistedRole, sessionRole) => {
    successfulProvider();
    mocks.findUser.mockResolvedValue(persistedUser(persistedRole));

    const response = await verifyOtp(request('/api/auth/verify-otp', { phone, otp }));

    expect(response.status).toBe(200);
    expect(mocks.insertUser).not.toHaveBeenCalled();
    expect((await sessionFromCookie())?.role).toBe(sessionRole);
  });

  it('does not derive admin access from a phone number alone', async () => {
    successfulProvider();
    const phoneOnlyUser = { ...persistedUser('student'), fullName: null };
    mocks.insertUser.mockImplementation(() => insertReturning(phoneOnlyUser));

    const response = await verifyOtp(request('/api/auth/verify-otp', {
      phone: '9999999999',
      otp,
    }));

    expect(response.status).toBe(200);
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ role: 'student' }));
    expect((await sessionFromCookie())?.role).toBe('student');
  });

  it('allows a send under the limit and then calls the provider', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimitResponse([1, 1, 1, 1]))
      .mockResolvedValueOnce(providerResponse('success'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await sendOtp(request('/api/auth/send-otp', { phone }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('redis.invalid/pipeline');
    expect(String(fetchMock.mock.calls[1][0])).toContain('provider.invalid');
  });

  it('returns 429 when repeated sends reach the limit without a second provider call', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(rateLimitResponse([1, 1, 1, 1]))
      .mockResolvedValueOnce(providerResponse('success'))
      .mockResolvedValueOnce(rateLimitResponse([2, 1, 2, 1]));
    vi.stubGlobal('fetch', fetchMock);

    const first = await sendOtp(request('/api/auth/send-otp', { phone }));
    const limited = await sendOtp(request('/api/auth/send-otp', { phone }));

    expect(first.status).toBe(200);
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('30');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns 429 for limited verification without calling the provider or issuing a session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(rateLimitResponse([11, 1]));
    vi.stubGlobal('fetch', fetchMock);

    const response = await verifyOtp(request('/api/auth/verify-otp', { phone, otp }));

    expect(response.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.insertUser).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it.each([
    ['send', sendOtp, '/api/auth/send-otp', { phone }],
    ['verify', verifyOtp, '/api/auth/verify-otp', { phone, otp }],
  ])('fails closed when the %s limiter is unavailable', async (_label, handler, path, body) => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('synthetic Redis failure')));

    const response = await handler(request(path, body));

    expect(response.status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });

  it.each([
    ['send', sendOtp, '/api/auth/send-otp', { phone }],
    ['verify', verifyOtp, '/api/auth/verify-otp', { phone, otp }],
  ])('fails closed before %s when Redis configuration is missing', async (_label, handler, path, body) => {
    delete process.env.UPSTASH_REDIS_REST_URL;

    const response = await handler(request(path, body));

    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});
