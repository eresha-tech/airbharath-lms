import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/airbharath_lms';

// Disable prefetch for serverless / edge compatibility. If local port 5433 is detected, use unix socket /tmp
const client =
  connectionString.includes('localhost:5433') || connectionString.includes('5433')
    ? postgres({ host: '/tmp', port: 5433, user: 'postgres', database: 'airbharath_lms', prepare: false })
    : postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export * from './schema';
