// Local founder UAT only. Secrets/authorization remain in this process and its child.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { workspaceFinancialReadiness } from '../lib/workspace/payments/configuration-core.mjs';
const require = createRequire(import.meta.url);

async function start() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--providers', '--payments-only'].includes(arg)) || args.length > 1) throw new Error('uat_invalid_arguments');
  if (process.env.NODE_ENV === 'production') throw new Error('uat_production_refused');
  const nextRequire = createRequire(require.resolve('next/package.json'));
  nextRequire('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const env = { ...process.env, NODE_ENV: 'development' };
  if (env.DATABASE_ENV !== 'development' || env.VERCEL !== undefined || env.VERCEL_ENV !== undefined || env.VERCEL_TARGET_ENV !== undefined) throw new Error('uat_environment_refused');
  const { createLoader } = require('../tests/postgres/workspace-financial-loader.cjs');
  // Reuse the repository's target, TLS, socket, pooling and timeout parser.
  const { databaseConfiguration, createDatabaseClient } = createLoader()('@/lib/db/configuration');
  const options = databaseConfiguration(env);
  if (!['localhost', '127.0.0.1', '::1'].includes(options.host[0]) || options.port[0] !== 5433 || options.database !== 'airbharath_lms') throw new Error('uat_database_target_refused');
  const client = createDatabaseClient({ ...options, max: 1, target_session_attrs: 'read-only', connection: { ...options.connection, default_transaction_read_only: true } });
  try {
    const [identity] = await client`select current_database() as database,
      (select oid::text from pg_catalog.pg_database where datname=current_database()) as oid,
      (select system_identifier::text from pg_catalog.pg_control_system()) as system_identifier,
      pg_catalog.host(pg_catalog.inet_server_addr()) as address, current_setting('port') as port`;
    if (identity.database !== 'airbharath_lms' || identity.oid !== '16384' || identity.system_identifier !== '7680462735222304705' || identity.port !== '5433'
      || (identity.address !== null && !['127.0.0.1', '::1'].includes(identity.address))) throw new Error('uat_database_identity_refused');
  } finally { await client.end({ timeout: 2 }); }

  const providers = args.includes('--providers'), paymentsOnly = args.includes('--payments-only'), payments = providers || paymentsOnly;
  Object.assign(env, {
    WORKSPACE_LOCAL_UAT_OTP_ENABLED: 'true', WORKSPACE_LOCAL_UAT_ELIGIBILITY_LIMITER_ENABLED: 'true',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '', NEXT_PUBLIC_POSTHOG_ENABLE_DEV: 'false',
    NEXT_PUBLIC_BASE_URL: 'http://localhost:3000', WORKSPACE_RAZORPAY_LIVE_AUTHORIZED: 'false',
    WORKSPACE_PAYMENT_ENABLED: String(payments), WORKSPACE_RAZORPAY_TEST_AUTHORIZED: String(payments),
    WORKSPACE_LOCAL_UAT_PAYMENTS_ONLY: String(paymentsOnly), WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED: String(providers),
    WORKSPACE_REFUND_ENABLED: String(providers), WORKSPACE_RAZORPAY_WEBHOOK_ENABLED: String(payments),
    WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED: String(payments), WORKSPACE_EMAIL_VERIFICATION_ENABLED: String(providers),
    WORKSPACE_EMAIL_SENDER_VERIFIED: String(providers), WORKSPACE_NOTICE_DELIVERY_ENABLED: String(providers),
    WORKSPACE_NOTICE_SENDER_VERIFIED: String(providers), WORKSPACE_NOTICE_PROVIDER_SCOPE: 'workspace-local-uat',
  });
  if (payments) {
    // The owner must separately authorize Test transactions and their verified sender/inboxes.
    if (env.WORKSPACE_RAZORPAY_MODE !== 'test') throw new Error('uat_test_mode_required');
    for (const key of ['WORKSPACE_EMAIL_OTP_SECRET', 'CRON_SECRET']) {
      env[key] ||= randomBytes(32).toString('hex');
      if (env[key].length < 32) throw new Error('uat_runtime_secret_invalid');
    }
    if (paymentsOnly) env.CRON_SECRET = randomBytes(32).toString('hex');
    const ready = workspaceFinancialReadiness(env);
    if (!ready.testModeSafe || !ready.checkoutReady || !ready.webhookReady || !ready.reconciliationReady || (providers && (!ready.refundMutationReady || !ready.refundReconciliationReady || !ready.noticeConfigurationReady)) || (paymentsOnly && (ready.refundMutationReady || ready.refundReconciliationReady || ready.noticeDeliveryAuthorized))) throw new Error('uat_provider_configuration_invalid');
  }
  console.log(paymentsOnly ? 'Local UAT: Test payments only; refunds/refund reconciliation/email/Redis/SMS/analytics disabled.' : providers ? 'Local UAT: Test payments/email enabled; Redis/SMS/analytics disabled.' : 'Local UAT: demo phone/eligibility enabled; external providers disabled.');
  const child = spawn('pnpm', ['dev', '--hostname', '127.0.0.1', '--port', '3000'], { env, stdio: 'inherit' });
  const worker = payments ? spawn(process.execPath, ['scripts/workspace-local-uat-worker.cjs'], { env: { ...env, WORKSPACE_LOCAL_UAT_FINANCIAL_WORKER_ENABLED: 'true' }, stdio: 'inherit' }) : null;
  process.on('SIGTERM', () => { child.kill('SIGTERM'); worker?.kill('SIGTERM'); });
  process.on('SIGINT', () => worker?.kill('SIGINT'));
  child.on('error', () => { console.error('Local UAT application could not start.'); process.exitCode = 1; });
  child.on('exit', code => { worker?.kill('SIGTERM'); process.exitCode = code ?? 1; });
  worker?.on('error', () => { console.error('Local UAT worker could not start.'); child.kill('SIGTERM'); process.exitCode = 1; });
  worker?.on('exit', code => { if (code) { console.error('Local UAT worker stopped; application stopped to avoid unprocessed payments.'); child.kill('SIGTERM'); process.exitCode = 1; } });
}
start().catch(error => {
  const reason = /^uat_[a-z_]+$/.test(error?.message || '') ? error.message : 'uat_preflight_failed';
  console.error(`Local UAT preflight refused startup (${reason}); private details suppressed.`);
  process.exitCode = 1;
});
