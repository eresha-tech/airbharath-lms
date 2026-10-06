// Opt-in Phase 1.5AV integration. Never run during implementation or against production.
// A separately authorized verifier supplies two reviewed snake_case accepted order
// fixtures, persisted synthetic eligible users and a fresh active usageLimit=1 coupon.
// Each order's created_at/quote context must be current. Fixtures are retained: no
// resets, trigger bypass, immutable-history deletion, provider calls or migrations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
const enabled = process.env.WORKSPACE_FINANCIAL_PG_VERIFY === 'true';
const fixturePath = process.env.WORKSPACE_FINANCIAL_PG_FIXTURE;
const allowedColumns = new Set(['id','user_id','eligibility_attempt_id','plan_version_id','settings_id','policy_id','eligibility_valid_until','plan_code','plan_snapshot','base_price_paise','discount_paise','taxable_amount_paise','gst_rate_bps','gst_amount_paise','total_paise','currency','duration_months','quote_hash','quote_version','pricing_rule_version','membership_start_rule_version','launch_at','membership_start_rule','context_hash','coupon_id','coupon_code','coupon_snapshot','request_key','request_payload_hash','commercial_policy_version','created_at','provider_account_id','provider_mode','provider_receipt']);
const jsonColumns = new Set(['plan_snapshot','coupon_snapshot']);
test('real two-connection final coupon slot and immutable financial invariants', { skip: !enabled }, async () => {
  assert.ok(['development','test'].includes(process.env.DATABASE_ENV), 'non-production classification required');
  const url = new URL(process.env.WORKSPACE_FINANCIAL_PG_URL || '');
  assert.equal(url.hostname, 'localhost'); assert.equal(url.port, '5433'); assert.equal(url.pathname, '/airbharath_lms');
  assert.ok(fixturePath, 'reviewed synthetic fixture file required');
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  assert.equal(fixture.orders.length, 2);
  assert.match(fixture.orders[0].coupon_code, /^WS15AV_/);
  assert.equal(fixture.orders[0].coupon_id, fixture.orders[1].coupon_id);
  assert.notEqual(fixture.orders[0].user_id, fixture.orders[1].user_id);
  for (const order of fixture.orders) {
    assert.equal(order.provider_mode, 'test'); assert.equal(order.commercial_policy_version, 'workspace-test-noncommercial-v1');
    for (const key of Object.keys(order)) assert.ok(allowedColumns.has(key), `unexpected fixture column ${key}`);
  }
  const clients = [postgres(url.toString(), { max: 1, connect_timeout: 5 }), postgres(url.toString(), { max: 1, connect_timeout: 5 })];
  try {
    for (let i = 0; i < 2; i++) {
      const [identity] = await clients[i]`select current_database() as db`;
      assert.equal(identity.db, 'airbharath_lms');
      const [user] = await clients[i]`select email from users where id=${fixture.orders[i].user_id}`;
      assert.match(user?.email || '', /^ws15av_.*@example\.invalid$/);
    }
    const [coupon] = await clients[0]`select usage_limit, status from workspace_coupons where id=${fixture.orders[0].coupon_id}`;
    assert.equal(coupon.usage_limit, 1); assert.equal(coupon.status, 'active');
    const [occupied] = await clients[0]`select count(*)::integer as n from workspace_coupon_redemptions where coupon_id=${fixture.orders[0].coupon_id} and status in ('reserved','redeemed')`;
    assert.equal(occupied.n, 0, 'a fresh synthetic coupon is required');
    // Both connections start independently. PostgreSQL coupon row locks decide the
    // final slot; there is no process mutex, in-memory counter or Redis truth.
    const results = await Promise.allSettled(clients.map((client, i) => client.begin(async tx => {
      const values = Object.fromEntries(Object.entries(fixture.orders[i]).map(([key, value]) => [key, jsonColumns.has(key) ? tx.json(value) : value]));
      await tx`insert into workspace_membership_orders ${tx(values)}`;
      await tx`insert into workspace_coupon_redemptions (coupon_id,user_id,membership_order_id,reserved_at,checkout_deadline) values (${values.coupon_id},${values.user_id},${values.id},${values.created_at},${values.created_at}::timestamptz + interval '10 minutes')`;
    })));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const rejected = results.find(r => r.status === 'rejected');
    assert.equal(rejected.reason.code, '23514');
    assert.match(rejected.reason.message, /coupon capacity exhausted/i);
    const winner = fixture.orders[results.findIndex(r => r.status === 'fulfilled')];
    const [after] = await clients[0]`select count(*)::integer as n from workspace_coupon_redemptions where coupon_id=${winner.coupon_id} and status in ('reserved','redeemed')`;
    assert.equal(after.n, 1);
    await assert.rejects(clients[0].begin(tx => tx`update workspace_membership_orders set total_paise=total_paise+1,version=version+1 where id=${winner.id}`), e => e.code === '23514');
    await assert.rejects(clients[0].begin(tx => tx`delete from workspace_coupon_redemptions where membership_order_id=${winner.id}`), e => e.code === '23514');
    await assert.rejects(clients[0].begin(tx => tx`update workspace_membership_orders set provider_setup_state='closed',close_reason='never_submitted',closed_at=now(),version=version+1 where id=${winner.id}`), e => e.code === '23514');
    // Closing an order without releasing its reservation must fail at COMMIT.
  } finally { await Promise.all(clients.map(client => client.end({ timeout: 3 }))); }
});
