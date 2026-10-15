import type { workspaceCourseSubmissions, workspaceCourseReviewEvents } from '@/lib/db/schema';
import type { CreatorStore, CreatorTransaction } from '../creator/service';
import { CreatorError, creatorCapabilities } from '../creator/model';
import { snapshot, digest } from './snapshot';
import { adminCommand, submitCommand, ReviewError, type ReviewStatus } from './model';
export type Submission = typeof workspaceCourseSubmissions.$inferSelect;
export type ReviewEvent = typeof workspaceCourseReviewEvents.$inferSelect;
export interface SubmissionTransaction {
  latest(draftId: string): Promise<Submission | null>;
  request(key: string): Promise<Submission | null>;
  create(row: typeof workspaceCourseSubmissions.$inferInsert): Promise<Submission>;
  history(draftId: string, page: number): Promise<{ submissions: { submission: Submission; events: ReviewEvent[] }[]; hasNext: boolean }>;
  statuses(ids: string[]): Promise<Record<string, ReviewStatus>>;
}
export interface AdminReviewTransaction {
  submission(): Promise<Submission | null>;
  request(key: string): Promise<ReviewEvent | null>;
  append(row: typeof workspaceCourseReviewEvents.$inferInsert): Promise<ReviewEvent>;
  transition(row: Submission, status: ReviewStatus, at: Date): Promise<Submission | null>;
}
export interface AdminReviewStore { transaction<T>(actorId: string, id: string, work: (tx: AdminReviewTransaction) => Promise<T>): Promise<T> }
export function reviewService(creators: CreatorStore, admins: AdminReviewStore, environment: string | undefined, clock = () => new Date()) {
  async function creator<T>(userId: string, edit: boolean, work: (tx: CreatorTransaction) => Promise<T>) {
    try {
      return await creators.transaction(userId, async tx => {
        const context = await tx.context();
        const capability = creatorCapabilities(context.evidence, clock(), environment, context.financialReview, context.grant);
        if (!context.profileId || !(edit ? capability.canEditWorkspace : capability.canViewCreatorWorkspace)) throw new ReviewError('forbidden');
        return work(tx);
      });
    } catch (error) { if (error instanceof CreatorError) throw new ReviewError(error.code === 'authentication' ? 'authentication' : 'forbidden'); throw error; }
  }
  return {
    history: (userId: string, draftId: string, page = 1) => creator<Awaited<ReturnType<SubmissionTransaction['history']>>>(userId, false, async tx => {
      if (!await tx.draft(draftId)) throw new ReviewError('not_found'); return tx.reviews.history(draftId, page);
    }),
    submit: (userId: string, draftId: string, value: unknown) => {
      const command = submitCommand(value); const commandHash = digest({ draftId, expectedDraftVersion: command.expectedDraftVersion });
      return creator<Submission>(userId, true, async tx => {
        const draft = await tx.draft(draftId); if (!draft) throw new ReviewError('not_found');
        const now = clock(); const context = await tx.context();
        if (!creatorCapabilities(context.evidence, now, environment, context.financialReview, context.grant).canEditWorkspace) throw new ReviewError('forbidden');
        const prior = await tx.reviews.request(command.requestKey);
        if (prior) { if (prior.commandHash !== commandHash) throw new ReviewError('conflict'); return prior; }
        const latest = await tx.reviews.latest(draftId);
        if (latest?.reviewStatus === 'approved') throw new ReviewError('already_approved');
        if (latest && latest.reviewStatus !== 'changes_requested') throw new ReviewError('review_in_progress');
        if (draft.version !== command.expectedDraftVersion) throw new ReviewError('stale_draft');
        const { content, contentHash } = snapshot(draft);
        if (latest?.contentHash === contentHash) throw new ReviewError('no_changes_to_resubmit');
        return tx.reviews.create({ ...content, contentHash, commandHash, requestKey: command.requestKey, draftId, userId, creatorProfileId: draft.creatorProfileId, draftVersion: draft.version, submissionNumber: (latest?.submissionNumber || 0) + 1, submittedAt: now, createdAt: now, updatedAt: now });
      });
    },
    review: (actorId: string, id: string, value: unknown) => {
      const command = adminCommand(value); const commandHash = digest({ id, ...command, requestKey: undefined });
      return admins.transaction(actorId, id, async tx => {
        const row = await tx.submission(); if (!row) throw new ReviewError('not_found');
        const prior = await tx.request(command.requestKey);
        if (prior) { if (prior.commandHash !== commandHash) throw new ReviewError('conflict'); return row; }
        if (row.reviewStatus !== command.expectedStatus) throw new ReviewError('conflict');
        const status: ReviewStatus = command.action === 'start_review' ? 'under_review' : command.action === 'request_changes' ? 'changes_requested' : 'approved';
        // One transaction: immutable event first, lifecycle update second. Deferred DB guards verify both.
        const now = new Date(Math.max(clock().getTime(), row.updatedAt.getTime()));
        await tx.append({ submissionId: row.id, actorAdminUserId: actorId, action: command.action === 'start_review' ? 'review_started' : status as 'changes_requested' | 'approved', fromStatus: row.reviewStatus, toStatus: status, transitionVersion: row.version + 1, feedback: command.feedback, note: command.note, requestKey: command.requestKey, commandHash, createdAt: now });
        const updated = await tx.transition(row, status, now); if (!updated) throw new ReviewError('conflict'); return updated;
      });
    },
  };
}
