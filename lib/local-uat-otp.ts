import 'server-only';
import { databaseConfiguration } from '@/lib/db/configuration';

// Owner-designated local development demos; registration never grants privileges.
export const LOCAL_UAT_PHONES = [
  '919876543222', '919000900009', '919696969696',
  '919876543223', '919876543224', '919876543225', '919876543226',
] as const;
const allowed = new Set<string>(LOCAL_UAT_PHONES);
export const isLocalUatPhone = (phone: string) => allowed.has(phone);
export function localUatOtpMode(env: Record<string, string | undefined> = process.env): 'off' | 'blocked' | 'local' {
  const flag = env.WORKSPACE_LOCAL_UAT_OTP_ENABLED;
  if (flag === undefined || flag === 'false') return 'off';
  if (flag !== 'true' || !['development', 'test'].includes(env.NODE_ENV ?? '') || env.DATABASE_ENV !== 'development'
    || env.VERCEL !== undefined || env.VERCEL_ENV !== undefined || env.VERCEL_TARGET_ENV !== undefined) return 'blocked';
  try {
    const options = databaseConfiguration(env);
    if (!['localhost','127.0.0.1','::1'].includes(options.host[0]) || options.port[0] !== 5433 || options.database !== 'airbharath_lms') return 'blocked';
    return 'local';
  } catch { return 'blocked'; }
}

export function localUatRequestAllowed(req: Request) {
  const valid = (value: string) => {
    try { const url = new URL(value); return url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.port === '3000' && !url.username && !url.password; }
    catch { return false; }
  };
  if (!valid(req.url) || req.headers.has('forwarded')) return false;
  for (const key of ['host','x-forwarded-host']) {
    const value = req.headers.get(key); if (value && !valid('http://' + value)) return false;
  }
  const origin = req.headers.get('origin');
  return !origin || valid(origin);
}

type Policy = { send: { cooldownSeconds: number; maxPerWindow: number; windowSeconds: number }; verify: { maxPerWindow: number; windowSeconds: number } };
type State = { expires: number; issued: boolean; sendWindow: number; sends: number; cooldown: number; verifyWindow: number; attempts: number };
export function createLocalUatOtpStore(now = () => Date.now()) {
  const records = new Map<string, State>();
  const record = (phone: string) => {
    if (!allowed.has(phone)) return null;
    let state = records.get(phone);
    if (!state) { state = { expires: 0, issued: false, sendWindow: 0, sends: 0, cooldown: 0, verifyWindow: 0, attempts: 0 }; records.set(phone,state); }
    return state;
  };
  return {
    limit(operation: 'send' | 'verify', phone: string, policy: Policy): { status: 'allowed' } | { status: 'limited'; retryAfter: number } | { status: 'unavailable' } {
      const state = record(phone); if (!state) return { status:'unavailable' };
      const time = now();
      if (operation === 'send') {
        if (time >= state.sendWindow) { state.sendWindow = time + policy.send.windowSeconds * 1000; state.sends = 0; }
        state.sends++;
        if (state.sends > policy.send.maxPerWindow) return { status:'limited', retryAfter:Math.max(1,Math.ceil((state.sendWindow-time)/1000)) };
        if (time < state.cooldown) return { status:'limited', retryAfter:Math.max(1,Math.ceil((state.cooldown-time)/1000)) };
        state.cooldown = time + policy.send.cooldownSeconds * 1000;
      } else {
        if (time >= state.verifyWindow) { state.verifyWindow = time + policy.verify.windowSeconds * 1000; state.attempts = 0; }
        state.attempts++;
        if (state.attempts > policy.verify.maxPerWindow) return { status:'limited', retryAfter:Math.max(1,Math.ceil((state.verifyWindow-time)/1000)) };
      }
      return { status:'allowed' };
    },
    send(phone: string) {
      const state = record(phone); if (!state) return false;
      state.expires = now() + 10 * 60 * 1000; state.issued = true; return true;
    },
    verify(phone: string, otp: unknown) {
      const state = record(phone);
      if (!state?.issued || now() >= state.expires || typeof otp !== 'string' || otp !== '1234') return false;
      state.issued = false; return true;
    },
  };
}
const runtime = globalThis as typeof globalThis & { airbharathLocalUatOtp?: ReturnType<typeof createLocalUatOtpStore> };
export const localUatOtpStore = () => runtime.airbharathLocalUatOtp ??= createLocalUatOtpStore();
