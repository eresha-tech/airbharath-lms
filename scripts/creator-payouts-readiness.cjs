// Operator-only readiness check: no dotenv, database access or writes.
// --inspect-read-access performs explicitly authorized provider GET requests only.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const args=process.argv.slice(2);if(args.some(x=>x!=='--inspect-read-access')){console.error('Usage: node scripts/creator-payouts-readiness.cjs [--inspect-read-access]');process.exitCode=2;return;}
const root=path.resolve(__dirname,'..'),req=Module.createRequire(root+'/package.json'),ts=req('typescript'),cache=new Map();
function load(name){if(name==='server-only')return {};if(!name.startsWith('@/')&&!name.startsWith('/'))return req(name);let file=name.startsWith('@/')?root+'/'+name.slice(2):name;if(!path.extname(file))file+='.ts';if(cache.has(file))return cache.get(file).exports;const m=new Module(file);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));cache.set(file,m);m.require=n=>n.startsWith('.')?load(path.resolve(path.dirname(file),n)):load(n);m._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);return m.exports;}
(async()=>{
 const config=load('@/lib/creator-payments/razorpayx/config'),readiness=config.payoutReadiness();
 const names=['RAZORPAYX_KEY_ID','RAZORPAYX_KEY_SECRET','RAZORPAYX_MERCHANT_ACCOUNT_ID','RAZORPAYX_FUNDING_ACCOUNT_NUMBER','RAZORPAYX_TRANSFER_MODE','RAZORPAYX_WEBHOOK_SECRET','CREATOR_PAYEE_ENCRYPTION_KEY','CRON_SECRET'];
 const result={...readiness,configuration:Object.fromEntries(names.map(n=>[n,Boolean(process.env[n])])),readAccess:'not_inspected',creationPermissions:'not_verified',fundingBalance:'not_verified',webhookDelivery:'not_verified',liveTransfers:'not_performed'};
 if(args.includes('--inspect-read-access')){
  if(process.env.RAZORPAYX_PERMISSION_INSPECTION_AUTHORIZED!=='true')throw Error('permission_inspection_not_authorized');
  const c=config.payoutConfiguration();await load('@/lib/creator-payments/razorpayx/adapter').razorpayXPayoutAdapter(c).inspect();result.readAccess='GET_access_confirmed_only';
 }
 console.log(JSON.stringify(result,null,2));if(!readiness.configured)process.exitCode=1;
})().catch(()=>{console.error(JSON.stringify({error:'payout_readiness_or_provider_read_access_unavailable',privateDetails:'redacted',liveTransfers:'not_performed'}));process.exitCode=1;});
