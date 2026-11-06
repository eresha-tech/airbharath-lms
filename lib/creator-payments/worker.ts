import 'server-only';
import { and,eq,lte,sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coursePaymentInbox as inbox,coursePaymentChecks as checks,courseFinanceRuns as runs,orders,users } from '@/lib/db/schema';
import { razorpay } from '@/lib/razorpay';
import { commerceService } from '@/lib/commerce/service';
import { requireCourseScope } from './config';
import { paymentFact } from './model';
import { recordDispute } from './ledger';
export async function runCourseFinanceWorker(database=db,provider=razorpay,scope=requireCourseScope()) {
 const result={processed:0,failed:0,checked:0,disputes:0};
 async function settle(paymentId:string,disputeId?:string|null) {
  const payment=paymentFact(await provider.payments.fetch(paymentId));
  const order=await database.query.orders.findFirst({where:eq(orders.razorpayOrderId,payment.order_id)});
  if(!order)return; // Membership and unrelated merchant orders are not course sales.
  if(!order.userId)throw Error('missing_order_owner');
  const check=await database.query.coursePaymentChecks.findFirst({where:eq(checks.orderId,order.id)});
  if(check?.scope==='unbound') {
   // Authenticated provider fetch + frozen order/amount bind historical orders.
   if(payment.amount!==Math.round(Number(order.amount)*100)||order.razorpayPaymentId&&order.razorpayPaymentId!==payment.id)throw Error('legacy_mismatch');
   await database.update(checks).set({scope}).where(and(eq(checks.orderId,order.id),eq(checks.scope,'unbound')));
  }else if(check&&check.scope!==scope)throw Error('provider_scope_mismatch');
  await commerceService(database,provider,scope).verify(order.userId,order.razorpayOrderId,payment.id,true);
  if(disputeId) {
   const dispute=await provider.disputes.fetch(disputeId);
   await database.transaction(async tx=>{
    if(order.creatorId)await tx.select().from(users).where(eq(users.id,order.creatorId)).for('update');
    const [locked]=await tx.select().from(orders).where(eq(orders.id,order.id)).for('update');
    await recordDispute(tx,locked,dispute,scope);
   });
  }
 }
 const events=await database.transaction(async tx=>{
  const rows=await tx.select().from(inbox).where(and(eq(inbox.scope,scope),eq(inbox.state,'pending'),lte(inbox.nextAttemptAt,new Date()))).orderBy(inbox.nextAttemptAt).limit(20).for('update',{skipLocked:true});
  for(const row of rows)await tx.update(inbox).set({attempts:row.attempts+1,nextAttemptAt:new Date(Date.now()+300000)}).where(eq(inbox.id,row.id));return rows;
 });
 for(const event of events)try{await settle(event.paymentId,event.disputeId);await database.update(inbox).set({state:'done',error:null}).where(eq(inbox.id,event.id));result.processed++;}catch{result.failed++;await database.update(inbox).set({error:'provider_or_evidence_review',nextAttemptAt:new Date(Date.now()+Math.min(86400000,30000*2**Math.min(event.attempts,12)))}).where(eq(inbox.id,event.id));}
 const due=await database.transaction(async tx=>{
  const rows=await tx.select().from(checks).where(and(sql`${checks.scope} in (${scope},'unbound')`,lte(checks.nextCheckAt,new Date()))).orderBy(checks.nextCheckAt,checks.orderId).limit(25).for('update',{skipLocked:true});
  for(const row of rows)await tx.update(checks).set({nextCheckAt:new Date(Date.now()+300000)}).where(eq(checks.orderId,row.orderId));return rows;
 });
 for(const row of due)try{
  const order=await database.query.orders.findFirst({where:eq(orders.id,row.orderId)});if(!order)continue;
  const payments=await provider.orders.fetchPayments(order.razorpayOrderId);
  const captured=payments.items.filter(p=>['captured','refunded'].includes(p.status));
  if(captured.length>1)throw Error('multiple_captures_need_review');
  if(captured.length)await settle(captured[0].id);
  else await database.update(checks).set({lastCheckedAt:new Date(),issue:null,nextCheckAt:new Date(Date.now()+3600000)}).where(eq(checks.orderId,row.orderId));
  result.checked++;
 }catch{result.failed++;await database.update(checks).set({issue:'provider_or_evidence_review'}).where(eq(checks.orderId,row.orderId));}
 // Paginated full sweeps also recover disputes whose webhook was never delivered.
 await database.insert(runs).values({scope}).onConflictDoNothing();
 const run=await database.query.courseFinanceRuns.findFirst({where:eq(runs.scope,scope)});
 try{
  const page=await provider.disputes.all({count:100,skip:run!.disputeSkip});
  for(const d of page.items){await settle(d.payment_id,d.id);result.disputes++;}
  await database.update(runs).set({disputeSkip:page.items.length===100?run!.disputeSkip+100:0,...(page.items.length<100?{disputesCheckedAt:new Date()}: {})}).where(eq(runs.scope,scope));
 }catch{result.failed++;}
 return result;
}
