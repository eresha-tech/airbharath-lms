// The existing synthetic payout launcher supplies the same secure local auth/DB setup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
if(process.env.PHASE25A_LOCAL_TEST!=='true')throw Error('PHASE25A_LOCAL_TEST=true required');
const file=path.join(__dirname,'phase22p-local-test.cjs');let code=fs.readFileSync(file,'utf8');
const replacements=[
 ["'/tmp/airbharath-phase22p/fixture.json'","'/tmp/airbharath-phase25a/fixture.json'"],
 ["source=path.resolve('output/audits/workspace-phase22p/browser-source')","source='/tmp/airbharath-phase25a/browser-source'"],
 ["path.resolve('output/audits/workspace-phase22p')","path.resolve('output/audits/workspace-phase25a/audits/workspace-phase22p')"],
];
for(const [before,after]of replacements){assert.equal(code.split(before).length,2,'Existing local launcher contract changed');code=code.replace(before,after);}
code=code.replaceAll('PHASE22P_LOCAL_TEST','PHASE25A_LOCAL_TEST').replaceAll('55445','55453').replaceAll('3024','3032');
code=code.replace("PATH:process.env.PATH,HOME:process.env.HOME","WORKSPACE_OPERATIONS_ENABLED:'true',PATH:process.env.PATH,HOME:process.env.HOME");
// Synthetic media transport exists only in the disposable source. Never inject
// provider credentials or a simulated success into the shipping implementation.
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase25a/fixture.json')),source='/tmp/airbharath-phase25a/browser-source';
assert.equal(path.dirname(fs.realpathSync(f.root)),path.resolve('output/audits/workspace-phase25a/audits/workspace-phase22p'));
const stateFile=f.root+'/phase25a-media-provider.json';if(!fs.existsSync(stateFile))fs.writeFileSync(stateFile,'{}',{mode:0o600});
fs.writeFileSync(source+'/lib/workspace/media/synthetic-processing.ts',`import fs from 'node:fs';import type {MediaProcessor} from './processing';
const file=${JSON.stringify(stateFile)},read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
export const syntheticProcessing:MediaProcessor={dispatch:async(a,j)=>{const rows=read();rows[a.id]={...rows[a.id],jobId:j.id,sourceVersion:j.sourceVersion,status:rows[a.id]?.status??'complete'};fs.writeFileSync(file,JSON.stringify(rows),{mode:0o600});return 'synthetic-'+j.id;},inspect:async(a,j,id)=>{const row=read()[a.id];if(!row||row.jobId!==j.id||row.sourceVersion!==a.objectVersionId||id!=='synthetic-'+j.id)throw Error('synthetic_job_identity_mismatch');return row.status==='complete'?{status:'complete',manifest:{'master.m3u8':{version:'synthetic-master-v1',checksum:'a'.repeat(64),size:100},'master_720.m3u8':{version:'synthetic-playlist-v1',checksum:'b'.repeat(64),size:100},'master_72000001.ts':{version:'synthetic-segment-v1',checksum:'c'.repeat(64),size:188}}}:{status:row.status};}};`);
const runtimeFile=source+'/lib/workspace/media/runtime.ts';let runtime=fs.readFileSync(runtimeFile,'utf8');const marker="let provider; try { provider = processingProvider(processingConfig()); } catch { /* Provider operations fail closed. */ }";
if(runtime.includes(marker))runtime="import {syntheticProcessing} from './synthetic-processing';\n"+runtime.replace(marker,'const provider=syntheticProcessing;');
assert(runtime.includes('const provider=syntheticProcessing;'));fs.writeFileSync(runtimeFile,runtime);
// Inject provider transports only into the disposable source, including the explicit worker fetch argument.
const bankFile=f.root+'/phase22p-provider.json';
fs.writeFileSync(source+'/lib/creator-payments/bank-validation/synthetic-transport.ts',`import fs from 'node:fs';const {createBankTransport}=require('../../../tests/postgres/phase25a-bank-provider.cjs');const file=${JSON.stringify(bankFile)};export const syntheticBankTransport=createBankTransport(()=>JSON.parse(fs.readFileSync(file,'utf8')),(s:unknown)=>fs.writeFileSync(file,JSON.stringify(s),{mode:0o600}));`);
const bankAdapter=source+'/lib/creator-payments/bank-validation/adapter.ts';let bankCode=fs.readFileSync(bankAdapter,'utf8');bankCode="import {syntheticBankTransport} from './synthetic-transport';\n"+bankCode.replace('transport: typeof fetch = fetch','transport: typeof fetch = syntheticBankTransport');fs.writeFileSync(bankAdapter,bankCode);
const membershipFile=f.root+'/phase25a-membership-provider.json';if(!fs.existsSync(membershipFile))fs.writeFileSync(membershipFile,JSON.stringify(require('../tests/postgres/phase25a-membership-provider.cjs').initial()),{mode:0o600});
fs.writeFileSync(source+'/lib/workspace/payments/synthetic-transport.ts',`import fs from 'node:fs';const {createTransport}=require('../../../tests/postgres/phase25a-membership-provider.cjs');const file=${JSON.stringify(membershipFile)};export const syntheticMembershipTransport=createTransport(()=>JSON.parse(fs.readFileSync(file,'utf8')),(s:unknown)=>fs.writeFileSync(file,JSON.stringify(s),{mode:0o600}));`);
const ifscFile=source+'/lib/creator-payments/bank-validation/ifsc.ts';let ifscCode=fs.readFileSync(ifscFile,'utf8');ifscCode=ifscCode.replace('transport:typeof fetch=fetch',"transport:typeof fetch=async()=>Response.json({IFSC:'TEST0000001',BANK:'Synthetic Bank',BRANCH:'Local test branch'})");fs.writeFileSync(ifscFile,ifscCode);
const membershipAdapter=source+'/lib/workspace/payments/provider.ts';let membershipCode=fs.readFileSync(membershipAdapter,'utf8');membershipCode="import {syntheticMembershipTransport} from './synthetic-transport';\n"+membershipCode.replaceAll('http: typeof fetch = fetch','http: typeof fetch = syntheticMembershipTransport');fs.writeFileSync(membershipAdapter,membershipCode);
const workerFile=source+'/lib/workspace/payments/worker.ts';let workerCode=fs.readFileSync(workerFile,'utf8');workerCode="import {syntheticMembershipTransport} from './synthetic-transport';\n"+workerCode.replace('createRazorpayAdapter(process.env, fetch, signal)','createRazorpayAdapter(process.env, syntheticMembershipTransport, signal)');fs.writeFileSync(workerFile,workerCode);
// All source/provider configuration values below are synthetic and local-only.
code=code.replace("const env={", "const env={RAZORPAY_IFSC_LOOKUP_ENABLED:'true',CREATOR_BANK_VALIDATION_TRANSPORT:'synthetic',RAZORPAYX_FAV_AMOUNT_PAISE:'100',RAZORPAYX_FAV_METHOD:'pennydrop',WORKSPACE_RAZORPAY_MODE:'test',WORKSPACE_RAZORPAY_TEST_AUTHORIZED:'true',WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_synthetic',WORKSPACE_RAZORPAY_KEY_ID:'rzp_test_SYNTHETICPHASE25A',WORKSPACE_RAZORPAY_KEY_SECRET:'synthetic-membership-key-phase25a',WORKSPACE_RAZORPAY_WEBHOOK_SECRET:'synthetic-membership-webhook-phase25a',WORKSPACE_RAZORPAY_WEBHOOK_ENABLED:'true',WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED:'true',");
code=code.replace("WORKSPACE_PAYMENT_ENABLED:'false'","WORKSPACE_PAYMENT_ENABLED:'true'");
code=code.replace('code=code.replace(/transport:', 'code=code.replace(/transport:').replace('typeof fetch\\s*=\\s*fetch/,','typeof fetch\\s*=\\s*fetch/g,');
// Shared request and payout adapter both have transport defaults after Phase 2.5A extraction.
code=code.replace('typeof fetch\s*=\s*fetch/,','typeof fetch\s*=\s*fetch/g,');
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(__dirname);mod._compile(code,file);
