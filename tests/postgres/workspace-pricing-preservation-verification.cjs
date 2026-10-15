// Opt-in F.1 continuation: read-only catalog-portability and exact original-row preservation.
if(process.env.WORKSPACE_PRICING_PG_VERIFY!=='true')process.exit(0);
const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto'),postgres=require('postgres');
assert.equal(process.env.DATABASE_ENV,'development');const u=new URL(process.env.DATABASE_URL);assert.equal(u.hostname,'localhost');assert.equal(u.port,'5433');assert.equal(u.pathname,'/airbharath_lms');
const s=postgres(process.env.DATABASE_URL,{max:1,prepare:false,onnotice:()=>{}}),sha=b=>createHash('sha256').update(b).digest('hex'),file='/tmp/wsf1r-original-fingerprints.json',oldIds=[1,2,3].map(i=>'14000000-0000-4000-8000-00000000000'+i),expectedHash='5af885540dc1927ed3a7ed9fe54fb94a83f7658b2d2f7e49c09a02a37c3c66b8';
(async()=>{try{
assert.equal(sha(fs.readFileSync('drizzle/0026_workspace_membership_pricing_v2.sql')),expectedHash);
const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json')).entries;assert.equal(journal.length,27);assert.equal(journal[26].tag,'0026_workspace_membership_pricing_v2');
const result=await s.begin('isolation level repeatable read read only',async tx=>{
 const identity=(await tx`select current_database() as database,current_setting('port') as port,(select oid::text from pg_database where datname=current_database()) as oid,system_identifier::text as system from pg_control_system()`)[0];assert.deepEqual(identity,{database:'airbharath_lms',port:'5433',oid:'16384',system:'7680462735222304705'});
 const ledger=await tx`select hash,created_at::text as time from drizzle.__drizzle_migrations order by created_at,id`;assert.equal(ledger.length,process.argv.includes('--before')?26:27);ledger.forEach((r,i)=>{assert.equal(r.hash,sha(fs.readFileSync('drizzle/'+journal[i].tag+'.sql')));assert.equal(r.time,String(journal[i].when))});
 const tables=await tx`select tablename from pg_tables where schemaname='public' order by tablename`,fingerprints={};
 for(const {tablename}of tables)fingerprints[tablename]=JSON.parse(JSON.stringify(await tx`select md5(to_jsonb(t)::text) as hash,count(*)::int as n from ${tx(tablename)} t group by 1 order by 1`));
 const plans=JSON.parse(JSON.stringify(await tx`select id,code,version,is_current,base_price_paise from workspace_membership_plans order by code,version`));
 if(process.argv.includes('--before')){
  const expected=await tx`select id,md5(to_jsonb(p)::text) as before,md5((to_jsonb(p)||'{"is_current":false}'::jsonb)::text) as after from workspace_membership_plans p where id in ${tx(oldIds)} order by id`;assert.equal(expected.length,3);
  // Execute the exact proposal's IF predicate in read-only CTEs with independent histories.
  const sql=fs.readFileSync('drizzle/0026_workspace_membership_pricing_v2.sql','utf8'),predicate=sql.slice(sql.indexOf('  IF ')+5,sql.indexOf(' THEN\n'));
  const columns=['id','code','version','display_name','duration_months','base_price_paise','tax_rate_bps','currency','is_current','available'];
  const current=JSON.parse(JSON.stringify(await tx`select id,code,version,display_name,duration_months,base_price_paise,tax_rate_bps,currency,is_current,available from workspace_membership_plans order by code,version`));
  const minimal=current.filter(p=>p.is_current),copy=x=>structuredClone(x),histories=[['actual_local',current,false],['production_original_only',minimal,false]];
  let changed=copy(minimal);changed[0].base_price_paise++;histories.push(['different_price',changed,true]);
  changed=copy(minimal);changed[0].id='15000000-0000-4000-8000-000000000001';histories.push(['different_stable_id',changed,true]);
  changed=copy(minimal);changed[0].version=2;histories.push(['different_current_version',changed,true]);
  changed=copy(minimal);changed[0].available=false;histories.push(['unavailable_plan',changed,true]);
  changed=copy(minimal);const q=copy(minimal.find(p=>p.code==='quarterly'));Object.assign(q,{id:'15000000-0000-4000-8000-000000000005',version:5,is_current:false});changed.push(q);histories.push(['unexpected_historical_successor',changed,true]);
  changed=copy(minimal);const collision=copy(minimal.find(p=>p.code==='quarterly'));Object.assign(collision,{id:'14000000-0000-4000-8000-000000000004',version:2,is_current:false});changed.push(collision);histories.push(['reserved_uuid_collision',changed,true]);
  const quote=v=>typeof v==='boolean'?String(v):typeof v==='number'?String(v):"'"+v.replaceAll("'","''")+"'",checks=[];
  for(const [name,rows,denied]of histories){const values=rows.map(r=>'('+columns.map(k=>quote(r[k])+(k==='id'?'::uuid':'')).join(',')+')').join(',');const r=await tx.unsafe(`WITH workspace_membership_plans(${columns.join(',')}) AS (VALUES ${values}) SELECT (${predicate}) AS denied`);assert.equal(r[0].denied,denied,name);checks.push({name,denied});}
  return{identity,ledger,plans,fingerprints,expectedCurrentFlagTransitions:JSON.parse(JSON.stringify(expected)),portability:checks};
 }
 const before=JSON.parse(fs.readFileSync(file));let originalRows=0;
 for(const [name,rows]of Object.entries(before.fingerprints)){
  const map=new Map(fingerprints[name].map(r=>[r.hash,r.n]));
  for(const row of rows){const transition=name==='workspace_membership_plans'?before.expectedCurrentFlagTransitions.find(e=>e.before===row.hash):null;const match=transition?transition.after:row.hash;assert((map.get(match)||0)>=row.n,'Original row changed in '+name);originalRows+=row.n;}
  if(!name.startsWith('workspace_')&&name!=='users')assert.deepEqual(fingerprints[name],rows,'Legacy contents changed');
 }
 assert.equal(plans.length,before.plans.length+3);assert.deepEqual(plans.filter(p=>p.is_current).map(p=>[p.code,p.version,p.base_price_paise]),[['half_yearly',2,847373],['quarterly',5,499915],['yearly',2,1499915]]);
 return{identity,ledgerRows:ledger.length,originalTables:Object.keys(before.fingerprints).length,originalRows,preservedUnchanged:originalRows-3,expectedCurrentFlagTransitions:3,insertedPlanVersions:3,otherHistoryUnchanged:true};
});
if(process.argv.includes('--before')){assert(!fs.existsSync(file),'Never overwrite baseline');fs.writeFileSync(file,JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({baseline:file,sha256:sha(fs.readFileSync(file)),rows:Object.values(result.fingerprints).flat().reduce((n,r)=>n+r.n,0),tables:Object.keys(result.fingerprints).length,portability:result.portability,ledgerRows:result.ledger.length}))}else{fs.writeFileSync('/tmp/wsf1r-preservation-'+(process.argv.includes('--final')?'final':'migration')+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
}finally{await s.end()}})().catch(e=>{console.error(JSON.stringify({code:e.code||e.name,message:e.name==='AssertionError'?e.message:'Local read-only preservation failed'}));process.exitCode=1});
