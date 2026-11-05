import 'server-only';
import { and, asc, eq, sql, isNull, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceMembershipOrders as orders, workspaceCreatorProfiles as profiles, workspaceCourseProjects as projects, workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseReviewEvents as reviews, workspaceCourseLessons as lessons, workspaceCourseAssets as assets, workspaceMediaJobs as jobs } from '@/lib/db/schema';
import { readWorkspaceAccess } from '../activation/repository';
import { readGrantEvidence } from '../access/repository';
import { MediaError } from './model';
import type { MediaStore } from './service';

export const postgresMediaStore: MediaStore = {
  transaction: (actorId, reference, work) => db.transaction(async tx => {
    // Same persisted actor -> orders -> profile -> project -> draft/source order as Builder.
    // Access-grant revocation also holds the actor lock; no provider calls occur here.
    const [actor] = await tx.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, actorId)).for('update');
    if (!actor) throw new MediaError('authentication');
    await tx.select({ id: orders.id }).from(orders).where(eq(orders.userId, actorId)).orderBy(orders.id).for('update');
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, actorId)).for('update');
    if (!profile) throw new MediaError('forbidden');
    const identity = 'assetId' in reference
      ? (await tx.select({ lessonId: assets.lessonId, projectId: assets.projectId }).from(assets).where(and(eq(assets.id, reference.assetId), eq(assets.userId, actorId), eq(assets.creatorProfileId, profile.id))))[0]
      : 'projectId' in reference?{lessonId:null,projectId:reference.projectId}:(await tx.select({ lessonId: lessons.id, projectId: lessons.projectId }).from(lessons).where(and(eq(lessons.id, reference.lessonId), eq(lessons.userId, actorId))))[0];
    if (!identity) throw new MediaError('not_found');
    const [project] = await tx.select().from(projects).where(and(eq(projects.id, identity.projectId), eq(projects.userId, actorId), eq(projects.creatorProfileId, profile.id))).for('update');
    if (!project) throw new MediaError('not_found');
    await tx.select({ id: drafts.id }).from(drafts).where(and(eq(drafts.id, project.draftId), eq(drafts.userId, actorId))).for('update');
    const artwork=identity.lessonId===null;
    const lessonScope = and(eq(lessons.id, identity.lessonId??project.id), eq(lessons.projectId, project.id), eq(lessons.userId, actorId));
    const [lesson] = artwork?[{id:project.id}]:await tx.select().from(lessons).where(lessonScope).for('update');
    if (!lesson) throw new MediaError('not_found');
    const access = await readWorkspaceAccess(actorId, tx), grant = await readGrantEvidence(actorId, tx);
    const scope = and(artwork?isNull(assets.lessonId):eq(assets.lessonId, lesson.id), eq(assets.projectId, project.id), eq(assets.userId, actorId), eq(assets.creatorProfileId, profile.id));
    return work({
      processing: {
        read: async () => { if (!('assetId' in reference)) throw new MediaError('validation'); return (await tx.select().from(jobs).where(eq(jobs.assetId, reference.assetId)).for('update'))[0] || null; },
        create: async job => { if (!('assetId' in reference) || job.assetId !== reference.assetId) throw new MediaError('validation'); return (await tx.insert(jobs).values(job).returning())[0]; },
        update: async (job, patch) => { if (!('assetId' in reference) || job.assetId !== reference.assetId) throw new MediaError('validation'); return (await tx.update(jobs).set(patch).where(and(eq(jobs.id, job.id), eq(jobs.assetId, reference.assetId))).returning())[0]; },
      },
      context: { user: actor, profileId: profile.id, grant,
        evidence: access.row ? { refundedAt: access.row.refund?.confirmedAt, profileStatus: access.row.profile.status, activationState: access.row.order.activationState, providerMode: access.row.order.providerMode, commercialPolicyVersion: access.row.order.commercialPolicyVersion, membership: access.row.membership } : null,
        financialReview: access.latestOrder?.activationState === 'held_for_review', planName: access.row?.order.planSnapshot.displayName || null },
      // Reload because the asset trigger advances mediaRevision and Builder version atomically.
      lesson: async () => { if(artwork){const [r]=await tx.select({revision:sql<number>`coalesce(sum(${assets.version}),0)::int`}).from(assets).where(scope);return {id:project.id,projectId:project.id,userId:actorId,mediaRevision:r.revision,artwork:true};} const [row] = await tx.select({ id: lessons.id, projectId: lessons.projectId, userId: lessons.userId, mediaRevision: lessons.mediaRevision }).from(lessons).where(lessonScope); if (!row) throw new MediaError('not_found'); return row; },
      assets: async () => { const rows=await tx.select().from(assets).where(scope).orderBy(asc(assets.createdAt),asc(assets.id));const states=rows.length?await tx.select({assetId:jobs.assetId,state:jobs.state}).from(jobs).where(inArray(jobs.assetId,rows.map(a=>a.id))):[];return rows.map(a=>({...a,processingState:states.find(j=>j.assetId===a.id)?.state})); },
      request: async key => (await tx.select().from(assets).where(and(eq(assets.userId, actorId), eq(assets.requestKey, key))))[0] || null,
      create: async asset => {
        if (asset.userId !== actorId || asset.creatorProfileId !== profile.id || asset.projectId !== project.id || asset.lessonId !== (artwork?null:lesson.id)) throw new MediaError('not_found');
        return (await tx.insert(assets).values(asset).returning())[0];
      },
      update: async (asset, patch) => {
        const [row] = await tx.update(assets).set({ ...patch, version: asset.version + 1 }).where(and(scope, eq(assets.id, asset.id), eq(assets.version, asset.version))).returning();
        if (!row) throw new MediaError('conflict'); return row;
      },
    });
  }),
};

// Read-only inspection has its own persisted Admin-role check, never a Creator bypass flag.
export async function inspectMedia(actorId: string, projectId: string, reference: { lessonId: string } | { assetId: string }) {
  return db.transaction(async tx => {
    const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share');
    if (actor?.role !== 'admin') throw new MediaError('forbidden');
    const [project] = await tx.select().from(projects).where(eq(projects.id, projectId));
    if (!project) throw new MediaError('not_found');
    if ('lessonId' in reference) {
      const [lesson] = await tx.select({ id: lessons.id }).from(lessons).where(and(eq(lessons.id, reference.lessonId), eq(lessons.projectId, project.id), eq(lessons.userId, project.userId)));
      if (!lesson) throw new MediaError('not_found');
    }
    const rows = await tx.select().from(assets).where(and(eq(assets.projectId, project.id), eq(assets.userId, project.userId), eq(assets.creatorProfileId, project.creatorProfileId), 'lessonId' in reference ? eq(assets.lessonId, reference.lessonId) : eq(assets.id, reference.assetId))).orderBy(asc(assets.createdAt), asc(assets.id));
    if ('assetId' in reference && !rows.length) throw new MediaError('not_found');
    return rows;
  });
}
