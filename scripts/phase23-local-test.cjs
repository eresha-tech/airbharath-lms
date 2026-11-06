// The existing synthetic payout launcher supplies the same secure local auth/DB setup.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
if(process.env.PHASE23_LOCAL_TEST!=='true')throw Error('PHASE23_LOCAL_TEST=true required');
const file=path.join(__dirname,'phase22p-local-test.cjs');let code=fs.readFileSync(file,'utf8');
const replacements=[
 ["'/tmp/airbharath-phase22p/fixture.json'","'/tmp/airbharath-phase23/fixture.json'"],
 ["source=path.resolve('output/audits/workspace-phase22p/browser-source')","source='/tmp/airbharath-phase23/browser-source'"],
 ["path.resolve('output/audits/workspace-phase22p')","path.resolve('output/audits/workspace-phase23/audits/workspace-phase22p')"],
];
for(const [before,after]of replacements){assert.equal(code.split(before).length,2,'Existing local launcher contract changed');code=code.replace(before,after);}
code=code.replaceAll('PHASE22P_LOCAL_TEST','PHASE23_LOCAL_TEST').replaceAll('55445','55447').replaceAll('3024','3026');
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(__dirname);mod._compile(code,file);
