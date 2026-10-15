import { expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReviewedSource, preflightConfiguration, reconcileLedger, assessCatalog, inspectDatabase, PreflightError, preflightFailure } from '../../scripts/database-readonly-preflight-core.mjs';
import { main } from '../../scripts/database-readonly-preflight.mjs';
const providerMock = vi.hoisted(()=>({factory:vi.fn()}));
vi.mock('postgres',()=>({default:providerMock.factory}));
import { queries } from '../../scripts/database-readonly-queries.mjs';
interface SnapshotTable {
  name:string; isRLSEnabled:boolean;
  columns:Record<string,{name:string;type:string;notNull:boolean;primaryKey:boolean;default?:string}>;
  indexes:Record<string,{name:string;isUnique:boolean}>;
  foreignKeys:Record<string,{name:string;tableTo:string;columnsFrom:string[];columnsTo:string[];onDelete:string;onUpdate:string}>;
  compositePrimaryKeys:Record<string,{name:string}>; uniqueConstraints:Record<string,{name:string}>; checkConstraints:Record<string,{name:string}>;
}
interface ReviewedSource {
  manifest:{idx:number;when:number;tag:string;sha256:string}[];
  migrations:{idx:number;when:number;tag:string;sql:string}[];
  snapshots:{tables:Record<string,SnapshotTable>;enums:Record<string,{schema:string;name:string;values:string[]}>}[];
}
const source: ReviewedSource = loadReviewedSource();
const environment = () => ({ ALLOW_PRODUCTION_READONLY_PREFLIGHT:'true', DATABASE_ENV:'production', PREFLIGHT_CONNECTION_MODE:'direct',
  PREFLIGHT_EXPECTED_HOST:'ep-synthetic-123.us-east-2.aws.neon.tech', PREFLIGHT_EXPECTED_DATABASE:'airbharath_lms', PREFLIGHT_EXPECTED_ROLE:'inspection_readonly', PREFLIGHT_MIGRATION_ROLE:'migration_owner',
  PREFLIGHT_NEON_PROJECT_ID:'synthetic-project-123', PREFLIGHT_NEON_BRANCH_ID:'br-synthetic-123', PREFLIGHT_DATABASE_URL:'postgresql://inspection_readonly:synthetic-only@ep-synthetic-123.us-east-2.aws.neon.tech/airbharath_lms?sslmode=verify-full' });
