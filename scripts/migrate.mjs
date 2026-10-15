import { spawnSync } from 'node:child_process';

import { assertDatabaseMigration } from './database-safety.mjs';

assertDatabaseMigration({
  databaseEnv: process.env.DATABASE_ENV,
  databaseUrl: process.env.DATABASE_URL,
  acknowledgement: process.env.ALLOW_DATABASE_MIGRATION,
});

const migration = spawnSync('drizzle-kit', ['migrate'], {
  stdio: 'inherit',
  env: process.env,
});

if (migration.error) {
  console.error('Unable to start the installed Drizzle migration tool.');
  process.exit(1);
}

process.exit(migration.status ?? 1);
