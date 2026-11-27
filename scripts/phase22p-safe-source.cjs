// Credential-free copies for local Phase 2.2P verification. No dependency install.
const fs=require('node:fs'),path=require('node:path');
const mode=process.argv[2]??'source';if(!['source','validation','build'].includes(mode))throw Error('Invalid verification purpose');
const target=mode==='build'?path.resolve('output/audits/workspace-phase22p/build-source'):mode==='source'?path.resolve('output/audits/workspace-phase22p/browser-source'):'/tmp/airbharath-phase22p/'+mode;
const manifest='/tmp/airbharath-phase22p/files.manifest';if(!fs.existsSync(manifest))throw Error('Prepare the safe git source manifest first');
fs.mkdirSync(target,{recursive:true});
for(const name of fs.readFileSync(manifest,'utf8').split('\0').filter(Boolean)){
 if((name.startsWith('output/')&&!['output/audits/workspace-f6r/coverage-review.json','output/audits/workspace-f6/catalog-before.json'].includes(name))||/(^|\/)(\.env[^/]*|\.aws|\.codex|\.agents|\.git)(\/|$)/.test(name)||/\.(pem|key|log)$/.test(name))continue;
 const source=path.resolve(name);if(!fs.existsSync(source)||!fs.statSync(source).isFile())continue;const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
}
if(!fs.existsSync(path.join(target,'node_modules')))fs.symlinkSync(path.resolve('node_modules'),path.join(target,'node_modules'),'dir');
console.log(target);
