// The existing synthetic payout launcher supplies the same secure local auth/DB setup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
if(process.env.PHASE24_LOCAL_TEST!=='true')throw Error('PHASE24_LOCAL_TEST=true required');
const file=path.join(__dirname,'phase22p-local-test.cjs');let code=fs.readFileSync(file,'utf8');
const replacements=[
 ["'/tmp/airbharath-phase22p/fixture.json'","'/tmp/airbharath-phase24/fixture.json'"],
 ["source=path.resolve('output/audits/workspace-phase22p/browser-source')","source='/tmp/airbharath-phase24/browser-source'"],
 ["path.resolve('output/audits/workspace-phase22p')","path.resolve('output/audits/workspace-phase24/audits/workspace-phase22p')"],
];
for(const [before,after]of replacements){assert.equal(code.split(before).length,2,'Existing local launcher contract changed');code=code.replace(before,after);}
code=code.replaceAll('PHASE22P_LOCAL_TEST','PHASE24_LOCAL_TEST').replaceAll('55445','55449').replaceAll('3024','3028');
code=code.replace("PATH:process.env.PATH,HOME:process.env.HOME","WORKSPACE_OPERATIONS_ENABLED:'true',PATH:process.env.PATH,HOME:process.env.HOME");
// Synthetic media transport exists only in the disposable source. Never inject
// provider credentials or a simulated success into the shipping implementation.
const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase24/fixture.json')),source='/tmp/airbharath-phase24/browser-source';
assert.equal(path.dirname(fs.realpathSync(f.root)),path.resolve('output/audits/workspace-phase24/audits/workspace-phase22p'));
const stateFile=f.root+'/phase24-media-provider.json';if(!fs.existsSync(stateFile))fs.writeFileSync(stateFile,'{}',{mode:0o600});
fs.writeFileSync(source+'/lib/workspace/media/synthetic-processing.ts',`import fs from 'node:fs';import type {MediaProcessor} from './processing';
const file=${JSON.stringify(stateFile)},read=()=>JSON.parse(fs.readFileSync(file,'utf8'));
export const syntheticProcessing:MediaProcessor={dispatch:async(a,j)=>{const rows=read();rows[a.id]={...rows[a.id],jobId:j.id,sourceVersion:j.sourceVersion,status:rows[a.id]?.status??'complete'};fs.writeFileSync(file,JSON.stringify(rows),{mode:0o600});return 'synthetic-'+j.id;},inspect:async(a,j,id)=>{const row=read()[a.id];if(!row||row.jobId!==j.id||row.sourceVersion!==a.objectVersionId||id!=='synthetic-'+j.id)throw Error('synthetic_job_identity_mismatch');return row.status==='complete'?{status:'complete',manifest:{'master.m3u8':{version:'synthetic-master-v1',checksum:'a'.repeat(64),size:100},'master_720.m3u8':{version:'synthetic-playlist-v1',checksum:'b'.repeat(64),size:100},'master_72000001.ts':{version:'synthetic-segment-v1',checksum:'c'.repeat(64),size:188}}}:{status:row.status};}};`);
const runtimeFile=source+'/lib/workspace/media/runtime.ts';let runtime=fs.readFileSync(runtimeFile,'utf8');const marker="let provider; try { provider = processingProvider(processingConfig()); } catch { /* Provider operations fail closed. */ }";
if(runtime.includes(marker))runtime="import {syntheticProcessing} from './synthetic-processing';\n"+runtime.replace(marker,'const provider=syntheticProcessing;');
assert(runtime.includes('const provider=syntheticProcessing;'));fs.writeFileSync(runtimeFile,runtime);
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(__dirname);mod._compile(code,file);
