import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import { financialHarness } from './workspace-payments-fixtures';
import { createRefundService, type RefundProvider } from '@/lib/workspace/refunds/service';
import { RefundError, type ProviderRefund } from '@/lib/workspace/refunds/model';
import type { RefundStore, RefundTransaction, RefundRequest, RefundAttempt, RefundCompletion } from '@/lib/workspace/refunds/store';
export async function refundHarness(){
 const finance=financialHarness(),order=await finance.ready();
 const payment=finance.captured(order);await finance.service.reconcileOrder(order.userId,order.id);
 Object.assign(order,{activationState:'fulfilled',fulfilledAt:finance.now.value});
 const adminId=randomUUID(),roles=new Map([[adminId,'admin'],[order.userId,'student']]);
 const clock={value:finance.now.value};
 const state={request:null as RefundRequest|null,attempt:null as RefundAttempt|null,completion:null as RefundCompletion|null,notices:[] as string[],observations:[] as string[]};
 let tail=Promise.resolve();const scope=new AsyncLocalStorage<boolean>();
 const store:RefundStore={
  async transaction(id,actorId,work){const previous=tail;let release!:()=>void;tail=new Promise(r=>release=r);await previous;const before=structuredClone(state);
   try{if(id!==order.id)throw new RefundError('not_found');const tx:RefundTransaction={order,actor:actorId&&roles.has(actorId)?{id:actorId,role:roles.get(actorId)!}:null,payment:finance.state.payments[0],
    get request(){return state.request;},get attempt(){return state.attempt;},get completion(){return state.completion;},now:async()=>clock.value,
    requestByKey:async(user,key)=>state.request?.userId===user&&state.request.requestKey===key?state.request:undefined,
    async createRequest(input){state.request={...input,decision:'requested',decidedBy:null,decidedAt:null,rejectionReason:null} as RefundRequest;return state.request;},
    async patchRequest(input){Object.assign(state.request!,input);return state.request!;},
    async createAttempt(input){state.attempt={...input,state:'prepared',providerRefundId:null,startedAt:null,lastCheckedAt:null,evidenceHash:null,errorCode:null,createdAt:clock.value} as RefundAttempt;return state.attempt;},
    async patchAttempt(input){Object.assign(state.attempt!,input);return state.attempt!;},
    async complete(input){state.completion||={...input,id:randomUUID()} as RefundCompletion;return state.completion;},
    async notice(kind){if(!state.notices.includes(kind))state.notices.push(kind);},async observe(_hash,outcome){state.observations.push(outcome);},
   };return await scope.run(true,()=>work(tx));}catch(error){Object.assign(state,before);throw error;}finally{release();}
  },
  async read(id,actorId,admin=false){if(id!==order.id)return null;if(actorId&&(admin?roles.get(actorId)!=='admin':actorId!==order.userId))throw new RefundError('forbidden');return {order,...state};},
  async pending(){return state.attempt?[state.attempt]:[];},
 };
 const refunds:ProviderRefund[]=[];
 const provider:RefundProvider={context:finance.provider.context,
  fetchPayment:vi.fn(async()=>{if(scope.getStore())throw Error('HTTP under lock');return structuredClone(payment);}),
  fetchRefunds:vi.fn(async()=>{if(scope.getStore())throw Error('HTTP under lock');return structuredClone(refunds);}),
  createRefund:vi.fn(async input=>{if(scope.getStore()||!state.attempt||state.attempt.state!=='uncertain')throw Error('Missing committed intent');const row:ProviderRefund={...provider.context,id:'rfnd_'+randomUUID().replaceAll('-',''),paymentId:input.paymentId,amountPaise:input.amountPaise,currency:'INR',status:'pending',createdAt:clock.value};refunds.push(row);return row;}),
 };
 const service=createRefundService(store,provider),command={requestKey:randomUUID(),reason:'changed_mind',note:'Synthetic test only'};
 async function requested(){return service.request(order.userId,order.id,command);}
 async function approved(){await requested();return service.decide(adminId,order.id,{action:'approve',confirmed:true});}
 function full(){const row=refunds[0]||{...provider.context,id:'rfnd_'+randomUUID().replaceAll('-',''),paymentId:payment.id,amountPaise:order.totalPaise,currency:'INR',status:'processed' as const,createdAt:clock.value};row.status='processed';if(!refunds.length)refunds.push(row);payment.refundedPaise=order.totalPaise;payment.refundStatus='full';return row;}
 return {finance,order,payment,adminId,roles,clock,state,store,provider,refunds,service,command,requested,approved,full};
}
