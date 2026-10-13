import type { CourseSummary } from './dashboard';
import { createHash } from 'node:crypto';
import type { SubmissionTransaction } from '../review/service';
import { permitsDraftEdit } from '../review/model';
import type { workspaceCourseDrafts, workspaceCreatorProfileDetails } from '@/lib/db/schema';
import { UUID } from '../eligibility/model';
import type { AccessEvidence } from '../activation/model';
import { CreatorError, creatorCapabilities, validateDraft, validateProfile, version, type DraftContent, type ProfileContent } from './model';
export type Draft = typeof workspaceCourseDrafts.$inferSelect;
export type ProfileDetails = typeof workspaceCreatorProfileDetails.$inferSelect;
export type CreatorContext = { user: { id: string; fullName: string | null }; profileId: string | null; evidence: AccessEvidence | null; financialReview: boolean; planName: string | null };
export interface CreatorTransaction {
  reviews: SubmissionTransaction;
  summary?(): Promise<CourseSummary>;
  context(): Promise<CreatorContext>;
  draft(id: string): Promise<Draft | null>;
  request(key: string): Promise<Draft | null>;
  list(page: number): Promise<{ drafts: Draft[]; total: number; hasNext: boolean }>;
  details(): Promise<ProfileDetails | null>;
  create(content: DraftContent, profileId: string, requestKey: string, hash: string, now: Date): Promise<Draft>;
  update(id: string, expectedVersion: number, content: DraftContent, now: Date): Promise<Draft | null>;
  saveDetails(profileId: string, expectedVersion: number, content: ProfileContent, now: Date): Promise<ProfileDetails | null>;
}
export interface CreatorStore { transaction<T>(userId: string, work: (tx: CreatorTransaction) => Promise<T>): Promise<T> }
export function creatorService(store: CreatorStore, environment: string | undefined, clock = () => new Date()) {
  async function run<T>(userId: string, edit: boolean, work: (tx: CreatorTransaction, context: CreatorContext, now: Date) => Promise<T>) {
    return store.transaction(userId, async tx => {
      const context = await tx.context(); const now = clock();
      const capabilities = creatorCapabilities(context.evidence, now, environment, context.financialReview);
      if (!(edit ? capabilities.canEditWorkspace : capabilities.canViewCreatorWorkspace) || !context.profileId) throw new CreatorError('restricted');
      return work(tx, context, now);
    });
  }
  return {
    overview: (userId: string, page = 1) => run(userId, false, async (tx, context, now) => {
      const list = await tx.list(page);
      return { ...context, capabilities: creatorCapabilities(context.evidence, now, environment, context.financialReview), ...list, reviewStatuses: await tx.reviews.statuses(list.drafts.map(draft => draft.id)), details: await tx.details() };
    }),
    dashboardSummary: (userId: string) => run(userId, false, async tx => { if (!tx.summary) throw new Error('Course summary unavailable'); return tx.summary(); }),
    read: (userId: string, id: string) => run(userId, false, async tx => { const draft = await tx.draft(id); if (!draft) throw new CreatorError('not_found'); return draft; }),
    create: (userId: string, requestKey: string, input: unknown) => {
      if (!UUID.test(requestKey)) throw new CreatorError('validation');
      const content = validateDraft(input); const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
      return run(userId, true, async (tx, context, now) => {
        const prior = await tx.request(requestKey);
        if (prior) { if (prior.creationHash !== hash) throw new CreatorError('conflict'); return prior; }
        return tx.create(content, context.profileId!, requestKey, hash, now);
      });
    },
    update: (userId: string, id: string, expected: number, input: unknown) => {
      const content = validateDraft(input); const expectedVersion = version(expected);
      return run(userId, true, async (tx, context) => {
        if (!await tx.draft(id)) throw new CreatorError('not_found');
        if (!permitsDraftEdit((await tx.reviews.latest(id))?.reviewStatus)) throw new CreatorError('review_locked');
        const now = clock();
        if (!creatorCapabilities(context.evidence, now, environment, context.financialReview).canEditWorkspace) throw new CreatorError('restricted');
        const updated = await tx.update(id, expectedVersion, content, now);
        if (!updated) throw new CreatorError('conflict'); return updated;
      });
    },
    saveProfile: (userId: string, expected: number, input: unknown) => {
      const content = validateProfile(input); const expectedVersion = version(expected);
      return run(userId, true, async (tx, context, now) => {
        const saved = await tx.saveDetails(context.profileId!, expectedVersion, content, now);
        if (!saved) throw new CreatorError('conflict'); return saved;
      });
    },
  };
}