const ledger = (count=7) => source.manifest.slice(0,count).map((e,i)=>({id:i+1,hash:e.sha256,created_at:String(e.when)}));
const actions: Record<string,string> = { 'no action':'a', restrict:'r', cascade:'c', 'set null':'n', 'set default':'d' };
function catalog(count=7) {
  const snapshot = source.snapshots[count-1];
  return {
    schemas: [{name:'public',owner:'migration_owner'},{name:'drizzle',owner:'migration_owner'}],
    objects: [...Object.values(snapshot.tables).map(t=>({schema:'public', name:t.name, kind:'r', owner:'migration_owner', rls:t.isRLSEnabled})),{schema:'drizzle',name:'__drizzle_migrations',kind:'r',owner:'migration_owner',rls:false}],
    columns: Object.values(snapshot.tables).flatMap(t=>Object.values(t.columns).map(c=>({schema:'public',table:t.name,name:c.name,type:c.type,not_null:c.notNull,default_definition:c.default ?? null}))),
    constraints: Object.values(snapshot.tables).flatMap(t=>[
      ...Object.values(t.foreignKeys).map(c=>({schema:'public',table:t.name,name:c.name.slice(0,63),type:'f',validated:true,columns:c.columnsFrom,foreign_schema:'public',foreign_table:c.tableTo,foreign_columns:c.columnsTo,delete_action:actions[c.onDelete],update_action:actions[c.onUpdate],definition:'synthetic definition'})),
      ...Object.values(t.uniqueConstraints).map(c=>({schema:'public',table:t.name,name:c.name.slice(0,63),type:'u',validated:true,definition:'synthetic unique'})),
      ...Object.values(t.checkConstraints).map(c=>({schema:'public',table:t.name,name:c.name.slice(0,63),type:'c',validated:true,definition:'synthetic check'})),
      ...(Object.values(t.columns).some(c=>c.primaryKey)?[{schema:'public',table:t.name,name:t.name+'_pkey',type:'p',validated:true,definition:'synthetic primary key'}]:[]),
    ]),
    indexes: Object.values(snapshot.tables).flatMap(t=>Object.values(t.indexes).map(i=>({schema:'public',table:t.name,name:i.name.slice(0,63),valid:true,ready:true,unique:i.isUnique,definition:'synthetic index'}))),
    functions: [] as {schema:string;name:string;arguments:string;body:string;definition:string;security_definer:boolean}[],
    triggers: [] as {schema:string;table:string;name:string;function:string;function_schema:string;enabled:string}[],
    enums: Object.values(snapshot.enums).map(e=>({schema:e.schema,name:e.name,values:e.values})),
  };
}
function harness(count=7) {
  const data: Record<string, unknown[] | Error> = { ...catalog(count),
    identity:[{database:'airbharath_lms',oid:'98765',role:'inspection_readonly',authenticated_role:'inspection_readonly',version:'16.15',server_address:'192.0.2.1',port:5432,search_path:'pg_catalog',read_only:'on',no_temp_namespace:true,statement_timeout_ms:5000,lock_timeout_ms:1000,idle_transaction_timeout_ms:5000}],
    tls:[{ssl:true,version:'TLSv1.3',cipher:'TLS_AES_256_GCM_SHA384',bits:256}],
    roles:[{ elevated:false,owns_objects:false,owns_routines:false,schema_create:false,table_write:false,sequence_write:false,database_create:false,temporary_objects:false,public_temp:false,nonpublic_temp:false,migration_role_accessible:false,migration_role_exists:true }],
    ledgerPresence:[{present:true}],populated:[{populated:true}],ledger:ledger(count),
    terms:[{ready:true}],pricing:[{ready:true}],emailPrerequisite:[{ready:true}],capacity:[{name:'max_connections',setting:'100'}],activity:[{state:'active',connections:1}],serverIdentifier:new Error('permission denied synthetic') };
  const unsafe = vi.fn(async (statement:string) => {
    const name = Object.entries(queries).find(([,value])=>value===statement)?.[0];
    if (!name) throw Error('unexpected SQL');
    const rows = data[name]; if (rows instanceof Error) throw rows;
    if (!rows) throw Error('missing mock'); return structuredClone(rows);
  });
  const tx = { unsafe, savepoint: async <T>(callback:(sp:{unsafe:typeof unsafe})=>Promise<T>)=>callback({unsafe}) };
  const client = { begin:vi.fn(async <T>(options:string, callback:(transaction:typeof tx)=>Promise<T>)=>callback(tx)), end:vi.fn(async()=>{}) };
  const connect = vi.fn(()=>client);
  return { data, unsafe, client, connect, run:(env:Record<string,string|undefined>=environment())=>inspectDatabase({env,connect,source}) };
}
it('pins all 32 reviewed SQL sources and 66 source/schema files without network or database use',()=>{
  expect(source.manifest).toHaveLength(32); expect(source.snapshots).toHaveLength(32); expect(source.manifest[31].tag).toBe('0031_workspace_phone_only_onboarding');
});
it('fails before connection construction without separate opt-in or explicit production manifest',async()=>{
  const h=harness(); for(const overrides of [{ALLOW_PRODUCTION_READONLY_PREFLIGHT:undefined},{DATABASE_ENV:'development'},{PREFLIGHT_NEON_BRANCH_ID:undefined},{PREFLIGHT_EXPECTED_DATABASE:undefined},{ALLOW_DATABASE_MIGRATION:'true'}]) await expect(h.run({...environment(),...overrides})).rejects.toThrow(/^preflight_/);
  expect(h.connect).not.toHaveBeenCalled();
});
it.each(['postgres://inspection_readonly:synthetic-only@localhost:5433/airbharath_lms?sslmode=verify-full','postgres://inspection_readonly:synthetic-only@127.0.0.1/airbharath_lms?sslmode=verify-full','postgres://inspection_readonly:synthetic-only@[::1]/airbharath_lms?sslmode=verify-full','postgres://inspection_readonly:synthetic-only@other.invalid/airbharath_lms?sslmode=verify-full','invalid','https://ep-synthetic-123.us-east-2.aws.neon.tech/airbharath_lms'])('rejects malformed/local/non-Neon targets offline: %s',url=>{
  expect(()=>preflightConfiguration({...environment(),PREFLIGHT_DATABASE_URL:url})).toThrow(/^preflight_/);
});
it.each(['sslmode=require','sslmode=disable','sslmode=prefer','sslmode=verify-full&sslmode=disable','sslmode=verify-full&sslrootcert=/secret','sslmode=verify-full&channel_binding=require','sslmode=verify-full&host=localhost'])('rejects unsafe, unsupported or ambiguous connection policy: %s',params=>{
  expect(()=>preflightConfiguration({...environment(),PREFLIGHT_DATABASE_URL:environment().PREFLIGHT_DATABASE_URL.replace('sslmode=verify-full',params)})).toThrow(/^preflight_/);
});
it('refuses pooled/mismatched endpoints rather than rewriting hosts or stripping channel binding',()=>{
  const env=environment();
  expect(()=>preflightConfiguration({...env,PREFLIGHT_DATABASE_URL:env.PREFLIGHT_DATABASE_URL.replace('123.', '123-pooler.'),PREFLIGHT_EXPECTED_HOST:env.PREFLIGHT_EXPECTED_HOST.replace('123.','123-pooler.')})).toThrow('preflight_target_invalid');
  expect(()=>preflightConfiguration({...env,PREFLIGHT_EXPECTED_HOST:'ep-another.us-east-2.aws.neon.tech'})).toThrow('preflight_target_invalid');
  expect(()=>preflightConfiguration({...env,PREFLIGHT_CONNECTION_MODE:'pooled'})).toThrow('preflight_environment_invalid');
});
it('uses explicit encoded identity and certificate-verified bounded options, never ambient PG credentials',()=>{
  const c=preflightConfiguration({...environment(),PREFLIGHT_DATABASE_URL:environment().PREFLIGHT_DATABASE_URL.replace('synthetic-only','synthetic%3A%405433')});
  expect(c.options.password()).toBe('synthetic:@5433'); expect(c.options).toMatchObject({host:[environment().PREFLIGHT_EXPECTED_HOST],port:[5432],ssl:'verify-full',max:1,connect_timeout:5,prepare:false,debug:false,connection:{default_transaction_read_only:true,statement_timeout:5000,lock_timeout:1000}});
  expect(c.options.target_session_attrs).toBeNull(); expect(c.options.fetch_types).toBe(false);
});
it.each(['', 'read-only', 'read-write', 'primary', 'standby', 'prefer-standby', 'malicious-synthetic'])('refuses ambient session selection before constructing a driver: %s',async value=>{
  const h=harness();
  await expect(h.run({...environment(),PGTARGETSESSIONATTRS:value})).rejects.toThrow('preflight_session_selection_unsupported');
  expect(h.connect).not.toHaveBeenCalled();
});
it('also rejects the actual driver process environment when given a separate manifest',async()=>{
  vi.stubEnv('PGTARGETSESSIONATTRS','read-write');
  try { const h=harness();await expect(h.run()).rejects.toThrow('preflight_session_selection_unsupported');expect(h.connect).not.toHaveBeenCalled(); }
  finally {vi.unstubAllEnvs();}
});
it('rejects URL session-selection overrides rather than forwarding them',()=>{
  expect(()=>preflightConfiguration({...environment(),PREFLIGHT_DATABASE_URL:environment().PREFLIGHT_DATABASE_URL+'&target_session_attrs=read-only'})).toThrow('preflight_options_unsupported');
});
it.each(['CONNECTION_DESTROYED','ECONNRESET','CONNECT_TIMEOUT','ERR_TLS_CERT_ALTNAME_INVALID'])('retains only allowlisted startup code %s without raw driver details',async code=>{
  const h=harness();h.client.begin.mockRejectedValueOnce(Object.assign(new Error('private-synthetic-message'),{code,detail:'private-synthetic-detail'}));
  await expect(h.run()).rejects.toMatchObject({diagnostic:{stage:'transaction_begin',driverCode:code}});
  expect(h.unsafe).not.toHaveBeenCalled();expect(h.client.end).toHaveBeenCalled();
  expect(JSON.stringify(preflightFailure({code,message:'private-synthetic-message'},'transaction_begin'))).not.toContain('private-synthetic');
});
it.each([1,7,31,32])('reconciles the exact contiguous prefix of %i migrations',count=>{
  const r=reconcileLedger(ledger(count),source,true,true); expect(r.state).toBe('MATCHED_PREFIX'); expect(r.installed).toHaveLength(count); expect(r.pending).toHaveLength(32-count);
});
it('never assumes the owner provisional 0006 boundary, accepting a different proven prefix',()=>{
  expect(reconcileLedger(ledger(8),source,true,true).pending?.[0]).toBe('0008_eager_energizer');
});
it('blocks missing/empty/unreadable ledgers on an existing database',()=>{
  expect(reconcileLedger([],source,false,true).problems).toContain('ledger_missing_on_populated_schema');
  expect(reconcileLedger([],source,true,true).problems).toContain('ledger_empty_existing_database');
  expect(reconcileLedger(null,source,true,true).state).toBe('UNKNOWN');
});
it('blocks gaps, duplicates, changed hashes and unknown future timestamps without a guessed suffix',()=>{
  const valid=ledger(); const variants=[valid.filter((_,i)=>i!==2),[...valid,valid[2]],valid.map((r,i)=>i===2?{...r,hash:'a'.repeat(64)}:r),[...valid,{id:99,hash:'b'.repeat(64),created_at:'9999999999999'}]];
  for(const rows of variants){const r=reconcileLedger(rows,source,true,true);expect(r.state).toBe('BLOCKED');expect(r.pending).toBeNull();}
});
it('collects only fixed SELECT metadata inside a read-only transaction and closes every pool',async()=>{
  const h=harness(), report=await h.run();
  expect(h.client.begin).toHaveBeenCalledWith('isolation level repeatable read read only',expect.any(Function)); expect(h.client.end).toHaveBeenCalledWith({timeout:2});
  expect(report.ledger.pending).toHaveLength(25); expect(report.ledgerEvidence.rows).toEqual(ledger()); expect(report.migrationAuthorized).toBe(false); expect(report.requiredGates).toContain('founder_led_local_phase18_e2e_explicit_UAT_acceptance');
  expect(report.compatibility.state).toBe('STRUCTURAL_MATCH_REVIEW_REQUIRED'); expect(report.prerequisites['0019']).toBe('UNKNOWN_UNTIL_EARLIER_PENDING_MIGRATIONS_REHEARSED');
  expect(report.publicTempExceptionAccepted).toBe(false);
  expect(report.limitations).toContain('serverIdentifier:unavailable');
  for(const [query] of h.unsafe.mock.calls) expect(query.trim()).toMatch(/^(select|with)\b/i);
});
it.each(['elevated','owns_objects','owns_routines','schema_create','table_write','sequence_write','database_create','temporary_objects','migration_role_accessible'])('rejects mutative/privileged/owner capability %s before reading history',async capability=>{
  const h=harness(); h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],[capability]:true}];
  await expect(h.run()).rejects.toThrow('preflight_readonly_role_required'); expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger); expect(h.client.end).toHaveBeenCalled();
});
it('fails closed if privilege proof, verified TLS, read-only mode or identity is unavailable',async()=>{
  for(const [name,value,code] of [['roles',new Error('private server error'),'preflight_readonly_role_required'],['tls',[{ssl:false}],'preflight_tls_unverified'],['identity',[{database:'wrong',role:'inspection_readonly'}],'preflight_identity_mismatch']] as const){
    const h=harness();h.data[name]=value instanceof Error?value:[...value];await expect(h.run()).rejects.toThrow(code);expect(h.client.end).toHaveBeenCalled();
  }
});
it('records a ledger privilege failure as UNKNOWN without repairing it or escalating',async()=>{
  const h=harness();h.data.ledger=new Error('permission denied; private connection detail');const r=await h.run();expect(r.ledger.state).toBe('UNKNOWN');expect(r.ledger.pending).toBeNull();expect(r.limitations).toContain('ledger:unavailable');expect(JSON.stringify(r)).not.toContain('private connection detail');
});
it('records missing prerequisites and shared-user/pending-name conflicts without bypasses',async()=>{
  const h=harness();const c=catalog(7);h.data.objects=[...c.objects,{schema:'public',name:'workspace_creator_terms_versions',kind:'r',owner:'migration_owner',rls:false},{schema:'public',name:'workspace_membership_plans',kind:'r',owner:'migration_owner',rls:false}];
  h.data.terms=[{ready:false}];h.data.pricing=[{ready:false}];h.data.triggers=[{schema:'public',table:'users',name:'workspace_email_contact_change',function:'workspace_email_contact_change',function_schema:'public',enabled:'O'}];
  const r=await h.run();expect(r.prerequisites).toMatchObject({'0019':'UNMET','0026':'UNMET'});expect(r.compatibility.findings).toContain('pending_trigger_name_conflict:users.workspace_email_contact_change');expect(r.compatibility.sharedUsersEmailTriggerPending).toBe(true);
});
it('flags foreign-key name drift, unexpected tables, bad columns and indexes for review',()=>{
  const c=catalog();c.objects.push({schema:'public',name:'otps',kind:'r',owner:'migration_owner',rls:false});c.columns[0].type='wrong';c.constraints[0].name='legacy_fkey';c.indexes[0].valid=false;
  const a=assessCatalog(c,reconcileLedger(ledger(),source,true,true),source);expect(a.state).toBe('REVIEW_REQUIRED');expect(a.findings).toContain('unexpected_table:public.otps');expect(a.findings.some(s=>s.startsWith('column_mismatch:'))).toBe(true);expect(a.findings.some(s=>s.startsWith('fk_name_review:'))).toBe(true);expect(a.findings.some(s=>s.startsWith('index_mismatch:'))).toBe(true);
});
it('does not query foreign/RLS-protected prerequisite relations or export private routine/default definitions',async()=>{
  const h=harness();h.data.objects=[{schema:'public',name:'users',kind:'f',owner:'migration_owner',rls:true}];h.data.functions=[{schema:'public',name:'custom_function',arguments:'',body:'private-synthetic-value',definition:'https://private.invalid/secret'}];h.data.columns=[{schema:'public',table:'users',name:'id',type:'uuid',not_null:true,default_definition:"'private-synthetic-default'"}];
  const r=await h.run();const output=JSON.stringify(r);expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.populated);expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.emailPrerequisite);expect(output).not.toContain('private-synthetic-value');expect(output).not.toContain('private-synthetic-default');expect(output).not.toContain('private.invalid');expect(output).not.toContain('synthetic-only');
});
it('flags result limits as unknown instead of silently accepting an incomplete catalog',async()=>{
  const h=harness();h.data.functions=Array.from({length:1001},()=>({name:'test'}));const r=await h.run();expect(r.catalog.functions).toBeNull();expect(r.compatibility.state).toBe('UNKNOWN');expect(r.limitations).toContain('functions:catalog_limit_exceeded');
});
it('detects changed/unreviewed source before any real client could be constructed',()=>{
  const root=mkdtempSync(join(tmpdir(),'preflight-offline-test-'));try{mkdirSync(join(root,'drizzle/meta'),{recursive:true});writeFileSync(join(root,'drizzle/meta/_journal.json'),JSON.stringify({entries:[]}));expect(()=>loadReviewedSource(root)).toThrow('preflight_source_unreviewed');}finally{rmSync(root,{recursive:true});}
});
it('contains no migration CLI, arbitrary SQL, provider calls or executable DDL/DML',()=>{
  for(const q of Object.values(queries)){const noLiterals=q.replace(/'[^']*'/g,"''");expect(noLiterals).not.toMatch(/\b(insert|update|delete|truncate|create|alter|drop|grant|revoke|nextval|setval)\b/i);}
  const cli=readFileSync('scripts/database-readonly-preflight.mjs','utf8');expect(cli).not.toMatch(/dotenv|drizzle-kit|spawn|execSync|fetch\(/);expect(cli).toContain('preflightConfiguration(env)');
});

it('refuses ignored limits instead of proceeding without bounded database statements',async()=>{ const h=harness();h.data.identity=[{database:'airbharath_lms',oid:'98765',role:'inspection_readonly',authenticated_role:'inspection_readonly',search_path:'pg_catalog',read_only:'on',statement_timeout_ms:0,lock_timeout_ms:0,idle_transaction_timeout_ms:0}];await expect(h.run()).rejects.toThrow('preflight_limits_unverified');expect(h.client.end).toHaveBeenCalled(); });

it('accepts the same sole pg_catalog schema when PostgreSQL preserves identifier quotes',async()=>{
  const h=harness();h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],search_path:'"pg_catalog"'}];
  expect((await h.run()).migrationAuthorized).toBe(false);
});
it('reports only per-setting booleans when session settings cannot be verified',async()=>{
  const h=harness();h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],lock_timeout_ms:0}];
  await expect(h.run()).rejects.toMatchObject({diagnostic:{code:'preflight_limits_unverified',sessionSettingChecks:{searchPath:true,statementTimeout:true,lockTimeout:false,idleTransactionTimeout:true}}});
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledgerPresence);
});
it.each(['public','pg_catalog, public','"pg_catalog", public','"PG_CATALOG"','$user, pg_catalog','pg_catalog; select private_synthetic',undefined,null,5000])('keeps unsafe or unverifiable search paths blocked: %s',async path=>{
  const h=harness();h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],search_path:path}];
  try {await h.run();throw Error('Expected refusal');}
  catch(error) {
    expect(error).toBeInstanceOf(PreflightError);
    const diagnostic=preflightFailure(error,'inspection');
    expect(diagnostic).toMatchObject({stage:'session_limits_verification',sessionSettingChecks:{searchPath:false,statementTimeout:true,lockTimeout:true,idleTransactionTimeout:true}});
    expect(JSON.stringify(diagnostic)).not.toContain('private_synthetic');
  }
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledgerPresence);
});
it.each([
  ['statement_timeout_ms','statementTimeout'],['lock_timeout_ms','lockTimeout'],['idle_transaction_timeout_ms','idleTransactionTimeout'],
])('preserves exact integer-millisecond verification for %s',async(field,flag)=>{
  for(const value of [0,-1,6000,'5000','5s',null,undefined]) {
    const h=harness();h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],[field]:value}];
    await expect(h.run()).rejects.toMatchObject({diagnostic:{sessionSettingChecks:{[flag]:false}}});
    expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledgerPresence);
  }
});
it('serializes only four safe setting booleans through the CLI failure path',async()=>{
  const h=harness();h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],search_path:'private-synthetic-secret',statement_timeout_ms:0}];
  providerMock.factory.mockReturnValueOnce(h.client);
  const stderr=vi.spyOn(process.stderr,'write').mockImplementation(()=>true);
  try {
    expect(await main(environment())).toBe(1);
    const text=String(stderr.mock.calls[0][0]), output=JSON.parse(text);
    expect(output).toMatchObject({decision:'BLOCKED',category:'session_safety_check_failed',stage:'session_limits_verification',sqlstate:null,sessionSettingChecks:{searchPath:false,statementTimeout:false,lockTimeout:true,idleTransactionTimeout:true}});
    expect(text).not.toContain('private-synthetic-secret');expect(text).not.toContain('synthetic-only');
    expect(Object.values(output.sessionSettingChecks).every(v=>typeof v==='boolean')).toBe(true);
  } finally {stderr.mockRestore();}
});

