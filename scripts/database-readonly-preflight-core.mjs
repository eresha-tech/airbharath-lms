import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { queries } from './database-readonly-queries.mjs';
import { safeDiagnostic } from './database-readonly-diagnostics.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
// Reviewed additive 0031: old SQL hashes unchanged; exact 32-entry chain remains pinned.
const pinnedManifest = 'e9494753700c4df15ce57261e7431ba8d0451c1e41d46db485a7d55886f6eaf8';
const identifier = value => typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_$]{0,62}$/.test(value);
export class PreflightError extends Error {
  constructor(code, diagnostic = null) { super(code); this.name = 'PreflightError'; this.code = code; this.diagnostic = diagnostic; }
}
export const preflightFailure = (error, stage) => error instanceof PreflightError && error.diagnostic
  ? error.diagnostic : safeDiagnostic(error, stage, error instanceof PreflightError ? error.code : null);
const diagnosed = (error, stage) => {
  const diagnostic = preflightFailure(error, stage);
  return new PreflightError(diagnostic.code, diagnostic);
};
const fail = code => { throw new PreflightError(code); };
const bodyHash = value => sha(value.replaceAll('\r\n', '\n').trim());

export function preflightConfiguration(env) {
  if (env.ALLOW_PRODUCTION_READONLY_PREFLIGHT !== 'true') fail('preflight_owner_authorization_required');
  if (env.DATABASE_ENV !== 'production' || env.PREFLIGHT_CONNECTION_MODE !== 'direct' || env.ALLOW_DATABASE_MIGRATION === 'true') fail('preflight_environment_invalid');
  for (const key of ['PREFLIGHT_EXPECTED_DATABASE', 'PREFLIGHT_EXPECTED_ROLE', 'PREFLIGHT_MIGRATION_ROLE']) if (!identifier(env[key])) fail('preflight_manifest_required');
  for (const key of ['PREFLIGHT_NEON_PROJECT_ID', 'PREFLIGHT_NEON_BRANCH_ID']) if (!/^[a-z0-9-]{3,100}$/.test(env[key] ?? '')) fail('preflight_manifest_required');
  if (env.PREFLIGHT_EXPECTED_ROLE === env.PREFLIGHT_MIGRATION_ROLE) fail('preflight_role_separation_required');
  const raw = env.PREFLIGHT_DATABASE_URL;
  if (!raw || raw.trim() !== raw || /[\s\\]/.test(raw)) fail('preflight_target_invalid');
  let url, user, password, database;
  try { url = new URL(raw); user = decodeURIComponent(url.username); password = decodeURIComponent(url.password); database = decodeURIComponent(url.pathname.slice(1)); }
  catch { fail('preflight_target_invalid'); }
  const host = url.hostname.toLowerCase(), labels = host.split('.');
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hash || host !== env.PREFLIGHT_EXPECTED_HOST || !/^ep-[a-z0-9-]+$/.test(labels[0])
    || !host.endsWith('.neon.tech') || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) || labels[0].includes('-pooler') || (url.port && url.port !== '5432')
    || user !== env.PREFLIGHT_EXPECTED_ROLE || database !== env.PREFLIGHT_EXPECTED_DATABASE || !password || /[\u0000-\u001f\u007f]/.test(password)) fail('preflight_target_invalid');
  const params = new Map();
  for (const [key, value] of url.searchParams) {
    if (key === 'channel_binding') fail('preflight_channel_binding_unsupported');
    if (!['sslmode', 'sslrootcert'].includes(key) || params.has(key)) fail('preflight_options_unsupported');
    params.set(key, value);
  }
  if (params.get('sslmode') !== 'verify-full' || (params.has('sslrootcert') && params.get('sslrootcert') !== 'system')) fail('preflight_verified_tls_required');
  const expectedOid = env.PREFLIGHT_EXPECTED_DATABASE_OID;
  if (expectedOid !== undefined && !/^[1-9]\d{0,9}$/.test(expectedOid)) fail('preflight_manifest_required');
  return { target: { host, database, role: user, migrationRole: env.PREFLIGHT_MIGRATION_ROLE, expectedOid: expectedOid ?? null,
    declaredNeonProject: env.PREFLIGHT_NEON_PROJECT_ID, declaredNeonBranch: env.PREFLIGHT_NEON_BRANCH_ID, providerMapping: 'OWNER_ATTESTED_NOT_SQL_VERIFIED' },
    options: { host: [host], port: [5432], database, user, password: () => password, ssl: 'verify-full', sslnegotiation: null,
      max: 1, prepare: false, debug: false, fetch_types: false, target_session_attrs: 'read-only', connect_timeout: 5, idle_timeout: 2, max_lifetime: 60, onnotice: () => {},
      connection: { application_name: 'airbharath_readonly_preflight', search_path: 'pg_catalog', default_transaction_read_only: true, statement_timeout: 5000, lock_timeout: 1000, idle_in_transaction_session_timeout: 5000 } } };
}

