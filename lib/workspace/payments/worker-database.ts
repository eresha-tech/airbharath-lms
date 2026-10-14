import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';
import { createDatabaseClient, databaseConfiguration } from '@/lib/db/configuration';

// Dedicated pool: never SET session limits on the shared LMS connection pool.
export function createFinancialWorkerDatabase(env: Record<string, string | undefined> = process.env, applicationName: 'workspace_financial_worker' | 'workspace_refund_notice_worker' = 'workspace_financial_worker') {
  let options: ReturnType<typeof databaseConfiguration>;
  try { options = databaseConfiguration(env, 'worker', applicationName); }
  catch { throw new Error('worker_database_unavailable'); }
  const client = createDatabaseClient(options);
  return { db: drizzle(client, { schema }), close: () => client.end({ timeout: 1 }) };
}