it('never prints server/driver error messages that resemble validator codes',async()=>{providerMock.factory.mockImplementationOnce(()=>{throw Error('preflight_private_synthetic_secret')});const stderr=vi.spyOn(process.stderr,'write').mockImplementation(()=>true);try{expect(await main(environment())).toBe(1);expect(stderr).toHaveBeenCalledWith(expect.stringContaining('preflight_inspection_failed'));expect(JSON.stringify(stderr.mock.calls)).not.toContain('private_synthetic_secret');}finally{stderr.mockRestore();}});

it('reuses retained F6 function evidence offline to check migration-body parsing',()=>{
  const retained: {functions:{schema:string;name:string;arguments:string;definition:string;security_definer:boolean}[]} = JSON.parse(readFileSync('output/audits/workspace-f6/catalog-before.json','utf8'));
  const c=catalog(30);
  c.functions=retained.functions.filter(f=>f.schema==='public').map(f=>{
    const match=f.definition.match(/AS\s+(\$\w*\$)([\s\S]*?)\1/);
    if(!match) throw Error('Retained routine body unavailable');
    return {...f,body:match[2]};
  });
  const result=assessCatalog(c,reconcileLedger(ledger(30),source,true,true),source);
  expect(c.functions.length).toBeGreaterThan(40);
  expect(result.findings.filter(s=>s.startsWith('function_mismatch:')||s.startsWith('unreviewed_function:'))).toEqual([]);
});

