import { localUatOtpMode } from './local-uat-otp';
import { localUatOtpProvider } from './local-uat-otp-provider';
import { createHash } from 'node:crypto';

export const OTP_RATE_LIMIT_POLICY = {
  send: {
    cooldownSeconds: 30,
    maxPerWindow: 5,
    windowSeconds: 60 * 60,
  },
  verify: {
    maxPerWindow: 10,
    windowSeconds: 10 * 60,
  },
} as const;

type RateLimitResult =
  | { status: 'allowed' }
  | { status: 'limited'; retryAfter: number }
  | { status: 'unavailable' };

type RedisCommand = [string, ...string[]];

function keyFor(scope: string, phone: string): string {
  const phoneHash = createHash('sha256').update(phone).digest('hex');
  return `otp:${scope}:${phoneHash}`;
}

function counterCommands(key: string, windowSeconds: number): RedisCommand[] {
  return [
    ['INCR', key],
    ['EXPIRE', key, String(windowSeconds), 'NX'],
  ];
}

function isValidPipelineEntry(entry: unknown): entry is { result: number } {
  if (!entry || typeof entry !== 'object' || !('result' in entry)) return false;
  const result = (entry as { result: unknown }).result;
  return Number.isInteger(result) && Number(result) >= 0;
}

async function runPipeline(commands: RedisCommand[]): Promise<number[] | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!Array.isArray(payload) || payload.length !== commands.length || !payload.every(isValidPipelineEntry)) {
      return null;
    }

    return payload.map((entry) => entry.result);
  } catch {
    return null;
  }
}

export async function consumeOtpRateLimit(
  operation: 'send' | 'verify',
  normalizedPhone: string,
): Promise<RateLimitResult> {
  if (localUatOtpMode() !== 'off') {
    const provider = await localUatOtpProvider(normalizedPhone);
    return provider ? provider.limit(operation,normalizedPhone,OTP_RATE_LIMIT_POLICY) : { status:'unavailable' };
  }
  if (operation === 'send') {
    const cooldownKey = keyFor('send-cooldown', normalizedPhone);
    const windowKey = keyFor('send-window', normalizedPhone);
    const results = await runPipeline([
      ...counterCommands(cooldownKey, OTP_RATE_LIMIT_POLICY.send.cooldownSeconds),
      ...counterCommands(windowKey, OTP_RATE_LIMIT_POLICY.send.windowSeconds),
    ]);
    if (!results) return { status: 'unavailable' };

    if (results[2] > OTP_RATE_LIMIT_POLICY.send.maxPerWindow) {
      return { status: 'limited', retryAfter: OTP_RATE_LIMIT_POLICY.send.windowSeconds };
    }
    if (results[0] > 1) {
      return { status: 'limited', retryAfter: OTP_RATE_LIMIT_POLICY.send.cooldownSeconds };
    }
    return { status: 'allowed' };
  }

  const verifyKey = keyFor('verify-window', normalizedPhone);
  const results = await runPipeline(
    counterCommands(verifyKey, OTP_RATE_LIMIT_POLICY.verify.windowSeconds),
  );
  if (!results) return { status: 'unavailable' };
  if (results[0] > OTP_RATE_LIMIT_POLICY.verify.maxPerWindow) {
    return { status: 'limited', retryAfter: OTP_RATE_LIMIT_POLICY.verify.windowSeconds };
  }
  return { status: 'allowed' };
}
