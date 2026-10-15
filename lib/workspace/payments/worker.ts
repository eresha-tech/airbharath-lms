import 'server-only';
import { financialConfiguration, requireFinancialConfiguration } from './configuration';
import { createRazorpayAdapter } from './provider';
import { classifyWorkspaceRuntime } from './classification';
import { createFinancialWorkerDatabase } from './worker-database';
import type { ProviderContext } from './model';

export interface FinancialWorkerTasks {
  payments(limit: number): Promise<unknown>;
  refunds?(limit: number): Promise<unknown>;
  activation(limit: number): Promise<unknown>;
}

// Cooperative deadline is also passed to every provider HTTP call. PostgreSQL remains recovery truth.
export async function drainFinancialWork(tasks: FinancialWorkerTasks, signal: AbortSignal, limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('worker_invalid_limit');
  const result = { payments: 'not_started', refunds: 'not_started', activation: 'not_started' };
  for (const name of ['payments', 'refunds', 'activation'] as const) {
    if (signal.aborted) break;
    const task = tasks[name]; if (!task) continue;
    try { await task(limit); result[name] = 'visited'; }
    catch { result[name] = 'retry_required'; }
  }
  return result;
}

export async function runWorkspaceFinancialWorker() {
  const config = requireFinancialConfiguration('reconciliation');
  const signal = AbortSignal.timeout(40_000);
  const provider = createRazorpayAdapter(process.env, fetch, signal);
  const [{ createPostgresFinanceStore }, { createWorkspacePaymentService }, { createRefundService }, { createPostgresRefundStore }, { createRefundEventProcessor }, { createWorkspaceActivationService }, { createPostgresActivationStore }] = await Promise.all([
    import('./repository'), import('./service'), import('../refunds/service'), import('../refunds/repository'), import('../refunds/events'), import('../activation/service'), import('../activation/repository'),
  ]);
  const database = createFinancialWorkerDatabase();
  try {
    const postgresFinanceStore = createPostgresFinanceStore(database.db), postgresRefundStore = createPostgresRefundStore(database.db), postgresActivationStore = createPostgresActivationStore(database.db);
    const refunds = financialConfiguration('refund_reconciliation') ? createRefundService(postgresRefundStore, provider) : null;
    const payments = createWorkspacePaymentService(postgresFinanceStore, provider, undefined, undefined, refunds ? createRefundEventProcessor(provider, postgresFinanceStore, postgresRefundStore, refunds) : undefined);
    const context: ProviderContext = { accountId: config.accountId, mode: config.mode };
    const activation = createWorkspaceActivationService(postgresActivationStore, classifyWorkspaceRuntime(), () => new Date(), context);
    return await drainFinancialWork({ payments: limit => payments.runReconciliationBatch(limit), refunds: refunds ? limit => refunds.recoverPrepared(limit) : undefined, activation: limit => activation.runBatch(limit) }, signal);
  } finally { await database.close(); }
}
