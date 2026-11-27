// Reuse approved checkout and payout browser journeys on the Phase24 fixture.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),Module=require('module');
assert.equal(process.env.PHASE24_BROWSER_REGRESSION,'true');const kind=process.argv[2];assert(['checkout','payout'].includes(kind));
const source='/tmp/airbharath-phase24/browser-source';assert.match(fs.readFileSync(source+'/lib/creator-payments/razorpayx/adapter.ts','utf8'),/transport:\s*typeof fetch\s*=\s*syntheticTransport/);
const file=path.join(__dirname,kind==='checkout'?'phase22-browser.cjs':'phase22p-browser.cjs');let code=fs.readFileSync(file,'utf8');
const out=path.resolve('output/audits/workspace-phase24/'+kind+'-browser');fs.mkdirSync(out,{recursive:true});
if(kind==='checkout'){
 code=code.slice(0,code.indexOf(" stage='payee'"))+" fs.writeFileSync(out+'/browser.json',JSON.stringify(report,null,2));\n }finally{await browser?.close();await db?.end({timeout:2});}})().catch(e=>{console.error('Checkout regression '+stage+': '+e.message);process.exitCode=1;});";
 code=code.replaceAll('PHASE22_BROWSER_VERIFY','PHASE24_BROWSER_REGRESSION').replace("'/tmp/airbharath-phase22/fixture.json'","'/tmp/airbharath-phase24/fixture.json'").replace("assert.match(root,/^\\/tmp\\/airbharath-media-pg-phase22-[A-Za-z0-9_-]+$/)","assert.equal(require('path').dirname(root),require('path').resolve('output/audits/workspace-phase24/audits/workspace-phase22p'))").replace("host:root+'/socket'","host:f.socket").replaceAll('http://127.0.0.1:3022','http://127.0.0.1:3028').replace("out='output/audits/workspace-phase22'",'out='+JSON.stringify(out));
}else{
 code=code.replace("const ux=process.env.PHASE22P_UX_BROWSER==='true';assert(ux||process.env.PHASE22P_BROWSER==='true');","const ux=false;assert.equal(process.env.PHASE24_BROWSER_REGRESSION,'true');").replace("'/tmp/airbharath-phase22p/fixture.json'","'/tmp/airbharath-phase24/fixture.json'").replace("out=path.resolve(ux?'output/audits/workspace-phase22p-uiux':'output/audits/workspace-phase22p')",'out='+JSON.stringify(out)).replace("assert.equal(path.dirname(root),ux?out+'/audits/workspace-phase22p':out)","assert.equal(path.dirname(root),path.resolve('output/audits/workspace-phase24/audits/workspace-phase22p'))").replaceAll('http://127.0.0.1:3024','http://127.0.0.1:3028');
}
assert(code.includes("'/tmp/airbharath-phase24/fixture.json'"));assert(code.includes('http://127.0.0.1:3028'));
const mod=new Module(file,module);mod.filename=file;mod.paths=Module._nodeModulePaths(__dirname);mod._compile(code,file);