export function loadReviewedSource(root = fileURLToPath(new URL('../', import.meta.url))) {
  const journal = JSON.parse(readFileSync(root + '/drizzle/meta/_journal.json', 'utf8')).entries;
  if (journal.length !== 32 || journal.some((e, i) => e.idx !== i || !/^\d{4}_[a-z0-9_]+$/.test(e.tag) || !Number.isSafeInteger(e.when) || (i && e.when <= journal[i-1].when))) fail('preflight_source_unreviewed');
  const migrations = journal.map(e => ({ ...e, sql: readFileSync(root + '/drizzle/' + e.tag + '.sql', 'utf8') }));
  const manifest = migrations.map(e => ({ idx: e.idx, sha256: sha(e.sql), tag: e.tag, when: e.when }));
  if (sha(JSON.stringify(manifest)) !== pinnedManifest) fail('preflight_source_unreviewed');
  const reviewedFiles = ['drizzle/meta/_journal.json','lib/db/schema.ts', ...journal.flatMap(e => ['drizzle/'+e.tag+'.sql', 'drizzle/meta/'+e.tag.slice(0,4)+'_snapshot.json'])].sort();
  const sourceFiles = reviewedFiles.map(path => ({ path, sha256: sha(readFileSync(root+'/'+path)) }));
  if (sha(JSON.stringify(sourceFiles)) !== '2fed961b801f528b8c92c2f200d312e4abb9d95a22e1cffa40a27b289d6b9ba9') fail('preflight_source_unreviewed');
  const snapshots = journal.map(e => JSON.parse(readFileSync(root + '/drizzle/meta/' + e.tag.slice(0,4) + '_snapshot.json', 'utf8')));
  if (snapshots.some((s, i) => s.dialect !== 'postgresql' || (i && s.prevId !== snapshots[i-1].id))) fail('preflight_snapshot_lineage_invalid');
  return { manifest, migrations, snapshots };
}

export function reconcileLedger(rows, source, present, populated) {
  const problems = [], timestamps = new Set(), hashes = new Set();
  if (!present || rows === null) return { state: 'UNKNOWN', installed: null, pending: null, problems: [!present ? (populated ? 'ledger_missing_on_populated_schema' : 'ledger_missing') : 'ledger_read_unavailable'] };
  if (rows.length === 0) return { state: 'BLOCKED', installed: [], pending: null, problems: ['ledger_empty_existing_database'] };
  const sorted = [...rows].sort((a,b) => Number(a.created_at)-Number(b.created_at));
  for (const [i,row] of sorted.entries()) {
    const timestamp = String(row.created_at);
    if (timestamps.has(timestamp) || hashes.has(row.hash)) problems.push('ledger_duplicate');
    timestamps.add(timestamp); hashes.add(row.hash);
    const index = source.manifest.findIndex(e => String(e.when) === timestamp);
    if (index < 0) problems.push('ledger_unknown_timestamp');
    else {
      if (index !== i) problems.push('ledger_not_contiguous');
      if (row.hash !== source.manifest[index].sha256) problems.push('ledger_hash_mismatch');
    }
  }
  if (problems.length) return { state: 'BLOCKED', installed: null, pending: null, problems: [...new Set(problems)] };
  return { state: 'MATCHED_PREFIX', installed: source.manifest.slice(0,rows.length).map(e => e.tag), pending: source.manifest.slice(rows.length).map(e => e.tag), problems: [] };
}

