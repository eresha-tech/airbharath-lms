import { afterEach, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
const mocks = vi.hoisted(() => ({ postgres: vi.fn<(options: postgres.Options<Record<string, postgres.PostgresType>>) => { end: ReturnType<typeof vi.fn>; unsafe: ReturnType<typeof vi.fn> }>(), drizzle: vi.fn(() => ({})), end: vi.fn(async () => {}), unsafe: vi.fn(async () => { throw Error('synthetic_connect_failure'); }) }));
vi.mock('postgres', () => ({ default: mocks.postgres }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: mocks.drizzle }));
import { applicationDatabaseClient, closeApplicationDatabaseClient } from '@/lib/db/client';
const env = { DATABASE_ENV: 'development', DATABASE_URL: 'postgresql://synthetic:secret5433@remote.example.invalid/catalog' };
afterEach(async () => { await closeApplicationDatabaseClient(); vi.resetModules(); });
function setup() { mocks.postgres.mockReturnValue({ end: mocks.end, unsafe: mocks.unsafe }); }
it('does not send a remote URL containing 5433 in its password to a local socket', async () => {
  setup(); vi.stubEnv('DATABASE_ENV', 'development'); vi.stubEnv('DATABASE_URL', env.DATABASE_URL);
  await import('@/lib/db');
  expect(mocks.postgres).toHaveBeenCalledWith(expect.objectContaining({ host: ['remote.example.invalid'], path: undefined }));
});
it('reuses one web pool across calls and module reloads, then closes explicitly', async () => {
  setup(); const client = applicationDatabaseClient(env);
  expect(applicationDatabaseClient(env)).toBe(client);
  vi.resetModules(); const reload = await import('@/lib/db/client');
  expect(reload.applicationDatabaseClient(env)).toBe(client); expect(mocks.postgres).toHaveBeenCalledTimes(1);
  await reload.closeApplicationDatabaseClient(); expect(mocks.end).toHaveBeenCalledWith({ timeout: 5 });
});
it('rejects target changes and invalid configuration even when a pool already exists', () => {
  setup(); applicationDatabaseClient(env);
  expect(() => applicationDatabaseClient({ ...env, DATABASE_URL: env.DATABASE_URL.replace('catalog', 'other') })).toThrow('database_configuration_changed_restart_required');
  expect(() => applicationDatabaseClient({ DATABASE_ENV: 'production' })).toThrow('database_configuration_invalid');
  expect(mocks.postgres).toHaveBeenCalledTimes(1);
});
it('never falls back to local credentials or creates a second target on connection failure', async () => {
  setup(); const client = applicationDatabaseClient(env);
  await expect(client.unsafe('select 1')).rejects.toThrow('synthetic_connect_failure');
  expect(applicationDatabaseClient(env)).toBe(client); expect(mocks.postgres).toHaveBeenCalledTimes(1);
  expect(mocks.postgres.mock.calls[0][0].host).toEqual(['remote.example.invalid']);
});
it('rejects a missing URL without constructing a client', () => {
  setup(); expect(() => applicationDatabaseClient({ DATABASE_ENV: 'production', NODE_ENV: 'production' })).toThrow('database_configuration_invalid');
  expect(mocks.postgres).not.toHaveBeenCalled();
});
