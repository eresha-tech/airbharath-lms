import { createHash } from 'node:crypto';
import type postgres from 'postgres';
import { createDatabaseClient, databaseConfiguration } from './configuration';

type SharedClient = { signature: string; sql: postgres.Sql };
const runtime = globalThis as typeof globalThis & { airbharathDatabase?: SharedClient };

// One lazy pool per process/isolate, including Next development module reloads.
// Configuration changes require restart; never reuse a pool pointing at a different target.
export function applicationDatabaseClient(env: Record<string, string | undefined> = process.env) {
  const options = databaseConfiguration(env);
  const signature = createHash('sha256').update(JSON.stringify({ ...options, password: env.DATABASE_URL ?? env.POSTGRES_URL })).digest('hex');
  if (runtime.airbharathDatabase) {
    if (runtime.airbharathDatabase.signature !== signature) throw new Error('database_configuration_changed_restart_required');
    return runtime.airbharathDatabase.sql;
  }
  const sql = createDatabaseClient(options);
  runtime.airbharathDatabase = { signature, sql };
  return sql;
}

// For controlled process shutdown/test teardown, never per HTTP request.
export async function closeApplicationDatabaseClient() {
  const current = runtime.airbharathDatabase;
  if (!current) return;
  await current.sql.end({ timeout: 5 });
  if (runtime.airbharathDatabase === current) delete runtime.airbharathDatabase;
}
