import 'server-only';
import { requireFinancialConfiguration } from './configuration';
import { createRazorpayAdapter } from './provider';
import { classifyWorkspaceRuntime } from './classification';
import type { ProviderContext } from './model';

export interface FinancialWorkerTasks {
  payments(limit: number): Promise<unknown>;
  refunds(limit: number): Promise<unknown>;
  activation(limit: number): Promise<unknown>;
}

// Cooperative deadline is also passed to every provider HTTP call. PostgreSQL remains recovery truth.
export async function drainFinancialWork(tasks: FinancialWorkerTasks, signal: AbortSignal, limit = 3) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 3) throw new Error('worker_invalid_limit');
  const result = { payments: 'not_started', refunds: 'not_started', activation: 'not_started' };
  for (const name of ['payments', 'refunds', 'activation'] as const) {
    if (signal.aborted) break;
    try { await tasks[name](limit); result[name] = 'visited'; }
    catch { result[name] = 'retry_required'; }
  }
  return result;
}

export async function runWorkspaceFinancialWorker() {
  const config = requireFinancialConfiguration('reconciliation');
  const signal = AbortSignal.timeout(40_000);
  const provider = createRazorpayAdapter(process.env, fetch, signal);
  const [{ postgresFinanceStore }, { createWorkspacePaymentService }, { createRefundService }, { postgresRefundStore }, { createRefundEventProcessor }, { createWorkspaceActivationService }, { postgresActivationStore }] = await Promise.all([
    import('./repository'), import('./service'), import('../refunds/service'), import('../refunds/repository'), import('../refunds/events'), import('../activation/service'), import('../activation/repository'),
  ]);
  const refunds = createRefundService(postgresRefundStore, provider);
  const payments = createWorkspacePaymentService(postgresFinanceStore, provider, undefined, undefined, createRefundEventProcessor(provider, postgresFinanceStore, postgresRefundStore, refunds));
  const context: ProviderContext = { accountId: config.accountId, mode: config.mode };
  const activation = createWorkspaceActivationService(postgresActivationStore, classifyWorkspaceRuntime(), () => new Date(), context);
  return drainFinancialWork({ payments: limit => payments.runReconciliationBatch(limit), refunds: limit => refunds.recoverPrepared(limit), activation: limit => activation.runBatch(limit) }, signal);
}
