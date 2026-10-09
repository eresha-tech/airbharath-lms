// Read-only identity and ledger verification; local target only.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto'),assert=require('node:assert/strict');
const req=createRequire(path.join(process.cwd(),'package.json')),postgres=req('postgres');
if(process.env.WORKSPACE_REVIEW_PG_VERIFY!=='true')process.exit(0);assert.equal(process.env.DATABASE_ENV,'development');const target=new URL(process.env.DATABASE_URL);assert.equal(target.hostname,'localhost');assert.equal(target.port,'5433');assert.equal(target.pathname,'/airbharath_lms');
const tcp=postgres(process.env.DATABASE_URL,{max:1,prepare:false,connect_timeout:5}),socket=postgres({host:'/tmp',port:5433,user:'postgres',database:'airbharath_lms',max:1,prepare:false,connect_timeout:5});
(async()=>{try{
 const identity=async sql=>(await sql`select current_database() as database,(select oid::text from pg_database where datname=current_database()) as database_oid,current_setting('port') as port,(select system_identifier::text from pg_control_system()) as system_identifier`)[0];
 const a=await identity(socket),b=await identity(tcp);assert.deepEqual(a,b);assert.equal(a.database,'airbharath_lms');assert.equal(a.port,'5433');assert.equal(a.database_oid,'16384');assert.equal(a.system_identifier,'7680462735222304705');
 const ledger=await tcp`select id,hash,created_at::text as created_at from drizzle.__drizzle_migrations order by created_at`;
 const journal=JSON.parse(fs.readFileSync('drizzle/meta/_journal.json')).entries;
 const phase=process.argv[2]||'before';assert.equal(ledger.length,phase==='before'?15:16);
 for(let i=0;i<ledger.length;i++){const j=journal[i],hash=createHash('sha256').update(fs.readFileSync('drizzle/'+j.tag+'.sql')).digest('hex');assert.equal(ledger[i].hash,hash,j.tag);assert.equal(ledger[i].created_at,String(j.when),j.tag);ledger[i].tag=j.tag;}
 const result={identity:{runtimeSocket:a,migrationTCP:b,equal:true},ledger,pending:journal.slice(ledger.length).map(j=>j.tag)};
 fs.writeFileSync('/tmp/ws17v-ledger-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await Promise.all([tcp.end(),socket.end()]);}})().catch(e=>{console.error(JSON.stringify({failure:e.name,code:e.code||e.cause?.code,message:e.name==='AssertionError'?e.message:'Database identity/ledger check failed; details redacted.'}));process.exitCode=1});
