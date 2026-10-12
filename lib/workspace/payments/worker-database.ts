import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';

// Dedicated pool: never SET session limits on the shared LMS connection pool.
export function createFinancialWorkerDatabase(env: Record<string, string | undefined> = process.env, applicationName: 'workspace_financial_worker' | 'workspace_refund_notice_worker' = 'workspace_financial_worker') {
  const value = env.DATABASE_URL || env.POSTGRES_URL;
  if (!value) throw new Error('worker_database_unavailable');
  let target: URL;
  try { target = new URL(value); } catch { throw new Error('worker_database_unavailable'); }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error('worker_database_unavailable');
  const options = { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 5, onnotice: () => {},
    connection: { application_name: applicationName, statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000 } };
  // Match the repository's authorized local runtime socket, without its broad port substring heuristic.
  const localSocket = target.hostname === 'localhost' && target.port === '5433' && target.pathname === '/airbharath_lms';
  const client = localSocket ? postgres({ ...options, host: '/tmp', port: 5433, user: 'postgres', database: 'airbharath_lms' }) : postgres(value, options);
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 1 }) };
}
