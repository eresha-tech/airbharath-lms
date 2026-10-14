import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isLocalUatPhone, localUatOtpMode, localUatRequestAllowed } from './local-uat-otp';
import { localUatOtpProvider } from './local-uat-otp-provider';
import type { EligibilityLimit } from './workspace/eligibility/limiter';

type Policy = { userMax: number; userSeconds: number; globalMax: number; globalSeconds: number };
type Window = { until: number; count: number };

// Bounded to the three local demos. Restart resets these development-only counters.
export function createLocalUatEligibilityLimiter(clock = () => Date.now()) {
  const users = new Map<string, Window>();
  let global: Window = { until: 0, count: 0 };
  return (phone: string, policy: Policy): EligibilityLimit => {
    if (!isLocalUatPhone(phone)) return { status: 'unavailable' };
    const now = clock();
    let user = users.get(phone);
    if (!user || now >= user.until) {
      user = { until: now + policy.userSeconds * 1000, count: 0 };
      users.set(phone, user);
    }
    if (now >= global.until) global = { until: now + policy.globalSeconds * 1000, count: 0 };
    user.count++;
    global.count++;
    if (user.count > policy.userMax || global.count > policy.globalMax) {
      return { status: 'limited', retryAfter: Math.max(1, Math.ceil((Math.max(user.until, global.until) - now) / 1000)) };
    }
    return { status: 'allowed' };
  };
}

const runtime = globalThis as typeof globalThis & { airbharathLocalUatEligibilityLimit?: ReturnType<typeof createLocalUatEligibilityLimiter> };
export async function consumeLocalUatEligibilityLimit(userId: string, policy: Policy, request?: Request): Promise<EligibilityLimit> {
  if (process.env.WORKSPACE_LOCAL_UAT_ELIGIBILITY_LIMITER_ENABLED !== 'true' || localUatOtpMode() !== 'local'
    || !request || !localUatRequestAllowed(request)) return { status: 'unavailable' };
  try {
    const [user] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1);
    // Reuse actual server-identity, allowlist and persisted student-role verification.
    if (!user?.phone || !await localUatOtpProvider(user.phone)) return { status: 'unavailable' };
    const limit = runtime.airbharathLocalUatEligibilityLimit ??= createLocalUatEligibilityLimiter();
    return limit(user.phone, policy);
  } catch { return { status: 'unavailable' }; }
}
