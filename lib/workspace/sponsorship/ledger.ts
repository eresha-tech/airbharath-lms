import 'server-only';
import {randomUUID} from 'node:crypto';
import {sql} from 'drizzle-orm';
import {creatorLedger,orders} from '@/lib/db/schema';
import type {db} from '@/lib/db';
import {requireSyntheticSponsorship} from './config';
import {commercialRows} from './service';
import {allocateSponsored,type AllocationEvidence} from './model';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function recordCommercialAllocation(tx:Tx,order:typeof orders.$inferSelect,scope:string){
 if(order.purchaseEvidence?.commercial?.arrangement!=='sponsored_20')return;
 if(await requireSyntheticSponsorship(tx)!==scope)throw new Error('commercial_payment_scope_mismatch');
 await tx.execute(sql`select id from users where id=${order.creatorId}::uuid for update`);
 const [check]=await commercialRows<{issue:string|null}>(tx,sql`select issue from course_payment_checks where order_id=${order.id}::uuid`);if(!check||check.issue)return;
 const [row]=await commercialRows<{facts:AllocationEvidence&{financialHash:string;feeKnown:boolean;approvedAdjustmentPaise:number}}>(tx,sql`select creator_commercial_financial_facts(${order.id}::uuid) facts`),facts=row.facts;if(!facts.feeKnown)return;
 const [previous]=await commercialRows<{revision:number;commission_paise:number;financial_hash:string}>(tx,sql`select revision,commission_paise,financial_hash from airbharath_commission_ledger where order_id=${order.id}::uuid order by revision desc limit 1`);if(previous?.financial_hash===facts.financialHash)return;
 const amounts=allocateSponsored(facts),delta=amounts.commissionPaise-(previous?.commission_paise??0),id=randomUUID();
 await tx.execute(sql`insert into airbharath_commission_ledger(id,order_id,creator_id,scope,revision,financial_hash,distributable_paise,creator_paise,commission_paise,delta_paise,evidence) values(${id}::uuid,${order.id}::uuid,${order.creatorId}::uuid,${scope},${(previous?.revision??0)+1},${facts.financialHash},${amounts.distributablePaise},${amounts.creatorPaise},${amounts.commissionPaise},${delta},${JSON.stringify({paymentId:order.razorpayPaymentId,commercial:order.purchaseEvidence.commercial,synthetic:true,recoveryAuthorized:false})}::jsonb)`);
 if(delta)await tx.insert(creatorLedger).values({creatorId:order.creatorId!,orderId:order.id,scope,sourceKey:'commercial:'+id,kind:'commercial_share',commercialAllocationId:id,commissionPaise:delta,netPaise:-delta,evidence:{paymentId:order.razorpayPaymentId,allocationId:id,synthetic:true}});
}
