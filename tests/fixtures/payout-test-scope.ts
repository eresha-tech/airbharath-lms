// Synthetic unit-test evidence only. Never used by the application or a provider transport.
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { db } from '@/lib/db';
export const testHash = (value: string) => createHash('sha256').update(value).digest('hex');
export function payoutTestFixture<T extends Record<string, string | undefined>>(values: T) {
 const directory = mkdtempSync(join(tmpdir(), 'abx-scope-unit-'));
 const env = { ...values, NODE_ENV: 'test', DATABASE_ENV: 'test', RAZORPAYX_TEST_AUTHORIZED: 'true',
  DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:55439/airbharath_test_synthetic', RAZORPAYX_TEST_SCOPE_FILE: join(directory, 'scope.json') };
 const row = { database_name: 'airbharath_test_synthetic', database_user: 'synthetic', database_oid: '16384', system_identifier: '1234567890123456789', address: '127.0.0.1', port: 55439 };
 const proof = { version: 1, runId: randomUUID(), expiresAt: new Date(Date.now() + 3600000).toISOString(),
  credentialHash: testHash(env.RAZORPAYX_KEY_ID + ':' + env.RAZORPAYX_KEY_SECRET), merchantId: env.RAZORPAYX_MERCHANT_ACCOUNT_ID,
  fundingFingerprint: testHash(env.RAZORPAYX_FUNDING_ACCOUNT_NUMBER ?? ''), databaseUrlHash: testHash(env.DATABASE_URL),
  systemIdentifier: row.system_identifier, databaseOid: row.database_oid, databaseName: row.database_name, databaseUser: row.database_user };
 const write = (changes = {}) => writeFileSync(env.RAZORPAYX_TEST_SCOPE_FILE, JSON.stringify({ ...proof, ...changes }), { mode: 0o600 });
 write();
 const database = { execute: async () => [row] } as unknown as Pick<typeof db, 'execute'>;
 return { env, proof, row, database, write, directory, dispose: () => rmSync(directory, { recursive: true }) };
}
