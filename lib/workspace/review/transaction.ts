import { and, desc, eq, inArray } from 'drizzle-orm';
import type { db } from '@/lib/db';
import { workspaceCourseSubmissions as submissions, workspaceCourseReviewEvents as events } from '@/lib/db/schema';
import type { SubmissionTransaction } from './service';
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export function submissionTransaction(tx: Tx, userId: string): SubmissionTransaction {
  const owner = eq(submissions.userId, userId);
  return {
    latest: async id => (await tx.select().from(submissions).where(and(owner, eq(submissions.draftId, id))).orderBy(desc(submissions.submissionNumber)).limit(1))[0] || null,
    request: async key => (await tx.select().from(submissions).where(and(owner, eq(submissions.requestKey, key))).limit(1))[0] || null,
    create: async row => (await tx.insert(submissions).values(row).returning())[0],
    statuses: async ids => {
      if (!ids.length) return {};
      const rows = await tx.selectDistinctOn([submissions.draftId], { draftId: submissions.draftId, status: submissions.reviewStatus }).from(submissions).where(and(owner, inArray(submissions.draftId, ids))).orderBy(submissions.draftId, desc(submissions.submissionNumber));
      return Object.fromEntries(rows.map(row => [row.draftId, row.status]));
    },
    history: async (id, page) => {
      const rows = await tx.select().from(submissions).where(and(owner, eq(submissions.draftId, id))).orderBy(desc(submissions.submissionNumber)).limit(11).offset((page - 1) * 10);
      const visible = rows.slice(0, 10);
      const history = visible.length ? await tx.select().from(events).where(inArray(events.submissionId, visible.map(row => row.id))).orderBy(events.transitionVersion) : [];
      return { submissions: visible.map(submission => ({ submission, events: history.filter(event => event.submissionId === submission.id) })), hasNext: rows.length > 10 };
    },
  };
}
