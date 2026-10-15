import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ identity: vi.fn(), query: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { execute: mocks.identity, select: () => ({ from: () => ({ where: () => ({ limit: mocks.query }) }) }) } }));
import { consumeEligibilityLimit, LIMIT_POLICY } from '@/lib/workspace/eligibility/limiter';
import { createLocalUatEligibilityLimiter } from '@/lib/local-uat-eligibility-limit';
import { LOCAL_UAT_PHONES } from '@/lib/local-uat-otp';
const id = '00000000-0000-4000-8000-000000000123';
const request = () => new Request('http://localhost:3000/api/workspace/eligibility');
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('DATABASE_ENV', 'development');
  vi.stubEnv('DATABASE_URL', 'postgresql://synthetic:synthetic@localhost:5433/airbharath_lms');
  vi.stubEnv('WORKSPACE_LOCAL_UAT_OTP_ENABLED', 'true'); vi.stubEnv('WORKSPACE_LOCAL_UAT_ELIGIBILITY_LIMITER_ENABLED', 'true');
  delete (globalThis as typeof globalThis & { airbharathLocalUatEligibilityLimit?: unknown }).airbharathLocalUatEligibilityLimit;
  mocks.identity.mockResolvedValue([{ database: 'airbharath_lms', oid: '16384', system_identifier: '7680462735222304705', address: '127.0.0.1', port: '5433' }]);
  mocks.query.mockResolvedValue([{ phone: LOCAL_UAT_PHONES[0], role: 'student' }]);
});
it('requires actual local identity and allowlisted student, with no Redis call', async () => {
  expect(await consumeEligibilityLimit(id, request())).toEqual({ status: 'allowed' });
  expect(mocks.identity).toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
});
it('keeps the existing 20-per-15-minute user window and independent global window', () => {
  let time = 1000; const limit = createLocalUatEligibilityLimiter(() => time);
  for (let i = 0; i < LIMIT_POLICY.userMax; i++) expect(limit(LOCAL_UAT_PHONES[0], LIMIT_POLICY).status).toBe('allowed');
  expect(limit(LOCAL_UAT_PHONES[0], LIMIT_POLICY)).toEqual({ status: 'limited', retryAfter: 3600 });
  expect(limit(LOCAL_UAT_PHONES[1], LIMIT_POLICY).status).toBe('allowed');
  time += LIMIT_POLICY.userSeconds * 1000;
  expect(limit(LOCAL_UAT_PHONES[0], LIMIT_POLICY).status).toBe('allowed');
  const globalLimit = createLocalUatEligibilityLimiter(() => time), policy = { ...LIMIT_POLICY, globalMax: 2 };
  expect(globalLimit(LOCAL_UAT_PHONES[0], policy).status).toBe('allowed');
  expect(globalLimit(LOCAL_UAT_PHONES[1], policy).status).toBe('allowed');
  expect(globalLimit(LOCAL_UAT_PHONES[2], policy).status).toBe('limited');
  expect(globalLimit('919123456781', policy).status).toBe('unavailable');
});
it.each([{ NODE_ENV: 'production' }, { DATABASE_ENV: 'staging' }, { DATABASE_ENV: 'production' }, { VERCEL: '1' }, { WORKSPACE_LOCAL_UAT_OTP_ENABLED: 'false' }, { WORKSPACE_LOCAL_UAT_ELIGIBILITY_LIMITER_ENABLED: 'yes' }, { DATABASE_URL: 'postgresql://synthetic:synthetic@neon.invalid:5433/airbharath_lms' }])('refuses misplaced local activation in %j, without Redis fallback', async values => {
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
  expect(await consumeEligibilityLimit(id, request())).toEqual({ status: 'unavailable' });
  expect(fetch).not.toHaveBeenCalled(); expect(mocks.identity).not.toHaveBeenCalled();
});
it('refuses missing/tunneled requests, wrong identity, unknown user and Admin', async () => {
  expect(await consumeEligibilityLimit(id)).toEqual({ status: 'unavailable' });
  expect(await consumeEligibilityLimit(id, new Request('https://tunnel.trycloudflare.com/api/workspace/eligibility'))).toEqual({ status: 'unavailable' });
  mocks.identity.mockResolvedValueOnce([{ database: 'other' }]);
  expect(await consumeEligibilityLimit(id, request())).toEqual({ status: 'unavailable' });
  mocks.query.mockResolvedValueOnce([]);
  expect(await consumeEligibilityLimit(id, request())).toEqual({ status: 'unavailable' });
  mocks.query.mockResolvedValueOnce([{ phone: LOCAL_UAT_PHONES[0] }]).mockResolvedValueOnce([{ role: 'admin' }]);
  expect(await consumeEligibilityLimit(id, request())).toEqual({ status: 'unavailable' }); expect(fetch).not.toHaveBeenCalled();
});
