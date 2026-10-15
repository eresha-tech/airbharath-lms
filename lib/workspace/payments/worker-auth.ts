import 'server-only';
import { timingSafeEqual } from 'node:crypto';
export function financialWorkerAuthorized(request: Request, env: Record<string, string | undefined> = process.env) {
  const secret = env.CRON_SECRET;
  const supplied = request.headers.get('authorization') || '';
  if (!secret || secret.length < 32 || !supplied.startsWith('Bearer ')) return false;
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
