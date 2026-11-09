// Strictly synthetic HTTP responses for the documented traditional FAV contract.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {initial,createTransport}=require('./phase22p-provider.cjs');
const initialBank=()=>({...initial(),validations:{}});
function createBankTransport(read,write) {
 const base=createTransport(read,write);
 return async(input,init={})=>{
  const url=new URL(input),route=url.pathname.replace('/v1/','');
  if(!route.startsWith('fund_accounts/validations'))return base(input,init);
  assert.equal(url.origin,'https://api.razorpay.com');assert.equal(init.redirect,'error');
  const s=read();s.validations??={};s.calls.push({route,method:init.method??'GET'});
  const response=(r,status=200)=>{write(s);return Response.json(r,{status});};
  if(init.method==='POST') {
   const b=JSON.parse(init.body);assert.equal(b.account_number,'000000123456');assert(!('validation_type' in b));
   const fund=s.funds[b.fund_account.id];assert(fund);
   const r={id:'fav_'+randomUUID().replaceAll('-',''),entity:'fund_account.validation',fund_account:fund,status:s.settings.validationStatus??'completed',amount:b.amount,currency:b.currency,notes:b.notes,results:{account_status:s.settings.accountStatus??'active',registered_name:s.settings.omitName?null:s.settings.registeredName??fund.bank_account.name}};
   s.validations[r.id]=r;if(s.settings.loseValidationResponse){s.settings.loseValidationResponse--;write(s);throw Error('synthetic_validation_timeout');}return response(r);
  }
  if(s.settings.validationFetchError){write(s);throw Error('synthetic_validation_unavailable');}
  if(route==='fund_accounts/validations')return response({entity:'collection',items:Object.values(s.validations).slice(Number(url.searchParams.get('skip')??0),Number(url.searchParams.get('skip')??0)+100)});
  const r=s.validations[route.split('/')[2]];return response(r??{},r?200:404);
 };
}
module.exports={initialBank,createBankTransport};
