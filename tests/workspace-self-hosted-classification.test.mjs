import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const moduleUrl = new URL('../lib/workspace/payments/configuration-core.mjs', import.meta.url).href;
const valid = {NODE_ENV:'production', DATABASE_ENV:'production', WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted', WORKSPACE_DEPLOYMENT_ENV:'production', WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'true', WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_SYNTHETICPROD', WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_SYNTHETICPROD', WORKSPACE_RAZORPAY_MODE:'live', WORKSPACE_RAZORPAY_KEY_ID:'rzp_live_SYNTHETICPROD', WORKSPACE_RAZORPAY_KEY_SECRET:'synthetic-secret-only', WORKSPACE_RAZORPAY_WEBHOOK_SECRET:'synthetic-distinct-webhook'};
function probe(env, config = env) {
 const code = `import {workspaceFinancialReadiness} from ${JSON.stringify(moduleUrl)};globalThis.fetch=()=>{throw Error('Network forbidden')};console.log(JSON.stringify(workspaceFinancialReadiness(${JSON.stringify(config)})))`;
 const r = spawnSync(process.execPath,['--input-type=module','-e',code],{env,encoding:'utf8'});
 assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
test('self-hosted actual production requires explicit deployment and consistent financial scope; activation stays off',()=>{
 assert.equal(probe(valid).runtime,'production');assert.equal(probe(valid).checkoutReady,false);
 for(const key of ['WORKSPACE_DEPLOYMENT_PROVIDER','WORKSPACE_DEPLOYMENT_ENV','WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED','WORKSPACE_PRODUCTION_ACCOUNT_ID','WORKSPACE_RAZORPAY_MODE','WORKSPACE_RAZORPAY_KEY_ID','WORKSPACE_RAZORPAY_ACCOUNT_ID']){
  const e={...valid};delete e[key];assert.equal(probe(e).runtime,'unclassified',key);
 }
});
test('rejects staging, Test, mixed accounts, contradictory markers and authorization before provider work',()=>{
 for(const patch of [{NODE_ENV:'development'},{DATABASE_ENV:'staging'},{DATABASE_ENV:'test'},{WORKSPACE_DEPLOYMENT_ENV:'staging'},{WORKSPACE_DEPLOYMENT_PROVIDER:'aws-unknown'},{WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'false'},{WORKSPACE_RAZORPAY_MODE:'test'},{WORKSPACE_RAZORPAY_KEY_ID:'rzp_test_SYNTHETICPROD'},{WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_DIFFERENT'},{RAZORPAY_KEY_ID:'rzp_test_SYNTHETICPROD'},{RAZORPAY_KEY_ID:'rzp_live_SYNTHETICPROD',COURSE_RAZORPAY_ACCOUNT_ID:'acc_DIFFERENT'},{RAZORPAYX_KEY_ID:'rzp_test_SYNTHETICPROD'},{RAZORPAYX_MERCHANT_ACCOUNT_ID:'acc_DIFFERENT'},{RAZORPAYX_TEST_AUTHORIZED:'true'},{RAZORPAYX_TEST_SCOPE_FILE:'/unused'},{WORKSPACE_RAZORPAY_TEST_AUTHORIZED:'true'},{VERCEL:'1',VERCEL_ENV:'production'},{VERCEL_ENV:'preview'},{VERCEL_TARGET_ENV:'staging'}]){
  const r=probe({...valid,...patch,WORKSPACE_PAYMENT_ENABLED:'true',WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'true'});assert.notEqual(r.runtime,'production',JSON.stringify(patch));assert.equal(r.checkoutReady,false);
 }
});
test('caller-supplied production configuration cannot contradict the actual process',()=>{
 for(const patch of [{NODE_ENV:'test'},{DATABASE_ENV:'test'},{WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:undefined},{WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_DIFFERENT'}]){
  const actual={...valid,...patch};for(const k in actual)if(actual[k]===undefined)delete actual[k];assert.equal(probe(actual,valid).runtime,'unclassified');
 }
});
test('existing coherent Vercel, preview and dedicated nonproduction classification remains intact',()=>{
 for(const [env,expected] of [[{NODE_ENV:'production',DATABASE_ENV:'production',VERCEL:'1',VERCEL_ENV:'production'},'production'],[{NODE_ENV:'production',DATABASE_ENV:'production',VERCEL:'1',VERCEL_ENV:'preview'},'preview'],[{NODE_ENV:'test',DATABASE_ENV:'test'},'test'],[{NODE_ENV:'development',DATABASE_ENV:'development'},'development'],[{NODE_ENV:'production',DATABASE_ENV:'production'},'unclassified']])assert.equal(probe(env).runtime,expected);
});
test('production-built self-hosted staging remains explicitly blocked, without credentials or Vercel markers',()=>{
 const r=probe({NODE_ENV:'production',DATABASE_ENV:'staging',WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted',WORKSPACE_DEPLOYMENT_ENV:'staging'});
 assert.equal(r.runtime,'unclassified');for(const key of ['checkoutReady','refundMutationReady','webhookReady','reconciliationReady','refundReconciliationReady'])assert.equal(r[key],false);
});

const staging = {NODE_ENV:'production',DATABASE_ENV:'staging',WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted',WORKSPACE_DEPLOYMENT_ENV:'staging',WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED:'true'};
test('authorized actual staging is distinct and authoring-only even with financial switches enabled',()=>{
 const env={...staging,WORKSPACE_PAYMENT_ENABLED:'true',WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'true',WORKSPACE_RAZORPAY_WEBHOOK_ENABLED:'true',WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED:'true',WORKSPACE_REFUND_ENABLED:'true'};
 const r=probe(env);assert.equal(r.runtime,'staging');for(const key of ['checkoutReady','refundMutationReady','webhookReady','reconciliationReady','refundReconciliationReady'])assert.equal(r[key],false);
});
test('staging requires actual authorization and matching identities, including callers hiding actual staging',()=>{
 for(const patch of [{NODE_ENV:'development'},{DATABASE_ENV:'production'},{DATABASE_ENV:'test'},{WORKSPACE_DEPLOYMENT_ENV:'production'},{WORKSPACE_DEPLOYMENT_PROVIDER:'vercel'},{WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED:undefined}]){
  const actual={...staging,...patch};for(const k in actual)if(actual[k]===undefined)delete actual[k];assert.equal(probe(actual,staging).runtime,'unclassified');
 }
 assert.equal(probe(staging,{NODE_ENV:'production',DATABASE_ENV:'production',VERCEL:'1',VERCEL_ENV:'production'}).runtime,'unclassified');
});
test('staging rejects supplied and hidden actual credentials or competing production identities',()=>{
 for(const key of ['WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED','WORKSPACE_PRODUCTION_ACCOUNT_ID','VERCEL','VERCEL_ENV','VERCEL_TARGET_ENV','WORKSPACE_RAZORPAY_MODE','WORKSPACE_RAZORPAY_ACCOUNT_ID','WORKSPACE_RAZORPAY_KEY_ID','WORKSPACE_RAZORPAY_KEY_SECRET','WORKSPACE_RAZORPAY_WEBHOOK_SECRET','RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','COURSE_RAZORPAY_ACCOUNT_ID','COURSE_RAZORPAY_WEBHOOK_SECRET','RAZORPAYX_KEY_ID','RAZORPAYX_KEY_SECRET','RAZORPAYX_MERCHANT_ACCOUNT_ID','RAZORPAYX_FUNDING_ACCOUNT_NUMBER','RAZORPAYX_WEBHOOK_SECRET','RAZORPAYX_TEST_SCOPE_FILE']){
  assert.equal(probe({...staging,[key]:'synthetic'},staging).runtime,'unclassified',key);
  assert.equal(probe(staging,{...staging,[key]:'synthetic'}).runtime,'unclassified',key);
 }
});
