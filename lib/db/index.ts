import { drizzle } from 'drizzle-orm/postgres-js';
import { applicationDatabaseClient } from './client';
import * as schema from './schema';

export const db = drizzle(applicationDatabaseClient(), { schema });
export * from './schema';
