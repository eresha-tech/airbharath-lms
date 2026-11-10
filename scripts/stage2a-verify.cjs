// Local-only verification. No .env or ambient credentials copied.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync,spawnSync}=require('node:child_process'),{randomBytes,createHash}=require('node:crypto');
const repo=path.resolve(__dirname,'..'),base='/tmp/airbharath-stage2a',out=repo+'/output/audits/workspace-stage2a';
const mode=process.argv[2],purpose=process.argv[3];
if(mode==='prepare'){
 assert(['validation','schema','build','browser-source'].includes(purpose));const target=base+'/'+purpose;
 if(purpose==='browser-source')assert(!fs.existsSync(target),'Never overlay a running synthetic server');
 fs.mkdirSync(target,{recursive:true});
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','.',':(exclude)output/**'],{cwd:repo,encoding:'utf8'}).split('\0').filter(Boolean);
 for(const file of [...files,'output/audits/workspace-f6r/coverage-review.json','output/audits/workspace-f6/catalog-before.json']){
  if(/(^|\/)(\.env[^/]*|\.git|\.aws|\.codex|\.agents|\.claude)(\/|$)|\.(pem|key|log)$/.test(file))continue;
  const source=path.join(repo,file);assert(!fs.lstatSync(source).isSymbolicLink());const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
 }
 if(!fs.existsSync(target+'/node_modules'))fs.symlinkSync(repo+'/node_modules',target+'/node_modules','dir');console.log('Prepared credential-free '+purpose);
}else if(['validate','build','focused'].includes(mode)){
 assert.equal(process.env.STAGE2A_VERIFY,'true');assert.equal(process.env.DATABASE_URL,undefined);
 const env={PATH:process.env.PATH,HOME:process.env.HOME,AWS_EC2_METADATA_DISABLED:'true',NEXT_TELEMETRY_DISABLED:'1'};
 if(mode==='build')Object.assign(env,{NODE_ENV:'production',DATABASE_ENV:'production',DATABASE_URL:'postgresql://synthetic@127.0.0.1:9/stage2a_compile_only?sslmode=verify-full&default_transaction_read_only=on',JWT_SECRET:randomBytes(48).toString('hex')});
 const args=mode==='focused'?['exec','vitest','run',...process.argv.slice(3)]:[mode];assert(args.length>3||mode!=='focused');
 const log=fs.openSync(out+'/'+mode+'.log','w');const result=spawnSync('pnpm',args,{cwd:base+'/'+(mode==='build'?'build':'validation'),env,stdio:['ignore',log,log]});fs.closeSync(log);
 fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({exitCode:result.status,at:new Date().toISOString(),syntheticOnly:true},null,2));console.log(mode+' exit '+result.status);process.exitCode=result.status??1;
}else if(mode==='preservation'){
 const b=JSON.parse(fs.readFileSync(out+'/baseline.json'));const h=p=>createHash('sha256').update(fs.readFileSync(repo+'/'+p)).digest('hex');
 for(const group of ['protected','stage1'])for(const[p,hash]of Object.entries(b[group]))assert.equal(h(p),hash,p);
 for(const[p,hash]of Object.entries(b.migrations))if(p!=='drizzle/meta/_journal.json')assert.equal(h(p),hash,p);
 const before=JSON.parse(execFileSync('git',['show',b.commit+':drizzle/meta/_journal.json'],{cwd:repo,encoding:'utf8'}));const after=JSON.parse(fs.readFileSync(repo+'/drizzle/meta/_journal.json'));
 assert.deepEqual(after.entries.slice(0,44),before.entries);for(const p of ['package.json','pnpm-lock.yaml'])assert.equal(h(p),b.source[p]);
 fs.writeFileSync(out+'/preservation.json',JSON.stringify({at:new Date().toISOString(),protected:6,stage1:8,historicalSqlAndSnapshots:88,historicalJournalEntries:44,dependenciesUnchanged:true},null,2));console.log('Preservation passed');
}else throw Error('Expected prepare, validate, focused, build or preservation');
