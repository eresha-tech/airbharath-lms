import { expect, it, vi } from 'vitest';
import { consumeEligibilityLimit } from '@/lib/workspace/eligibility/limiter';
import { userId } from './workspace-eligibility-fixtures';
function config() { vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.test'); vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'synthetic-test-token'); vi.stubEnv('JWT_SECRET', 'synthetic-test-secret'); }
it('fails closed with missing provider configuration', async () => { expect(await consumeEligibilityLimit(userId)).toEqual({ status: 'unavailable' }); });
it('uses one atomic Workspace script, opaque user key and shared cluster namespace', async () => {
  config(); const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: [1, 0] }))); vi.stubGlobal('fetch', fetch);
  expect(await consumeEligibilityLimit(userId)).toEqual({ status: 'allowed' });
  const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body[0]).toBe('EVAL'); expect(body[1]).toContain("redis.call('INCR'"); expect(body[2]).toBe('2');
  expect(body[3]).toMatch(/^workspace:\{eligibility\}:user:[a-f0-9]{64}$/); expect(body[4]).toBe('workspace:{eligibility}:global'); expect(JSON.stringify(body)).not.toContain(userId);
});
it.each([{ result: [0, 75] }, { result: [0, -1] }, { result: [1, '0'] }, { error: 'private' }])('validates provider response %#', async payload => {
  config(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
  expect(await consumeEligibilityLimit(userId)).toEqual(payload.result?.[1] === 75 ? { status: 'limited', retryAfter: 75 } : { status: 'unavailable' });
});
it('provider exceptions and non-HTTPS configuration fail closed', async () => {
  config(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout'))); expect(await consumeEligibilityLimit(userId)).toEqual({ status: 'unavailable' });
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'http://redis.example.test'); expect(await consumeEligibilityLimit(userId)).toEqual({ status: 'unavailable' });
});