it('redacts invalid ledger values while preserving the divergent-ledger blocker',async()=>{const h=harness();h.data.ledger=[{id:'private-synthetic-id',hash:'private-synthetic-hash',created_at:'private-synthetic-time'}];const r=await h.run();expect(r.ledger.state).toBe('BLOCKED');expect(JSON.stringify(r)).not.toContain('private-synthetic');expect(r.ledgerEvidence.rows).toEqual([{id:'[INVALID_ID]',hash:'[INVALID_HASH]',created_at:'[INVALID_TIMESTAMP]'}]);});
it('refuses altered SQL, journal metadata and snapshots after the reviewed 0031 repin',()=>{
  const root=mkdtempSync(join(tmpdir(),'preflight-source-pin-'));
  try {
    mkdirSync(join(root,'drizzle/meta'),{recursive:true}); mkdirSync(join(root,'lib/db'),{recursive:true});
    const paths=['drizzle/meta/_journal.json','lib/db/schema.ts',...source.manifest.flatMap(e=>['drizzle/'+e.tag+'.sql','drizzle/meta/'+e.tag.slice(0,4)+'_snapshot.json'])];
    for(const path of paths)writeFileSync(join(root,path),readFileSync(path));
    expect(loadReviewedSource(root).manifest).toHaveLength(32);
    for(const path of ['drizzle/0006_great_kate_bishop.sql','drizzle/0031_workspace_phone_only_onboarding.sql','drizzle/meta/0031_snapshot.json','drizzle/meta/_journal.json']) {
      const original=readFileSync(join(root,path));writeFileSync(join(root,path),Buffer.concat([original,Buffer.from('\n ')]));
      expect(()=>loadReviewedSource(root)).toThrow('preflight_source_unreviewed');writeFileSync(join(root,path),original);
    }
  } finally {rmSync(root,{recursive:true});}
});

