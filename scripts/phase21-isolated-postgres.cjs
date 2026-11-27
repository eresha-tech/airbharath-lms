// Opt-in verification only: creates its own cluster. Never reads .env or DATABASE_URL.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(process.env.PHASE21_ISOLATED_VERIFY!=='true'||process.env.DATABASE_ENV!=='test'||process.env.ALLOW_DATABASE_MIGRATION!=='true'||process.env.ALLOW_DESTRUCTIVE_DB_OPERATION!=='true')throw Error('Explicit isolated-test migration and destructive-operation acknowledgements required.');
fs.mkdirSync('/tmp/airbharath-phase21',{recursive:true,mode:0o700});fs.mkdirSync('output/audits/workspace-phase21',{recursive:true});
const root=fs.mkdtempSync('/tmp/airbharath-media-pg-phase21-');fs.chmodSync(root,0o700);fs.mkdirSync(path.join(root,'socket'));
const clean={PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',DATABASE_ENV:'test',ALLOW_DATABASE_MIGRATION:'true',ALLOW_DESTRUCTIVE_DB_OPERATION:'true',WORKSPACE_PUBLISHING_EPHEMERAL_VERIFY:'true',WORKSPACE_MEDIA_EPHEMERAL_ROOT:root};
const pg='/usr/lib/postgresql/16/bin/';
execFileSync(pg+'initdb',['-D',root+'/data','-U','phase19b','--auth=trust','--no-locale','--encoding=UTF8'],{env:clean,stdio:'pipe'});
execFileSync(pg+'pg_ctl',['-D',root+'/data','-o',`-p 55439 -k ${root}/socket -c listen_addresses=''`,'-l',root+'/postgres.log','-w','start'],{env:clean,stdio:'pipe'});
try {execFileSync(process.execPath,['tests/postgres/phase21-verification.cjs'],{env:clean,stdio:'inherit'});}finally{if(process.env.PHASE21_KEEP_FIXTURE!=='true')execFileSync(pg+'pg_ctl',['-D',root+'/data','-m','fast','-w','stop'],{env:clean,stdio:'pipe'});else console.log('Disposable fixture retained at '+root);}
