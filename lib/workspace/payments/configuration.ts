import 'server-only';
import { PaymentError, type ProviderContext } from './model';
import { workspaceFinancialReadiness } from './configuration-core.mjs';
export { workspaceFinancialReadiness } from './configuration-core.mjs';
export type FinancialCapability = 'checkout' | 'refund' | 'webhook' | 'reconciliation' | 'refund_reconciliation';
export type ProviderConfiguration = ProviderContext & { keyId: string; keySecret: string; webhookSecret: string };
export function financialConfiguration(capability: FinancialCapability, env: Record<string, string | undefined> = process.env): ProviderConfiguration | null {
  const state = workspaceFinancialReadiness(env);
  const allowed = { checkout: state.checkoutReady, refund: state.refundMutationReady, webhook: state.webhookReady, reconciliation: state.reconciliationReady, refund_reconciliation: state.refundReconciliationReady }[capability];
  if (!allowed) return null;
  return { accountId: env.WORKSPACE_RAZORPAY_ACCOUNT_ID!, mode: state.mode as 'test' | 'live', keyId: env.WORKSPACE_RAZORPAY_KEY_ID!, keySecret: env.WORKSPACE_RAZORPAY_KEY_SECRET!, webhookSecret: env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET! };
}
export function requireFinancialConfiguration(capability: FinancialCapability, env: Record<string, string | undefined> = process.env) {
  const config = financialConfiguration(capability, env);
  if (!config) throw new PaymentError('disabled');
  return config;
}