// Mocks verify the collector gate; isolated PostgreSQL tests verify ACL semantics.
it('accepts proven PUBLIC-only TEMP without pretending it was revoked or permitting temp objects',async()=>{
  const h=harness(); h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],temporary_objects:true,public_temp:true,nonpublic_temp:false}];
  const result=await h.run();
  expect(result.roles.temporary_objects).toBe(true);
  expect(result.publicTempExceptionAccepted).toBe(true);
  expect(result.limitations).toContain('public_temp_present_unused_by_inspector');
  expect(result.migrationAuthorized).toBe(false);
  expect(h.client.begin).toHaveBeenCalledWith('isolation level repeatable read read only',expect.any(Function));
  expect(h.client.end).toHaveBeenCalledWith({timeout:2});
  for(const [query] of h.unsafe.mock.calls) expect(Object.values(queries)).toContain(query);
});
it.each([
  {temporary_objects:true,public_temp:false,nonpublic_temp:true},
  {temporary_objects:true,public_temp:true,nonpublic_temp:true},
  {temporary_objects:true,public_temp:false,nonpublic_temp:false},
  {temporary_objects:false,public_temp:true,nonpublic_temp:false},
  {temporary_objects:true,public_temp:undefined,nonpublic_temp:false},
  {temporary_objects:true,public_temp:true,nonpublic_temp:undefined},
  {temporary_objects:undefined,public_temp:false,nonpublic_temp:false},
  {temporary_objects:null,public_temp:false,nonpublic_temp:false},
  {temporary_objects:true,public_temp:null,nonpublic_temp:false},
  {temporary_objects:true,public_temp:true,nonpublic_temp:null},
  {temporary_objects:true,public_temp:'true',nonpublic_temp:false},
])('refuses extra/unknown/contradictory TEMP evidence before ledger reads: %j',async patch=>{
  const h=harness();h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],...patch}];
  await expect(h.run()).rejects.toThrow('preflight_readonly_role_required');
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
  expect(h.client.end).toHaveBeenCalledWith({timeout:2});
});
it.each([false,null,undefined])('refuses PUBLIC TEMP if fresh temp namespace proof is %s',async value=>{
  const h=harness();h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],temporary_objects:true,public_temp:true,nonpublic_temp:false}];
  h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],no_temp_namespace:value}];
  await expect(h.run()).rejects.toThrow('preflight_readonly_role_required');
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
});
it.each([false,null,undefined])('refuses temporary namespaces even without effective TEMP when proof is %s',async value=>{
  const h=harness();
  h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],no_temp_namespace:value}];
  await expect(h.run()).rejects.toThrow('preflight_readonly_role_required');
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
});
it.each(['elevated','owns_objects','owns_routines','schema_create','table_write','sequence_write','database_create','migration_role_accessible'])('PUBLIC TEMP never overrides the retained deny check %s',async key=>{
  const h=harness();h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],temporary_objects:true,public_temp:true,nonpublic_temp:false,[key]:true}];
  await expect(h.run()).rejects.toThrow('preflight_readonly_role_required');
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
});
it('PUBLIC TEMP never overrides actual READ ONLY verification',async()=>{
  const h=harness();h.data.roles=[{...(h.data.roles as Record<string,boolean>[])[0],temporary_objects:true,public_temp:true,nonpublic_temp:false}];
  h.data.identity=[{...(h.data.identity as Record<string,unknown>[])[0],read_only:'off'}];
  await expect(h.run()).rejects.toThrow('preflight_identity_mismatch');
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
});

