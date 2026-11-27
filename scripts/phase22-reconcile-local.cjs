// Calls only the loopback synthetic server; no production secrets are loaded.
const fs=require('node:fs'),assert=require('node:assert/strict');
assert.equal(process.env.PHASE22_LOCAL_RECONCILE,'true');const f=JSON.parse(fs.readFileSync('/tmp/airbharath-phase22/fixture.json')),root=fs.realpathSync(f.root);assert.match(root,/^\/tmp\/airbharath-media-pg-phase22-[A-Za-z0-9_-]+$/);
const seed=fs.readFileSync(root+'/phase22-test-seed','utf8');
fetch('http://127.0.0.1:3022/api/internal/course-payments/reconcile',{headers:{authorization:'Bearer '+seed}}).then(async response=>{const result=await response.json();console.log(JSON.stringify({status:response.status,...result}));if(!response.ok)process.exitCode=1;}).catch(()=>{console.error('Synthetic local reconciliation unavailable.');process.exitCode=1;});
