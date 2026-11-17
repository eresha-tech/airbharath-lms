import { payoutTestFixture, testHash } from '../fixtures/payout-test-scope';
import { verifyPayoutTestDatabase } from '@/lib/creator-payments/razorpayx/test-isolation';
import {afterAll,beforeEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {payoutConfiguration,payoutReadiness,requirePayoutExecution} from '@/lib/creator-payments/razorpayx/config';
import {razorpayXPayoutAdapter,PayoutProviderError} from '@/lib/creator-payments/razorpayx/adapter';
import {payoutFact,matchesIntent,payoutState,mayObserve,type PayoutRequest} from '@/lib/creator-payments/razorpayx/model';
import {assertLiveOperation} from '@/lib/creator-payments/razorpayx/service';
const values={DATABASE_ENV:'test',RAZORPAYX_KEY_ID:'rzp_test_SYNTHETIC',RAZORPAYX_KEY_SECRET:'synthetic-only-secret',RAZORPAYX_MERCHANT_ACCOUNT_ID:'acc_synthetic',RAZORPAYX_FUNDING_ACCOUNT_NUMBER:'000000123456',RAZORPAYX_WEBHOOK_SECRET:'synthetic-webhook-secret-32-characters',RAZORPAYX_TRANSFER_MODE:'NEFT',CREATOR_RAZORPAYX_ENABLED:'true',RAZORPAYX_TEST_AUTHORIZED:'true'};
const fixture=payoutTestFixture(values),env=fixture.env;afterAll(fixture.dispose);
const bank={holder:'SYNTHETIC BANK HOLDER',account:'000000654321',ifsc:'TEST0000001'},payee='00000000-0000-4000-8000-000000000001',c=payoutConfiguration(env);
const intent:PayoutRequest={account_number:c.fundingAccount,fund_account_id:'fa_SYNTHETIC1',amount:1000,currency:'INR',mode:'NEFT',purpose:'payout',queue_if_low_balance:true,reference_id:payee,narration:'AirBharath Creator'};
const entity={id:'pout_SYNTHETIC1',entity:'payout',currency:'INR',amount:1000,fund_account_id:'fa_SYNTHETIC1',mode:'NEFT',reference_id:payee,status:'processed',utr:'SYNTHETICUTR1',fees:5,tax:1};
beforeEach(async()=>{vi.restoreAllMocks();fixture.write();await verifyPayoutTestDatabase(fixture.database,c);});
it('requires separate complete payout configuration and preserves merchant/funding scope across key rotation',()=>{
 expect(payoutReadiness({}).configured).toBe(false);
 for(const key of ['RAZORPAYX_KEY_ID','RAZORPAYX_KEY_SECRET','RAZORPAYX_MERCHANT_ACCOUNT_ID','RAZORPAYX_FUNDING_ACCOUNT_NUMBER','RAZORPAYX_WEBHOOK_SECRET','RAZORPAYX_TRANSFER_MODE'])expect(()=>payoutConfiguration({...env,[key]:undefined})).toThrow();
 fixture.write({credentialHash:testHash('rzp_test_ROTATED:'+env.RAZORPAYX_KEY_SECRET)});expect(payoutConfiguration({...env,RAZORPAYX_KEY_ID:'rzp_test_ROTATED'}).scope).toBe(c.scope);fixture.write();
 expect(()=>payoutConfiguration({...env,RAZORPAYX_FUNDING_ACCOUNT_NUMBER:'000000999999'})).toThrow();
 expect(requirePayoutExecution(c)).toBe(c);
 expect(()=>payoutConfiguration({...env,RAZORPAYX_TEST_AUTHORIZED:'false'})).toThrow();
 expect(JSON.stringify(payoutReadiness(env))).not.toContain(env.RAZORPAYX_KEY_SECRET);
 expect(payoutReadiness(env)).toMatchObject({permissionsVerified:false,fundingVerified:false,webhookDeliveryVerified:false});
});
it('rejects live keys outside production and requires separately restricted founder pilot or rollout authorization',()=>{
 expect(()=>payoutConfiguration({...env,RAZORPAYX_KEY_ID:'rzp_live_SYNTHETIC'})).toThrow();
 const live=payoutConfiguration({...env,DATABASE_ENV:'production',NODE_ENV:'production',RAZORPAYX_TEST_AUTHORIZED:undefined,RAZORPAYX_TEST_SCOPE_FILE:undefined,RAZORPAYX_KEY_ID:'rzp_live_SYNTHETIC',RAZORPAYX_LIVE_EXECUTION_AUTHORIZED:'true',RAZORPAYX_LIVE_PERMISSION_REVIEWED:'true'});
 expect(()=>assertLiveOperation(live,payee,100,{})).toThrow();
 const pilot={RAZORPAYX_LIVE_PILOT_PAYOUT_ID:payee,RAZORPAYX_LIVE_PILOT_MAX_PAISE:'100'};
 expect(()=>assertLiveOperation(live,payee,100,pilot)).not.toThrow();
 expect(()=>assertLiveOperation(live,payee,101,pilot)).toThrow();expect(()=>assertLiveOperation(live,randomUUID(),100,pilot)).toThrow();
 expect(()=>assertLiveOperation(live,payee,100,{...pilot,RAZORPAYX_LIVE_PILOT_MAX_PAISE:'10001'})).toThrow();
 expect(()=>assertLiveOperation(live,payee,100,{RAZORPAYX_LIVE_ROLLOUT_AUTHORIZED:'true'})).not.toThrow();
});
it.each(['queued','pending','scheduled','processing','processed','failed','reversed','rejected','cancelled'])('projects %s from exact independent provider evidence',status=>{
 const f=payoutFact({...entity,status});matchesIntent(f,intent);expect(payoutState(f.status)).toBe(status==='processed'?'confirmed':['failed','reversed','rejected','cancelled'].includes(status)?'failed':status==='processing'?'initiated':'uncertain');
});
it('fails closed on mismatched evidence, unknown states, estimated fees and malformed IDs',()=>{
 for(const change of [{currency:'USD'},{amount:0},{status:'success'},{fees:-1},{tax:1.2},{id:'pout_/redirect'}])expect(()=>payoutFact({...entity,...change})).toThrow();
 for(const change of [{amount:1001},{fund_account_id:'fa_DIFFERENT'},{reference_id:randomUUID()},{mode:'IMPS'}])expect(()=>matchesIntent(payoutFact({...entity,...change}),intent)).toThrow();
 expect(payoutFact({...entity,fees:null,tax:null})).toMatchObject({fees:null,tax:null});
 expect(mayObserve('processed','queued')).toBe(false);expect(mayObserve('processed','reversed')).toBe(true);expect(mayObserve('reversed','processed')).toBe(false);
});
it('uses documented HTTPS Basic authentication, immutable JSON and payout idempotency without redirects',async()=>{
 const transport=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json(entity)),adapter=razorpayXPayoutAdapter(c,transport),key=randomUUID();await adapter.create(intent,key);
 const [url,init]=transport.mock.calls[0];expect(url).toBe('https://api.razorpay.com/v1/payouts');expect(init).toMatchObject({method:'POST',redirect:'error',cache:'no-store',body:JSON.stringify(intent),headers:{'X-Payout-Idempotency':key,Authorization:'Basic '+Buffer.from(c.keyId+':'+c.secret).toString('base64')}});
 await adapter.create(intent,key);expect(transport.mock.calls[1][1]?.body).toBe(init?.body);
});
it('does not call a write endpoint while execution is disabled; read reconciliation remains available',async()=>{
 const disabled=payoutConfiguration({...env,CREATOR_RAZORPAYX_ENABLED:'false'});await verifyPayoutTestDatabase(fixture.database,disabled);
 const transport=vi.fn<typeof fetch>().mockResolvedValue(Response.json(entity)),adapter=razorpayXPayoutAdapter(disabled,transport);
 await expect(adapter.create(intent,randomUUID())).rejects.toThrow();await expect(adapter.contact(payee)).rejects.toThrow();await expect(adapter.fund('cont_SYNTHETIC',bank)).rejects.toThrow();expect(transport).not.toHaveBeenCalled();await adapter.fetch(entity.id);expect(transport).toHaveBeenCalledOnce();
});
it('uses deterministic contact and bank creation contracts and refuses inactive or different accounts',async()=>{
 const contact={id:'cont_SYNTHETIC1',entity:'contact',name:'AirBharath Creator '+payee.slice(0,8),type:'vendor',reference_id:payee,active:true};
 const fund={id:'fa_SYNTHETIC1',entity:'fund_account',contact_id:contact.id,account_type:'bank_account',active:true,bank_account:{name:bank.holder,ifsc:bank.ifsc,account_number:bank.account}};
 const transport=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(contact)).mockResolvedValueOnce(Response.json(fund)).mockResolvedValueOnce(Response.json(fund)).mockResolvedValueOnce(Response.json(contact));
 const a=razorpayXPayoutAdapter(c,transport);expect(await a.contact(payee)).toBe(contact.id);expect(await a.fund(contact.id,bank)).toBe(fund.id);await a.verifyFund(fund.id,contact.id,bank);
 expect(JSON.parse(String(transport.mock.calls[0][1]?.body))).toMatchObject({reference_id:payee,type:'vendor'});expect(JSON.parse(String(transport.mock.calls[1][1]?.body)).bank_account.account_number).toBe(bank.account);
 const bad=razorpayXPayoutAdapter(c,vi.fn<typeof fetch>().mockResolvedValue(Response.json({...fund,active:false})));await expect(bad.fund(contact.id,bank)).rejects.toThrow();
 const mismatch=razorpayXPayoutAdapter(c,vi.fn<typeof fetch>().mockResolvedValue(Response.json({...fund,bank_account:{...fund.bank_account,account_number:'1111111111'}})));await expect(mismatch.verifyFund(fund.id,contact.id,bank)).rejects.toThrow();
});
it.each([400,401,403,409,429,500])('returns sanitized provider error %s without private response data',async status=>{
 const a=razorpayXPayoutAdapter(c,vi.fn<typeof fetch>().mockResolvedValue(new Response('private bank account credential',{status})));
 try{await a.create(intent,randomUUID());throw Error('expected failure');}catch(e){expect(e).toBeInstanceOf(PayoutProviderError);expect((e as PayoutProviderError).httpStatus).toBe(status);expect(String(e)).not.toContain('private');}
});
it('bounds malformed, oversized and uncertain responses without claiming a transfer failed',async()=>{
 for(const transport of [vi.fn<typeof fetch>().mockRejectedValue(Error('private secret')),vi.fn<typeof fetch>().mockResolvedValue(new Response('not json')),vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(524289)))]){
  await expect(razorpayXPayoutAdapter(c,transport).create(intent,randomUUID())).rejects.toBeInstanceOf(PayoutProviderError);
 }
});
it('aborts slow provider requests within the worker time budget and retains an unknown result',async()=>{
 vi.useFakeTimers();try{
  const transport=vi.fn<typeof fetch>().mockImplementation((_url,init)=>new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(Error('aborted')))));
  const check=expect(razorpayXPayoutAdapter(c,transport).create(intent,randomUUID())).rejects.toMatchObject({code:'provider_response_unknown'});
  await vi.advanceTimersByTimeAsync(6000);await check;
 }finally{vi.useRealTimers();}
});
