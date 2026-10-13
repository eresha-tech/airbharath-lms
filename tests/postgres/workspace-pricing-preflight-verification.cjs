// Read-only F.1 preflight. No migration execution or synthetic financial writes.
if (process.env.WORKSPACE_PRICING_PG_VERIFY !== 'true') process.exit(0);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
assert.equal(process.env.DATABASE_ENV, 'development');
const target = new URL(process.env.DATABASE_URL);
assert.equal(target.hostname, 'localhost');
assert.equal(target.port, '5433');
assert.equal(target.pathname, '/airbharath_lms');
global.fetch = async () => { throw Error('External HTTP forbidden'); };
const postgres = require('postgres');
const tcp = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
const socket = postgres(process.env.DATABASE_URL, { host: '/tmp', port: 5433, max: 1, prepare: false, onnotice: () => {} });
const sha = value => createHash('sha256').update(value).digest('hex');
const identity = async sql => (await sql`select current_database() as database, (select oid::text from pg_database where datname=current_database()) as oid, current_setting('port') as port, system_identifier::text as system from pg_control_system()`)[0];
async function fingerprints(sql) {
  const tables = await sql`select tablename from pg_tables where schemaname='public' order by tablename`;
  const out = {};
  for (const { tablename } of tables) {
    // Persist only sorted row fingerprints; never retain row contents/contact data.
    const rows = await sql`select md5(to_jsonb(t)::text) as digest from ${sql(tablename)} t order by digest`;
    out[tablename] = { count: rows.length, sha256: sha(rows.map(row => row.digest).join('\n')) };
  }
  return out;
}
(async () => {
  try {
    const a = await identity(tcp), b = await identity(socket);
    assert.deepEqual(a, b);
    assert.deepEqual(a, { database: 'airbharath_lms', oid: '16384', port: '5433', system: '7680462735222304705' });
    const evidence = await tcp.begin('isolation level repeatable read read only', async sql => {
      const journal = JSON.parse(fs.readFileSync('drizzle/meta/_journal.json', 'utf8')).entries;
      const ledger = await sql`select id, hash, created_at::text as created_at from drizzle.__drizzle_migrations order by created_at, id`;
      assert.equal(ledger.length, 26);
      const verified = ledger.map((row, i) => {
        const entry = journal[i], expected = sha(fs.readFileSync(`drizzle/${entry.tag}.sql`));
        assert.equal(row.hash, expected); assert.equal(row.created_at, String(entry.when));
        return { tag: entry.tag, hash: row.hash, createdAt: row.created_at };
      });
      const plans = await sql`select id,code,version,display_name,duration_months,base_price_paise,tax_rate_bps,currency,is_current,available from workspace_membership_plans order by duration_months`;
      const current = plans.filter(p => p.is_current).sort((a,b) => a.duration_months-b.duration_months);
      assert.equal(current.length, 3);
      assert.equal(plans.filter(p => p.code === 'quarterly').length, 4);
      assert.deepEqual(plans.filter(p => p.code === 'quarterly').map(p => p.version).sort(), [1,2,3,4]);
      const old = [499900,899900,1699900];
      current.forEach((p, i) => { assert.equal(p.version, 1); assert.equal(p.is_current, true); assert.equal(p.available, true); assert.equal(p.base_price_paise, old[i]); });
      const functions = await sql`select proname,prosrc from pg_proc where pronamespace='public'::regnamespace and proname in ('workspace_phase14_plan_immutable','workspace_phase15_order_guard') order by proname`;
      assert.equal(functions.length, 2);
      assert(functions.find(f => f.proname === 'workspace_phase14_plan_immutable').prosrc.includes("to_jsonb(NEW) - 'is_current'"));
      const guard = functions.find(f => f.proname === 'workspace_phase15_order_guard').prosrc;
      assert(guard.includes('p.base_price_paise <> NEW.base_price_paise'));
      assert(guard.includes("NEW.plan_snapshot IS DISTINCT FROM jsonb_build_object('version',p.version,'displayName',p.display_name)"));
      const rounding = await sql`select base, discount, base-discount as taxable, round((base-discount)::numeric*1800/10000)::int as gst, (base-discount+round((base-discount)::numeric*1800/10000))::int as total from (select base, case kind when 'fixed' then 50000 when 'percentage' then round(base::numeric*1000/10000)::int else 0 end as discount from (values(499915),(847373),(1499915)) as p(base) cross join (values('none'),('fixed'),('percentage')) as d(kind)) as amounts order by base,discount`;
      const expected = [
        [499915,0,499915,89985,589900],[499915,49992,449923,80986,530909],[499915,50000,449915,80985,530900],
        [847373,0,847373,152527,999900],[847373,50000,797373,143527,940900],[847373,84737,762636,137274,899910],
        [1499915,0,1499915,269985,1769900],[1499915,50000,1449915,260985,1710900],[1499915,149992,1349923,242986,1592909],
      ];
      assert.deepEqual(rounding.map(r => [r.base,r.discount,r.taxable,r.gst,r.total]), expected);
      const tables = await fingerprints(sql);
      return { identity: a, ledger: verified, plans, installedGuardsVerified: true, proposedPricePostgresArithmetic: rounding, tables };
    });
    const file = '/tmp/wsf1-preflight.json';
    if (process.argv.includes('--compare')) {
      const before = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.deepEqual(JSON.parse(JSON.stringify(evidence)), before);
      console.log(JSON.stringify({ unchangedTables: Object.keys(evidence.tables).length, unchangedRows: Object.values(evidence.tables).reduce((n,t) => n+t.count,0), ledgerRows: 26, proposedMigrationApplied: false }));
    } else {
      assert(!fs.existsSync(file), 'Never overwrite the F.1 preservation baseline');
      fs.writeFileSync(file, JSON.stringify(evidence, null, 2), { mode: 0o600 });
      console.log(JSON.stringify({ identity: a, ledgerRows: 26, allAppliedHashesMatch: true, currentPlans: evidence.plans.filter(p => p.is_current), historicalPlanRows: evidence.plans.filter(p => !p.is_current).length, arithmeticCases: 9, fingerprintedTables: Object.keys(evidence.tables).length, fingerprintedRows: Object.values(evidence.tables).reduce((n,t) => n+t.count,0), evidenceFile: file }));
    }
  } finally { await tcp.end(); await socket.end(); }
})().catch(error => { console.error(JSON.stringify({ code: error.code || error.name, message: error.name === 'AssertionError' ? error.message : 'Local F.1 read-only preflight failed' })); process.exitCode = 1; });
