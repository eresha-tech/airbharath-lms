import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ postgres: vi.fn(), drizzle: vi.fn(), end: vi.fn() }));
vi.mock('postgres', () => ({ default: mocks.postgres }));
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: mocks.drizzle }));
import { createFinancialWorkerDatabase } from '@/lib/workspace/payments/worker-database';
beforeEach(() => { mocks.postgres.mockReturnValue({ end: mocks.end }); mocks.drizzle.mockReturnValue({}); });
it('uses a dedicated bounded pool matching the authorized local socket', async () => {
  const worker = createFinancialWorkerDatabase({ DATABASE_ENV: 'development', DATABASE_LOCAL_SOCKET_PATH: '/tmp', DATABASE_URL: 'postgresql://synthetic:synthetic@localhost:5433/airbharath_lms' });
  expect(mocks.postgres).toHaveBeenCalledWith(expect.objectContaining({ host: ['localhost'], port: [5433], path: '/tmp/.s.PGSQL.5433', database: 'airbharath_lms', max: 1, connect_timeout: 5, connection: expect.objectContaining({ application_name: 'workspace_financial_worker', statement_timeout: 5000, lock_timeout: 2000, idle_in_transaction_session_timeout: 5000 }) }));
  await worker.close(); expect(mocks.end).toHaveBeenCalledWith({ timeout: 1 });
});
it('keeps other database targets on their exact configured connection rather than guessing a local port', () => {
  const value = 'postgresql://synthetic:synthetic@example.invalid:5433/isolated';
  createFinancialWorkerDatabase({ DATABASE_ENV: 'development', DATABASE_URL: value });
  expect(mocks.postgres).toHaveBeenCalledWith(expect.objectContaining({ host: ['example.invalid'], port: [5433], path: undefined, max: 1, connection: expect.objectContaining({ lock_timeout: 2000 }) }));
});
it('rejects missing or invalid connection configuration without leaking it', () => {
  for (const DATABASE_URL of [undefined, 'invalid-private-detail', 'https://example.invalid']) expect(() => createFinancialWorkerDatabase({ DATABASE_URL })).toThrow('worker_database_unavailable');
  expect(mocks.postgres).not.toHaveBeenCalled();
});
