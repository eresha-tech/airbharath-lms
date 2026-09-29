const DATABASE_ENVIRONMENTS = new Set([
  'development',
  'test',
  'staging',
  'production',
]);

const DESTRUCTIVE_DATABASE_ENVIRONMENTS = new Set(['development', 'test']);

function requireDatabaseEnvironment(databaseEnv) {
  if (!DATABASE_ENVIRONMENTS.has(databaseEnv)) {
    throw new Error(
      'DATABASE_ENV must explicitly be development, test, staging, or production.',
    );
  }

  return databaseEnv;
}

function parseDatabaseUrl(databaseUrl) {
  if (typeof databaseUrl !== 'string' || databaseUrl.length === 0) {
    throw new Error('DATABASE_URL is required for database operations.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL URL.');
  }

  if (
    !['postgres:', 'postgresql:'].includes(parsedUrl.protocol) ||
    !parsedUrl.hostname ||
    parsedUrl.pathname.length <= 1
  ) {
    throw new Error(
      'DATABASE_URL must identify a PostgreSQL host and database name.',
    );
  }

  return {
    hostname: parsedUrl.hostname,
    database: parsedUrl.pathname.slice(1),
  };
}

export function assertDestructiveDatabaseOperation({
  databaseEnv,
  databaseUrl,
  acknowledgement,
}) {
  const environment = requireDatabaseEnvironment(databaseEnv);

  if (!DESTRUCTIVE_DATABASE_ENVIRONMENTS.has(environment)) {
    throw new Error(
      'Destructive database operations are restricted to development and test.',
    );
  }

  const target = parseDatabaseUrl(databaseUrl);

  if (acknowledgement !== 'true') {
    throw new Error(
      'Set ALLOW_DESTRUCTIVE_DB_OPERATION=true to acknowledge this destructive operation.',
    );
  }

  return { environment, ...target };
}

export function assertDatabaseMigration({
  databaseEnv,
  databaseUrl,
  acknowledgement,
}) {
  const environment = requireDatabaseEnvironment(databaseEnv);
  const target = parseDatabaseUrl(databaseUrl);

  if (acknowledgement !== 'true') {
    throw new Error(
      'Set ALLOW_DATABASE_MIGRATION=true to authorize this versioned migration.',
    );
  }

  return { environment, ...target };
}