it.each([
  ['28P01','authentication_failed','28P01'],
  ['28000','authentication_failed','28000'],
  ['ERR_TLS_CERT_ALTNAME_INVALID','tls_verification_failed',null],
  ['UNABLE_TO_VERIFY_LEAF_SIGNATURE','tls_verification_failed',null],
  ['ECONNREFUSED','connection_failed',null],
  ['ENOTFOUND','connection_failed',null],
  ['08006','connection_failed','08006'],
  ['CONNECT_TIMEOUT','inspection_timeout',null],
  ['57014','inspection_timeout','57014'],
  ['42501','insufficient_privileges','42501'],
  ['42601','query_failed','42601'],
  ['private-synthetic-code','inspection_failed',null],
])('classifies transaction establishment failure %s without exporting driver details',async(driverCode,category,sqlstate)=>{
  const h=harness();
  h.client.begin.mockRejectedValueOnce(Object.assign(new Error('postgresql://private.invalid/private-synthetic-password'),{code:driverCode,detail:'private-synthetic-detail',query:'private-synthetic-query',stack:'private-synthetic-stack'}));
  providerMock.factory.mockReturnValueOnce(h.client);
  const stderr=vi.spyOn(process.stderr,'write').mockImplementation(()=>true);
  try {
    expect(await main(environment())).toBe(1);
    const output=JSON.parse(String(stderr.mock.calls[0][0]));
    expect(output).toMatchObject({decision:'BLOCKED',code:'preflight_inspection_failed',category,stage:'transaction_begin',sqlstate,migrationAuthorized:false});
    expect(JSON.stringify(output)).not.toMatch(/private-synthetic|private\.invalid|postgresql:/);
    expect(h.unsafe).not.toHaveBeenCalled();
    expect(h.client.end).toHaveBeenCalledWith({timeout:2});
  } finally {stderr.mockRestore();}
});