function expectedRoutines(migrations) {
  const functions = new Map(), triggers = new Map();
  for (const m of migrations) {
    for (const match of m.sql.matchAll(/CREATE(?: OR REPLACE)? FUNCTION\s+(?:public\.)?(\w+)\(\)\s+[\s\S]*?AS\s+\$\$([\s\S]*?)\$\$/g)) functions.set(match[1], bodyHash(match[2]));
    for (const match of m.sql.matchAll(/CREATE(?: CONSTRAINT)? TRIGGER\s+(\w+)\s+[\s\S]*?ON\s+(?:public\.)?(\w+)[\s\S]*?EXECUTE FUNCTION\s+(?:public\.)?(\w+)\(\)/g)) triggers.set(match[2] + '.' + match[1], match[3]);
  }
  return { functions, triggers };
}
const action = { a: 'no action', r: 'restrict', c: 'cascade', n: 'set null', d: 'set default' };
const typeName = s => s?.replaceAll('"','').replace(/^public\./,'').replace(/numeric\((\d+),\s*(\d+)\)/, 'numeric($1,$2)');

export function assessCatalog(catalog, ledger, source) {
  if (ledger.state !== 'MATCHED_PREFIX') return { state: 'UNKNOWN', findings: ['catalog_prefix_unknown'] };
  const findings = [], snapshot = source.snapshots[ledger.installed.length-1], prefix = source.migrations.slice(0,ledger.installed.length);
  for (const key of ['schemas','objects','columns','constraints','indexes','functions','triggers','enums']) if (catalog[key] === null) findings.push('catalog_'+key+'_unavailable');
  if (findings.length) return { state: 'UNKNOWN', findings };
  for (const schema of catalog.schemas) if (!['public','drizzle'].includes(schema.name)) findings.push('unexpected_schema:'+schema.name);
  const expected = snapshot.tables;
  for (const [key, e] of Object.entries(snapshot.enums)) {
    const actual = catalog.enums.find(a => a.schema+'.'+a.name===key);
    if (!actual || JSON.stringify(actual.values)!==JSON.stringify(e.values)) findings.push('enum_mismatch:'+key);
  }
  for (const e of catalog.enums) if (!(e.schema+'.'+e.name in snapshot.enums)) findings.push('unexpected_enum:'+e.schema+'.'+e.name);
  const tables = catalog.objects.filter(o => o.kind === 'r' || o.kind === 'p');
  for (const o of catalog.objects) if (o.kind==='S' && !(o.schema==='drizzle' && o.name==='__drizzle_migrations_id_seq')) findings.push('unreviewed_sequence:'+o.schema+'.'+o.name);
  for (const o of catalog.objects) if (['v','m','f'].includes(o.kind)) findings.push('unreviewed_relation:'+o.schema+'.'+o.name);
  for (const table of tables) if (!(table.schema+'.'+table.name in expected) && !(table.schema==='drizzle' && table.name==='__drizzle_migrations')) findings.push('unexpected_table:'+table.schema+'.'+table.name);
  for (const [key, table] of Object.entries(expected)) {
    if (!tables.some(o => o.schema+'.'+o.name===key)) { findings.push('missing_table:'+key); continue; }
    if (tables.find(o => o.schema+'.'+o.name===key)?.rls!==table.isRLSEnabled) findings.push('rls_review:'+key);
    const columns = catalog.columns.filter(c => c.schema+'.'+c.table===key);
    for (const c of Object.values(table.columns)) {
      const actual = columns.find(a => a.name===c.name);
      if (!actual || typeName(actual.type)!==typeName(c.type) || actual.not_null!==c.notNull) findings.push('column_mismatch:'+key+'.'+c.name);
    }
    for (const c of columns) if (!(c.name in table.columns)) findings.push('unexpected_column:'+key+'.'+c.name);
    for (const fk of Object.values(table.foreignKeys)) {
      const actual = catalog.constraints.find(c => c.schema+'.'+c.table===key && c.type==='f' && c.foreign_schema==='public' && c.foreign_table===fk.tableTo
        && JSON.stringify(c.columns)===JSON.stringify(fk.columnsFrom) && JSON.stringify(c.foreign_columns)===JSON.stringify(fk.columnsTo) && action[c.delete_action]===fk.onDelete && action[c.update_action]===fk.onUpdate);
      if (!actual || !actual.validated) findings.push('fk_mismatch:'+key+'.'+fk.name);
      else if (actual.name!==fk.name.slice(0,63)) findings.push('fk_name_review:'+key+'.'+actual.name);
    }
    const knownIndexes = new Set([...Object.values(table.indexes).map(i=>i.name.slice(0,63)), ...Object.values(table.uniqueConstraints).map(c=>c.name.slice(0,63)), ...Object.values(table.compositePrimaryKeys).map(c=>c.name.slice(0,63)), (table.name+'_pkey').slice(0,63)]);
    for (const i of catalog.indexes.filter(i=>i.schema+'.'+i.table===key)) if (!knownIndexes.has(i.name) || !i.valid || !i.ready) findings.push('unreviewed_or_invalid_index:'+key+'.'+i.name);
    for (const index of Object.values(table.indexes)) if (!catalog.indexes.some(i => i.schema+'.'+i.table===key && i.name===index.name.slice(0,63) && i.valid && i.ready && i.unique===index.isUnique)) findings.push('index_mismatch:'+key+'.'+index.name);
    for (const [collection,kind] of [[table.uniqueConstraints,'u'],[table.checkConstraints,'c'],[table.compositePrimaryKeys,'p']]) for (const c of Object.values(collection)) {
      if (!catalog.constraints.some(a => a.schema+'.'+a.table===key && a.name===c.name.slice(0,63) && a.type===kind && a.validated)) findings.push('constraint_mismatch:'+key+'.'+c.name);
    }
    if (Object.values(table.columns).some(c => c.primaryKey) && !catalog.constraints.some(c => c.schema+'.'+c.table===key && c.type==='p' && c.validated)) findings.push('primary_key_missing:'+key);
  }
  const routines = expectedRoutines(prefix), future = expectedRoutines(source.migrations.slice(prefix.length));
  for (const [name,hash] of routines.functions) {
    const f = catalog.functions.find(f => f.name===name && f.arguments==='');
    if (!f || bodyHash(f.body)!==hash || f.security_definer) findings.push('function_mismatch:'+name);
  }
  for (const [key,fn] of routines.triggers) if (!catalog.triggers.some(t => t.table+'.'+t.name===key && t.function===fn && t.function_schema==='public' && t.enabled==='O')) findings.push('trigger_mismatch:'+key);
  for (const f of catalog.functions) if (!routines.functions.has(f.name)) findings.push((future.functions.has(f.name)?'pending_function_name_conflict:':'unreviewed_function:')+f.name);
  for (const t of catalog.triggers) if (!routines.triggers.has(t.table+'.'+t.name)) findings.push((future.triggers.has(t.table+'.'+t.name)?'pending_trigger_name_conflict:':'unreviewed_trigger:')+t.table+'.'+t.name);
  // Snapshots/normalized names do not establish complete defaults/check/index/trigger semantics.
  return { state: findings.length ? 'REVIEW_REQUIRED' : 'STRUCTURAL_MATCH_REVIEW_REQUIRED', findings: [...new Set(findings)],
    limitations: ['full_definition_and_privilege_review_required','isolated_neon_rehearsal_required'], sharedUsersEmailTriggerPending: ledger.pending.some(tag=>tag.startsWith('0027_')) };
}

