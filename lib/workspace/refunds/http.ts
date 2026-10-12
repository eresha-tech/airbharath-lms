import { getWorkspaceUser } from '../eligibility/service';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { isSameOrigin, privateJson, readJson } from '../http';
import { UUID } from '../eligibility/model';
import { RefundError, refundStatus } from './model';
import { workspaceRefundRuntime } from './runtime';
import type { RefundSnapshot } from './store';
export function refundReceipt(row: RefundSnapshot) {
 return { orderId:row.order.id,requestId:row.request?.id||null,status:row.request?refundStatus(row.request.decision,row.attempt?.state,!!row.completion):row.completion?'Refund completed':null,requestedAt:row.request?.requestedAt?.toISOString()||null,rejectionReason:row.request?.rejectionReason||null,confirmedAt:row.completion?.confirmedAt?.toISOString()||null };
}
export async function refundHttp(request:Request,orderId:string,kind:'request'|'decision') {
 try {
  if(!isSameOrigin(request))throw new RefundError('forbidden');
  const actor=kind==='decision'?await getAuthorizedAdminSession():await getWorkspaceUser();
  if(!actor)throw new RefundError(kind==='decision'?'forbidden':'authentication');
  if(!UUID.test(orderId))throw new RefundError('not_found');
  let raw:unknown;try{raw=await readJson(request,8192);}catch{throw new RefundError('validation');}
  const service=workspaceRefundRuntime();
  if(kind==='request'){
   const row=await service.request(actor.id,orderId,raw);return privateJson({refund:{orderId,requestId:row.id,status:refundStatus(row.decision),requestedAt:row.requestedAt.toISOString()}});
  }
  const row=await service.decide(actor.id,orderId,raw);return privateJson({refund:row?refundReceipt(row):null});
 }catch(error){
  const code=error instanceof RefundError?error.code:'unavailable';
  const messages={validation:'Check the request and confirm the action. Do not include payment or payout details.',authentication:'Please sign in again.',forbidden:'This action is unavailable for your account.',not_found:'Membership payment not found.',conflict:'This case was already decided or the request conflicts. Reload to check the recorded status.',window_ended:'Refund request window ended.',not_refundable:'This payment is not currently eligible for a standard full refund request. Contact support if needed.',unavailable:'Refund processing is temporarily unavailable. Your existing case is retained; reload before retrying.',reconciliation_required:'Provider processing requires reconciliation before another refund can be initiated.'};
  return privateJson({code,error:messages[code]},code==='authentication'?401:code==='forbidden'?403:code==='not_found'?404:code==='validation'?400:code==='unavailable'?503:409);
 }
}
