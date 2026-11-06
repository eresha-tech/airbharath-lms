import 'server-only';
import { and,eq,sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders,creatorLedger as ledger,coursePaymentChecks as checks } from '@/lib/db/schema';
import { CommerceError } from '@/lib/commerce/model';
import { paymentFact,proceeds,paise } from './model';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function recordCapture(tx:Tx,order:typeof orders.$inferSelect,raw:unknown,scope:string,observedAt=new Date()) {
 const p=paymentFact(raw);
 if(p.order_id!==order.razorpayOrderId||p.id!==order.razorpayPaymentId||p.amount!==Math.round(Number(order.amount)*100))throw new CommerceError(409,'Payment evidence mismatch.');
 const check=await tx.query.coursePaymentChecks.findFirst({where:eq(checks.orderId,order.id)});
 if(check&&check.scope!==scope)throw new CommerceError(409,'Payment account needs reconciliation.');
 if(!check)await tx.insert(checks).values({orderId:order.id,scope});
 // A slower, older provider read must not overwrite a newer observation.
 if(check?.lastCheckedAt&&check.lastCheckedAt>observedAt)return;
 let issue:string|null=null;
 if(order.creatorId) {
  const quote=order.purchaseEvidence;
  if(!quote||quote.creatorId!==order.creatorId)throw new CommerceError(409,'Creator sale evidence needs review.');
  const rows=await tx.select().from(ledger).where(eq(ledger.orderId,order.id));
  const base={creatorId:order.creatorId,orderId:order.id,scope,commissionPaise:0};
  if(!rows.some(r=>r.kind==='sale'))await tx.insert(ledger).values({...base,sourceKey:'sale',kind:'sale',grossPaise:p.amount,taxPaise:quote.taxPaise,netPaise:p.amount-quote.taxPaise,evidence:{paymentId:p.id,quote,provider:p}});
  const fee=rows.find(r=>r.kind==='fee');
  const fees=rows.filter(r=>['fee','fee_adjustment'].includes(r.kind)),feeTotal=fees.reduce((s,r)=>s+r.feePaise,0),feeTax=fees.reduce((s,r)=>s+r.feeTaxPaise,0);
  if(p.fee===null||p.tax===null)issue='fee_evidence_missing';
  else if(!fee)await tx.insert(ledger).values({...base,sourceKey:'fee',kind:'fee',feePaise:p.fee,feeTaxPaise:p.tax,netPaise:-p.fee,evidence:{paymentId:p.id,feeIncludesTax:true,provider:p}});
  else if(feeTotal!==p.fee||feeTax!==p.tax)await tx.insert(ledger).values({...base,sourceKey:`fee_adjustment:${rows.length}`,kind:'fee_adjustment',feePaise:p.fee-feeTotal,feeTaxPaise:p.tax-feeTax,netPaise:feeTotal-p.fee,evidence:{paymentId:p.id,feeIncludesTax:true,previousFeePaise:feeTotal,observedAt:observedAt.toISOString(),provider:p}});
  const refunded=-rows.filter(r=>r.kind==='refund').reduce((s,r)=>s+r.grossPaise,0);
  if(p.amount_refunded>refunded) {
   const previous=proceeds(p.amount,quote.taxPaise,refunded,0),current=proceeds(p.amount,quote.taxPaise,p.amount_refunded,0);
   await tx.insert(ledger).values({...base,sourceKey:`refund:${p.amount_refunded}`,kind:'refund',grossPaise:-(p.amount_refunded-refunded),taxPaise:-(current.refundTax-previous.refundTax),netPaise:current.net-previous.net,evidence:{paymentId:p.id,cumulativeRefundPaise:p.amount_refunded,taxAllocation:'proportional_original_quote_not_tax_credit',provider:p}});
  }
  if(p.amount_refunded&&rows.filter(r=>r.kind==='dispute').reduce((s,r)=>s+r.netPaise,0)<0&&!rows.some(r=>r.kind==='adjustment'&&r.evidence.refundPaise===p.amount_refunded&&r.evidence.disputePaise===-rows.filter(x=>x.kind==='dispute').reduce((s,x)=>s+x.netPaise,0)))issue='refund_dispute_overlap_review';
 }
 if(p.amount_refunded===p.amount&&p.amount>0)await tx.update(orders).set({status:'refunded'}).where(eq(orders.id,order.id));
 await tx.insert(checks).values({orderId:order.id,scope,paymentId:p.id,lastCheckedAt:new Date(),nextCheckAt:new Date(Date.now()+86400000),issue}).onConflictDoUpdate({target:checks.orderId,set:{paymentId:p.id,lastCheckedAt:new Date(),nextCheckAt:new Date(Date.now()+86400000),issue}});
}
export async function recordDispute(tx:Tx,order:typeof orders.$inferSelect,raw:unknown,scope:string) {
 const d=raw as {id:string;payment_id:string;amount:number;currency:string;status:string};
 if(!d||!/^disp_[A-Za-z0-9_]{6,100}$/.test(d.id)||d.payment_id!==order.razorpayPaymentId||d.currency!=='INR'||!['open','under_review','action_required','won','lost','closed'].includes(d.status))throw new CommerceError(409,'Dispute evidence needs review.');
 paise(d.amount,Math.round(Number(order.amount)*100));
 if(!order.creatorId)return;
 const rows=await tx.select().from(ledger).where(and(eq(ledger.orderId,order.id),eq(ledger.kind,'dispute')));
 const prior=rows.filter(r=>r.evidence.disputeId===d.id);
 // Closed is ambiguous: retain a reserve until an explicit won/lost decision.
 if(prior.some(r=>['won','lost'].includes(String(r.evidence.status))))return;
 const reserved=-prior.reduce((s,r)=>s+r.netPaise,0),target=d.status==='won'?0:d.amount;
 await tx.insert(ledger).values({creatorId:order.creatorId,orderId:order.id,scope,kind:'dispute',sourceKey:`dispute:${d.id}:${d.status}`,grossPaise:reserved-target,netPaise:reserved-target,evidence:{disputeId:d.id,paymentId:d.payment_id,status:d.status,amountPaise:d.amount,observedAt:new Date().toISOString()}}).onConflictDoNothing();
 const refunds=await tx.select().from(ledger).where(and(eq(ledger.orderId,order.id),eq(ledger.kind,'refund')));
 const refunded=-refunds.reduce((s,r)=>s+r.grossPaise,0);
 if(refunded&&target>0)await tx.update(checks).set({issue:'refund_dispute_overlap_review'}).where(eq(checks.orderId,order.id));
 else await tx.update(checks).set({issue:null}).where(and(eq(checks.orderId,order.id),sql`${checks.issue} in ('dispute_review','refund_dispute_overlap_review')`));
 // Payment refresh alone cannot remove a still-active dispute from the ledger.
}
export async function ledgerBalance(tx:Tx,creatorId:string,scope:string,before?:Date) {
 if(before) {
  const rows=await tx.execute(sql`select coalesce(sum(case when b.ordered_at<${before.toISOString()}::timestamptz then b.net else least(b.net,0) end),0) as net from (select o.created_at as ordered_at,sum(l.net_paise) as net from creator_ledger l join orders o on o.id=l.order_id where l.creator_id=${creatorId} and l.scope=${scope} group by o.id) b`);
  return Number(rows[0].net);
 }
 const [row]=await tx.select({net:sql<string>`coalesce(sum(${ledger.netPaise}),0)`}).from(ledger).where(and(eq(ledger.creatorId,creatorId),eq(ledger.scope,scope)));return Number(row.net);
}
