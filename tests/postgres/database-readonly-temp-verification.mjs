/**
 * Opt-in: node tests/postgres/database-readonly-temp-verification.mjs
 * Starts and stops its OWN disposable /tmp PostgreSQL cluster with local TLS.
 * Never loads dotenv or accepts an application/production database URL.
 * The collector's injected test transport maps a synthetic Neon manifest ONLY
 * to this fixture; production CLI target/TLS validation is never changed.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import postgres from 'postgres';
import { inspectDatabase, loadReviewedSource } from '../../scripts/database-readonly-preflight-core.mjs';
import { queries } from '../../scripts/database-readonly-queries.mjs';

const bin = '/usr/lib/postgresql/16/bin';
const root = mkdtempSync('/tmp/airbharath-preflight-temp-');
const data = join(root, 'data'), socket = join(root, 'socket');
const adminRole = 'preflight_fixture_admin', auditRole = 'preflight_fixture_audit';
const migrationRole = 'preflight_fixture_migrator', groupRole = 'preflight_fixture_group';
const ownerPassword = randomBytes(24).toString('hex'), auditPassword = randomBytes(24).toString('hex');
const source = loadReviewedSource();
const results = { isolated: true, checks: [], sourceMigrations: source.manifest.length };
const clients = new Set();
let started = false, port, certificate;
const childEnv = Object.fromEntries(['PATH', 'HOME', 'USER', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
function command(executable, args) { return execFileSync(executable, args, { env: childEnv, stdio: 'pipe' }); }
function client(user, database, readOnly = true, sslOverrides = {}, passwordOverride) {
  const sql = postgres({ host: '127.0.0.1', port, database, user,
    password: () => passwordOverride ?? (user === adminRole ? ownerPassword : auditPassword),
    ssl: { ca: certificate, rejectUnauthorized: true, servername: 'localhost', ...sslOverrides },
    max: 1, prepare: false, fetch_types: false, debug: false, connect_timeout: 5, idle_timeout: 2,
    connection: { application_name: 'airbharath_isolated_preflight_test', search_path: 'pg_catalog',
      default_transaction_read_only: readOnly, statement_timeout: 5000, lock_timeout: 1000, idle_in_transaction_session_timeout: 5000 }, onnotice() {} });
  clients.add(sql); return sql;
}
function environment(database, user) {
  return { ALLOW_PRODUCTION_READONLY_PREFLIGHT: 'true', DATABASE_ENV: 'production', PREFLIGHT_CONNECTION_MODE: 'direct',
    PREFLIGHT_EXPECTED_HOST: 'ep-synthetic-preflight.us-east-2.aws.neon.tech', PREFLIGHT_EXPECTED_DATABASE: database,
    PREFLIGHT_EXPECTED_ROLE: user, PREFLIGHT_MIGRATION_ROLE: migrationRole,
    PREFLIGHT_NEON_PROJECT_ID: 'synthetic-project', PREFLIGHT_NEON_BRANCH_ID: 'br-synthetic',
    PREFLIGHT_DATABASE_URL: `postgresql://${user}:synthetic-only@ep-synthetic-preflight.us-east-2.aws.neon.tech/${database}?sslmode=verify-full` };
}
async function inspect(name, database, { user = auditRole, existing, readWrite = false, rejection, flags } = {}) {
  const issued = [], observed = {}; let closed = false;
  const connect = options => {
    assert.deepEqual(options.host, ['ep-synthetic-preflight.us-east-2.aws.neon.tech']);
    assert.equal(options.ssl, 'verify-full'); assert.equal(options.max, 1);
    assert.equal(options.connection.default_transaction_read_only, true);
    const sql = existing || client(user, database);
    return {
      begin: async (mode, callback) => {
        assert.equal(mode, 'isolation level repeatable read read only');
        return sql.begin(readWrite ? 'isolation level repeatable read read write' : mode, tx => callback({
          savepoint: fn => tx.savepoint(sp => fn({ unsafe: async (statement, parameters) => {
            const query = Object.entries(queries).find(([, value]) => value === statement)?.[0];
            assert(query, 'Only existing fixed collector SELECTs may execute'); issued.push(query);
            const rows = await sp.unsafe(statement, parameters);
            if (['roles', 'identity', 'tls'].includes(query)) observed[query] = rows[0];
            return rows;
          } })),
        }));
      },
      end: async options => { await sql.end(options); clients.delete(sql); closed = true; },
    };
  };
  if (rejection) {
    await assert.rejects(() => inspectDatabase({ env: environment(database, user), connect, source }), { message: rejection });
    assert(!issued.includes('ledgerPresence'), 'Rejection must happen before history/catalog collection');
  } else {
    const result = await inspectDatabase({ env: environment(database, user), connect, source });
    assert.equal(result.migrationAuthorized, false);
    assert.equal(result.publicTempExceptionAccepted, result.roles.temporary_objects);
    assert.equal(result.roles.temporary_objects, result.roles.public_temp);
    assert.equal(result.limitations.includes('public_temp_present_unused_by_inspector'), result.roles.temporary_objects);
    assert.equal(result.tls.clientVerification, 'verify-full');
    assert.equal(result.ledger.state, 'UNKNOWN'); // Deliberately no application schema or ledger in these fixtures.
  }
  assert(closed, 'Pool must close on success and refusal');
  assert.equal(observed.tls.ssl, true); assert(['TLSv1.2', 'TLSv1.3'].includes(observed.tls.version));
  if (flags) for (const [key, value] of Object.entries(flags)) assert.equal(observed.roles[key], value, key);
  results.checks.push({ name, outcome: rejection || 'collected_not_migration_authorized',
    temp: observed.roles.temporary_objects, publicTemp: observed.roles.public_temp, nonpublicTemp: observed.roles.nonpublic_temp,
    noTempNamespace: observed.identity.no_temp_namespace, readOnly: observed.identity.read_only, tls: observed.tls.version });
}

try {
  mkdirSync(socket, { mode: 0o700 });
  const pwfile = join(root, 'init-password'); writeFileSync(pwfile, ownerPassword, { mode: 0o600 });
  command(join(bin, 'initdb'), ['-D', data, '-U', adminRole, '--auth-local=trust', '--auth-host=scram-sha-256', '--pwfile=' + pwfile, '--no-locale']);
  const reserve = createServer(); await new Promise((resolve, reject) => { reserve.once('error', reject); reserve.listen(0, '127.0.0.1', resolve); });
  port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  assert(port !== 5432 && port !== 5433);
  command('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1', '-keyout', join(root, 'server.key'), '-out', join(root, 'server.crt')]);
  certificate = readFileSync(join(root, 'server.crt'), 'utf8');
  writeFileSync(join(data, 'postgresql.conf'), `listen_addresses='127.0.0.1'\nport=${port}\nunix_socket_directories='${socket}'\nssl=on\nssl_cert_file='${root}/server.crt'\nssl_key_file='${root}/server.key'\nmax_connections=15\nshared_buffers='8MB'\nlog_statement='none'\n`);
  writeFileSync(join(data, 'pg_hba.conf'), 'local all all trust\nhostssl all all 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n');
  command(join(bin, 'pg_ctl'), ['-D', data, '-l', join(root, 'server.log'), '-w', '-t', '15', 'start']); started = true;
  const admin = client(adminRole, 'postgres', false);
  const [identity] = await admin`select current_setting('data_directory') as data_directory, current_setting('server_version') as version, system_identifier::text from pg_catalog.pg_control_system()`;
  assert.equal(identity.data_directory, data); assert.notEqual(identity.system_identifier, '7680462735222304705');
  results.server = { version: identity.version, applicationDatabaseUntouched: true, loopbackOnly: true, generatedPrivateCluster: true };
  await admin.unsafe(`CREATE ROLE ${auditRole} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${auditPassword}'`);
  await admin.unsafe(`CREATE ROLE preflight_fixture_noinherit LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${auditPassword}'`);
  await admin.unsafe(`CREATE ROLE ${migrationRole} NOLOGIN`); await admin.unsafe(`CREATE ROLE ${groupRole} NOLOGIN`);
  for (const database of ['preflight_temp_default', 'preflight_temp_explicit', 'preflight_temp_none']) await admin.unsafe(`CREATE DATABASE ${database}`);
  const [defaultAcl] = await admin`select datacl is null as defaults from pg_catalog.pg_database where datname='preflight_temp_default'`;
  assert.equal(defaultAcl.defaults, true);
  await inspect('default NULL database ACL uses acldefault: PUBLIC-only TEMP accepted', 'preflight_temp_default', { flags: { temporary_objects: true, public_temp: true, nonpublic_temp: false } });
  const db = 'preflight_temp_explicit';
  await admin.unsafe(`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`); await admin.unsafe(`GRANT CONNECT, TEMPORARY ON DATABASE ${db} TO PUBLIC`);
  await inspect('explicit PUBLIC TEMP ACL accepted', db, { flags: { temporary_objects: true, public_temp: true, nonpublic_temp: false } });
  await admin.unsafe('REVOKE TEMPORARY ON DATABASE preflight_temp_none FROM PUBLIC');
  await inspect('no TEMP privilege still accepted', 'preflight_temp_none', { flags: { temporary_objects: false, public_temp: false, nonpublic_temp: false } });
  await admin.unsafe(`GRANT TEMPORARY ON DATABASE ${db} TO ${auditRole}`);
  await inspect('additional direct TEMP rejected', db, { rejection: 'preflight_readonly_role_required', flags: { nonpublic_temp: true } });
  await admin.unsafe(`REVOKE TEMPORARY ON DATABASE ${db} FROM PUBLIC`);
  await inspect('direct-only TEMP rejected', db, { rejection: 'preflight_readonly_role_required', flags: { temporary_objects: true, public_temp: false, nonpublic_temp: true } });
  await admin.unsafe(`GRANT TEMPORARY ON DATABASE ${db} TO PUBLIC`);
  await admin.unsafe(`REVOKE TEMPORARY ON DATABASE ${db} FROM ${auditRole}`);
  await admin.unsafe(`GRANT TEMPORARY ON DATABASE ${db} TO ${groupRole}`); await admin.unsafe(`GRANT ${groupRole} TO ${auditRole}`);
  await inspect('inherited TEMP rejected even alongside PUBLIC', db, { rejection: 'preflight_readonly_role_required', flags: { nonpublic_temp: true } });
  await admin.unsafe(`REVOKE TEMPORARY ON DATABASE ${db} FROM PUBLIC`);
  await inspect('inherited-only TEMP rejected', db, { rejection: 'preflight_readonly_role_required', flags: { temporary_objects: true, public_temp: false, nonpublic_temp: true } });
  await admin.unsafe(`GRANT ${groupRole} TO preflight_fixture_noinherit`);
  await inspect('NOINHERIT membership-derived TEMP rejected despite effective TEMP false', db, { user: 'preflight_fixture_noinherit', rejection: 'preflight_readonly_role_required', flags: { temporary_objects: false, public_temp: false, nonpublic_temp: true } });
  await admin.unsafe(`REVOKE ${groupRole} FROM preflight_fixture_noinherit`); await admin.unsafe(`REVOKE ${groupRole} FROM ${auditRole}`);
  await admin.unsafe(`REVOKE TEMPORARY ON DATABASE ${db} FROM ${groupRole}`); await admin.unsafe(`GRANT TEMPORARY ON DATABASE ${db} TO PUBLIC`);
  const fixtures = client(adminRole, db, false);
  await fixtures.unsafe(`CREATE TABLE public.preflight_fixture_table(id integer PRIMARY KEY)`);
  await fixtures.unsafe('INSERT INTO public.preflight_fixture_table VALUES (1)');
  await fixtures.unsafe(`GRANT SELECT ON public.preflight_fixture_table TO ${auditRole}`);
  for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER']) {
    await fixtures.unsafe(`GRANT ${privilege} ON public.preflight_fixture_table TO ${auditRole}`);
    await inspect(`${privilege} remains rejected with PUBLIC TEMP`, db, { rejection: 'preflight_readonly_role_required', flags: { table_write: true } });
    await fixtures.unsafe(`REVOKE ${privilege} ON public.preflight_fixture_table FROM ${auditRole}`);
  }
  await fixtures.unsafe('CREATE SEQUENCE public.preflight_fixture_sequence');
  await fixtures.unsafe(`GRANT USAGE ON SEQUENCE public.preflight_fixture_sequence TO ${auditRole}`);
  await inspect('sequence mutation capability remains rejected', db, { rejection: 'preflight_readonly_role_required', flags: { sequence_write: true } });
  await fixtures.unsafe(`REVOKE USAGE ON SEQUENCE public.preflight_fixture_sequence FROM ${auditRole}`);
  await fixtures.unsafe(`GRANT CREATE ON SCHEMA public TO ${auditRole}`);
  await inspect('schema CREATE remains rejected', db, { rejection: 'preflight_readonly_role_required', flags: { schema_create: true } });
  await fixtures.unsafe(`REVOKE CREATE ON SCHEMA public FROM ${auditRole}`);
  await admin.unsafe(`GRANT CREATE ON DATABASE ${db} TO ${auditRole}`);
  await inspect('database CREATE remains rejected', db, { rejection: 'preflight_readonly_role_required', flags: { database_create: true } });
  await admin.unsafe(`REVOKE CREATE ON DATABASE ${db} FROM ${auditRole}`);
  await admin.unsafe(`ALTER ROLE ${auditRole} CREATEDB`);
  await inspect('elevated role remains rejected', db, { rejection: 'preflight_readonly_role_required', flags: { elevated: true } });
  await admin.unsafe(`ALTER ROLE ${auditRole} NOCREATEDB`);
  await admin.unsafe(`GRANT ${migrationRole} TO ${auditRole}`);
  await inspect('migration role membership remains rejected', db, { rejection: 'preflight_readonly_role_required', flags: { migration_role_accessible: true } });
  await admin.unsafe(`REVOKE ${migrationRole} FROM ${auditRole}`);
  const temporary = client(auditRole, db, false);
  await temporary.unsafe('CREATE TEMP TABLE preflight_temporary(id integer)');
  await inspect('pre-existing temporary namespace rejected in real READ ONLY transaction', db, { existing: temporary, rejection: 'preflight_readonly_role_required' });
  const revoked = client(auditRole, db, false);
  await revoked.unsafe('CREATE TEMP TABLE preflight_temporary(id integer)');
  await revoked.unsafe('DROP TABLE preflight_temporary');
  await admin.unsafe(`REVOKE TEMPORARY ON DATABASE ${db} FROM PUBLIC`);
  await inspect('allocated temp namespace rejected after TEMP revoked and table dropped', db, { existing: revoked, rejection: 'preflight_readonly_role_required', flags: { temporary_objects: false, public_temp: false, nonpublic_temp: false } });
  await admin.unsafe(`GRANT TEMPORARY ON DATABASE ${db} TO PUBLIC`);
  await inspect('actual READ WRITE mode rejected', db, { readWrite: true, rejection: 'preflight_identity_mismatch' });
  const readOnly = client(auditRole, db);
  await assert.rejects(() => readOnly.begin('read only', tx => tx.unsafe('CREATE TEMP TABLE forbidden_temporary(id integer)')), { code: '25006' });
  results.checks.push({ name: 'PostgreSQL itself rejects CREATE TEMP in READ ONLY', outcome: '25006' });
  await readOnly.end(); clients.delete(readOnly);
  async function diagnosticRejection(name, sql, category, sqlstate) {
    await assert.rejects(() => inspectDatabase({ env:environment(db, auditRole), connect:() => sql, source }), error => {
      assert.equal(error.diagnostic.category, category);
      assert.equal(error.diagnostic.stage, 'transaction_begin');
      assert.equal(error.diagnostic.sqlstate, sqlstate);
      assert(!JSON.stringify(error).includes(auditPassword));
      return true;
    });
    clients.delete(sql);
    results.checks.push({ name, category, sqlstate, stage:'transaction_begin' });
  }
  await diagnosticRejection('local TLS hostname mismatch diagnosed', client(auditRole, db, true, { servername:'wrong.invalid' }), 'tls_verification_failed', null);
  await diagnosticRejection('untrusted local TLS certificate diagnosed', client(auditRole, db, true, { ca:[] }), 'tls_verification_failed', null);
  await diagnosticRejection('wrong isolated audit password diagnosed', client(auditRole, db, true, {}, randomBytes(24).toString('hex')), 'authentication_failed', '28P01');
  await fixtures.unsafe('CREATE SCHEMA drizzle');
  await fixtures.unsafe('CREATE TABLE drizzle.__drizzle_migrations(id integer, hash text, created_at bigint)');
  await fixtures.unsafe('CREATE TABLE public.users(id integer)');
  await fixtures.unsafe(`GRANT USAGE ON SCHEMA drizzle TO ${auditRole}`);
  const restricted = client(auditRole, db);
  const diagnosed = await inspectDatabase({ env:environment(db, auditRole), connect:() => restricted, source }); clients.delete(restricted);
  assert.equal(diagnosed.ledger.state, 'UNKNOWN');
  assert.equal(diagnosed.migrationAuthorized, false);
  assert(diagnosed.queryFailures.some(f => f.stage==='ledger' && f.category==='insufficient_privileges' && f.sqlstate==='42501'));
  assert(diagnosed.queryFailures.some(f => f.stage==='populated' && f.category==='insufficient_privileges' && f.sqlstate==='42501'));
  results.checks.push({ name:'real missing ledger/user permissions remain UNKNOWN', category:'insufficient_privileges', sqlstate:'42501' });
  const [unchanged] = await fixtures`select count(*)::int as n, min(id) as id from public.preflight_fixture_table`;
  assert.deepEqual({ n: unchanged.n, id: unchanged.id }, { n: 1, id: 1 });
  results.checks.push({ name: 'synthetic permanent table unchanged', outcome: 'one original row intact' });
} catch (error) {
  // Never print generated credentials, raw SQL, connection options or private-key files.
  results.failed = { name: error.name, code: error.code || null, checkCount: results.checks.length };
  process.exitCode = 1;
} finally {
  await Promise.allSettled([...clients].map(sql => sql.end({ timeout: 2 })));
  if (started || existsSync(join(data, 'postmaster.pid'))) {
    try { command(join(bin, 'pg_ctl'), ['-D', data, '-m', 'fast', '-w', '-t', '15', 'stop']); }
    catch { results.cleanupFailed = true; process.exitCode = 1; }
  }
  if (!results.cleanupFailed) rmSync(root, { recursive: true, force: true });
  results.clusterStoppedAndRemoved = !results.cleanupFailed;
  console.log(JSON.stringify(results, null, 2));
}