it('records missing ledger permissions and unavailable catalog metadata as diagnosed UNKNOWN results',async()=>{
  const h=harness();
  h.data.ledger=Object.assign(new Error('private-synthetic-ledger'),{code:'42501'});
  h.data.columns=Object.assign(new Error('private-synthetic-catalog'),{code:'42P01'});
  const r=await h.run();
  expect(r.ledger.state).toBe('UNKNOWN');expect(r.compatibility.state).toBe('UNKNOWN');
  expect(r.queryFailures).toEqual(expect.arrayContaining([
    {stage:'ledger',category:'insufficient_privileges',sqlstate:'42501'},
    {stage:'columns',category:'query_failed',sqlstate:'42P01'},
  ]));
  expect(r.migrationAuthorized).toBe(false);expect(JSON.stringify(r)).not.toContain('private-synthetic');
});

it('reports an optional query timeout and unexpected error without inventing metadata',async()=>{
  const h=harness();
  h.data.indexes=Object.assign(new Error('private-synthetic-timeout'),{code:'57014'});
  h.data.functions=Object.assign(new Error('private-synthetic-unexpected'),{code:'ABCDE'});
  const r=await h.run();
  expect(r.catalog.indexes).toBeNull();expect(r.catalog.functions).toBeNull();
  expect(r.queryFailures).toEqual(expect.arrayContaining([
    {stage:'indexes',category:'inspection_timeout',sqlstate:'57014'},
    {stage:'functions',category:'query_failed',sqlstate:null},
  ]));
  expect(JSON.stringify(r)).not.toMatch(/private-synthetic|ABCDE/);
});

