import { workspaceFinancialReadiness } from '../lib/workspace/payments/configuration-core.mjs';
// No dotenv load, database client, provider SDK or HTTP. Use explicit process-scoped env only.
if (process.argv.slice(2).some(arg => arg !== '--matrix')) {
  console.error('Usage: pnpm workspace:payments:readiness [--matrix]');
  process.exitCode = 2;
} else if (process.argv.includes('--matrix')) {
  const synthetic = { NODE_ENV: 'production', DATABASE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production', WORKSPACE_RAZORPAY_MODE: 'live', WORKSPACE_RAZORPAY_ACCOUNT_ID: 'acc_SYNTHETIC001', WORKSPACE_RAZORPAY_KEY_ID: 'rzp_live_SYNTHETIC001', WORKSPACE_RAZORPAY_KEY_SECRET: 'synthetic-api-secret-not-a-credential', WORKSPACE_RAZORPAY_WEBHOOK_SECRET: 'synthetic-webhook-secret-not-a-credential', WORKSPACE_RAZORPAY_LIVE_AUTHORIZED: 'true', WORKSPACE_PAYMENT_ENABLED: 'true', WORKSPACE_REFUND_ENABLED: 'true', WORKSPACE_RAZORPAY_WEBHOOK_ENABLED: 'true', WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED: 'true' };
  console.log(JSON.stringify({ production: workspaceFinancialReadiness(synthetic), checkoutStopped: workspaceFinancialReadiness({ ...synthetic, WORKSPACE_PAYMENT_ENABLED: 'false' }), mutationsStopped: workspaceFinancialReadiness({ ...synthetic, WORKSPACE_RAZORPAY_LIVE_AUTHORIZED: 'false' }), preview: workspaceFinancialReadiness({ ...synthetic, VERCEL_ENV: 'preview' }), local: workspaceFinancialReadiness({ ...synthetic, VERCEL: undefined, VERCEL_ENV: undefined, DATABASE_ENV: 'development' }) }, null, 2));
} else console.log(JSON.stringify(workspaceFinancialReadiness(), null, 2));
