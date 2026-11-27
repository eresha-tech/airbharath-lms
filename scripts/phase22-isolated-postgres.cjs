// Opt-in verification only: creates its own cluster. Never reads .env or DATABASE_URL.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
if(process.env.PHASE22_ISOLATED_VERIFY!=='true'||process.env.DATABASE_ENV!=='test'||process.env.ALLOW_DATABASE_MIGRATION!=='true'||process.env.ALLOW_DESTRUCTIVE_DB_OPERATION!=='true')throw Error('Explicit isolated-test migration and destructive-operation acknowledgements required.');
fs.mkdirSync('/tmp/airbharath-phase22',{recursive:true,mode:0o700});fs.mkdirSync('output/audits/workspace-phase22',{recursive:true});
const root=fs.mkdtempSync('/tmp/airbharath-media-pg-phase22-');fs.chmodSync(root,0o700);fs.mkdirSync(path.join(root,'socket'));
const clean={PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8',DATABASE_ENV:'test',ALLOW_DATABASE_MIGRATION:'true',ALLOW_DESTRUCTIVE_DB_OPERATION:'true',WORKSPACE_PUBLISHING_EPHEMERAL_VERIFY:'true',WORKSPACE_MEDIA_EPHEMERAL_ROOT:root,CREATOR_PAYEE_ENCRYPTION_KEY:'1'.repeat(64),CREATOR_BANK_SETTLEMENT_ENABLED:'true',RAZORPAY_KEY_ID:'rzp_test_SYNTHETICPHASE22',RAZORPAY_KEY_SECRET:'synthetic-only',COURSE_RAZORPAY_ACCOUNT_ID:'acc_synthetic'};
const pg='/usr/lib/postgresql/16/bin/';
execFileSync(pg+'initdb',['-D',root+'/data','-U','phase19b','--auth=trust','--no-locale','--encoding=UTF8'],{env:clean,stdio:'pipe'});
execFileSync(pg+'pg_ctl',['-D',root+'/data','-o',`-p 55439 -k ${root}/socket -c listen_addresses=''`,'-l',root+'/postgres.log','-w','start'],{env:clean,stdio:'pipe'});
try {execFileSync(process.execPath,['tests/postgres/phase22-verification.cjs'],{env:clean,stdio:'inherit'});}finally{if(process.env.PHASE22_KEEP_FIXTURE!=='true')execFileSync(pg+'pg_ctl',['-D',root+'/data','-m','fast','-w','stop'],{env:clean,stdio:'pipe'});else console.log('Disposable fixture retained at '+root);}
