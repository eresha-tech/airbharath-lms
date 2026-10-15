import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseReviewEvents as events, workspaceCreatorProfiles as profiles, workspaceCreatorProfileDetails as details } from '@/lib/db/schema';
import { postgresCreatorStore } from '../creator/repository';
import { environment } from '../creator/model';
import { ReviewError, type ReviewStatus } from './model';
import { reviewService, type AdminReviewStore } from './service';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function authorize(tx: Tx, actorId: string, lock: 'share' | 'update' = 'share') {
  const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for(lock);
  if (actor?.role !== 'admin') throw new ReviewError('forbidden');
}
export const postgresAdminReviewStore: AdminReviewStore = {
  transaction: (actorId, id, work) => db.transaction(async tx => {
    // Serialize this actor's request keys even across different submissions.
    await authorize(tx, actorId, 'update');
    const [identity] = await tx.select({ draftId: submissions.draftId }).from(submissions).where(eq(submissions.id, id)).limit(1);
    // Draft -> submission matches creator lock order; no membership dependency for an admin review.
    if (identity) await tx.select({ id: drafts.id }).from(drafts).where(eq(drafts.id, identity.draftId)).for('update');
    const [row] = await tx.select().from(submissions).where(eq(submissions.id, id)).for('update');
    return work({ submission: async () => row || null,
      request: async key => (await tx.select().from(events).where(and(eq(events.actorAdminUserId, actorId), eq(events.requestKey, key))).limit(1))[0] || null,
      append: async event => (await tx.insert(events).values(event).returning())[0],
      transition: async (prior, reviewStatus, now) => (await tx.update(submissions).set({ reviewStatus, version: prior.version + 1, updatedAt: now, ...(reviewStatus === 'under_review' ? { reviewStartedAt: now } : { reviewCompletedAt: now }) }).where(and(eq(submissions.id, id), eq(submissions.reviewStatus, prior.reviewStatus), eq(submissions.version, prior.version))).returning())[0] || null,
    });
  }),
};
export function workspaceReviews() { return reviewService(postgresCreatorStore, postgresAdminReviewStore, environment()); }
export async function reviewQueue(actorId: string, status: ReviewStatus | undefined, page: number) {
  return db.transaction(async tx => {
    await authorize(tx, actorId);
    const rows = await tx.select({ submission: submissions, creatorName: users.fullName }).from(submissions).innerJoin(users, eq(users.id, submissions.userId)).where(status ? eq(submissions.reviewStatus, status) : inArray(submissions.reviewStatus, ['submitted', 'under_review'])).orderBy(desc(submissions.submittedAt), desc(submissions.id)).limit(21).offset((page - 1) * 20);
    return { rows: rows.slice(0, 20), hasNext: rows.length > 20 };
  });
}
export async function reviewDetail(actorId: string, id: string) {
  return db.transaction(async tx => {
    await authorize(tx, actorId);
    const [row] = await tx.select({ submission: submissions, creatorName: users.fullName, creatorStatus: profiles.status, professional: details }).from(submissions).innerJoin(users, eq(users.id, submissions.userId)).innerJoin(profiles, and(eq(profiles.id, submissions.creatorProfileId), eq(profiles.userId, submissions.userId))).leftJoin(details, and(eq(details.userId, submissions.userId), eq(details.creatorProfileId, submissions.creatorProfileId))).where(eq(submissions.id, id)).limit(1);
    if (!row) throw new ReviewError('not_found');
    return { ...row, events: await tx.select().from(events).where(eq(events.submissionId, id)).orderBy(events.transitionVersion) };
  });
}
