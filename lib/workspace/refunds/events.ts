import { PaymentError } from '../payments/model';
import type { FinanceStore, InboxEvent } from '../payments/repository';
import { RefundError } from './model';
import type { RefundProvider, createRefundService } from './service';
import type { RefundStore } from './store';
export function createRefundEventProcessor(provider:RefundProvider,finance:FinanceStore,refunds:RefundStore,service:ReturnType<typeof createRefundService>){
 return async(event:InboxEvent)=>{
  if(event.providerAccountId!==provider.context.accountId||event.providerMode!==provider.context.mode||!event.evidence.providerPaymentId||!event.evidence.providerRefundId)throw new PaymentError('provider_mismatch');
  const payment=await provider.fetchPayment(event.evidence.providerPaymentId);
  if(payment.id!==event.evidence.providerPaymentId||payment.accountId!==provider.context.accountId||payment.mode!==provider.context.mode||(event.evidence.providerOrderId&&event.evidence.providerOrderId!==payment.orderId))throw new PaymentError('provider_mismatch');
  const order=await finance.matchOrder(provider.context,payment.orderId);
  if(!order){await finance.finishUnmatchedEvent(event.id,new Date(),'ignored','unrelated_refund');return;}
  if(order.winningPaymentId!==payment.id){await finance.finishUnmatchedEvent(event.id,new Date(),'needs_review','nonwinning_refund');return;}
  try{await service.reconcile(order.id,event.evidence.providerRefundId);}
  catch(error){if(error instanceof RefundError&&error.code==='reconciliation_required'){await finance.finishUnmatchedEvent(event.id,new Date(),'needs_review','refund_requires_review');return;}throw error;}
  const result=await refunds.read(order.id);
  // Even without a local request, a partial/external refund stays in the review inbox.
  const partial=payment.refundedPaise>0&&payment.refundedPaise<order.totalPaise;
  await finance.finishUnmatchedEvent(event.id,new Date(),partial||(!result?.completion&&result?.attempt?.state==='uncertain')?'needs_review':'ignored',result?.completion?'refund_completed':'refund_observed');
 };
}
