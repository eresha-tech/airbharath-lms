import 'server-only';
import { razorpayXRequest } from '../razorpayx/adapter';
import { providerId } from '../razorpayx/model';
import { requireBankValidation, type BankValidationConfig } from './config';
import type { BankDetails } from './model';
export function bankValidationAdapter(config: BankValidationConfig, transport: typeof fetch = fetch) {
  const request = razorpayXRequest(config.payout,transport);
  function gate() {
    requireBankValidation(config);
    if (config.mode === 'synthetic' && transport === fetch) throw Error('synthetic_transport_required');
  }
  return {
    async contact(payeeId: string) { gate(); const r=await request('contacts',{name:'AirBharath Creator '+payeeId.slice(0,8),type:'vendor',reference_id:payeeId}); if(r.entity!=='contact'||r.reference_id!==payeeId||r.active!==true)throw Error('validation_contact_mismatch');return providerId(r.id,'cont'); },
    async fund(contactId:string,bank:BankDetails) { gate(); const r=await request('fund_accounts',{contact_id:providerId(contactId,'cont'),account_type:'bank_account',bank_account:{name:bank.holder,ifsc:bank.ifsc,account_number:bank.account}}); const b=r.bank_account as Record<string,unknown>|undefined;if(r.entity!=='fund_account'||r.contact_id!==contactId||r.active!==true||r.account_type!=='bank_account'||b?.name!==bank.holder||b?.ifsc!==bank.ifsc||b?.account_number!==bank.account)throw Error('validation_fund_mismatch');return providerId(r.id,'fa'); },
    async create(id:string,fundId:string) { gate();return request('fund_accounts/validations',{account_number:config.payout.fundingAccount,fund_account:{id:providerId(fundId,'fa')},amount:config.amount,currency:'INR',notes:{airbharath_validation:id}}); },
    async fetch(id:string) {gate();if(!/^fav_[A-Za-z0-9]{6,100}$/.test(id))throw Error('validation_id_invalid');return request('fund_accounts/validations/'+id);},
    async list(skip:number) {gate();if(!Number.isSafeInteger(skip)||skip<0||skip>10000)throw Error('validation_scan_limit');return request('fund_accounts/validations?'+new URLSearchParams({account_number:config.payout.fundingAccount,count:'100',skip:String(skip)}));},
  };
}
export type BankValidationAdapter = ReturnType<typeof bankValidationAdapter>;
