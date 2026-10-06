import { and, count, desc, eq, inArray, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCoupons as coupons, workspaceMembershipPlans as plans, workspaceEligibilitySettings as settings, workspacePolicyVersions as policies, workspaceMembershipOrders as orders, workspaceCouponRedemptions as redemptions, workspacePaymentAttempts as payments, workspacePaymentEvents as events } from '@/lib/db/schema';
import { readMembershipQuote, type MembershipQuoteContext } from '../membership/service';
import type { QuoteInput } from '../membership/model';
import { PaymentError, type EventState, type ProviderContext, type WebhookEvidence } from './model';

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Redemption = typeof redemptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InboxEvent = typeof events.$inferSelect;
export type OrderPatch = Partial<Pick<Order, 'providerSetupState' | 'providerCreateStartedAt' | 'providerRequestCount' | 'providerOrderId' | 'providerOrderCreatedAt' | 'providerRecoveryCheckedAt' | 'providerRecoveryReason' | 'providerCreateFailureHash' | 'financialState' | 'activationState' | 'winningPaymentId' | 'paidAt' | 'refundEligibleUntil' | 'reviewReason' | 'closedAt' | 'closeReason'>>;
export type RedemptionPatch = Partial<Pick<Redemption, 'status' | 'redeemedAt' | 'releasedAt' | 'releaseReason' | 'releaseEvidenceHash' | 'releaseSource'>>;
export type PaymentPatch = Partial<Pick<Payment, 'state' | 'winner' | 'lastObservedAt' | 'capturedAt' | 'captureTimeSource' | 'refundedPaise' | 'evidenceHash'>>;
export interface FinanceTransaction {
  findRequest(userId: string, key: string): Promise<Order | undefined>;
  findUnresolved(userId: string): Promise<Order | undefined>;
  readQuote(userId: string, input: QuoteInput, clock: () => Date): Promise<MembershipQuoteContext>;
  couponUse(couponId: string, userId: string): Promise<Redemption | undefined>;
  occupancy(couponId: string): Promise<number>;
  insertOrder(values: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  patchOrder(id: string, patch: OrderPatch): Promise<Order>;
  insertRedemption(values: typeof redemptions.$inferInsert): Promise<Redemption>;
  getRedemption(orderId: string): Promise<Redemption | undefined>;
  patchRedemption(id: string, patch: RedemptionPatch): Promise<Redemption>;
  getPayment(context: ProviderContext, id: string): Promise<Payment | undefined>;
  insertPayment(values: typeof payments.$inferInsert): Promise<Payment>;
  patchPayment(id: string, patch: PaymentPatch): Promise<Payment>;
  finishEvent(id: string, state: EventState, now: Date, orderId?: string, error?: string): Promise<void>;
}
export interface FinanceStore {
  transaction<T>(locks: { userId: string; couponId?: string | null; couponCode?: string; orderId?: string }, work: (tx: FinanceTransaction) => Promise<T>): Promise<T>;
  readOrder(id: string, userId?: string): Promise<Order | undefined>;
  matchOrder(context: ProviderContext, providerOrderId: string | null, receipt?: string | null): Promise<Order | undefined>;
  receiveEvent(context: ProviderContext, event: { eventId: string; type: string; hash: string; evidence: WebhookEvidence }, now: Date): Promise<{ event: InboxEvent; anomaly: boolean }>;
  claimEvent(id: string, now: Date): Promise<InboxEvent | undefined>;
  retryEvent(id: string, now: Date): Promise<void>;
  finishUnmatchedEvent(id: string, now: Date, state: 'ignored' | 'needs_review', reason?: string): Promise<void>;
  pendingEvents(now: Date, limit: number): Promise<InboxEvent[]>;
  recoveryOrders(limit: number): Promise<Order[]>;
}
const dbCode = (error: unknown) => (error as { code?: string; cause?: { code?: string } })?.code || (error as { cause?: { code?: string } })?.cause?.code;
export const postgresFinanceStore: FinanceStore = {
  async transaction(locks, work) {
    for (let retry = 0; ; retry++) {
      try { return await db.transaction(async tx => {
        // Shared order for all financial paths: persisted user → coupon → order → ledger/payment → event.
        const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, locks.userId)).for('update');
        if (!user) throw new PaymentError('authentication');
        if (locks.couponId || locks.couponCode) await tx.select({ id: coupons.id }).from(coupons).where(locks.couponId ? eq(coupons.id, locks.couponId) : and(eq(coupons.scope, 'workspace_membership'), eq(coupons.code, locks.couponCode!))).for('update');
        if (locks.orderId) await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.id, locks.orderId), eq(orders.userId, locks.userId))).for('update');
        const methods: FinanceTransaction = {
          findRequest: (userId, key) => tx.query.workspaceMembershipOrders.findFirst({ where: and(eq(orders.userId, userId), eq(orders.requestKey, key)) }),
          findUnresolved: userId => tx.query.workspaceMembershipOrders.findFirst({ where: and(eq(orders.userId, userId), or(sql`${orders.providerSetupState} <> 'closed'`, eq(orders.financialState, 'captured'))) }),
          async readQuote(userId, input, clock) {
            await tx.select({ id: plans.id }).from(plans).where(and(eq(plans.code, input.planCode), eq(plans.isCurrent, true))).for('share');
            await tx.select({ id: settings.id }).from(settings).where(eq(settings.isCurrent, true)).for('share');
            await tx.select({ id: policies.id }).from(policies).where(eq(policies.isCurrent, true)).for('share');
            return readMembershipQuote(tx, userId, input, clock);
          },
          couponUse: (couponId, userId) => tx.query.workspaceCouponRedemptions.findFirst({ where: and(eq(redemptions.couponId, couponId), eq(redemptions.userId, userId), inArray(redemptions.status, ['reserved', 'redeemed'])) }),
          async occupancy(couponId) { return (await tx.select({ n: count() }).from(redemptions).where(and(eq(redemptions.couponId, couponId), inArray(redemptions.status, ['reserved', 'redeemed']))))[0].n; },
          async insertOrder(values) { return (await tx.insert(orders).values(values).returning())[0]; },
          getOrder: id => tx.query.workspaceMembershipOrders.findFirst({ where: eq(orders.id, id) }),
          async patchOrder(id, patch) { return (await tx.update(orders).set({ ...patch, version: sql`${orders.version} + 1` }).where(eq(orders.id, id)).returning())[0]; },
          async insertRedemption(values) { return (await tx.insert(redemptions).values(values).returning())[0]; },
          async getRedemption(orderId) { return (await tx.select().from(redemptions).where(eq(redemptions.membershipOrderId, orderId)).for('update'))[0]; },
          async patchRedemption(id, patch) { return (await tx.update(redemptions).set(patch).where(eq(redemptions.id, id)).returning())[0]; },
          async getPayment(context, id) { return (await tx.select().from(payments).where(and(eq(payments.providerAccountId, context.accountId), eq(payments.providerMode, context.mode), eq(payments.providerPaymentId, id))).for('update'))[0]; },
          async insertPayment(values) { return (await tx.insert(payments).values(values).returning())[0]; },
          async patchPayment(id, patch) { return (await tx.update(payments).set(patch).where(eq(payments.id, id)).returning())[0]; },
          async finishEvent(id, state, now, orderId, error) {
            const [event] = await tx.select().from(events).where(eq(events.id, id)).for('update');
            if (!event) throw new PaymentError('unavailable');
            const anomaly = !!event.anomalyHash;
            await tx.update(events).set({ processingState: anomaly ? 'needs_review' : state, processedAt: ['processed', 'ignored', 'needs_review'].includes(state) || anomaly ? now : null, leaseUntil: null, membershipOrderId: orderId, lastErrorCode: anomaly ? 'event_hash_conflict' : error || null }).where(eq(events.id, id));
          },
        };
        return work(methods);
      }); } catch (error) {
        const code = dbCode(error);
        if (['40P01', '40001'].includes(code || '') && retry < 2) continue;
        if (code === '23505') throw new PaymentError('conflict');
        throw error;
      }
    }
  },
  readOrder: (id, userId) => db.query.workspaceMembershipOrders.findFirst({ where: and(eq(orders.id, id), userId ? eq(orders.userId, userId) : undefined) }),
  matchOrder: (context, providerOrderId, receipt) => db.query.workspaceMembershipOrders.findFirst({ where: and(eq(orders.providerAccountId, context.accountId), eq(orders.providerMode, context.mode), providerOrderId && receipt ? or(eq(orders.providerOrderId, providerOrderId), eq(orders.providerReceipt, receipt)) : providerOrderId ? eq(orders.providerOrderId, providerOrderId) : receipt ? eq(orders.providerReceipt, receipt) : sql`false`) }),
  async receiveEvent(context, incoming, now) {
    return db.transaction(async tx => {
      await tx.insert(events).values({ providerAccountId: context.accountId, providerMode: context.mode, eventId: incoming.eventId, eventType: incoming.type, payloadHash: incoming.hash, evidence: incoming.evidence, receivedAt: now }).onConflictDoNothing();
      const [event] = await tx.select().from(events).where(and(eq(events.providerAccountId, context.accountId), eq(events.providerMode, context.mode), eq(events.eventId, incoming.eventId))).for('update');
      if (!event) throw new PaymentError('unavailable');
      if (event.payloadHash !== incoming.hash) {
        const [changed] = await tx.update(events).set({ anomalyHash: event.anomalyHash || incoming.hash, processingState: 'needs_review', processedAt: now, leaseUntil: null, lastErrorCode: 'event_hash_conflict' }).where(eq(events.id, event.id)).returning();
        return { event: changed, anomaly: true };
      }
      return { event, anomaly: !!event.anomalyHash };
    });
  },
  async claimEvent(id, now) {
    return db.transaction(async tx => {
      const [event] = await tx.select().from(events).where(eq(events.id, id)).for('update');
      if (event && event.attemptCount >= 100 && !['processed', 'ignored', 'needs_review'].includes(event.processingState)) { await tx.update(events).set({ processingState: 'needs_review', processedAt: now, leaseUntil: null, lastErrorCode: 'retry_exhausted' }).where(eq(events.id, id)); return undefined; }
      if (!event || ['processed', 'ignored', 'needs_review'].includes(event.processingState) || (event.leaseUntil && event.leaseUntil > now) || (event.nextAttemptAt && event.nextAttemptAt > now)) return undefined;
      return (await tx.update(events).set({ processingState: 'processing', leaseUntil: new Date(now.getTime() + 60_000), nextAttemptAt: null, attemptCount: event.attemptCount + 1 }).where(eq(events.id, id)).returning())[0];
    });
  },
  async retryEvent(id, now) { await db.update(events).set({ processingState: 'retry', processedAt: null, leaseUntil: null, nextAttemptAt: new Date(now.getTime() + 60_000), lastErrorCode: 'reconciliation_retry' }).where(and(eq(events.id, id), eq(events.processingState, 'processing'), sql`${events.anomalyHash} IS NULL`)); },
  async finishUnmatchedEvent(id, now, state, reason) { await db.update(events).set({ processingState: state, processedAt: now, leaseUntil: null, lastErrorCode: reason || null }).where(and(eq(events.id, id), eq(events.processingState, 'processing'), sql`${events.anomalyHash} IS NULL`)); },
  pendingEvents: (now, limit) => db.query.workspacePaymentEvents.findMany({ where: and(inArray(events.processingState, ['pending', 'retry', 'processing']), or(sql`${events.nextAttemptAt} IS NULL`, lte(events.nextAttemptAt, now)), or(sql`${events.leaseUntil} IS NULL`, lte(events.leaseUntil, now))), orderBy: [events.receivedAt], limit }),
  recoveryOrders: limit => db.query.workspaceMembershipOrders.findMany({ where: inArray(orders.providerSetupState, ['creating', 'recovery_required', 'ready']), orderBy: [sql`${orders.providerRecoveryCheckedAt} ASC NULLS FIRST`, orders.createdAt], limit }),
};
export async function listFinancialOrders(page = 1) {
  const rows = await db.select({ order: orders, userName: users.fullName }).from(orders).innerJoin(users, eq(users.id, orders.userId)).orderBy(desc(orders.createdAt)).limit(25).offset((page - 1) * 25);
  const evidence = rows.length ? await db.query.workspacePaymentAttempts.findMany({ where: inArray(payments.membershipOrderId, rows.map(r => r.order.id)) }) : [];
  return rows.map(row => ({ ...row, paymentEvidence: evidence.filter(p => p.membershipOrderId === row.order.id) }));
}
export async function financialCouponCounts(couponId: string) {
  const rows = await db.select({ status: redemptions.status, n: count() }).from(redemptions).where(eq(redemptions.couponId, couponId)).groupBy(redemptions.status);
  const held = await db.select({ n: count() }).from(orders).where(and(eq(orders.couponId, couponId), eq(orders.financialState, 'captured'), eq(orders.activationState, 'held_for_review')));
  return { activeReserved: rows.find(r => r.status === 'reserved')?.n || 0, redeemedPaidUses: rows.find(r => r.status === 'redeemed')?.n || 0, releasedReservations: rows.find(r => r.status === 'released')?.n || 0, capturedHeldOrders: held[0].n };
}

export async function paymentInboxSummary() { return db.select({ state: events.processingState, count: count() }).from(events).groupBy(events.processingState); }
