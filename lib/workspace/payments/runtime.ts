import { refundEventProcessor } from '../refunds/runtime';
import { createWorkspacePaymentService } from './service';
import { postgresFinanceStore } from './repository';
import 'server-only';
import { createRazorpayAdapter } from './provider';
import { requireFinancialConfiguration, type FinancialCapability } from './configuration';
export function workspacePaymentRuntime(capability: FinancialCapability = 'checkout') {
  const config = requireFinancialConfiguration(capability);
  const provider = createRazorpayAdapter();
  return { config, service: createWorkspacePaymentService(postgresFinanceStore, provider, undefined, undefined, refundEventProcessor(provider)), store: postgresFinanceStore };
}
// Separate operator boundary; the authenticated internal worker provides bounded serverless recovery.
// Scheduling and deployment authorization remain release prerequisites.
export async function runWorkspaceReconciliation(limit = 10) { return workspacePaymentRuntime('reconciliation').service.runReconciliationBatch(limit); }
