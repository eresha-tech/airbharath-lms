// Temporary local UAT orchestration. All financial decisions use normal application services.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- This CLI reuses the existing CommonJS local-verification loader.
const { createLoader, req } = require('../tests/postgres/workspace-financial-loader.cjs');
let stopping = false;
process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

async function main() {
  if (process.env.WORKSPACE_LOCAL_UAT_FINANCIAL_WORKER_ENABLED !== 'true') throw Error('uat_worker_disabled');
  const base = createLoader({ 'server-only': {} });
  if (base('@/lib/local-uat-otp').localUatOtpMode() !== 'local') throw Error('uat_worker_environment_refused');
  const phones = base('@/lib/local-uat-otp').LOCAL_UAT_PHONES;
  const configuration = base('@/lib/workspace/payments/configuration').requireFinancialConfiguration('reconciliation');
  if (configuration.mode !== 'test') throw Error('uat_worker_live_refused');
  const { databaseConfiguration, createDatabaseClient } = base('@/lib/db/configuration');
  const client = createDatabaseClient(databaseConfiguration(process.env, 'worker', 'workspace_local_uat_worker'));
  try {
    const [identity] = await client`select current_database() as database,
      (select oid::text from pg_catalog.pg_database where datname=current_database()) as oid,
      (select system_identifier::text from pg_catalog.pg_control_system()) as system_identifier,
      pg_catalog.host(pg_catalog.inet_server_addr()) as address,current_setting('port') as port`;
    if (identity.database !== 'airbharath_lms' || identity.oid !== '16384' || identity.system_identifier !== '7680462735222304705' || identity.port !== '5433'
      || (identity.address !== null && !['127.0.0.1', '::1'].includes(identity.address))) throw Error('uat_worker_identity_refused');
    const schema = base('@/lib/db/schema'), db = req('drizzle-orm/postgres-js').drizzle(client, { schema });
    const load = createLoader({ 'server-only': {}, '@/lib/db': { db } });
    const finance = load('@/lib/workspace/payments/repository').createPostgresFinanceStore(db);
    const refunds = load('@/lib/workspace/refunds/repository').createPostgresRefundStore(db);
    const activationStore = load('@/lib/workspace/activation/repository').createPostgresActivationStore(db);
    console.log('Local UAT worker ready: only the three demo students and matching Test account/orders.');
    while (!stopping) {
      const signal = AbortSignal.timeout(30_000);
      const provider = load('@/lib/workspace/payments/provider').createRazorpayAdapter(process.env, fetch, signal);
      const refundService = load('@/lib/workspace/refunds/service').createRefundService(refunds, provider);
      const refundEvents = load('@/lib/workspace/refunds/events').createRefundEventProcessor(provider, finance, refunds, refundService);
      const payments = load('@/lib/workspace/payments/service').createWorkspacePaymentService(finance, provider, undefined, undefined, refundEvents);
      const activation = load('@/lib/workspace/activation/service').createWorkspaceActivationService(activationStore, 'development', () => new Date(), provider.context);
      try {
        // Match only known demo orders; never claim unrelated historical or LMS webhook evidence.
        const events = await client`select distinct e.id,e.received_at from workspace_payment_events e
          join workspace_membership_orders o on (e.evidence->>'providerOrderId'=o.provider_order_id or e.evidence->>'providerPaymentId'=o.winning_payment_id)
          join users u on u.id=o.user_id where u.phone in ${client(phones)} and u.role='student'
          and o.provider_mode='test' and o.provider_account_id=${configuration.accountId}
          and e.provider_mode=o.provider_mode and e.provider_account_id=o.provider_account_id
          and e.processing_state in ('pending','retry','processing') and (e.next_attempt_at is null or e.next_attempt_at<=clock_timestamp())
          order by e.received_at,e.id limit 3`;
        for (const event of events) { if (stopping || signal.aborted) break; await payments.processEvent(event.id); }
        const orders = await client`select o.id,o.user_id from workspace_membership_orders o join users u on u.id=o.user_id
          where u.phone in ${client(phones)} and u.role='student' and o.provider_mode='test'
          and o.provider_account_id=${configuration.accountId} and o.fulfilled_at is null and o.closed_at is null
          order by o.created_at,o.id limit 3`;
        for (const order of orders) {
          if (stopping || signal.aborted) break;
          await payments.reconcileOrder(order.user_id, order.id);
          await activation.fulfill(order.user_id, order.id);
        }
        const notices = load('@/lib/workspace/refund-notifications/repository').createPostgresNoticeStore(db);
        const candidates = async limit => (await client`select n.id from workspace_refund_notices n
          join workspace_membership_orders o on o.id=n.membership_order_id join users u on u.id=o.user_id
          left join workspace_refund_notice_deliveries d on d.notice_id=n.id
          where u.phone in ${client(phones)} and u.role='student' and o.provider_mode='test' and o.provider_account_id=${configuration.accountId}
          and (d.id is null or (d.state in ('pending','retryable_failure') and (d.next_attempt_at is null or d.next_attempt_at<=clock_timestamp()))
            or (d.state in ('claimed','submitted') and d.lease_until<=clock_timestamp()))
          order by n.created_at,n.id limit ${limit}`).map(row => row.id);
        const noticeConfig = load('@/lib/workspace/refund-notifications/configuration').noticeConfiguration();
        if (noticeConfig && !stopping && !signal.aborted) {
          const noticeProvider = load('@/lib/workspace/refund-notifications/provider').createNoticeMailercloudAdapter(process.env, fetch, signal);
          await load('@/lib/workspace/refund-notifications/service').createRefundNoticeDeliveryService({ ...notices, candidates }, noticeProvider, noticeConfig).run(signal, 3);
        }
        if (events.length || orders.length) console.log(`Local UAT worker visited ${events.length} demo events and ${orders.length} demo orders; normal guards determine fulfillment.`);
      } catch { console.warn('Local UAT worker cycle needs retry; no financial state was forced.'); }
      if (!stopping) await new Promise(resolve => setTimeout(resolve, 15_000));
    }
  } finally { await client.end({ timeout: 2 }); }
}
main().catch(() => { console.error('Local UAT worker refused startup; private details suppressed.'); process.exitCode = 1; });