function safeMetadata(value) {
  if (Array.isArray(value)) return value.map(safeMetadata);
  if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).flatMap(([key,v]) => {
    if (key==='body' || key==='definition' || key==='default_definition') return [[key+'_sha256', v===null ? null : sha(String(v))]];
    if (key==='created_at') return [[key, /^\d{1,16}$/.test(String(v)) ? String(v) : '[INVALID_TIMESTAMP]']];
    if (key==='id') return [[key, /^[1-9]\d{0,15}$/.test(String(v)) ? v : '[INVALID_ID]']];
    if (key==='hash') return [[key, /^[a-f0-9]{64}$/.test(v) ? v : '[INVALID_HASH]']];
    return [[key,safeMetadata(v)]];
  }));
  if (typeof value==='string' && (value.length>300 || /:\/\/|@|[\u0000-\u001f]/.test(value))) return '[REDACTED_METADATA]';
  return value;
}

export async function inspectDatabase({ env, connect, source = /** @type {ReturnType<typeof loadReviewedSource> | null} */ (null) }) {
  let stage = 'configuration', client, deadline, primaryFailure, expired = false;
  try {
    const configuration = preflightConfiguration(env); // Before any driver construction.
    stage = 'source_integrity';
    source ??= loadReviewedSource();
    stage = 'client_initialization';
    client = connect(configuration.options);
    const connectedClient = client;
    deadline = setTimeout(() => { expired = true; void connectedClient.end({ timeout: 1 }).catch(() => {}); }, 30_000);
    stage = 'transaction_begin';
    return await client.begin('isolation level repeatable read read only', async tx => {
      const limitations = [], queryFailures = [];
      async function read(name, parameters=[]) {
        stage = name;
        if (expired) fail('preflight_deadline_exceeded');
        try {
          const rows = await tx.savepoint(sp => sp.unsafe(queries[name],parameters));
          if (rows.length>({objects:2000,columns:10000,constraints:2000,indexes:2000,functions:1000,triggers:1000,ledger:32}[name] ?? 100)) { limitations.push(name+':catalog_limit_exceeded'); return null; }
          return Array.from(rows);
        } catch (error) {
          const diagnostic = safeDiagnostic(error, name);
          const critical = { identity:'preflight_identity_mismatch', tls:'preflight_tls_unverified', roles:'preflight_readonly_role_required' }[name];
          if (critical) throw new PreflightError(critical, { ...diagnostic, code:critical });
          const { category, stage:failedStage, sqlstate } = diagnostic;
          queryFailures.push({ category, stage:failedStage, sqlstate });
          limitations.push(name+':unavailable'); return null;
        }
      }
      const identity = (await read('identity'))?.[0], tls = (await read('tls'))?.[0], roles = (await read('roles',[configuration.target.migrationRole]))?.[0];
      stage = 'identity_verification';
      if (!identity || identity.database!==configuration.target.database || identity.role!==configuration.target.role || identity.authenticated_role!==configuration.target.role
        || identity.read_only!=='on' || (configuration.target.expectedOid && identity.oid!==configuration.target.expectedOid)) fail('preflight_identity_mismatch');
      stage = 'session_limits_verification';
      if (identity.search_path!=='pg_catalog' || identity.statement_timeout_ms!==5000 || identity.lock_timeout_ms!==1000 || identity.idle_transaction_timeout_ms!==5000) fail('preflight_limits_unverified');
      stage = 'tls_verification';
      if (!tls?.ssl || !['TLSv1.2','TLSv1.3'].includes(tls.version)) fail('preflight_tls_unverified');
      stage = 'privilege_verification';
      // PUBLIC-only TEMP is an explicit inspection exception, not an absent privilege.
      // Unknown/contradictory ACL provenance or any role-specific TEMP grant still refuses.
      const tempEvidenceValid = typeof roles?.temporary_objects==='boolean'
        && typeof roles?.public_temp==='boolean' && roles?.nonpublic_temp===false
        && roles.temporary_objects===roles.public_temp;
      if (!roles || ['elevated','owns_objects','owns_routines','schema_create','table_write','sequence_write','database_create','migration_role_accessible'].some(key=>roles[key]!==false)
        || !tempEvidenceValid || identity.no_temp_namespace!==true) fail('preflight_readonly_role_required');
      if (roles.temporary_objects) limitations.push('public_temp_present_unused_by_inspector');
      const catalog = {};
      for (const name of ['schemas','objects','columns','constraints','indexes','functions','triggers','enums']) catalog[name] = await read(name);
      const presence = (await read('ledgerPresence'))?.[0]?.present;
      const ordinary = name => catalog.objects?.some(o=>o.schema==='public' && o.name===name && ['r','p'].includes(o.kind) && !o.rls);
      const populated = ordinary('users') ? (await read('populated'))?.[0]?.populated : null;
      const rows = presence===true ? await read('ledger') : null;
      stage = 'ledger_reconciliation';
      const ledger = presence===undefined ? { state:'UNKNOWN',installed:null,pending:null,problems:['ledger_presence_unavailable'] } : reconcileLedger(rows,source,presence, populated);
      stage = 'catalog_assessment';
      const compatibility = assessCatalog(catalog,ledger,source);
      stage = 'prerequisite_assessment';
      const prerequisites = {};
      for (const [prefix,query,table] of [['0019','terms','workspace_creator_terms_versions'],['0026','pricing','workspace_membership_plans'],['0027','emailPrerequisite','users']]) {
        if (!ledger.pending) prerequisites[prefix] = 'UNKNOWN';
        else if (!ledger.pending.some(tag=>tag.startsWith(prefix+'_'))) prerequisites[prefix] = 'NOT_PENDING';
        else if (!ordinary(table)) prerequisites[prefix] = 'UNKNOWN_UNTIL_EARLIER_PENDING_MIGRATIONS_REHEARSED';
        else { const result = (await read(query))?.[0]; prerequisites[prefix] = result?.ready===true ? 'OBSERVED_PREREQUISITE_MATCH' : result?.ready===false ? 'UNMET' : 'UNKNOWN'; }
      }
      const capacity = await read('capacity'), activity = await read('activity'), serverIdentifier = (await read('serverIdentifier'))?.[0] ?? null;
      if (activity?.some(row=>row.state===null)) limitations.push('activity_visibility_limited');
      if (!roles.migration_role_exists) limitations.push('migration_role_not_confirmed');
      if (expired) fail('preflight_deadline_exceeded');
      stage = 'report_serialization';
      const report = safeMetadata({ decision: 'BLOCKED_PENDING_REHEARSAL_AND_OWNER_LOCAL_UAT', migrationAuthorized: false,
        publicTempExceptionAccepted: roles.temporary_objects,
        expectedTarget: configuration.target, identity, tls: { ...tls, clientVerification:'verify-full' }, roles, ledger, ledgerEvidence:{present:presence ?? null,populatedSchema:populated,rows}, catalog, compatibility, prerequisites,
        capacity, activity, serverIdentifier, limitations, queryFailures, sourceManifestSha256:pinnedManifest,
        requiredGates:['separately_authorized_production_inspection','complete_catalog_and_definition_review','neon_direct_pooled_tls_and_capacity_proof','isolated_neon_branch_restore_and_pending_chain_rehearsal','founder_led_local_phase18_e2e_explicit_UAT_acceptance','separate_production_migration_and_deployment_authorizations'],
        ownerProvisionalPrefix: { last:'0006_great_kate_bishop', entries:7, pending:25, evidence:'OWNER_PROVISIONAL_NOT_LEDGER_PROOF' } });
      stage = 'transaction_finish';
      return report;
    });
  } catch (error) {
    primaryFailure = diagnosed(expired ? new PreflightError('preflight_deadline_exceeded') : error, stage);
    throw primaryFailure;
  } finally {
    clearTimeout(deadline);
    if (client) {
      try { await client.end({ timeout: 2 }); }
      catch (error) { if (!primaryFailure) throw diagnosed(error, 'connection_close'); }
    }
  }
}
