// Opt-in E.1 real local PostgreSQL integrity checks. All external HTTP blocked.
const { req, createLoader } = require('./workspace-financial-loader.cjs');
const assert = require('node:assert/strict'), fs = require('node:fs'), { randomUUID } = require('node:crypto');
if (process.env.WORKSPACE_INFLUENCER_PG_VERIFY !== 'true') process.exit(0);
assert.equal(process.env.DATABASE_ENV, 'development');
const target = new URL(process.env.DATABASE_URL);
assert.equal(target.hostname, 'localhost'); assert.equal(target.port, '5433'); assert.equal(target.pathname, '/airbharath_lms');
global.fetch = async () => { throw Error('External HTTP forbidden'); };
const sql = req('postgres')(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5, onnotice: () => {} });
const base = createLoader({ 'server-only': {} }), schema = base('@/lib/db/schema');
const db = req('drizzle-orm/postgres-js').drizzle(sql, { schema });
const load = createLoader({ 'server-only': {}, '@/lib/db': { db } });
const service = load('@/lib/workspace/membership/influencers'), membership = load('@/lib/workspace/membership/service');
const run = 'WSE1C_' + randomUUID(), result = { run, checks: [], fixtures: {}, failures: [] };
const save = () => fs.writeFileSync('/tmp/wse1c-stage-a.json', JSON.stringify(result, null, 2));
function ok(name, data = {}) { result.checks.push({ name, ...data }); save(); console.log(JSON.stringify({ name, ...data })); }
function code(e) { return e.code || e.cause?.code; }
async function probe(name, work, expected = '23514') {
  let actual;
  try { await sql.begin(async tx => { await work(tx); throw Object.assign(Error('Rollback successful invalid operation'), { accepted: true }); }); }
  catch (e) { actual = e.accepted ? 'ACCEPTED_ROLLED_BACK' : code(e); }
  ok(name, { sqlstate: actual, expected });
  if (actual !== expected) result.failures.push({ name, actual, expected });
  save();
}
(async () => { try {
  const admin = randomUUID(), student = randomUUID(), id = randomUUID();
  for (const [uid, role] of [[admin, 'admin'], [student, 'student']]) await sql`insert into users(id,phone,full_name,role) values(${uid},${run+'_'+role},${run},${role})`;
  result.fixtures = { admin, student, influencer: id }; save();
  const definition = { displayName: run, description: 'Synthetic local E.1 verification', status: 'active' };
  const row = await service.saveInfluencer(admin, id, definition);
  assert.equal(row.version, 1); assert.equal(row.createdBy, admin);
  assert.equal((await service.saveInfluencer(admin, id, definition)).id, id);
  assert.equal((await sql`select count(*)::int as n from workspace_influencer_history where influencer_id=${id}`)[0].n, 1);
  ok('real_service_create_replay_one_history');
  await assert.rejects(service.saveInfluencer(student, randomUUID(), definition), e => e.code === 'forbidden');
  await assert.rejects(service.saveInfluencer(admin, randomUUID(), { ...definition, displayName: '' }), e => e.code === 'validation');
  await service.saveInfluencer(admin, id, { ...definition, displayName: run+'_renamed', status: 'inactive' }, 1);
  await assert.rejects(service.saveInfluencer(admin, id, definition, 1), e => e.code === 'conflict');
  await service.saveInfluencer(admin, id, { ...definition, displayName: run+'_renamed' }, 2);
  const history = await sql`select version,snapshot,actor_id from workspace_influencer_history where influencer_id=${id} order by version`;
  assert.equal(history.length, 3); assert.equal(history[0].snapshot.displayName, run); assert(history.every(x => x.actor_id === admin));
  ok('real_version_history_rename_pause_resume_stale_conflict');
  const codeName = ('E1'+randomUUID().replaceAll('-','')).slice(0,32);
  const coupon = await membership.createWorkspaceCoupon(admin, { code: codeName.toLowerCase(), influencerId: id, discountType: 'fixed', discountValue: 50000, startsAt: null, expiresAt: null, usageLimit: 2, planCodes: ['quarterly','half_yearly','yearly'], campaignName: run, sourceType: 'influencer', sourceName: run }, randomUUID());
  result.fixtures.coupon = coupon.id; save(); assert.equal(coupon.code, codeName.toUpperCase()); assert.equal(coupon.influencerId, id);
  ok('real_coupon_creation_canonical_code_stable_identity');
  await probe('history_update', tx => tx`update workspace_influencer_history set snapshot='{}' where influencer_id=${id}`);
  await probe('history_delete', tx => tx`delete from workspace_influencer_history where influencer_id=${id}`);
  await probe('history_direct_insert', tx => tx`insert into workspace_influencer_history(influencer_id,actor_id,version,snapshot) values(${id},${admin},99,'{}')`);
  await probe('identity_delete', tx => tx`delete from workspace_influencers where id=${id}`);
  await probe('invalid_version', tx => tx`update workspace_influencers set version=version+2,updated_at=clock_timestamp() where id=${id}`);
  await probe('nonadmin_actor', tx => tx`update workspace_influencers set updated_by=${student},version=version+1,updated_at=clock_timestamp() where id=${id}`);
  await probe('coupon_reassignment', tx => tx`update workspace_coupons set influencer_id=null where id=${coupon.id}`);
  await probe('coupon_economics_rewrite', tx => tx`update workspace_coupons set discount_value=1 where id=${coupon.id}`);
  await probe('history_bulk_deletion', tx => tx`truncate workspace_influencer_history`);
  await probe('identity_truncate_restrict', tx => tx`truncate workspace_influencers`, '0A000');
  await probe('history_truncate_cascade', tx => tx`truncate workspace_influencer_history cascade`);
  await probe('identity_truncate_cascade', tx => tx`truncate workspace_influencers cascade`);
  await probe('multi_table_truncate', tx => tx`truncate workspace_influencer_history,workspace_influencers cascade`);
  assert.equal((await sql`select count(*)::int as n from workspace_influencer_history where influencer_id=${id}`)[0].n, 3);
  ok('all_invalid_probes_rolled_back_history_intact');
  result.complete = result.failures.length === 0; save();
  if (result.failures.length) process.exitCode = 1;
} finally { await sql.end(); } })().catch(e => { save(); console.error(JSON.stringify({ failure: true, code: code(e), message: e.name === 'AssertionError' ? e.message : 'Local influencer integrity verification failed; credentials redacted' })); process.exitCode = 1; });
