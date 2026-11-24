import { it, expect, vi } from 'vitest';
import {createHash} from 'node:crypto';
import {assertLiveOperation,preparePayoutJob,type PayoutTx} from '@/lib/creator-payments/razorpayx/service';
import {bankValidationAdapter} from '@/lib/creator-payments/bank-validation/adapter';
import { financialConfiguration } from '@/lib/workspace/payments/configuration';
import { createRazorpayAdapter } from '@/lib/workspace/payments/provider';
import { payoutConfiguration } from '@/lib/creator-payments/razorpayx/config';
import { razorpayXPayoutAdapter } from '@/lib/creator-payments/razorpayx/adapter';
import { bankValidationConfiguration } from '@/lib/creator-payments/bank-validation/config';
const workspace={NODE_ENV:'production',DATABASE_ENV:'production',WORKSPACE_DEPLOYMENT_PROVIDER:'self-hosted',WORKSPACE_DEPLOYMENT_ENV:'production',WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED:'true',WORKSPACE_PRODUCTION_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_SYNTHETICPROD',WORKSPACE_RAZORPAY_MODE:'live',WORKSPACE_RAZORPAY_KEY_ID:'rzp_live_SYNTHETICPROD',WORKSPACE_RAZORPAY_KEY_SECRET:'synthetic-api-secret-only',WORKSPACE_RAZORPAY_WEBHOOK_SECRET:'synthetic-webhook-only-distinct',WORKSPACE_RAZORPAY_LIVE_AUTHORIZED:'true',WORKSPACE_PAYMENT_ENABLED:'true'};
const payout={NODE_ENV:'production',DATABASE_ENV:'production',RAZORPAYX_KEY_ID:'rzp_live_SYNTHETIC',RAZORPAYX_KEY_SECRET:'synthetic-only-secret',RAZORPAYX_MERCHANT_ACCOUNT_ID:'acc_synthetic',RAZORPAYX_FUNDING_ACCOUNT_NUMBER:'000000123456',RAZORPAYX_WEBHOOK_SECRET:'synthetic-webhook-secret-longer-than-32',RAZORPAYX_TRANSFER_MODE:'NEFT',CREATOR_RAZORPAYX_ENABLED:'true',RAZORPAYX_LIVE_EXECUTION_AUTHORIZED:'true',RAZORPAYX_LIVE_PERMISSION_REVIEWED:'true'};
const bind=(env:Record<string,string|undefined>)=>{for(const[k,v]of Object.entries(env))vi.stubEnv(k,v);};
it.each(['WORKSPACE_PAYMENT_ENABLED','WORKSPACE_RAZORPAY_LIVE_AUTHORIZED'])('actual disabled %s cannot be overridden by supplied configuration',key=>{
 bind({...workspace,[key]:'false'});const http=vi.fn<typeof fetch>();expect(financialConfiguration('checkout',workspace)).toBeNull();expect(()=>createRazorpayAdapter(workspace,http)).toThrow();expect(http).not.toHaveBeenCalled();
});
it('actual payout execution disabled cannot be overridden',async()=>{
 bind({...payout,CREATOR_RAZORPAYX_ENABLED:'false'});const http=vi.fn<typeof fetch>();const config=payoutConfiguration(payout);expect(config.enabled).toBe(false);await expect(razorpayXPayoutAdapter(config,http).contact('synthetic')).rejects.toThrow();expect(http).not.toHaveBeenCalled();
});
it('actual FAV disabled cannot be overridden',()=>{
 const env={...payout,CREATOR_BANK_VALIDATION_ENABLED:'true',RAZORPAYX_FAV_METHOD:'pennydrop',RAZORPAYX_FAV_AMOUNT_PAISE:'100',RAZORPAYX_FAV_MIN_INTERVAL_SECONDS:'3600',RAZORPAYX_FAV_FUNDING_TYPE:'razorpayx_lite',RAZORPAYX_FAV_ACTIVATION_CONFIRMED:'true',RAZORPAYX_FAV_PERMISSION_REVIEWED:'true',RAZORPAYX_FAV_CHARGES_REVIEWED:'true',RAZORPAYX_FAV_FREQUENCY_REVIEWED:'true',RAZORPAYX_FAV_LIVE_AUTHORIZED:'true',RAZORPAYX_FAV_APPROVED_FUNDING_FINGERPRINT:createHash('sha256').update(payout.RAZORPAYX_FUNDING_ACCOUNT_NUMBER).digest('hex')};
 bind({...env,CREATOR_BANK_VALIDATION_ENABLED:'false'});expect(bankValidationConfiguration(env).enabled).toBe(false);
});
it.each([
 ['WORKSPACE_PAYMENT_ENABLED','checkout'],['WORKSPACE_REFUND_ENABLED','refund'],['WORKSPACE_RAZORPAY_WEBHOOK_ENABLED','webhook'],['WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED','reconciliation'],['WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED','refund_reconciliation'],
] as const)('actual %s is authoritative for %s', (flag,capability)=>{
 const config={...workspace,WORKSPACE_REFUND_ENABLED:'true',WORKSPACE_RAZORPAY_WEBHOOK_ENABLED:'true',WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED:'true',WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED:'true'};
 bind(config);expect(financialConfiguration(capability,config)!==null).toBe(true);vi.stubEnv(flag,'false');expect(financialConfiguration(capability,config)===null).toBe(true);
});
it.each(['WORKSPACE_RAZORPAY_MODE','WORKSPACE_RAZORPAY_ACCOUNT_ID','WORKSPACE_RAZORPAY_KEY_ID','WORKSPACE_RAZORPAY_KEY_SECRET','WORKSPACE_RAZORPAY_WEBHOOK_SECRET'])('rejects actual changed Workspace identity %s before transport',key=>{
 bind(workspace);vi.stubEnv(key,'different-synthetic-value');const transport=vi.fn<typeof fetch>();expect(()=>createRazorpayAdapter(workspace,transport)).toThrow();expect(transport).not.toHaveBeenCalled();
});
it('Vercel production also intersects actual authorization, without changing diagnostic classification',()=>{
 for(const key of ['WORKSPACE_DEPLOYMENT_PROVIDER','WORKSPACE_DEPLOYMENT_ENV','WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED','WORKSPACE_PRODUCTION_ACCOUNT_ID'])vi.stubEnv(key,undefined);
 const {WORKSPACE_DEPLOYMENT_PROVIDER: _provider,WORKSPACE_DEPLOYMENT_ENV: _deployment,WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED: _authorization,WORKSPACE_PRODUCTION_ACCOUNT_ID: _account,...rest}=workspace;
 const config={...rest,VERCEL:'1',VERCEL_ENV:'production'};bind(config);expect(financialConfiguration('checkout',config)!==null).toBe(true);vi.stubEnv('WORKSPACE_RAZORPAY_LIVE_AUTHORIZED','false');expect(financialConfiguration('checkout',config)===null).toBe(true);
});
it('a retained Workspace adapter stops after the actual payment kill switch changes',async()=>{
 bind(workspace);const transport=vi.fn<typeof fetch>(),adapter=createRazorpayAdapter({...workspace},transport);vi.stubEnv('WORKSPACE_PAYMENT_ENABLED','false');await expect(adapter.createOrder({amountPaise:100,currency:'INR',receipt:'synthetic'})).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it.each(['CREATOR_RAZORPAYX_ENABLED','RAZORPAYX_LIVE_EXECUTION_AUTHORIZED','RAZORPAYX_LIVE_PERMISSION_REVIEWED'])('a retained payout adapter stops after actual %s changes',async key=>{
 bind(payout);const config=payoutConfiguration(payout),transport=vi.fn<typeof fetch>(),adapter=razorpayXPayoutAdapter(config,transport);vi.stubEnv(key,'false');await expect(adapter.contact('synthetic')).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it.each(['RAZORPAYX_KEY_ID','RAZORPAYX_KEY_SECRET','RAZORPAYX_MERCHANT_ACCOUNT_ID','RAZORPAYX_FUNDING_ACCOUNT_NUMBER','RAZORPAYX_WEBHOOK_SECRET','RAZORPAYX_TRANSFER_MODE','DATABASE_ENV','NODE_ENV'])('retained payout configuration rejects actual changed %s even for reads',async key=>{
 bind(payout);const config=payoutConfiguration(payout),transport=vi.fn<typeof fetch>(),adapter=razorpayXPayoutAdapter(config,transport);vi.stubEnv(key,'different-synthetic-value');await expect(adapter.inspect()).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it('supplied Test authorization cannot enable a process with Test collection disabled',()=>{
 for(const key of ['WORKSPACE_DEPLOYMENT_PROVIDER','WORKSPACE_DEPLOYMENT_ENV','WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED','WORKSPACE_PRODUCTION_ACCOUNT_ID'])vi.stubEnv(key,undefined);
 const env={NODE_ENV:'test',DATABASE_ENV:'test',WORKSPACE_RAZORPAY_MODE:'test',WORKSPACE_RAZORPAY_ACCOUNT_ID:'acc_SYNTHETICTEST',WORKSPACE_RAZORPAY_KEY_ID:'rzp_test_SYNTHETICTEST',WORKSPACE_RAZORPAY_KEY_SECRET:'synthetic-test-secret-only',WORKSPACE_RAZORPAY_WEBHOOK_SECRET:'synthetic-test-webhook-only',WORKSPACE_RAZORPAY_TEST_AUTHORIZED:'true',WORKSPACE_PAYMENT_ENABLED:'true'};
 bind(env);expect(financialConfiguration('checkout',env)!==null).toBe(true);vi.stubEnv('WORKSPACE_RAZORPAY_TEST_AUTHORIZED','false');const transport=vi.fn<typeof fetch>();expect(financialConfiguration('checkout',env)===null).toBe(true);expect(()=>createRazorpayAdapter(env,transport)).toThrow();expect(transport).not.toHaveBeenCalled();
});

it('supplied rollout/pilot approval cannot authorize a disabled actual Live rollout',()=>{
 bind(payout);const config=payoutConfiguration(payout);expect(()=>assertLiveOperation(config,'synthetic',100,{RAZORPAYX_LIVE_ROLLOUT_AUTHORIZED:'true'})).toThrow();
});
it('actual disabled execution rejects payout-job creation before database mutation',async()=>{
 bind(payout);const config=payoutConfiguration(payout);vi.stubEnv('CREATOR_RAZORPAYX_ENABLED','false');const insert=vi.fn(),execute=vi.fn();await expect(preparePayoutJob({insert,execute} as unknown as PayoutTx,'synthetic','live:acc_synthetic',config)).rejects.toThrow();expect(insert).not.toHaveBeenCalled();expect(execute).not.toHaveBeenCalled();
});
it('retained FAV configuration rechecks actual authorization before mocked transport',async()=>{
 const env={...payout,CREATOR_BANK_VALIDATION_ENABLED:'true',RAZORPAYX_FAV_METHOD:'pennydrop',RAZORPAYX_FAV_AMOUNT_PAISE:'100',RAZORPAYX_FAV_MIN_INTERVAL_SECONDS:'3600',RAZORPAYX_FAV_FUNDING_TYPE:'razorpayx_lite',RAZORPAYX_FAV_ACTIVATION_CONFIRMED:'true',RAZORPAYX_FAV_PERMISSION_REVIEWED:'true',RAZORPAYX_FAV_CHARGES_REVIEWED:'true',RAZORPAYX_FAV_FREQUENCY_REVIEWED:'true',RAZORPAYX_FAV_LIVE_AUTHORIZED:'true',RAZORPAYX_FAV_APPROVED_FUNDING_FINGERPRINT:createHash('sha256').update(payout.RAZORPAYX_FUNDING_ACCOUNT_NUMBER).digest('hex')};
 bind(env);const config=bankValidationConfiguration(env);expect(config.enabled).toBe(true);const transport=vi.fn<typeof fetch>(),adapter=bankValidationAdapter(config,transport);vi.stubEnv('RAZORPAYX_FAV_LIVE_AUTHORIZED','false');await expect(adapter.create('synthetic','fa_SYNTHETIC')).rejects.toThrow();expect(transport).not.toHaveBeenCalled();
});
it('execution kill switch preserves independently scoped provider reconciliation GETs',async()=>{
 bind(payout);const config=payoutConfiguration(payout),transport=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({entity:'collection',items:[]}));vi.stubEnv('CREATOR_RAZORPAYX_ENABLED','false');await razorpayXPayoutAdapter(config,transport).inspect();expect(transport).toHaveBeenCalledTimes(3);for(const[,options]of transport.mock.calls)expect(options?.method).toBe('GET');
});
