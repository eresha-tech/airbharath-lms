import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceCreatorProfiles as profiles, workspaceMembershipOrders as orders, workspaceCourseDrafts as drafts, workspaceCourseSubmissions as submissions, workspaceCourseReviewEvents as reviews, workspaceCourseProjects as projects, workspaceCourseModules as modules, workspaceCourseLessons as lessons } from '@/lib/db/schema';
import { readWorkspaceAccess } from '../activation/repository';
import { environment } from '../creator/model';
import { BuildError } from './model';
import { builderService, projectReceipt, sourceReceipt, moduleReceipt, lessonSummary, lessonReceipt, type BuildStore, type Project, type ApprovedSource, type BuildTree } from './service';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
// Explicit table/identifier pairs preserve correlation when Drizzle flattens a
// single-table select; interpolated columns otherwise lose their qualifiers.
const approvalExists = sql<boolean>`exists(select 1 from ${reviews} where ${reviews}.${sql.identifier('submission_id')}=${submissions}.${sql.identifier('id')} and ${reviews}.${sql.identifier('action')}='approved' and ${reviews}.${sql.identifier('to_status')}='approved' and ${reviews}.${sql.identifier('transition_version')}=${submissions}.${sql.identifier('version')} and ${reviews}.${sql.identifier('created_at')}=${submissions}.${sql.identifier('review_completed_at')})`;
async function source(tx: Tx, id: string, userId?: string, draftId?: string): Promise<ApprovedSource | null> {
  const [row] = await tx.select({ submission: submissions, approvalExists }).from(submissions).where(and(eq(submissions.id, id), userId ? eq(submissions.userId, userId) : undefined, draftId ? eq(submissions.draftId, draftId) : undefined)).for('share');
  return row ? { ...row.submission, approvalExists: row.approvalExists } : null;
}
const lessonColumns = { id: lessons.id, projectId: lessons.projectId, moduleId: lessons.moduleId, userId: lessons.userId, title: lessons.title, summary: lessons.summary, position: lessons.position, version: lessons.version, createdAt: lessons.createdAt, updatedAt: lessons.updatedAt };
async function structure(tx: Tx, project: Project) {
  const scoped = and(eq(modules.projectId, project.id), eq(modules.userId, project.userId));
  return { modules: await tx.select().from(modules).where(scoped).orderBy(asc(modules.position)), lessons: await tx.select(lessonColumns).from(lessons).where(and(eq(lessons.projectId, project.id), eq(lessons.userId, project.userId))).orderBy(asc(lessons.moduleId), asc(lessons.position)) };
}
export const postgresBuildStore: BuildStore = {
  transaction: (userId, work) => db.transaction(async tx => {
    // Same persisted owner/access locks as creator mutations; no external HTTP.
    const [user] = await tx.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new BuildError('authentication');
    await tx.select({ id: orders.id }).from(orders).where(eq(orders.userId, userId)).orderBy(orders.id).for('update');
    const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId)).for('update');
    const access = await readWorkspaceAccess(userId, tx);
    const owner = (project: Project) => and(eq(modules.projectId, project.id), eq(modules.userId, userId));
    const lessonOwner = (project: Project, moduleId?: string) => and(eq(lessons.projectId, project.id), eq(lessons.userId, userId), moduleId ? eq(lessons.moduleId, moduleId) : undefined);
    return work({
      context: async () => ({ user, profileId: profile?.id || null, evidence: access.row ? { profileStatus: access.row.profile.status, activationState: access.row.order.activationState, providerMode: access.row.order.providerMode, commercialPolicyVersion: access.row.order.commercialPolicyVersion, membership: access.row.membership } : null, financialReview: access.latestOrder?.activationState === 'held_for_review', planName: access.row?.order.planSnapshot.displayName || null }),
      source: async (id, draftId) => {
        // Match the established creator/review order: draft before submission.
        await tx.select({ id: drafts.id }).from(drafts).where(and(eq(drafts.id, draftId), eq(drafts.userId, userId))).for('update');
        return source(tx, id, userId, draftId);
      },
      project: async draftId => (await tx.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.draftId, draftId))).orderBy(desc(projects.createdAt), desc(projects.id)).limit(1).for('update'))[0] || null,
      existing: async id => (await tx.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.approvedSubmissionId, id))).for('update'))[0] || null,
      createProject: async (s, now) => (await tx.insert(projects).values({ userId, creatorProfileId: s.creatorProfileId, draftId: s.draftId, approvedSubmissionId: s.id, createdAt: now, updatedAt: now }).returning())[0],
      modules: async project => tx.select().from(modules).where(owner(project)).orderBy(asc(modules.position)),
      lessons: async project => tx.select(lessonColumns).from(lessons).where(lessonOwner(project)).orderBy(asc(lessons.moduleId), asc(lessons.position)),
      module: async (project, id) => (await tx.select().from(modules).where(and(owner(project), eq(modules.id, id))).for('update'))[0] || null,
      lesson: async (project, moduleId, id) => (await tx.select().from(lessons).where(and(lessonOwner(project, moduleId), eq(lessons.id, id))).for('update'))[0] || null,
      createModule: async (project, content, position, now) => (await tx.insert(modules).values({ ...content, projectId: project.id, userId, position, createdAt: now, updatedAt: now }).returning())[0],
      createLesson: async (project, module, content, position, now) => (await tx.insert(lessons).values({ ...content, projectId: project.id, moduleId: module.id, userId, position, createdAt: now, updatedAt: now }).returning())[0],
      updateModule: async (project, id, expected, content, now) => (await tx.update(modules).set({ ...content, version: expected + 1, updatedAt: now }).where(and(owner(project), eq(modules.id, id), eq(modules.version, expected))).returning())[0] || null,
      updateLesson: async (project, moduleId, id, expected, content, now) => (await tx.update(lessons).set({ ...content, version: expected + 1, updatedAt: now }).where(and(lessonOwner(project, moduleId), eq(lessons.id, id), eq(lessons.version, expected))).returning())[0] || null,
      deleteModule: async (project, id, expected) => (await tx.delete(modules).where(and(owner(project), eq(modules.id, id), eq(modules.version, expected))).returning({ id: modules.id })).length === 1,
      deleteLesson: async (project, moduleId, id, expected) => (await tx.delete(lessons).where(and(lessonOwner(project, moduleId), eq(lessons.id, id), eq(lessons.version, expected))).returning({ id: lessons.id })).length === 1,
      positions: async (project, kind, rows, now) => {
        // Position uniqueness is deferred until commit. Parent/owner locks serialize
        // structural changes; changed neighbors receive independent new versions.
        for (const [position, row] of rows.entries()) {
          if (row.position === position) continue;
          const changed = kind === 'module'
            ? await tx.update(modules).set({ position, version: row.version + 1, updatedAt: now }).where(and(owner(project), eq(modules.id, row.id), eq(modules.version, row.version))).returning({ id: modules.id })
            : await tx.update(lessons).set({ position, version: row.version + 1, updatedAt: now }).where(and(lessonOwner(project), eq(lessons.id, row.id), eq(lessons.version, row.version))).returning({ id: lessons.id });
          if (changed.length !== 1) throw new BuildError('conflict');
        }
      },
    });
  }),
};
export function workspaceBuilder() { return builderService(postgresBuildStore, environment()); }
// These projections are read-only. Persisted admin is locked/rechecked inside
// each inspection transaction, regardless of a stale cookie/JWT role.
async function admin<T>(actorId: string, work: (tx: Tx) => Promise<T>) {
  return db.transaction(async tx => { const [actor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actorId)).for('share'); if (actor?.role !== 'admin') throw new BuildError('forbidden'); return work(tx); });
}
export async function inspectBuilds(actorId: string, page: number) {
  return admin(actorId, async tx => { const rows = await tx.select({ project: projects, source: submissions, creatorName: users.fullName,
    moduleCount: sql<number>`(select count(*)::int from ${modules} where ${modules}.${sql.identifier('project_id')}=${projects}.${sql.identifier('id')})`, lessonCount: sql<number>`(select count(*)::int from ${lessons} where ${lessons}.${sql.identifier('project_id')}=${projects}.${sql.identifier('id')})`,
  }).from(projects).innerJoin(submissions, eq(submissions.id, projects.approvedSubmissionId)).innerJoin(users, eq(users.id, projects.userId)).orderBy(desc(projects.createdAt), desc(projects.id)).limit(21).offset((page - 1) * 20); return { rows: rows.slice(0, 20), hasNext: rows.length > 20 }; });
}
export async function inspectBuild(actorId: string, projectId: string): Promise<BuildTree> {
  return admin(actorId, async tx => { const [p] = await tx.select().from(projects).where(eq(projects.id, projectId)); if (!p) throw new BuildError('not_found'); const s = await source(tx, p.approvedSubmissionId); if (!s || !s.approvalExists || s.reviewStatus !== 'approved') throw new BuildError('not_approved'); const [creator] = await tx.select({ creatorName: users.fullName, creatorStatus: profiles.status }).from(users).innerJoin(profiles, and(eq(profiles.userId, users.id), eq(profiles.id, p.creatorProfileId))).where(eq(users.id, p.userId)); if (!creator) throw new BuildError('not_found'); const rows = await structure(tx, p); return { inspection: creator, project: projectReceipt(p), source: sourceReceipt(s), modules: rows.modules.map(moduleReceipt), lessons: rows.lessons.map(lessonSummary), canEdit: false }; });
}
export async function inspectLesson(actorId: string, projectId: string, moduleId: string, lessonId: string) {
  return admin(actorId, async tx => { const [row] = await tx.select({ lesson: lessons }).from(lessons).innerJoin(projects, and(eq(projects.id, lessons.projectId), eq(projects.userId, lessons.userId))).where(and(eq(projects.id, projectId), eq(lessons.moduleId, moduleId), eq(lessons.id, lessonId))); if (!row) throw new BuildError('not_found'); return lessonReceipt(row.lesson); });
}

export type BuildSummary = { projectId: string; moduleCount: number; lessonCount: number };
// A missing/unapplied builder migration must not take the existing draft library
// offline. Callers show unavailable instead of mistaking query failure for no build.
export async function readBuildSummaries(userId: string, draftIds: string[]): Promise<{ available: boolean; rows: Record<string, BuildSummary> }> {
  if (!draftIds.length) return { available: true, rows: {} };
  try {
    const rows = await db.select({ draftId: projects.draftId, projectId: projects.id,
      moduleCount: sql<number>`(select count(*)::int from ${modules} where ${modules}.${sql.identifier('project_id')}=${projects}.${sql.identifier('id')})`,
      lessonCount: sql<number>`(select count(*)::int from ${lessons} where ${lessons}.${sql.identifier('project_id')}=${projects}.${sql.identifier('id')})`,
    }).from(projects).where(and(eq(projects.userId, userId), inArray(projects.draftId, draftIds))).orderBy(asc(projects.createdAt), asc(projects.id));
    return { available: true, rows: Object.fromEntries(rows.map(row => [row.draftId, { projectId: row.projectId, moduleCount: row.moduleCount, lessonCount: row.lessonCount }])) };
  } catch { return { available: false, rows: {} }; }
}
