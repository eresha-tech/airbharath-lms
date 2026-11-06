// Synthetic HTTP transport for the real payout adapter. No network calls.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const initial=()=>({contacts:{},funds:{},payouts:{},keys:{},calls:[],settings:{initialStatus:'queued'}});
function createTransport(read,write){return async function transport(input,init={}){
 const url=new URL(input);assert.equal(url.origin,'https://api.razorpay.com');assert.equal(init.redirect,'error');const route=url.pathname.replace('/v1/',''),method=init.method||'GET',body=init.body?JSON.parse(init.body):null,s=read(),settings=s.settings;
 s.calls.push({route,method,key:init.headers?.['X-Payout-Idempotency']??null,body});
 const save=()=>write(s),json=(value,status=200)=>{save();return Response.json(value,{status});};
 if(method==='POST'&&route==='contacts'){
  const existing=Object.values(s.contacts).find(x=>x.reference_id===body.reference_id&&x.name===body.name&&x.type===body.type);const value=existing??{...body,id:'cont_'+randomUUID().replaceAll('-',''),entity:'contact',active:true};s.contacts[value.id]=value;return json(value);
 }
 if(method==='POST'&&route==='fund_accounts'){
  const existing=Object.values(s.funds).find(x=>JSON.stringify(x.bank_account)===JSON.stringify(body.bank_account)&&x.contact_id===body.contact_id);const value=existing??{...body,id:'fa_'+randomUUID().replaceAll('-',''),entity:'fund_account',active:true};s.funds[value.id]=value;return json(value);
 }
 if(method==='GET'&&route.startsWith('contacts/')){const value=s.contacts[route.split('/')[1]];return json({...value,active:!settings.inactive});}
 if(method==='GET'&&route.startsWith('fund_accounts/')){const value=s.funds[route.split('/')[1]];return json({...value,active:!settings.inactive});}
 if(method==='GET'&&route==='payouts')return json({entity:'collection',items:settings.hideList?[]:Object.values(s.payouts).slice(Number(url.searchParams.get('skip')||0),Number(url.searchParams.get('skip')||0)+Number(url.searchParams.get('count')||100))});
 if(method==='POST'&&route==='payouts'){
  const key=init.headers?.['X-Payout-Idempotency'];assert.match(key,/^[a-f0-9-]{36}$/);if(settings.createError)return json({error:{description:'synthetic rejection'}},settings.createError);
  const existing=s.keys[key];if(existing){assert.deepEqual(s.payouts[existing]._intent,body);return json(s.payouts[existing]);}
  const value={...body,id:'pout_'+randomUUID().replaceAll('-',''),entity:'payout',status:settings.initialStatus||'queued',fees:5,tax:1,utr:null,status_details:{reason:settings.reason||null},_intent:body};s.keys[key]=value.id;s.payouts[value.id]=value;
  if(settings.loseCreateResponse){settings.loseCreateResponse--;save();throw Error('synthetic_response_lost_after_acceptance');}return json(value);
 }
 if(method==='GET'&&route.startsWith('payouts/')){
  if(settings.fetchError){const status=settings.fetchError;settings.fetchError=0;return json({error:{description:'synthetic fetch denied'}},status);}
  const value=s.payouts[route.split('/')[1]];if(!value)return json({error:{}},404);return json(settings.mismatch?{...value,amount:value.amount+1}:value);
 }
 throw Error('Unexpected synthetic provider request');
};}
module.exports={initial,createTransport};
