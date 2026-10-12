// Opt-in C.1 regression: real isolated worker session bounds SQL and lock waits; no provider HTTP.
const {req,createLoader}=require('./workspace-financial-loader.cjs'),assert=require('node:assert/strict');
if(process.env.WORKSPACE_C1_PG_VERIFY!=='true')process.exit(0);
const target=new URL(process.env.DATABASE_URL);assert.equal(process.env.DATABASE_ENV,'development');assert.equal(target.hostname,'localhost');assert.equal(target.port,'5433');assert.equal(target.pathname,'/airbharath_lms');
global.fetch=async()=>{throw Error('External HTTP forbidden')};
const control=req('postgres')(process.env.DATABASE_URL,{max:1,prepare:false,onnotice:()=>{}}),load=createLoader({'server-only':{}}),database=load('@/lib/workspace/payments/worker-database').createFinancialWorkerDatabase(),{sql}=req('drizzle-orm');
const code=e=>e.code||e.cause?.code;
(async()=>{let release;try{
 const settings=(await database.db.execute(sql`select current_setting('statement_timeout') as statement,current_setting('lock_timeout') as lock,current_setting('idle_in_transaction_session_timeout') as idle`))[0];assert.equal(settings.statement,'5s');assert.equal(settings.lock,'2s');assert.equal(settings.idle,'5s');
 let ready;const gate=new Promise(r=>ready=r),block=control.begin(async tx=>{await tx`select pg_advisory_xact_lock(817301)`;ready();await new Promise(r=>release=r)});await gate;
 const started=Date.now();let observed;try{await database.db.transaction(async tx=>{await tx.execute(sql`select pg_advisory_xact_lock(817301)`)});}catch(e){observed=code(e)}finally{release();await block;}assert.equal(observed,'55P03');assert(Date.now()-started<3500);console.log(JSON.stringify({name:'dedicated_worker_lock_timeout',sqlstate:observed,elapsedMs:Date.now()-started,settings}));
 const queryStart=Date.now();try{await database.db.execute(sql`select pg_sleep(7)`);assert.fail('Unbounded SQL')}catch(e){assert.equal(code(e),'57014')}assert(Date.now()-queryStart<6500);console.log(JSON.stringify({name:'dedicated_worker_statement_timeout',sqlstate:'57014',elapsedMs:Date.now()-queryStart}));
 const unchanged=(await control`select current_setting('statement_timeout') as statement,current_setting('lock_timeout') as lock`)[0];assert.equal(unchanged.statement,'0');assert.equal(unchanged.lock,'0');console.log(JSON.stringify({name:'shared_runtime_sessions_unchanged'}));
}finally{release?.();await database.close();await control.end()}})().catch(e=>{console.error(JSON.stringify({failed:true,code:code(e)||e.name,message:e.name==='AssertionError'?e.message:'Local worker DB regression failed; private details redacted'}));process.exitCode=1});
