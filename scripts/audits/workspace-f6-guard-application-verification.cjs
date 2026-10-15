// Authorized F.6 completion: read-only snapshots, approved-delta comparison, no DDL/DML.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const approved='f34c190f4e7877d5b0f3fab03c89874b825ef0f2cfebca520c1dc40adfbd5bd2';
const functionName='workspace_retained_history_reject_truncate';
const sha=x=>createHash('sha256').update(x).digest('hex');
const normalized=x=>JSON.parse(JSON.stringify(x));
function compareSnapshots(before,after,targets){
 assert.deepEqual(after.identity,before.identity,'Database identity changed');
 assert.equal(before.ledger.length,30);assert.equal(after.ledger.length,31);
 assert.deepEqual(after.ledger.slice(0,30),before.ledger,'Existing ledger rows changed');
 assert.equal(after.ledger[30].hash,approved);
 const oldFunctions=after.functions.filter(f=>!(f.schema==='public'&&f.name===functionName));
 const addedFunctions=after.functions.filter(f=>f.schema==='public'&&f.name===functionName);
 assert.equal(addedFunctions.length,1,'Exactly one new function required');
 assert.deepEqual(oldFunctions,before.functions,'Existing function definitions/privileges changed');
 const names=targets.map(t=>t+'_retained_truncate_guard');
 const addedTriggers=after.triggers.filter(t=>t.schema==='public'&&names.includes(t.name));
 assert.equal(addedTriggers.length,21,'Exactly 21 new triggers required');
 assert.deepEqual(after.triggers.filter(t=>!addedTriggers.includes(t)),before.triggers,'Existing trigger definitions changed');
 for(const key of ['schemas','objects','columns','constraints','indexes','enums','extensions','views','policies','collation','runtimePrivileges'])assert.deepEqual(after[key],before[key],key+' changed');
 const ledgerKey='drizzle.__drizzle_migrations';
 for(const count of before.counts){
  const current=after.counts.find(c=>c.key===count.key);assert(current,'Original table disappeared');
  assert.equal(Number(current.count),Number(count.count)+(count.key===ledgerKey?1:0),'Unexpected row count change');
 }
 assert.equal(after.counts.length,before.counts.length,'Unexpected table added');
 for(const [table,rows]of Object.entries(before.fingerprints)){
  let actual=after.fingerprints[table];
  if(table===ledgerKey){actual=structuredClone(actual);const extra=actual.find(r=>r.hash===after.lastLedgerRowFingerprint);assert(extra,'New ledger row fingerprint missing');extra.n--;actual=actual.filter(r=>r.n>0);}
  assert.deepEqual(actual,rows,'Original row fingerprint changed in '+table);
 }
 return{originalRowsUnchanged:true,previousLedgerRowsUnchanged:true,onlyNewLedgerRow:true,existingSchemaUnchanged:true,newFunctions:1,newTriggers:21};
}
module.exports={compareSnapshots};
if(require.main===module)run().catch(e=>{console.error(JSON.stringify({failed:true,code:e.code||e.name,message:e.name==='AssertionError'?e.message.split('\n')[0]:'Read-only completion inspection failed; private details withheld'}));process.exitCode=1;});
async function run(){
 assert.equal(process.env.WORKSPACE_F6_GUARD_APPLICATION_VERIFY,'true');assert.equal(process.env.DATABASE_ENV,'development');
 const mode=process.argv[2];assert(['before','after','no-op'].includes(mode));
 const url=new URL(process.env.DATABASE_URL);assert(['postgres:','postgresql:'].includes(url.protocol));assert.equal(url.hostname,'localhost');assert.equal(url.port,'5433');assert.equal(url.pathname,'/airbharath_lms');
 const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json')).entries,review=JSON.parse(fs.readFileSync('output/audits/workspace-f6r/coverage-review.json'));
 assert.equal(journal.length,31);assert.equal(journal[30].tag,'0030_workspace_retained_history_truncate_guards');
 const source=fs.readFileSync('drizzle/'+journal[30].tag+'.sql','utf8');assert.equal(sha(source),approved);
 for(const old of review.priorMigrationHashes)assert.equal(sha(fs.readFileSync('drizzle/'+old.tag+'.sql')),old.sha256);
 const targets=review.rows.filter(r=>r.decision==='add_guard').map(r=>r.table);assert.equal(targets.length,21);
 const base='/tmp/workspace-f6-application-before.json',applied='/tmp/workspace-f6-application-after.json',noop='/tmp/workspace-f6-application-noop.json';
 const out=path.join(process.cwd(),'output/audits/workspace-f6-completion');fs.mkdirSync(out,{recursive:true});
 const postgres=require('postgres'),options={max:1,prepare:false,connect_timeout:5,idle_timeout:2,onnotice:()=>{},connection:{default_transaction_read_only:'on',statement_timeout:10000,lock_timeout:1500,idle_in_transaction_session_timeout:20000}};
 const tcp=postgres(process.env.DATABASE_URL,options),socket=postgres(process.env.DATABASE_URL,{...options,host:'/tmp',port:5433});
 const identity=async p=>(await p`select current_database() as database,(select oid::text from pg_database where datname=current_database()) as oid,current_setting('port') as port,system_identifier::text as system,current_setting('server_version') as version,current_setting('transaction_read_only') as read_only from pg_control_system()`)[0];
 try{
  const a=await identity(tcp),b=await identity(socket);assert.deepEqual(a,b);assert.equal(a.database,'airbharath_lms');assert.equal(a.oid,'16384');assert.equal(a.port,'5433');assert.equal(a.system,'7680462735222304705');assert.equal(a.read_only,'on');await socket.end();
  const snapshot=normalized(await tcp.begin('isolation level repeatable read read only',async t=>{
   const ledger=await t`select id,hash,created_at::text as time from drizzle.__drizzle_migrations order by created_at,id`;assert.equal(ledger.length,mode==='before'?30:31);
   for(let i=0;i<ledger.length;i++){assert.equal(ledger[i].hash,sha(fs.readFileSync('drizzle/'+journal[i].tag+'.sql')));assert.equal(ledger[i].time,String(journal[i].when));}
   const schemas=await t`select nspname as schema,pg_get_userbyid(nspowner) as owner,nspacl::text as privileges from pg_namespace where nspname !~ '^pg_' and nspname<>'information_schema' order by 1`;
   const objects=await t`select n.nspname as schema,c.relname as name,c.relkind as kind,pg_get_userbyid(c.relowner) as owner,c.relrowsecurity as rls,c.relforcerowsecurity as forced_rls,c.relacl::text as privileges from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','S','f') order by 1,2`;
   const columns=await t`select n.nspname as schema,c.relname as table,a.attname as name,a.attnum as position,format_type(a.atttypid,a.atttypmod) as type,a.attnotnull as not_null,pg_get_expr(d.adbin,d.adrelid) as default_expression,a.attidentity as identity,a.attgenerated as generated,co.collname as collation from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum left join pg_collation co on co.oid=a.attcollation where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and c.relkind in ('r','p','v','m','f') and a.attnum>0 and not a.attisdropped order by 1,2,4`;
   const constraints=await t`select n.nspname as schema,c.relname as table,k.conname as name,k.contype as type,k.convalidated as validated,k.condeferrable as deferrable,k.condeferred as initially_deferred,pg_get_constraintdef(k.oid,true) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' order by 1,2,3`;
   const indexes=await t`select n.nspname as schema,c.relname as table,ic.relname as name,i.indisunique as unique,i.indisprimary as primary,i.indisvalid as valid,i.indisready as ready,pg_get_indexdef(i.indexrelid) as definition,pg_get_expr(i.indpred,i.indrelid) as predicate from pg_index i join pg_class c on c.oid=i.indrelid join pg_namespace n on n.oid=c.relnamespace join pg_class ic on ic.oid=i.indexrelid where n.nspname !~ '^pg_' and n.nspname<>'information_schema' order by 1,2,3`;
   const triggers=await t`select n.nspname as schema,c.relname as table,tr.tgname as name,tr.tgtype as type,tr.tgenabled as enabled,tr.tgnargs as argument_count,tr.tgqual is not null as conditional,pg_get_triggerdef(tr.oid,true) as definition,pn.nspname as function_schema,p.proname as function from pg_trigger tr join pg_class c on c.oid=tr.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=tr.tgfoid join pg_namespace pn on pn.oid=p.pronamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and not tr.tgisinternal order by 1,2,3`;
   const functions=await t`select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,l.lanname as language,p.prorettype::regtype::text as return_type,p.prosrc as body,p.prosecdef as security_definer,pg_get_userbyid(p.proowner) as owner,p.proacl::text as privileges,p.proconfig as settings,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and p.prokind in ('f','p') order by 1,2,3`;
   const enums=await t`select n.nspname as schema,y.typname as name,array_agg(e.enumlabel order by e.enumsortorder) as labels from pg_type y join pg_namespace n on n.oid=y.typnamespace join pg_enum e on e.enumtypid=y.oid where n.nspname !~ '^pg_' group by n.nspname,y.typname order by 1,2`;
   const extensions=await t`select e.extname as name,e.extversion as version,n.nspname as schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace order by 1`;
   const views=await t`select schemaname as schema,viewname as name,definition from pg_views where schemaname !~ '^pg_' and schemaname<>'information_schema' union all select schemaname,matviewname,definition from pg_matviews where schemaname !~ '^pg_' and schemaname<>'information_schema' order by 1,2`;
   const policies=await t`select schemaname as schema,tablename as table,policyname as name,permissive,roles,cmd,qual,with_check from pg_policies where schemaname !~ '^pg_' order by 1,2,3`;
   const collation=(await t`select datlocprovider as provider,datcollate as collate,datctype as ctype,datcollversion as recorded_version,pg_database_collation_actual_version(oid) as actual_version from pg_database where datname=current_database()`)[0];
   const runtimePrivileges=await t`select c.relname as table,pg_get_userbyid(c.relowner)=current_user as owned,has_table_privilege(current_user,c.oid,'TRUNCATE') as truncate,r.rolsuper as superuser from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.rolname=current_user where n.nspname='public' and c.relkind='r' and c.relname like 'workspace_%' order by 1`;
   const counts=[],fingerprints={};for(const o of objects.filter(o=>['r','p','f','m'].includes(o.kind))){assert.notEqual(o.kind,'f');const key=o.schema+'.'+o.name,rel=t(key),[{count}]=await t`select count(*)::text as count from ${rel}`;counts.push({key,count});fingerprints[key]=await t`select md5(to_jsonb(r)::text) as hash,count(*)::int as n from ${rel} r group by 1 order by 1`;}
   const [{hash:lastLedgerRowFingerprint}]=await t`select md5(to_jsonb(r)::text) as hash from drizzle.__drizzle_migrations r order by created_at desc,id desc limit 1`;
   return{identity:a,ledger,schemas,objects,columns,constraints,indexes,triggers,functions,enums,extensions,views,policies,collation,runtimePrivileges,counts,fingerprints,lastLedgerRowFingerprint};
  }));
  const oldCatalog=JSON.parse(fs.readFileSync('output/audits/workspace-f6/catalog-before.json'));
  const project=t=>({schema:t.schema,table:t.table,name:t.name,enabled:t.enabled,definition:t.definition,function_schema:t.function_schema,function:t.function});
  if(mode==='before'){
   assert(!snapshot.functions.some(f=>f.schema==='public'&&f.name===functionName),'Proposed function already exists');
   assert.deepEqual(snapshot.triggers.map(project),oldCatalog.triggers,'Unexpected prior trigger catalog');
   for(const f of oldCatalog.functions)assert.equal(snapshot.functions.find(x=>x.schema===f.schema&&x.name===f.name&&x.arguments===f.arguments)?.definition,f.definition,'Old function differs from reviewed catalog');
   for(const table of targets){assert(snapshot.objects.some(t=>t.schema==='public'&&t.name===table&&t.kind==='r'));assert(!snapshot.triggers.some(t=>t.schema==='public'&&t.table===table&&(t.type&32)));}
  }
  const oldProtected=review.rows.filter(r=>r.decision==='existing_guard');assert.equal(oldProtected.length,18);
  for(const row of oldProtected)assert(snapshot.triggers.some(t=>t.schema==='public'&&t.table===row.table&&t.type===34&&t.enabled==='O'),'Existing statement guard missing');
  assert(!snapshot.triggers.some(t=>t.schema==='public'&&t.table==='workspace_email_rate_limits'&&(t.type&32)));
  let comparison=null;
  if(mode!=='before'){
   const f=snapshot.functions.filter(f=>f.schema==='public'&&f.name===functionName);assert.equal(f.length,1);
   assert.equal(f[0].body,source.match(/AS \$\$([\s\S]*?)\$\$/)[1]);assert.equal(f[0].arguments,'');assert.equal(f[0].language,'plpgsql');assert.equal(f[0].return_type,'trigger');assert.equal(f[0].security_definer,false);assert.deepEqual(f[0].settings,['search_path=pg_catalog']);
   const added=snapshot.triggers.filter(t=>t.schema==='public'&&t.function===functionName);assert.equal(added.length,21);
   for(const table of targets){const t=added.find(t=>t.table===table);assert(t);assert.equal(t.name,table+'_retained_truncate_guard');assert.equal(t.type,34);assert.equal(t.enabled,'O');assert.equal(t.function_schema,'public');assert.equal(t.argument_count,0);assert.equal(t.conditional,false);}
   comparison=compareSnapshots(JSON.parse(fs.readFileSync(base)),snapshot,targets);
   if(mode==='no-op')assert.deepEqual(snapshot,JSON.parse(fs.readFileSync(applied)),'Second migration run was not a no-op');
  }
  const privateFile=mode==='before'?base:mode==='after'?applied:noop;assert(!fs.existsSync(privateFile),'Never overwrite preservation baseline/evidence');fs.writeFileSync(privateFile,JSON.stringify(snapshot),{mode:0o600});
  const {fingerprints,lastLedgerRowFingerprint,...safe}=snapshot;
  const evidence={...safe,mode,approvedSqlSha256:approved,privateSnapshotSha256:sha(fs.readFileSync(privateFile)),allTableFingerprintsSha256:sha(JSON.stringify(fingerprints)),comparison,existingGuardCount:18,newGuardCount:mode==='before'?0:21,totalWorkspaceGuardedTables:mode==='before'?18:39,destructiveRetainedTests:false};
  fs.writeFileSync(path.join(out,'catalog-'+mode+'.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({mode,identity:snapshot.identity,tableCount:snapshot.counts.length,totalRows:snapshot.counts.reduce((n,c)=>n+Number(c.count),0),ledgerEntries:snapshot.ledger.length,newGuardCount:evidence.newGuardCount,existingGuardCount:18,comparison,noOp:mode==='no-op'}));
 }finally{await tcp.end();await socket.end();}
}
