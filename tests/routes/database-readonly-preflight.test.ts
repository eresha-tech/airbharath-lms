import { expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadReviewedSource, preflightConfiguration, reconcileLedger, assessCatalog, inspectDatabase } from '../../scripts/database-readonly-preflight-core.mjs';
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
    identity:[{database:'airbharath_lms',oid:'98765',role:'inspection_readonly',authenticated_role:'inspection_readonly',version:'16.15',server_address:'192.0.2.1',port:5432,search_path:'pg_catalog',read_only:'on',statement_timeout_ms:5000,lock_timeout_ms:1000,idle_transaction_timeout_ms:5000}],
    tls:[{ssl:true,version:'TLSv1.3',cipher:'TLS_AES_256_GCM_SHA384',bits:256}],
    roles:[{ elevated:false,owns_objects:false,owns_routines:false,schema_create:false,table_write:false,sequence_write:false,database_create:false,temporary_objects:false,migration_role_accessible:false,migration_role_exists:true }],
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
it('pins all 31 reviewed SQL sources and 64 source/schema files without network or database use',()=>{
  expect(source.manifest).toHaveLength(31); expect(source.snapshots).toHaveLength(31); expect(source.manifest[30].tag).toBe('0030_workspace_retained_history_truncate_guards');
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
});
it.each([1,7,31])('reconciles the exact contiguous prefix of %i migrations',count=>{
  const r=reconcileLedger(ledger(count),source,true,true); expect(r.state).toBe('MATCHED_PREFIX'); expect(r.installed).toHaveLength(count); expect(r.pending).toHaveLength(31-count);
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
  expect(report.ledger.pending).toHaveLength(24); expect(report.ledgerEvidence.rows).toEqual(ledger()); expect(report.migrationAuthorized).toBe(false); expect(report.requiredGates).toContain('founder_led_local_phase18_e2e_explicit_UAT_acceptance');
  expect(report.compatibility.state).toBe('STRUCTURAL_MATCH_REVIEW_REQUIRED'); expect(report.prerequisites['0019']).toBe('UNKNOWN_UNTIL_EARLIER_PENDING_MIGRATIONS_REHEARSED');
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
