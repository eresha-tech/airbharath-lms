import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OTP_RATE_LIMIT_POLICY,
  consumeOtpRateLimit,
} from '@/lib/otp-rate-limit';

const phone = '919876543210';

function pipelineResponse(results: unknown[]) {
  return new Response(JSON.stringify(results.map((result) => ({ result }))), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('OTP rate-limit policy', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.invalid');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'synthetic-redis-token');
  });

  it('allows a send when both atomic counters are under their limits', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineResponse([1, 1, 1, 1])));

    await expect(consumeOtpRateLimit('send', phone)).resolves.toEqual({ status: 'allowed' });
  });

  it('limits sends during the cooldown and across the hourly window', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(pipelineResponse([2, 1, 2, 1]))
      .mockResolvedValueOnce(pipelineResponse([1, 1, OTP_RATE_LIMIT_POLICY.send.maxPerWindow + 1, 1])));

    await expect(consumeOtpRateLimit('send', phone)).resolves.toEqual({
      status: 'limited',
      retryAfter: OTP_RATE_LIMIT_POLICY.send.cooldownSeconds,
    });
    await expect(consumeOtpRateLimit('send', phone)).resolves.toEqual({
      status: 'limited',
      retryAfter: OTP_RATE_LIMIT_POLICY.send.windowSeconds,
    });
  });

  it('limits verification attempts at the configured threshold', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pipelineResponse([
      OTP_RATE_LIMIT_POLICY.verify.maxPerWindow + 1,
      1,
    ])));

    await expect(consumeOtpRateLimit('verify', phone)).resolves.toEqual({
      status: 'limited',
      retryAfter: OTP_RATE_LIMIT_POLICY.verify.windowSeconds,
    });
  });

  it('fails closed when Redis configuration is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;

    await expect(consumeOtpRateLimit('send', phone)).resolves.toEqual({ status: 'unavailable' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['network failure', () => Promise.reject(new Error('synthetic Redis failure'))],
    ['malformed response', () => Promise.resolve(pipelineResponse(['not-a-count', 1]))],
  ])('fails closed on %s', async (_label, response) => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(response));

    await expect(consumeOtpRateLimit('verify', phone)).resolves.toEqual({ status: 'unavailable' });
  });

  it('uses atomic INCR counters with expirations and does not store the phone in the key', async () => {
    const fetchMock = vi.fn().mockResolvedValue(pipelineResponse([1, 1, 1, 1]));
    vi.stubGlobal('fetch', fetchMock);

    await consumeOtpRateLimit('send', phone);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const commands = JSON.parse(String(options.body));
    expect(url).toBe('https://redis.invalid/pipeline');
    expect(commands).toHaveLength(4);
    expect(commands[0][0]).toBe('INCR');
    expect(commands[1]).toEqual(['EXPIRE', commands[0][1], String(OTP_RATE_LIMIT_POLICY.send.cooldownSeconds), 'NX']);
    expect(commands[2][0]).toBe('INCR');
    expect(commands[3]).toEqual(['EXPIRE', commands[2][1], String(OTP_RATE_LIMIT_POLICY.send.windowSeconds), 'NX']);
    expect(JSON.stringify(commands)).not.toContain(phone);
  });
});
