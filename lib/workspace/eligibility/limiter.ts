import { createHmac } from 'node:crypto';

export type EligibilityLimit = { status: 'allowed' } | { status: 'limited'; retryAfter: number } | { status: 'unavailable' };
export const LIMIT_POLICY = { userMax: 20, userSeconds: 900, globalMax: 5000, globalSeconds: 3600 } as const;
const SCRIPT = `
local u = redis.call('INCR', KEYS[1])
if u == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
local g = redis.call('INCR', KEYS[2])
if g == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
if u > tonumber(ARGV[1]) or g > tonumber(ARGV[3]) then
 return {0, math.max(1, redis.call('TTL', KEYS[1]), redis.call('TTL', KEYS[2]))}
end
return {1, 0}`;
export async function consumeEligibilityLimit(userId: string): Promise<EligibilityLimit> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.JWT_SECRET;
  if (!url || !token || !secret) return { status: 'unavailable' };
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) return { status: 'unavailable' };
    const pseudonym = createHmac('sha256', secret).update(`workspace:eligibility:${userId}`).digest('hex');
    const response = await fetch(endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', SCRIPT, '2', `workspace:{eligibility}:user:${pseudonym}`, 'workspace:{eligibility}:global',
        String(LIMIT_POLICY.userMax), String(LIMIT_POLICY.userSeconds), String(LIMIT_POLICY.globalMax), String(LIMIT_POLICY.globalSeconds)]),
      signal: AbortSignal.timeout(3000), cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) return { status: 'unavailable' };
    const payload: unknown = await response.json();
    const result = payload && typeof payload === 'object' && 'result' in payload ? payload.result : null;
    if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) || !Number.isInteger(result[1]) || result[1] < 0 || result[1] > LIMIT_POLICY.globalSeconds) return { status: 'unavailable' };
    return result[0] === 1 ? { status: 'allowed' } : { status: 'limited', retryAfter: Math.max(1, result[1]) };
  } catch { return { status: 'unavailable' }; }
}
