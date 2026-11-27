const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{spawn}=require('child_process');
assert.equal(process.env.PHASE25_BUILD,'true','PHASE25_BUILD=true required');
const repo='/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms',source=repo+'/output/audits/workspace-phase25/build-source';
const {req}=require(repo+'/tests/postgres/workspace-financial-loader.cjs');
(async()=>{
 const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase25/fixture.json'));assert.equal(path.dirname(fs.realpathSync(f.root)),repo+'/output/audits/workspace-phase25/audits/workspace-phase22p');assert.match(f.socket,/^\/tmp\/abx-pg-[\w-]+$/);assert.match(f.database,/^phase19b_[a-f0-9]{32}$/);assert(!fs.readdirSync(source).some(x=>x.startsWith('.env')));
 const db=req('postgres')({host:f.socket,port:55439,database:f.database,user:'phase19b',max:1,prepare:false});try{const [identity]=await db`select current_setting('data_directory') directory,inet_server_addr() address`;assert.equal(fs.realpathSync(identity.directory),f.root+'/data');assert.equal(identity.address,null);}finally{await db.end();}
 // Next production compilation requires production-form configuration. This fixture
 // has Unix-socket-only PostgreSQL, so this loopback TCP endpoint cannot connect.
 // TLS verification and read-only mode stay enforced; no production service exists here.
 const env={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',DATABASE_ENV:'production',DATABASE_URL:`postgresql://phase19b@127.0.0.1:55439/${f.database}?sslmode=verify-full&default_transaction_read_only=on`,JWT_SECRET:fs.readFileSync(f.root+'/phase22-test-seed','utf8'),AWS_EC2_METADATA_DISABLED:'true',NEXT_TELEMETRY_DISABLED:'1'};
 const log=fs.openSync(repo+'/output/audits/workspace-phase25/build.log','w');
 const child=spawn('pnpm',['build'],{cwd:source,env,stdio:['ignore',log,log]});child.on('exit',code=>{fs.closeSync(log);process.exitCode=code??1;console.log('Guarded source build exit: '+code);});
})().catch(e=>{console.error('Guarded build: '+e.message);process.exitCode=1});
