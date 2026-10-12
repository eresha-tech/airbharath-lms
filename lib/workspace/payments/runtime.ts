import { refundEventProcessor } from '../refunds/runtime';
import { createWorkspacePaymentService } from './service';
import { postgresFinanceStore } from './repository';
import { createRazorpayTestAdapter, requireTestPaymentConfiguration } from './provider';
export function workspacePaymentRuntime() {
  const config = requireTestPaymentConfiguration();
  const provider = createRazorpayTestAdapter(config);
  return { config, service: createWorkspacePaymentService(postgresFinanceStore, provider, undefined, undefined, refundEventProcessor(provider)), store: postgresFinanceStore };
}
// Server-only boundary for a separately authorized scheduler/operator process. No public worker route.
// Provisioning a scheduler, sandbox keys and explicit authorization remains a release prerequisite.
export async function runWorkspaceReconciliation(limit = 10) { return workspacePaymentRuntime().service.runReconciliationBatch(limit); }
