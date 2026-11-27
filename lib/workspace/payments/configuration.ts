import 'server-only';
import { PaymentError, type ProviderContext } from './model';
import { workspaceFinancialReadiness } from './configuration-core.mjs';
export { workspaceFinancialReadiness } from './configuration-core.mjs';
export type FinancialCapability = 'checkout' | 'refund' | 'webhook' | 'reconciliation' | 'refund_reconciliation';
export type ProviderConfiguration = ProviderContext & { keyId: string; keySecret: string; webhookSecret: string };
export function financialConfiguration(capability: FinancialCapability, env: Record<string, string | undefined> = process.env): ProviderConfiguration | null {
  // Supplied configuration may restrict a process, never authorize it. Diagnostics
  // intentionally assess supplied candidates; executable configuration intersects both.
  const identity = ['NODE_ENV', 'DATABASE_ENV', 'VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV',
    'WORKSPACE_DEPLOYMENT_PROVIDER', 'WORKSPACE_DEPLOYMENT_ENV', 'WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED', 'WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED', 'WORKSPACE_PRODUCTION_ACCOUNT_ID',
    'WORKSPACE_RAZORPAY_MODE', 'WORKSPACE_RAZORPAY_ACCOUNT_ID', 'WORKSPACE_RAZORPAY_KEY_ID', 'WORKSPACE_RAZORPAY_KEY_SECRET', 'WORKSPACE_RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
  if (identity.some(key => env[key] !== process.env[key])) return null;
  const state = workspaceFinancialReadiness(env), actual = workspaceFinancialReadiness();
  const allowed = { checkout: state.checkoutReady, refund: state.refundMutationReady, webhook: state.webhookReady, reconciliation: state.reconciliationReady, refund_reconciliation: state.refundReconciliationReady }[capability];
  const processAllowed = { checkout: actual.checkoutReady, refund: actual.refundMutationReady, webhook: actual.webhookReady, reconciliation: actual.reconciliationReady, refund_reconciliation: actual.refundReconciliationReady }[capability];
  if (!allowed || !processAllowed) return null;
  return { accountId: env.WORKSPACE_RAZORPAY_ACCOUNT_ID!, mode: state.mode as 'test' | 'live', keyId: env.WORKSPACE_RAZORPAY_KEY_ID!, keySecret: env.WORKSPACE_RAZORPAY_KEY_SECRET!, webhookSecret: env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET! };
}
export function requireFinancialConfiguration(capability: FinancialCapability, env: Record<string, string | undefined> = process.env) {
  const config = financialConfiguration(capability, env);
  if (!config) throw new PaymentError('disabled');
  return config;
}
