import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCreatorProfiles as profiles, workspaceMembershipOrders as orders, workspaceCourseDrafts as drafts, workspaceCreatorProfileDetails as details } from '@/lib/db/schema';
import { readWorkspaceAccess } from '../activation/repository';
import { CreatorError, environment } from './model';
import { creatorService, type CreatorStore } from './service';
export const postgresCreatorStore: CreatorStore = {
  transaction: (userId, work) => db.transaction(async tx => {
    // Same lock order as financial/activation paths; sample time in service after all locks.
    const [user] = await tx.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new CreatorError('authentication');
    await tx.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId)).orderBy(orders.id).for('update');
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for('update');
    const access = await readWorkspaceAccess(userId, tx);
    const owner = eq(drafts.userId, userId);
    return work({
      context: async () => ({ user, profileId: profile?.id || null, evidence: access.row ? { profileStatus: access.row.profile.status, activationState: access.row.order.activationState, providerMode: access.row.order.providerMode, commercialPolicyVersion: access.row.order.commercialPolicyVersion, membership: access.row.membership } : null, financialReview: access.latestOrder?.activationState === 'held_for_review', planName: access.row?.order.planSnapshot.displayName || null }),
      draft: async id => (await tx.select().from(drafts).where(and(owner, eq(drafts.id, id))).limit(1))[0] || null,
      request: async key => (await tx.select().from(drafts).where(and(owner, eq(drafts.requestKey, key))).limit(1))[0] || null,
      list: async page => {
        const [total] = await tx.select({ value: count() }).from(drafts).where(owner);
        const rows = await tx.select().from(drafts).where(owner).orderBy(desc(drafts.updatedAt), desc(drafts.id)).limit(21).offset((page - 1) * 20);
        return { drafts: rows.slice(0, 20), total: total.value, hasNext: rows.length > 20 };
      },
      details: async () => (await tx.select().from(details).where(eq(details.userId, userId)).limit(1))[0] || null,
      create: async (content, creatorProfileId, requestKey, creationHash, now) => (await tx.insert(drafts).values({ ...content, userId, creatorProfileId, requestKey, creationHash, createdAt: now, updatedAt: now }).returning())[0],
      update: async (id, expectedVersion, content, now) => (await tx.update(drafts).set({ ...content, version: expectedVersion + 1, updatedAt: now }).where(and(owner, eq(drafts.id, id), eq(drafts.version, expectedVersion))).returning())[0] || null,
      saveDetails: async (creatorProfileId, expectedVersion, content, now) => expectedVersion === 0 ? (await tx.insert(details).values({ ...content, userId, creatorProfileId, createdAt: now, updatedAt: now }).onConflictDoNothing().returning())[0] || null : (await tx.update(details).set({ ...content, version: expectedVersion + 1, updatedAt: now }).where(and(eq(details.userId, userId), eq(details.creatorProfileId, creatorProfileId), eq(details.version, expectedVersion))).returning())[0] || null,
    });
  }),
};
export function workspaceContent() { return creatorService(postgresCreatorStore, environment()); }
// Admin authorization is locked/rechecked inside the read transaction; there are no admin content mutations.
export async function inspectDrafts(actorId: string, id?: string, page = 1) {
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new CreatorError('restricted');
    return tx.select({ draft: drafts, creatorName: users.fullName, creatorStatus: profiles.status }).from(drafts).innerJoin(users, eq(users.id, drafts.userId)).innerJoin(profiles, and(eq(profiles.id, drafts.creatorProfileId), eq(profiles.userId, drafts.userId)))
      .where(id ? eq(drafts.id, id) : undefined).orderBy(desc(drafts.updatedAt), desc(drafts.id)).limit(id ? 1 : 21).offset(id ? 0 : (page - 1) * 20);
  });
}
