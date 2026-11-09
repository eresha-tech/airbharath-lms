// Phase 2.5A reuses the credential-free copy workflow; no dependency installation.
const fs=require('node:fs'),path=require('node:path');
const mode=process.argv[2]??'validation';if(!['browser-source','validation','build-source'].includes(mode))throw Error('Invalid verification purpose');
const base='/tmp/airbharath-phase25a',target=mode==='build-source'?path.resolve('output/audits/workspace-phase25a/build-source'):path.join(base,mode),manifest=base+'/files.manifest';
fs.mkdirSync(target,{recursive:true});
for(const name of [...fs.readFileSync(manifest,'utf8').split('\0').filter(Boolean),'output/audits/workspace-f6r/coverage-review.json','output/audits/workspace-f6/catalog-before.json']){
 if((name.startsWith('output/')&&!['output/audits/workspace-f6r/coverage-review.json','output/audits/workspace-f6/catalog-before.json'].includes(name))||/(^|\/)(\.env[^/]*|\.aws|\.codex|\.agents|\.claude|\.git)(\/|$)/.test(name)||/\.(pem|key|log)$/.test(name))continue;
 const file=path.resolve(name);if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;const dest=path.join(target,name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);
}
if(!fs.existsSync(target+'/node_modules'))fs.symlinkSync(path.resolve('node_modules'),target+'/node_modules','dir');console.log(target);
