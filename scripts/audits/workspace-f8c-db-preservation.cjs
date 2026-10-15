// F.8C: read-only identity, migration provenance and original-row preservation.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),postgres=require(process.cwd()+'/node_modules/postgres');
const phase=process.argv[2],file='/tmp/workspace-f8c-preservation-before.json';
assert.equal(process.env.WORKSPACE_F8C_PG_VERIFY,'true');assert.equal(process.env.DATABASE_ENV,'development');assert(['before','after'].includes(phase));
const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'localhost');assert.equal(target.port,'5433');assert.equal(target.pathname,'/airbharath_lms');
const options={max:1,prepare:false,onnotice:()=>{},connect_timeout:5,connection:{default_transaction_read_only:'on',statement_timeout:15000,lock_timeout:1500}};
const tcp=postgres(target.href,options),socket=postgres(target.href,{...options,host:'/tmp',port:5433});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),q=x=>'"'+x.replaceAll('"','""')+'"';
const identity=async sql=>(await sql`select current_database() as database,(select oid::text from pg_database where datname=current_database()) as oid,system_identifier::text as system,current_setting('port') as port,current_setting('transaction_read_only') as read_only from pg_control_system()`)[0];
(async()=>{try{
 const actual=await identity(tcp);assert.deepEqual(actual,await identity(socket));assert.deepEqual(actual,{database:'airbharath_lms',oid:'16384',system:'7680462735222304705',port:'5433',read_only:'on'});
 const snapshot=await tcp.begin('isolation level repeatable read read only',async sql=>{
  const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json')).entries,ledger=await sql`select id,hash,created_at::text as time from drizzle.__drizzle_migrations order by created_at,id`;
  assert.equal(journal.length,31);assert.equal(ledger.length,31);for(let i=0;i<31;i++){assert.equal(ledger[i].hash,sha(fs.readFileSync('drizzle/'+journal[i].tag+'.sql')));assert.equal(ledger[i].time,String(journal[i].when));}
  const tables=await sql`select schemaname,tablename from pg_tables where schemaname !~ '^pg_' and schemaname<>'information_schema' order by 1,2`,rows=[];
  for(const t of tables){const fingerprints=await sql.unsafe(`select md5(row_to_json(r)::text) as hash,count(*)::int as count from ${q(t.schemaname)}.${q(t.tablename)} r group by 1 order by 1`);rows.push({table:t.schemaname+'.'+t.tablename,count:fingerprints.reduce((n,r)=>n+r.count,0),fingerprints});}
  const triggers=await sql`select n.nspname as schema,c.relname as table,t.tgname as name,t.tgenabled as enabled,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname !~ '^pg_' order by 1,2,3`;
  const functions=await sql`select n.nspname as schema,p.proname as name,pg_get_function_identity_arguments(p.oid) as arguments,md5(pg_get_functiondef(p.oid)) as definition_hash from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' and p.prokind in ('f','p') order by 1,2,3`;
  const columns=await sql`select table_schema,table_name,column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema !~ '^pg_' and table_schema<>'information_schema' order by table_schema,table_name,ordinal_position`;
  const constraints=await sql`select n.nspname as schema,c.relname as table,k.conname as name,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname !~ '^pg_' and n.nspname<>'information_schema' order by 1,2,3`;
  return {identity:actual,ledger,rows,triggers,functions,columns,constraints};
 });
 const data=JSON.parse(JSON.stringify(snapshot)),output={identity:actual,ledgerEntries:31,ledgerRange:'0000–0030',sourceHashesMatch:true,tables:data.rows.length,rows:data.rows.reduce((n,r)=>n+r.count,0),triggerCount:data.triggers.length,truncateProtectedWorkspaceTables:[...new Set(data.triggers.filter(t=>t.table.startsWith('workspace_')&&t.enabled==='O'&&/BEFORE TRUNCATE/.test(t.definition)).map(t=>t.table))].sort()};
 if(phase==='before'){fs.writeFileSync(file,JSON.stringify(data),{flag:'wx',mode:0o600});output.baselineDigest=sha(fs.readFileSync(file));}
 else{
  const before=JSON.parse(fs.readFileSync(file));for(const key of ['identity','ledger','triggers','functions','columns','constraints'])assert.deepEqual(data[key],before[key],'Original '+key+' changed');
  const checks=[];for(const original of before.rows){const after=data.rows.find(t=>t.table===original.table);assert(after,'Original table missing');const observed=new Map(after.fingerprints.map(r=>[r.hash,r.count])),missing=original.fingerprints.filter(r=>(observed.get(r.hash)||0)<r.count);assert.equal(missing.length,0,'Original rows changed or missing in '+original.table);checks.push({table:original.table,originalRows:original.count,finalRows:after.count,originalRowsPreserved:true});}
  output.originalRows=before.rows.reduce((n,r)=>n+r.count,0);output.originalRowsPreserved=true;output.observedSchemaAndLedgerUnchanged=true;output.tableResults=checks;
 }
 fs.writeFileSync('output/audits/workspace-f8c/database-'+phase+'.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({phase,...output,tableResults:undefined,truncateProtectedWorkspaceTables:undefined}));
}finally{await tcp.end();await socket.end();}})().catch(e=>{console.error(JSON.stringify({failed:true,code:e.code||e.name,reason:e.name==='AssertionError'?e.message.split('\n')[0]:'Private detail withheld'}));process.exitCode=1;});
