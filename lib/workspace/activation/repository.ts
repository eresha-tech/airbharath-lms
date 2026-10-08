import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCreatorProfiles as profiles, workspaceMemberships as memberships, workspaceMembershipOrders as orders, workspacePaymentAttempts as payments, workspaceCouponRedemptions as redemptions } from '@/lib/db/schema';
import type { ActivationStore } from './service';
export const postgresActivationStore: ActivationStore = {
  async transaction(userId, orderId, work) {
    for (let retry = 0; ; retry++) {
      try { return await db.transaction(async tx => {
        // Same first lock as every financial path. Coupon is finalized and never mutated here.
        const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
        if (!user) throw new Error('activation_authentication');
        const [order] = await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).for('update');
        if (!order) throw new Error('activation_not_found');
        const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for('update');
        return work({
          order: async () => order, profile: async () => profile || null,
          membership: async () => (await tx.select().from(memberships).where(eq(memberships.membershipOrderId, orderId)))[0] || null,
          payment: async () => order.winningPaymentId ? (await tx.select().from(payments).where(and(eq(payments.membershipOrderId, orderId), eq(payments.providerPaymentId, order.winningPaymentId), eq(payments.winner, true))))[0] || null : null,
          redemption: async () => (await tx.select().from(redemptions).where(eq(redemptions.membershipOrderId, orderId)))[0] || null,
          otherMemberships: async () => tx.select().from(memberships).where(eq(memberships.userId, userId)),
          createProfile: async now => (await tx.insert(profiles).values({ userId, createdAt: now, firstActivatedAt: now }).returning())[0],
          createMembership: async values => (await tx.insert(memberships).values(values).returning())[0],
          fulfill: async now => { await tx.update(orders).set({ activationState: 'fulfilled', fulfilledAt: now, reviewReason: null, version: sql`${orders.version} + 1` }).where(eq(orders.id, orderId)); },
          hold: async reason => { await tx.update(orders).set({ activationState: 'held_for_review', reviewReason: reason, version: sql`${orders.version} + 1` }).where(eq(orders.id, orderId)); },
        });
      }); } catch (error) {
        const code = (error as { code?: string; cause?: { code?: string } })?.code || (error as { cause?: { code?: string } })?.cause?.code;
        if (['40P01', '40001'].includes(code || '') && retry < 2) continue;
        throw error;
      }
    }
  },
  pending: (limit, context) => db.select({ id: orders.id, userId: orders.userId }).from(orders).where(and(eq(orders.financialState, 'captured'), eq(orders.activationState, 'pending_activation'), eq(orders.providerMode, context.mode), eq(orders.providerAccountId, context.accountId), eq(orders.provider, 'razorpay'), eq(orders.commercialPolicyVersion, 'workspace-test-noncommercial-v1'), isNotNull(orders.paidAt), isNotNull(orders.refundEligibleUntil))).orderBy(orders.createdAt, orders.id).limit(limit),
};
// Private server projection; every consumer supplies a persisted, authenticated owner.
export async function readWorkspaceAccess(userId: string) {
  const [row] = await db.select({ membership: memberships, profile: profiles, order: orders }).from(memberships)
    .innerJoin(profiles, and(eq(profiles.id, memberships.creatorProfileId), eq(profiles.userId, memberships.userId)))
    .innerJoin(orders, and(eq(orders.id, memberships.membershipOrderId), eq(orders.userId, memberships.userId)))
    .where(eq(memberships.userId, userId)).orderBy(desc(memberships.endsAt), desc(memberships.id)).limit(1);
  const [latestOrder] = await db.select({ activationState: orders.activationState, financialState: orders.financialState }).from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt), desc(orders.id)).limit(1);
  return { row: row || null, latestOrder: latestOrder || null };
}
export async function listWorkspaceCreators() {
  return db.select({ profile: profiles, membership: memberships, order: orders, userName: users.fullName }).from(memberships)
    .innerJoin(profiles, eq(profiles.id, memberships.creatorProfileId)).innerJoin(orders, eq(orders.id, memberships.membershipOrderId)).innerJoin(users, eq(users.id, memberships.userId))
    .orderBy(desc(memberships.fulfilledAt), desc(memberships.id)).limit(100);
}