it('preserves the underlying critical-query category while still refusing before ledger reads',async()=>{
  const h=harness();h.data.roles=Object.assign(new Error('private-synthetic-roles'),{code:'42501'});
  await expect(h.run()).rejects.toMatchObject({code:'preflight_readonly_role_required',diagnostic:{stage:'roles',category:'insufficient_privileges',sqlstate:'42501'}});
  expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
});

it('does not let connection cleanup replace the primary authentication failure',async()=>{
  const h=harness();
  h.client.begin.mockRejectedValueOnce(Object.assign(new Error('private-synthetic-auth'),{code:'28P01'}));
  h.client.end.mockRejectedValueOnce(Object.assign(new Error('private-synthetic-cleanup'),{code:'ECONNRESET'}));
  await expect(h.run()).rejects.toMatchObject({diagnostic:{stage:'transaction_begin',category:'authentication_failed',sqlstate:'28P01'}});
});

it('labels constructor and cleanup failures independently and keeps both non-successful',async()=>{
  const stderr=vi.spyOn(process.stderr,'write').mockImplementation(()=>true);
  try {
    providerMock.factory.mockImplementationOnce(()=>{throw Object.assign(new Error('private-synthetic-constructor'),{code:'unknown'});});
    expect(await main(environment())).toBe(1);
    expect(JSON.parse(String(stderr.mock.calls[0][0]))).toMatchObject({stage:'client_initialization',category:'inspection_failed',sqlstate:null});
    stderr.mockClear();
    const h=harness();h.client.end.mockRejectedValueOnce(Object.assign(new Error('private-synthetic-close'),{code:'ECONNRESET'}));
    providerMock.factory.mockReturnValueOnce(h.client);
    expect(await main(environment())).toBe(1);
    expect(JSON.parse(String(stderr.mock.calls[0][0]))).toMatchObject({stage:'connection_close',category:'connection_failed',migrationAuthorized:false});
    expect(JSON.stringify(stderr.mock.calls)).not.toContain('private-synthetic');
  } finally {stderr.mockRestore();}
});

it('labels source-integrity failures and suppresses arbitrary SQLSTATE-shaped strings and stages',()=>{
  const root=mkdtempSync(join(tmpdir(),'preflight-diagnostic-source-'));
  try {
    mkdirSync(join(root,'drizzle/meta'),{recursive:true});writeFileSync(join(root,'drizzle/meta/_journal.json'),JSON.stringify({entries:[]}));
    try {loadReviewedSource(root);throw Error('Expected source refusal');}
    catch(error) {expect(preflightFailure(error,'source_integrity')).toMatchObject({code:'preflight_source_unreviewed',category:'source_integrity_failure',stage:'source_integrity',sqlstate:null});}
    expect(preflightFailure(Object.assign(new Error('private-synthetic'),{code:'ABCDE'}),'private-synthetic-stage')).toEqual({code:'preflight_inspection_failed',category:'inspection_failed',stage:'inspection',sqlstate:null});
    expect(JSON.stringify(preflightFailure(new PreflightError('preflight_private_synthetic'),'configuration'))).not.toContain('private_synthetic');
    expect(preflightFailure(Object.assign(new Error('private-synthetic-path'),{code:'ENOENT'}),'source_integrity').category).toBe('source_integrity_failure');
  } finally {rmSync(root,{recursive:true});}
});

it('keeps explicit identity, role, TLS and session-limit refusals distinct',async()=>{
  for (const [query,patch,stage,category] of [
    ['identity',{database:'wrong'},'identity_verification','target_identity_mismatch'],
    ['identity',{statement_timeout_ms:0},'session_limits_verification','session_safety_check_failed'],
    ['tls',{ssl:false},'tls_verification','tls_verification_failed'],
    ['roles',{nonpublic_temp:true},'privilege_verification','role_verification_failed'],
  ] as const) {
    const h=harness();h.data[query]=[{...(h.data[query] as Record<string,unknown>[])[0],...patch}];
    await expect(h.run()).rejects.toMatchObject({diagnostic:{stage,category,sqlstate:null}});
    expect(h.unsafe.mock.calls.map(c=>c[0])).not.toContain(queries.ledger);
  }
});

it('labels the overall deadline without allowing shutdown errors to mask it',async()=>{
  vi.useFakeTimers();
  try {
    const h=harness();
    h.client.begin.mockImplementationOnce(async()=>{
      await new Promise(resolve=>setTimeout(resolve,31_000));
      throw Object.assign(new Error('private-synthetic-disconnect'),{code:'CONNECTION_CLOSED'});
    });
    const result=h.run().catch(error=>error);
    await vi.advanceTimersByTimeAsync(31_000);
    expect(await result).toMatchObject({code:'preflight_deadline_exceeded',diagnostic:{stage:'transaction_begin',category:'inspection_timeout',sqlstate:null}});
    expect(h.client.end).toHaveBeenCalledWith({timeout:1});
    expect(h.client.end).toHaveBeenCalledWith({timeout:2});
  } finally {vi.useRealTimers();}
});
