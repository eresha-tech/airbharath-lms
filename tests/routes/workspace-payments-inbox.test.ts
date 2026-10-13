import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { financialHarness, financeNow, testContext } from './workspace-payments-fixtures';
async function inbox(h: ReturnType<typeof financialHarness>, orderId: string, paymentId: string|null, type='payment.captured',eventId=randomUUID(),hash='a'.repeat(64)) { return h.store.receiveEvent(testContext,{eventId,type,hash,evidence:{providerOrderId:orderId,providerPaymentId:paymentId,receipt:null,eventCreatedAt:financeNow.toISOString()}},financeNow); }
it('duplicate event receipt keeps one immutable input; hash conflict becomes review', async () => { const h=financialHarness(),o=await h.ready(),p=h.captured(o),id=randomUUID();const a=await inbox(h,o.providerOrderId!,p.id,'payment.captured',id),b=await inbox(h,o.providerOrderId!,p.id,'payment.captured',id);expect(a.event.id).toBe(b.event.id);expect(h.state.events).toHaveLength(1);expect((await inbox(h,o.providerOrderId!,p.id,'payment.captured',id,'b'.repeat(64))).anomaly).toBe(true);expect(a.event.payloadHash).toBe('a'.repeat(64));expect(a.event.processingState).toBe('needs_review'); });
it('webhook and repeated callback converge on one capture/redemption',async()=>{const h=financialHarness(),o=await h.ready(),p=h.captured(o),e=await inbox(h,o.providerOrderId!,p.id);await h.service.processEvent(e.event.id);await h.service.processEvent(e.event.id);await h.service.reconcileOrder(o.userId,o.id);expect(h.state.payments).toHaveLength(1);expect(h.state.redemptions[0].status).toBe('redeemed');expect(e.event.processingState).toBe('processed');expect(e.event.processedAt).not.toBeNull();});
it('finalization rollback leaves the durable inbox retryable and no false processed state',async()=>{const h=financialHarness(),o=await h.ready(),p=h.captured(o),e=await inbox(h,o.providerOrderId!,p.id);h.fail('finishEvent');await h.service.processEvent(e.event.id);expect(h.state.orders[0].financialState).toBe('unpaid');expect(h.state.events[0].processingState).toBe('retry');expect(h.state.events[0].processedAt).toBeNull();h.now.value=new Date(financeNow.getTime()+60001);await h.service.processEvent(e.event.id);expect(h.state.orders[0].financialState).toBe('captured');expect(h.state.events[0].processingState).toBe('processed');});
it('unrelated events are ignored without touching payment tables',async()=>{const h=financialHarness(),e=await inbox(h,'order_COURSE15A',null,'subscription.charged');await h.service.processEvent(e.event.id);expect(e.event.processingState).toBe('ignored');expect(h.state.orders).toHaveLength(0);expect(h.provider.fetchOrder).not.toHaveBeenCalled();});
it('unmatched candidate Workspace evidence stays retryable; no blind provider creation',async()=>{const h=financialHarness(),external={...testContext,id:'order_UNKNOWN15A',receipt:'wso'+'a'.repeat(32),amountPaise:589882,currency:'INR',status:'created' as const,createdAt:financeNow};h.externalOrders.push(external);const e=await inbox(h,external.id,null);await h.service.processEvent(e.event.id);expect(e.event.processingState).toBe('retry');expect(h.provider.createOrder).not.toHaveBeenCalled();});
it('a course provider order is ignored and cannot mutate Workspace or LMS state',async()=>{const h=financialHarness();h.externalOrders.push({...testContext,id:'order_COURSE15A',receipt:'course-receipt',amountPaise:10000,currency:'INR',status:'created',createdAt:financeNow});const e=await inbox(h,'order_COURSE15A',null);await h.service.processEvent(e.event.id);expect(e.event.processingState).toBe('ignored');expect(h.state.payments).toHaveLength(0);});
it('one provider payment cannot fund another owner/order',async()=>{const h=financialHarness(),a=await h.ready(false),b=await h.ready(false),p=h.captured(a);await h.service.reconcileOrder(a.userId,a.id);const e=await inbox(h,b.providerOrderId!,p.id);await h.service.processEvent(e.event.id);expect(b.financialState).toBe('unpaid');expect(b.reviewReason).toBe('provider_identity_mismatch');expect(h.state.payments.filter(x=>x.winner)).toHaveLength(1);});
it('a consumed coupon cannot create another overlapping purchase',async()=>{const h=financialHarness(),o=await h.ready();h.captured(o);await h.service.reconcileOrder(o.userId,o.id);await expect(h.input(o.userId)).rejects.toMatchObject({code:'coupon_used'}); const i=await h.input(o.userId,false);await expect(h.service.acceptOrder(o.userId,i.request)).rejects.toMatchObject({code:'conflict'});expect(h.state.redemptions).toHaveLength(1);});
it('another coupon is independent on a safely released unpaid purchase',async()=>{const h=financialHarness(),i=await h.input(),o=await h.service.acceptOrder(i.userId,i.request);await h.service.closeUnsubmittedOrder(i.userId,o.id);h.offer.value={...h.offer.value,id:randomUUID(),code:'SYNTHETICOTHER15A'};const next=await h.input(i.userId);await h.service.acceptOrder(i.userId,next.request);expect(h.state.redemptions.map(r=>r.status)).toEqual(['released','reserved']);expect(h.state.redemptions[0].couponId).not.toBe(h.state.redemptions[1].couponId);});
it('foreign-account inbox work remains pending and cannot enter the configured worker', async () => {
  const h = financialHarness();
  const received = await h.store.receiveEvent({ ...testContext, accountId: 'acc_FOREIGN15A' }, { eventId: randomUUID(), type: 'subscription.charged', hash: 'a'.repeat(64), evidence: { providerOrderId: null, providerPaymentId: null, receipt: null, eventCreatedAt: null } }, financeNow);
  await h.service.processEvent(received.event.id);
  const batch = await h.service.runReconciliationBatch(1);
  expect(received.event.processingState).toBe('pending');
  expect(received.event.attemptCount).toBe(0);
  expect(batch.eventsVisited).toBe(0);
  expect(h.provider.fetchOrder).not.toHaveBeenCalled();
});
it('foreign-account historical orders cannot occupy the configured account recovery batch', async () => {
  const h = financialHarness(), foreign = await h.ready(false);
  foreign.providerAccountId = 'acc_FOREIGN15A';
  const own = await h.ready(false);
  const result = await h.service.runReconciliationBatch(1);
  expect(result.ordersVisited).toBe(1);
  expect(h.provider.fetchOrderPayments).toHaveBeenCalledTimes(1);
  expect(h.provider.fetchOrderPayments).toHaveBeenCalledWith(own.providerOrderId);
});
