import { afterEach, beforeEach, vi } from 'vitest';

const blockedFetch = vi.fn(async () => {
  throw new Error('Network access is blocked in tests');
});

const sensitiveEnvironmentVariables = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_WEBHOOK_SECRET',
  'MSG91_AUTH_KEY',
  'MSG91_TEMPLATE_ID',
  'OTP_PROVIDER_AUTHKEY',
  'OTP_PROVIDER_URL',
  'RAZORPAY_KEY_SECRET',
  'JWT_SECRET',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'MAILERCLOUD_API_KEY',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
];

beforeEach(() => {
  for (const variable of sensitiveEnvironmentVariables) {
    delete process.env[variable];
  }
  vi.stubGlobal('fetch', blockedFetch);
});

afterEach(() => {
  blockedFetch.mockClear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
