import 'server-only';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceMembershipOrders as orders, workspacePaymentAttempts as payments, workspaceRefundRequests as requests, workspaceRefundAttempts as attempts, workspaceRefundCompletions as completions, workspaceRefundNotices as notices, workspaceRefundObservations as observations, workspaceMemberships as memberships } from '@/lib/db/schema';
import { RefundError } from './model';
import type { RefundStore, RefundTransaction } from './store';
export const postgresRefundStore: RefundStore = {
 externalPending: (context, limit) => db.select({ membershipOrderId: orders.id }).from(orders).where(and(
  eq(orders.providerAccountId, context.accountId), eq(orders.providerMode, context.mode), eq(orders.financialState, 'captured'),
  sql`EXISTS (SELECT 1 FROM ${observations} WHERE ${observations.membershipOrderId} = ${orders.id})`,
  sql`NOT EXISTS (SELECT 1 FROM ${attempts} WHERE ${attempts.membershipOrderId} = ${orders.id})`,
  sql`NOT EXISTS (SELECT 1 FROM ${completions} WHERE ${completions.membershipOrderId} = ${orders.id})`
 )).orderBy(sql`${orders.providerRecoveryCheckedAt} ASC NULLS FIRST`, orders.createdAt).limit(limit),
 async markExternalChecked(orderId) { await this.transaction(orderId, null, async tx => { await tx.markScan?.(); }); },
 async transaction(orderId, actorId, work) {
  // Lookup only routes the locks; ownership is re-read after locks, not trusted from this projection.
  const candidate = await db.query.workspaceMembershipOrders.findFirst({where:eq(orders.id,orderId),columns:{userId:true}});
  if (!candidate) throw new RefundError('not_found');
  for (let retry=0;;retry++) {
   try { return await db.transaction(async tx=>{
    const actors = await tx.select({id:users.id,role:users.role}).from(users).where(inArray(users.id,Array.from(new Set([candidate.userId,...(actorId?[actorId]:[])])).sort())).orderBy(asc(users.id)).for('update');
    const [order] = await tx.select().from(orders).where(eq(orders.id,orderId)).for('update');
    if (!order || order.userId!==candidate.userId) throw new RefundError('not_found');
    const [request] = await tx.select().from(requests).where(eq(requests.membershipOrderId,orderId)).for('update');
    const [attempt] = await tx.select().from(attempts).where(eq(attempts.membershipOrderId,orderId)).for('update');
    const [completion] = await tx.select().from(completions).where(eq(completions.membershipOrderId,orderId));
    const [payment] = await tx.select().from(payments).where(and(eq(payments.membershipOrderId,orderId),eq(payments.winner,true))).for('share');
    const state: RefundTransaction = {
     async markScan(){ await tx.update(orders).set({providerRecoveryCheckedAt:await state.now(),version:sql`${orders.version} + 1`}).where(eq(orders.id,orderId)); },
     order,request:request||null,attempt:attempt||null,completion:completion||null,payment:payment||null,actor:actors.find(a=>a.id===actorId)||null,
     async now(){ const result = await tx.execute(sql`SELECT clock_timestamp() AS time`); return new Date(result[0].time as string | Date); },
     requestByKey:(userId,key)=>tx.query.workspaceRefundRequests.findFirst({where:and(eq(requests.userId,userId),eq(requests.requestKey,key))}),
     async createRequest(input){state.request=(await tx.insert(requests).values(input).returning())[0];return state.request;},
     async patchRequest(input){if(!state.request)throw new RefundError('not_found');state.request=(await tx.update(requests).set(input).where(eq(requests.id,state.request.id)).returning())[0];return state.request;},
     async createAttempt(input){state.attempt=(await tx.insert(attempts).values(input).returning())[0];return state.attempt;},
     async patchAttempt(input){if(!state.attempt)throw new RefundError('not_found');state.attempt=(await tx.update(attempts).set(input).where(eq(attempts.id,state.attempt.id)).returning())[0];return state.attempt;},
     async complete(input){await tx.insert(completions).values(input).onConflictDoNothing();state.completion=(await tx.select().from(completions).where(eq(completions.membershipOrderId,orderId)))[0];if(!state.completion)throw new RefundError('unavailable');return state.completion;},
     async observe(evidenceHash,outcome){await tx.insert(observations).values({membershipOrderId:orderId,evidenceHash,outcome}).onConflictDoNothing();},
     async notice(kind){await tx.insert(notices).values({membershipOrderId:orderId,kind}).onConflictDoNothing();},
    };return work(state);
   }); } catch(error) {
    const code=(error as {code?:string;cause?:{code?:string}})?.code||(error as {cause?:{code?:string}})?.cause?.code;
    if(['40P01','40001'].includes(code||'')&&retry<2)continue;
    if(code==='23505')throw new RefundError('conflict');throw error;
   }
  }
 },
 async read(orderId,actorId,admin=false){
  if(actorId) return this.transaction(orderId,actorId,async tx=>{if(admin ? tx.actor?.role!=='admin' : tx.order.userId!==actorId||!tx.actor)throw new RefundError(admin?'forbidden':'not_found');return {order:tx.order,request:tx.request,attempt:tx.attempt,completion:tx.completion};});
  const order=await db.query.workspaceMembershipOrders.findFirst({where:eq(orders.id,orderId)});if(!order)return null;
  const [request,attempt,completion]=await Promise.all([db.query.workspaceRefundRequests.findFirst({where:eq(requests.membershipOrderId,orderId)}),db.query.workspaceRefundAttempts.findFirst({where:eq(attempts.membershipOrderId,orderId)}),db.query.workspaceRefundCompletions.findFirst({where:eq(completions.membershipOrderId,orderId)})]);
  return {order,request:request||null,attempt:attempt||null,completion:completion||null};
 },
 pending:(context,limit,includePrepared=true)=>db.select().from(attempts).where(and(eq(attempts.providerAccountId,context.accountId),eq(attempts.providerMode,context.mode),inArray(attempts.state,includePrepared?['prepared','processing','uncertain']:['processing','uncertain']))).orderBy(sql`${attempts.lastCheckedAt} ASC NULLS FIRST`,attempts.createdAt).limit(Math.min(25,Math.max(1,limit))),
};
export async function listCreatorRefundOrders(userId:string){
 return db.select({order:orders,request:requests,attempt:attempts,completion:completions}).from(orders).leftJoin(requests,eq(requests.membershipOrderId,orders.id)).leftJoin(attempts,eq(attempts.membershipOrderId,orders.id)).leftJoin(completions,eq(completions.membershipOrderId,orders.id)).where(eq(orders.userId,userId)).orderBy(desc(orders.createdAt)).limit(25);
}
export async function listAdminRefunds(actorId:string){
 return db.transaction(async tx=>{
  const [actor]=await tx.select({role:users.role}).from(users).where(eq(users.id,actorId)).for('share');if(actor?.role!=='admin')throw new RefundError('forbidden');
  return tx.select({request:requests,order:orders,attempt:attempts,completion:completions,membership:memberships,name:users.fullName,email:users.email,phone:users.phone}).from(requests).innerJoin(orders,eq(orders.id,requests.membershipOrderId)).innerJoin(users,eq(users.id,requests.userId)).leftJoin(attempts,eq(attempts.membershipOrderId,orders.id)).leftJoin(completions,eq(completions.membershipOrderId,orders.id)).leftJoin(memberships,eq(memberships.membershipOrderId,orders.id)).orderBy(sql`CASE WHEN ${requests.decision} = 'requested' THEN 0 ELSE 1 END`,desc(requests.requestedAt)).limit(100);
 });
}

export async function listExternalRefundReviews(actorId:string){
 return db.transaction(async tx=>{
  const [actor]=await tx.select({role:users.role}).from(users).where(eq(users.id,actorId)).for('share');if(actor?.role!=='admin')throw new RefundError('forbidden');
  return tx.selectDistinctOn([orders.id],{order:orders,name:users.fullName,outcome:observations.outcome,observedAt:observations.observedAt}).from(observations).innerJoin(orders,eq(orders.id,observations.membershipOrderId)).innerJoin(users,eq(users.id,orders.userId)).leftJoin(requests,eq(requests.membershipOrderId,orders.id)).leftJoin(completions,eq(completions.membershipOrderId,orders.id)).where(and(inArray(observations.outcome,['partial_review','mismatch_review']),isNull(requests.id),isNull(completions.id))).orderBy(orders.id,desc(observations.observedAt)).limit(100);
 });
}
