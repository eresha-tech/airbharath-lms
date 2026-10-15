import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { financialConfiguration, workspaceFinancialReadiness } from '@/lib/workspace/payments/configuration';
import { createRazorpayAdapter } from '@/lib/workspace/payments/provider';
import { drainFinancialWork } from '@/lib/workspace/payments/worker';
import { financialHarness, financeNow, testContext } from './workspace-payments-fixtures';
const environment = () => ({ NODE_ENV: 'development', DATABASE_ENV: 'development', WORKSPACE_RAZORPAY_MODE: 'test', WORKSPACE_RAZORPAY_KEY_ID: 'rzp_test_SYNTHETIC001', WORKSPACE_RAZORPAY_KEY_SECRET: 'synthetic-api-secret-not-real', WORKSPACE_RAZORPAY_WEBHOOK_SECRET: 'synthetic-webhook-secret-not-real', WORKSPACE_RAZORPAY_ACCOUNT_ID: 'acc_SYNTHETIC001', WORKSPACE_RAZORPAY_TEST_AUTHORIZED: 'true', WORKSPACE_PAYMENT_ENABLED: 'true', WORKSPACE_RAZORPAY_WEBHOOK_ENABLED: 'true', WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED: 'true', WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED: 'false', WORKSPACE_REFUND_ENABLED: 'false', WORKSPACE_NOTICE_DELIVERY_ENABLED: 'false' });
it('keeps payment capabilities available with refund mutation/reconciliation and mail off', () => {
 const env=environment(); expect(workspaceFinancialReadiness(env)).toMatchObject({testModeSafe:true,checkoutReady:true,webhookReady:true,reconciliationReady:true,refundMutationReady:false,refundReconciliationReady:false,noticeDeliveryAuthorized:false});
 for(const cap of ['checkout','webhook','reconciliation'] as const)expect(financialConfiguration(cap,env)).not.toBeNull();
 for(const cap of ['refund','refund_reconciliation'] as const)expect(financialConfiguration(cap,env)).toBeNull();
 expect(financialConfiguration('refund_reconciliation',{...env,WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED:'typo'})).toBeNull();
 expect(workspaceFinancialReadiness({...env,NODE_ENV:'production'})).toMatchObject({checkoutReady:false,reconciliationReady:false,refundReconciliationReady:false});
});
it('refuses refund GET/POST before HTTP while allowing payment-only provider reads',async()=>{
 const env=environment(),http=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({items:[]}))),provider=createRazorpayAdapter(env,http);
 await expect(provider.fetchRefunds('pay_SYNTHETIC001')).rejects.toMatchObject({code:'disabled'});
 await expect(provider.createRefund({paymentId:'pay_SYNTHETIC001',amountPaise:589900,attemptId:randomUUID(),requestId:randomUUID()})).rejects.toMatchObject({code:'disabled'});expect(http).not.toHaveBeenCalled();
 expect(await provider.fetchOrderPayments('order_SYNTHETIC001')).toEqual([]);expect(http).toHaveBeenCalledTimes(1);
 env.WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED='false';env.WORKSPACE_PAYMENT_ENABLED='false';await expect(provider.fetchOrderPayments('order_SYNTHETIC001')).rejects.toMatchObject({code:'disabled'});expect(http).toHaveBeenCalledTimes(1);
});
it('leaves refund events unclaimed without starving a subsequent payment event',async()=>{
 const h=financialHarness(),order=await h.ready(false),payment=h.captured(order,{capturedAt:null,captureTimeSource:null});
 const evidence={providerOrderId:order.providerOrderId,providerPaymentId:payment.id,receipt:null,eventCreatedAt:financeNow.toISOString()};
 const refund=await h.store.receiveEvent(testContext,{eventId:randomUUID(),type:'refund.processed',hash:'a'.repeat(64),evidence},financeNow);
 const captured=await h.store.receiveEvent(testContext,{eventId:randomUUID(),type:'payment.captured',hash:'b'.repeat(64),evidence},financeNow);
 await h.service.runReconciliationBatch(1);expect(refund.event.processingState).toBe('pending');expect(refund.event.attemptCount).toBe(0);expect(captured.event.processingState).toBe('processed');expect(h.state.orders[0].paidAt).toEqual(financeNow);
});
it('drains payment and activation without scheduling a disabled refund task',async()=>{
 const payments=vi.fn(async()=>undefined),activation=vi.fn(async()=>undefined);
 expect(await drainFinancialWork({payments,activation},new AbortController().signal,1)).toEqual({payments:'visited',refunds:'not_started',activation:'visited'});expect(payments).toHaveBeenCalledOnce();expect(activation).toHaveBeenCalledOnce();
});
