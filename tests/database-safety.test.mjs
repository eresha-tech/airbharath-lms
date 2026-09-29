import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertDatabaseMigration,
  assertDestructiveDatabaseOperation,
} from '../scripts/database-safety.mjs';

const syntheticUrl =
  'postgresql://synthetic-user:synthetic-password@database.example.invalid:5432/airbharath_test';

function destructive(overrides = {}) {
  return assertDestructiveDatabaseOperation({
    databaseEnv: 'development',
    databaseUrl: syntheticUrl,
    acknowledgement: 'true',
    ...overrides,
  });
}

test('rejects a missing DATABASE_ENV', () => {
  assert.throws(() => destructive({ databaseEnv: undefined }), /DATABASE_ENV/);
});

test('rejects production destructive operations', () => {
  assert.throws(() => destructive({ databaseEnv: 'production' }), /restricted/);
});

test('rejects staging destructive operations', () => {
  assert.throws(() => destructive({ databaseEnv: 'staging' }), /restricted/);
});

test('rejects a missing DATABASE_URL', () => {
  assert.throws(() => destructive({ databaseUrl: undefined }), /DATABASE_URL/);
});

test('rejects a malformed DATABASE_URL', () => {
  assert.throws(() => destructive({ databaseUrl: 'not-a-database-url' }), /DATABASE_URL/);
});

test('rejects a missing destructive-operation acknowledgement', () => {
  assert.throws(() => destructive({ acknowledgement: undefined }), /ALLOW_DESTRUCTIVE/);
});

test('accepts an explicitly acknowledged development target', () => {
  assert.equal(destructive().environment, 'development');
});

test('accepts an explicitly acknowledged test target', () => {
  assert.equal(destructive({ databaseEnv: 'test' }).environment, 'test');
});

test('URL errors never expose an embedded password', () => {
  const password = 'never-expose-this-password';

  assert.throws(
    () => destructive({ databaseUrl: `not-a-url:${password}` }),
    (error) => !error.message.includes(password),
  );
});

test('a Neon hostname is not automatically classified as production', () => {
  const result = destructive({
    databaseEnv: 'test',
    databaseUrl:
      'postgresql://synthetic-user:synthetic-password@synthetic-branch.neon.tech/airbharath_test',
  });

  assert.equal(result.environment, 'test');
  assert.equal(result.hostname, 'synthetic-branch.neon.tech');
});

test('migration guard requires a separate explicit acknowledgement', () => {
  assert.throws(
    () =>
      assertDatabaseMigration({
        databaseEnv: 'development',
        databaseUrl: syntheticUrl,
      }),
    /ALLOW_DATABASE_MIGRATION/,
  );
});

test('migration guard accepts a valid explicitly authorized target', () => {
  const result = assertDatabaseMigration({
    databaseEnv: 'staging',
    databaseUrl: syntheticUrl,
    acknowledgement: 'true',
  });

  assert.equal(result.environment, 'staging');
});
