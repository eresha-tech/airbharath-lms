import 'server-only';
import { randomUUID } from 'node:crypto';
import { and,eq,lte,sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coursePaymentInbox as inbox,coursePaymentChecks as checks,courseFinanceRuns as runs,orders,users } from '@/lib/db/schema';
import { commerceService } from '@/lib/commerce/service';
import { requireCourseScope } from './config';
import { paymentFact } from './model';
import { recordDispute } from './ledger';
import { courseRecoveryProvider, type RecoveryProvider } from './worker-provider';
import { abortable } from '@/lib/async-budget';
import {createFinancialWorkerDatabase} from '@/lib/workspace/payments/worker-database';
import { reconcileAcademyRefunds } from '@/lib/academy-entitlements/refunds';
import { isProspectiveAcademyOrder } from '@/lib/academy-entitlements/repository';

type WorkerOptions={budgetMs?:number;batch?:number;signal?:AbortSignal};
export async function runCourseFinanceWorker(database=db,injected?:RecoveryProvider,scope=requireCourseScope(),options:WorkerOptions={}) {
 if(database!==db||injected)return recover(database,injected,scope,options);
 const signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(options.budgetMs??35000)]):AbortSignal.timeout(options.budgetMs??35000);
 const target=createFinancialWorkerDatabase(process.env,'course_financial_worker'),cancel=()=>{void target.close().catch(()=>undefined);};signal.addEventListener('abort',cancel,{once:true});
 try{return await recover(target.db,undefined,scope,{...options,signal});}finally{signal.removeEventListener('abort',cancel);await target.close();}
}
async function recover(database:typeof db,injected:RecoveryProvider|undefined,scope:string,options:WorkerOptions) {
 const budget=options.budgetMs??35000,batch=options.batch??3;
 if(!Number.isInteger(budget)||budget<1||budget>35000||!Number.isInteger(batch)||batch<1||batch>3)throw Error('course_worker_bounds');
 const started=Date.now(),signal=options.signal?AbortSignal.any([options.signal,AbortSignal.timeout(budget)]):AbortSignal.timeout(budget);
 const provider=injected??courseRecoveryProvider(signal),token=randomUUID();
 const result={processed:0,failed:0,checked:0,disputes:0,deferred:0,backlog:0,deadlineReached:false,elapsedMs:0,blocked:0};
 const ready=()=>!signal.aborted&&Date.now()-started<budget;
 // A scope lease serializes dispute cursors and bounds total recovery load. Row
 // leases and existing capture/ledger uniqueness remain independent crash guards.
 await database.insert(runs).values({scope}).onConflictDoNothing();
 const claimed=await database.update(runs).set({leaseToken:token,leaseUntil:new Date(Date.now()+90000)}).where(and(eq(runs.scope,scope),sql`(${runs.leaseUntil} is null or ${runs.leaseUntil}<now())`)).returning();
 if(!claimed.length)return {...result,deferred:1};
 // Every injected or real GET is bounded. The shipping adapter also propagates
 // cancellation to HTTP and body reads; a late response cannot trigger settlement.
 const call=<T>(work:()=>Promise<T>)=>{signal.throwIfAborted();return abortable(work(),AbortSignal.any([signal,AbortSignal.timeout(6000)]));};
 const bounded:RecoveryProvider={orders:{create:async()=>{throw Error('recovery_is_read_only');},fetchPayments:id=>call(()=>provider.orders.fetchPayments(id))},payments:{fetch:id=>call(()=>provider.payments.fetch(id)),...(provider.payments.fetchRefunds?{fetchRefunds:(id:string,q:{count:number;skip:number})=>call(()=>provider.payments.fetchRefunds!(id,q))}:{})},disputes:{fetch:id=>call(()=>provider.disputes.fetch(id)),all:q=>call(()=>provider.disputes.all(q))}};
 async function settle(paymentId:string,disputeId?:string|null) {
  const payment=paymentFact(await bounded.payments.fetch(paymentId));signal.throwIfAborted();
  const order=await database.query.orders.findFirst({where:eq(orders.razorpayOrderId,payment.order_id)});
  if(!order)return; // Membership and unrelated merchant orders are not course sales.
  if(!order.userId)throw Error('missing_order_owner');
  const check=await database.query.coursePaymentChecks.findFirst({where:eq(checks.orderId,order.id)});
  if(check?.scope==='unbound') {
   if(payment.amount!==Math.round(Number(order.amount)*100)||order.razorpayPaymentId&&order.razorpayPaymentId!==payment.id)throw Error('legacy_mismatch');
   await database.update(checks).set({scope}).where(and(eq(checks.orderId,order.id),eq(checks.scope,'unbound')));
  }else if(check&&check.scope!==scope)throw Error('provider_scope_mismatch');
  signal.throwIfAborted();await commerceService(database,bounded,scope).verify(order.userId,order.razorpayOrderId,payment.id,true);
  if(isProspectiveAcademyOrder(order)){signal.throwIfAborted();await reconcileAcademyRefunds(database,payment,scope,bounded.payments.fetchRefunds);}
  if(disputeId) {
   const observedAt=new Date(),dispute=await bounded.disputes.fetch(disputeId);signal.throwIfAborted();
   if(dispute.id!==disputeId)throw Error('dispute_identity_mismatch');
   await database.transaction(async tx=>{
    if(order.creatorId)await tx.select().from(users).where(eq(users.id,order.creatorId)).for('update');
    const [locked]=await tx.select().from(orders).where(eq(orders.id,order.id)).for('update');
    await recordDispute(tx,locked,dispute,scope,observedAt);
   });
  }
 }
 async function drainInbox() {
  for(let n=0;n<batch&&ready();n++) {
   const event=await database.transaction(async tx=>{
    const [row]=await tx.select().from(inbox).where(and(eq(inbox.scope,scope),eq(inbox.state,'pending'),lte(inbox.nextAttemptAt,new Date()))).orderBy(inbox.nextAttemptAt,inbox.id).limit(1).for('update',{skipLocked:true});
    if(row)await tx.update(inbox).set({attempts:row.attempts+1,nextAttemptAt:new Date(Date.now()+90000)}).where(eq(inbox.id,row.id));return row;
   });
   if(!event)break;
   try{signal.throwIfAborted();await settle(event.paymentId,event.disputeId);await database.update(inbox).set({state:'done',error:null}).where(eq(inbox.id,event.id));result.processed++;}
   catch{result.failed++;await database.update(inbox).set({error:signal.aborted?'invocation_deadline_retry':'provider_or_evidence_review',nextAttemptAt:new Date(Date.now()+Math.min(86400000,30000*2**Math.min(event.attempts,12)))}).where(eq(inbox.id,event.id));}
  }
 }
 async function drainChecks() {
  for(let n=0;n<batch&&ready();n++) {
   const row=await database.transaction(async tx=>{
    const [row]=await tx.select().from(checks).where(and(sql`${checks.scope} in (${scope},'unbound')`,lte(checks.nextCheckAt,new Date()))).orderBy(checks.nextCheckAt,checks.orderId).limit(1).for('update',{skipLocked:true});
    if(row)await tx.update(checks).set({nextCheckAt:new Date(Date.now()+90000)}).where(eq(checks.orderId,row.orderId));return row;
   });
   if(!row)break;
   try {
    signal.throwIfAborted();const order=await database.query.orders.findFirst({where:eq(orders.id,row.orderId)});if(!order)continue;
    const payments=await bounded.orders.fetchPayments(order.razorpayOrderId);
    if(!Array.isArray(payments.items)||payments.items.length>100)throw Error('course_payment_list');
    const captured=payments.items.filter(p=>['captured','refunded'].includes(p.status));
    if(captured.length>1)throw Error('multiple_captures_need_review');
    if(captured.length)await settle(captured[0].id);
    else await database.update(checks).set({lastCheckedAt:new Date(),issue:null,nextCheckAt:new Date(Date.now()+3600000)}).where(eq(checks.orderId,row.orderId));
    result.checked++;
   }catch{result.failed++;await database.update(checks).set({issue:signal.aborted?'invocation_deadline_retry':'provider_or_evidence_review',nextCheckAt:new Date(Date.now()+60000)}).where(eq(checks.orderId,row.orderId));}
  }
 }
 async function drainDisputes() {
  if(!injected&&process.env.COURSE_DISPUTE_POLLING_ENABLED!=='true'){await database.update(runs).set({lastError:null}).where(and(eq(runs.scope,scope),eq(runs.leaseToken,token),eq(runs.lastError,'provider_or_dispute_evidence_review')));return;}
  const run=await database.query.courseFinanceRuns.findFirst({where:eq(runs.scope,scope)});
  if(ready()&&run!.disputeNextAt<=new Date())try {
   const count=3,page=await bounded.disputes.all({count,skip:run!.disputeSkip});
   if(!Array.isArray(page.items)||page.items.length>count)throw Error('dispute_page_unbounded');
   let finished=0;
   for(const d of page.items){if(!ready())break;await settle(d.payment_id,d.id);finished++;result.disputes++;await database.update(runs).set({disputeSkip:run!.disputeSkip+finished}).where(and(eq(runs.scope,scope),eq(runs.leaseToken,token)));}
   if(finished===page.items.length)await database.update(runs).set({lastError:null,disputeSkip:page.items.length===count?run!.disputeSkip+finished:0,...(page.items.length<count?{disputesCheckedAt:new Date()}: {})}).where(and(eq(runs.scope,scope),eq(runs.leaseToken,token)));
   else result.deferred++;
  }catch{result.failed++;await database.update(runs).set({disputeNextAt:new Date(Date.now()+60000),lastError:signal.aborted?'invocation_deadline_retry':'provider_or_dispute_evidence_review'}).where(and(eq(runs.scope,scope),eq(runs.leaseToken,token)));}
 }
 try {
  const drains=[drainInbox,drainChecks,drainDisputes];
  for(let i=0;i<3&&ready();i++)await drains[(claimed[0].phase+i)%3]();
  const [state]=await database.select({error:runs.lastError}).from(runs).where(eq(runs.scope,scope));result.blocked=state?.error?1:0;
  const [backlog]=await database.execute(sql`select (select count(*) from course_payment_inbox where scope=${scope} and state='pending' and next_attempt_at<=now())::int+(select count(*) from course_payment_checks where scope in (${scope},'unbound') and next_check_at<=now())::int due`);
  result.backlog=Number(backlog.due);result.deadlineReached=!ready();result.deferred+=result.backlog;result.elapsedMs=Date.now()-started;
  return result;
 }finally{await database.update(runs).set({leaseToken:null,leaseUntil:null,phase:(claimed[0].phase+1)%3}).where(and(eq(runs.scope,scope),eq(runs.leaseToken,token)));}
}
