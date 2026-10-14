import 'server-only';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { isLocalUatPhone, localUatOtpMode, localUatOtpStore } from './local-uat-otp';

// Recheck the actual application connection for each operation. No cached target assertion or fallback.
export async function localUatOtpProvider(phone: string) {
  if (localUatOtpMode() !== 'local' || !isLocalUatPhone(phone)) return null;
  try {
    const [identity] = await db.execute(sql`select current_database() as database,
      (select oid::text from pg_catalog.pg_database where datname=current_database()) as oid,
      (select system_identifier::text from pg_catalog.pg_control_system()) as system_identifier,
      pg_catalog.host(pg_catalog.inet_server_addr()) as address,current_setting('port') as port`);
    if (identity.database !== 'airbharath_lms' || identity.oid !== '16384' || identity.system_identifier !== '7680462735222304705' || identity.port !== '5433'
      || (identity.address !== null && !['127.0.0.1','::1'].includes(String(identity.address)))) return null;
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.phone,phone)).limit(1);
    if (user && user.role !== 'student') return null;
    return localUatOtpStore();
  } catch { return null; }
}
