import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

// Opt-in only: never use a repository DATABASE_URL without exact local authorization.
const authorized = process.env.WORKSPACE_LOCAL_DATABASE_VERIFICATION === 'true';
if (authorized) {
  const target = new URL(process.env.DATABASE_URL);
  assert.equal(process.env.DATABASE_ENV, 'development');
  assert.equal(target.hostname, 'localhost');
  assert.equal(target.port, '5433');
  assert.equal(target.pathname, '/airbharath_lms');
}
const rollback = Symbol('rollback');
async function exercise(run, expectedState) {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5 });
  let result;
  try {
    await sql.begin(async tx => {
      const actor = randomUUID(), coupon = randomUUID();
      await tx`insert into users(id,phone,full_name,role) values(${actor},${'ws14v-regression-'+actor},'WS14V SYNTHETIC rolled-back regression','admin')`;
      await tx`insert into workspace_coupons(id,code,discount_type,discount_value,campaign_name,source_type,source_name,created_by) values(${coupon},${'WS14VREG'+randomUUID().slice(0,8).toUpperCase()},'fixed',1,'WS14V SYNTHETIC regression','internal','WS14V SYNTHETIC regression',${actor})`;
      await tx`insert into workspace_coupon_plans values(${coupon},'quarterly')`;
      await tx`insert into workspace_audit_events(actor_id,coupon_id,action,after_status,request_key,payload_hash,created_at) select ${actor},id,'coupon_created','active',gen_random_uuid(),'synthetic-regression',updated_at from workspace_coupons where id=${coupon}`;
      await tx`set constraints workspace_coupons_complete immediate`;
      await tx`set constraints workspace_coupons_complete deferred`;
      await run(tx, actor, coupon);
      await tx`set constraints workspace_coupons_complete immediate`;
      throw rollback;
    });
  } catch (error) {
    result = error === rollback ? 'accepted' : error.code;
  } finally { await sql.end(); }
  assert.equal(result, expectedState);
}
async function transition(tx, actor, coupon, before, after, advance = true) {
  await tx`update workspace_coupons set status=${after},version=version+1,updated_at=updated_at+${advance ? '1 millisecond' : '0 milliseconds'}::interval where id=${coupon}`;
  await tx`insert into workspace_audit_events(actor_id,coupon_id,action,before_status,after_status,request_key,payload_hash,created_at) select ${actor},id,'coupon_status_changed',${before},${after},gen_random_uuid(),'synthetic-regression',updated_at from workspace_coupons where id=${coupon}`;
  await tx`set constraints workspace_coupons_complete immediate`;
  await tx`set constraints workspace_coupons_complete deferred`;
}
test('real PostgreSQL accepts fresh exact evidence for audited lifecycle commands', { skip: !authorized }, () => exercise(async (tx, actor, coupon) => {
  await transition(tx, actor, coupon, 'active', 'paused');
  await transition(tx, actor, coupon, 'paused', 'active');
}, 'accepted'));
test('real PostgreSQL rejects same-timestamp lifecycle cycles that can reuse stale audit evidence', { skip: !authorized }, () => exercise(async (tx, actor, coupon) => {
  await transition(tx, actor, coupon, 'active', 'paused');
  await transition(tx, actor, coupon, 'paused', 'active', false);
  await tx`update workspace_coupons set status='paused',version=version+1 where id=${coupon}`;
}, '23514'));
test('real PostgreSQL rejects a later audit timestamp that does not match its command', { skip: !authorized }, () => exercise(async (tx, actor, coupon) => {
  await tx`update workspace_coupons set status='paused',version=version+1,updated_at=updated_at+interval '1 millisecond' where id=${coupon}`;
  await tx`insert into workspace_audit_events(actor_id,coupon_id,action,before_status,after_status,request_key,payload_hash,created_at) select ${actor},id,'coupon_status_changed','active','paused',gen_random_uuid(),'synthetic-regression',updated_at+interval '1 millisecond' from workspace_coupons where id=${coupon}`;
}, '23514'));
