import 'server-only';
import { currentEmailProof } from '../email/model';
import { noticeDigest } from './model';
import { and, eq, sql } from 'drizzle-orm';
import { workspaceRefundNotices as notices, workspaceRefundNoticeDeliveries as deliveries, workspaceRefundNoticeDeliveryAttempts as attempts, workspaceMembershipOrders as orders, users, workspaceRefundRequests as requests, workspaceRefundAttempts as refunds, workspaceRefundCompletions as completions, workspaceEmailNoticeBindings as emailBindings, workspaceVerifiedEmails as verifiedEmails } from '@/lib/db/schema';
import { randomUUID } from 'node:crypto';
import { NOTICE_MAX_ATTEMPTS, noticeRetryAt, type NoticeOutcome } from './model';
import type { NoticeStore, NoticeClaim, NoticeBinding, NoticeSummary } from './store';
export function createPostgresNoticeStore(db: typeof import('@/lib/db').db): NoticeStore {
  const databaseNow = async (tx: Pick<typeof db, 'execute'>) => new Date((await tx.execute(sql`select clock_timestamp() as time`))[0].time as string | Date);
  async function locked<T>(claim: NoticeClaim, work: (tx: Pick<typeof db, 'update' | 'execute'>, row: typeof deliveries.$inferSelect, now: Date) => Promise<T>, fallback: T) {
    return db.transaction(async tx => {
      const [row] = await tx.select().from(deliveries).where(eq(deliveries.id,claim.deliveryId)).for('update');
      if (!row || row.currentAttemptId !== claim.attemptId || !['claimed','submitted'].includes(row.state)) return fallback;
      return work(tx, row, await databaseNow(tx));
    });
  }
  async function seal(tx: Pick<typeof db, 'update' | 'execute'>, row: typeof deliveries.$inferSelect, now: Date, outcome: NoticeOutcome) {
    const retryable = outcome.state === 'retryable_failure' && row.attemptCount < NOTICE_MAX_ATTEMPTS;
    const state = outcome.state === 'retryable_failure' && !retryable ? 'blocked' : outcome.state;
    const reason = outcome.state === 'retryable_failure' && !retryable ? 'retry_exhausted' : outcome.reason;
    await tx.update(attempts).set({ state, reasonCode:reason, providerCode:outcome.providerCode ?? null, providerReference:outcome.providerReference ?? null, finishedAt:now }).where(eq(attempts.id,row.currentAttemptId!));
    await tx.update(deliveries).set({ state, reasonCode:reason, leaseUntil:null, nextAttemptAt:retryable?noticeRetryAt(now,row.attemptCount):null, acceptedAt:state==='accepted'?now:null, updatedAt:now, version:sql`${deliveries.version}+1` }).where(eq(deliveries.id,row.id));
  }
  return {
    async candidates(limit) {
      if (!Number.isInteger(limit)||limit<1||limit>3) throw new Error('notice_invalid_limit');
      const rows=await db.select({id:notices.id}).from(notices).leftJoin(deliveries,eq(deliveries.noticeId,notices.id)).where(sql`${deliveries.id} IS NULL OR (${deliveries.state} IN ('pending','retryable_failure') AND (${deliveries.nextAttemptAt} IS NULL OR ${deliveries.nextAttemptAt}<=clock_timestamp())) OR (${deliveries.state} IN ('claimed','submitted') AND ${deliveries.leaseUntil}<=clock_timestamp())`).orderBy(sql`coalesce(${deliveries.nextAttemptAt},${notices.createdAt})`,notices.id).limit(limit);
      return rows.map(row=>row.id);
    },
    async claim(noticeId) {
      return db.transaction(async tx=>{
        const started=await databaseNow(tx);
        await tx.insert(deliveries).values({noticeId,createdAt:started,updatedAt:started}).onConflictDoNothing();
        const [row]=await tx.select().from(deliveries).where(eq(deliveries.noticeId,noticeId)).for('update');
        if (!row||['accepted','uncertain','blocked'].includes(row.state))return null;
        const now=await databaseNow(tx);
        if (['claimed','submitted'].includes(row.state)) {
          if (row.leaseUntil && row.leaseUntil>now)return null;
          await seal(tx,row,now,row.state==='submitted'?{state:'uncertain',reason:'lease_expired_after_dispatch'}:{state:'retryable_failure',reason:'lease_expired_before_dispatch'});
          return null;
        }
        if ((row.nextAttemptAt&&row.nextAttemptAt>now)||row.attemptCount>=NOTICE_MAX_ATTEMPTS)return null;
        const attemptId=randomUUID(),attemptNumber=row.attemptCount+1;
        await tx.insert(attempts).values({id:attemptId,deliveryId:row.id,attemptNumber,createdAt:now});
        await tx.update(deliveries).set({state:'claimed',currentAttemptId:attemptId,attemptCount:attemptNumber,leaseUntil:new Date(now.getTime()+60_000),reasonCode:null,nextAttemptAt:null,updatedAt:now,version:sql`${deliveries.version}+1`}).where(eq(deliveries.id,row.id));
        return {deliveryId:row.id,attemptId,attemptNumber};
      });
    },
    async inspect(claim) {
      const [row]=await db.select({notice:{kind:notices.kind},user:{id:users.id,email:users.email},proof:verifiedEmails,request:{id:requests.id,decision:requests.decision,decidedBy:requests.decidedBy,decidedAt:requests.decidedAt,rejectionReason:requests.rejectionReason},refund:{providerRefundId:refunds.providerRefundId,state:refunds.state},completion:{id:completions.id}}).from(deliveries).innerJoin(notices,eq(notices.id,deliveries.noticeId)).innerJoin(orders,eq(orders.id,notices.membershipOrderId)).innerJoin(users,eq(users.id,orders.userId)).leftJoin(emailBindings,eq(emailBindings.noticeId,notices.id)).leftJoin(verifiedEmails,eq(verifiedEmails.id,emailBindings.verificationId)).leftJoin(requests,eq(requests.membershipOrderId,orders.id)).leftJoin(refunds,eq(refunds.membershipOrderId,orders.id)).leftJoin(completions,eq(completions.membershipOrderId,orders.id)).where(and(eq(deliveries.id,claim.deliveryId),eq(deliveries.currentAttemptId,claim.attemptId),eq(deliveries.state,'claimed'))).limit(1);
      if (!row)return null;
      return {facts:{userId:row.user.id,kind:row.notice.kind,request:!!row.request,rejected:row.request?.decision==='rejected'&&!!row.request.decidedBy&&!!row.request.decidedAt,rejectionReason:row.request?.rejectionReason??null,initiated:!!row.refund?.providerRefundId&&['processing','completed'].includes(row.refund.state),completed:!!row.completion},
        // The proof is frozen to this notice at creation; never choose another current recipient.
        recipient:{userId:row.user.id,email:row.proof?.email||row.user.email,verification:currentEmailProof(row.user.email,row.proof,row.user.id,new Date())?'verified':'unverified',verifiedAt:row.proof?.verifiedAt}};
    },
    dispatch(claim,binding:NoticeBinding) {
      return locked(claim,async(tx,row,now)=>{
        if(row.state!=='claimed'||!row.leaseUntil||row.leaseUntil<=now)return false;
        const recipient=await tx.execute(sql`SELECT p.email FROM workspace_refund_notice_deliveries d JOIN workspace_refund_notices n ON n.id=d.notice_id JOIN workspace_membership_orders o ON o.id=n.membership_order_id JOIN users u ON u.id=o.user_id LEFT JOIN workspace_email_notice_bindings b ON b.notice_id=n.id LEFT JOIN workspace_verified_emails p ON p.id=b.verification_id AND p.user_id=u.id AND p.active AND p.email=lower(btrim(u.email)) AND p.verified_at<=clock_timestamp() WHERE d.id=${row.id} FOR SHARE OF u`);
        if(typeof recipient[0]?.email!=='string'||noticeDigest([row.id,recipient[0].email])!==binding.recipientHash){await seal(tx,row,now,{state:'blocked',reason:'recipient_changed'});return false;}
        if(row.payloadHash&& (row.payloadHash!==binding.payloadHash||row.recipientHash!==binding.recipientHash||row.providerConfigHash!==binding.providerConfigHash||row.templateVersion!==binding.templateVersion)){await seal(tx,row,now,{state:'blocked',reason:'payload_changed'});return false;}
        await tx.update(attempts).set({...binding,dispatchAt:now,state:'submitted'}).where(eq(attempts.id,claim.attemptId));
        await tx.update(deliveries).set({...binding,state:'submitted',updatedAt:now,version:sql`${deliveries.version}+1`}).where(eq(deliveries.id,row.id));return true;
      },false);
    },
    finish(claim,outcome) {return locked(claim,async(tx,row,now)=>{
      if(row.state==='claimed'&& !['blocked','retryable_failure'].includes(outcome.state))return false;
      await seal(tx,row,now,outcome);return true;
    },false);},
    async summary():Promise<NoticeSummary> {
      const rows=await db.select({state:deliveries.state,n:sql<number>`count(*)::int`}).from(deliveries).groupBy(deliveries.state);
      const [pending]=await db.select({n:sql<number>`count(*)::int`,oldest:sql<Date|null>`min(${notices.createdAt})`}).from(notices).leftJoin(deliveries,eq(deliveries.noticeId,notices.id)).where(sql`${deliveries.id} IS NULL OR ${deliveries.state} IN ('pending','retryable_failure','claimed','submitted')`);
      const [last]=await db.select({at:sql<Date|null>`max(${deliveries.acceptedAt})`}).from(deliveries);
      const states=Object.fromEntries(rows.map(r=>[r.state,r.n]));
      const [missing]=await db.select({n:sql<number>`count(*)::int`}).from(notices).leftJoin(deliveries,eq(deliveries.noticeId,notices.id)).where(sql`${deliveries.id} IS NULL`);states.pending=(states.pending||0)+missing.n;
      const iso=(v:Date|null)=>v?new Date(v).toISOString():null;
      const blocked=await db.select({reason:deliveries.reasonCode,n:sql<number>`count(*)::int`}).from(deliveries).where(eq(deliveries.state,'blocked')).groupBy(deliveries.reasonCode);
      return {states,blockedReasons:Object.fromEntries(blocked.map(r=>[r.reason||'unknown',r.n])),lastAcceptedAt:iso(last.at),oldestPendingAt:iso(pending.oldest)};
    },
  };
}
