import { getWorkspaceUser } from '../eligibility/service';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { isSameOrigin, privateJson } from '../http';
import { UUID } from '../eligibility/model';
import { ReviewError } from './model';
import type { Submission, ReviewEvent } from './service';
export function submissionReceipt(row: Submission) {
  const { id, submissionNumber, draftVersion, reviewStatus, submittedAt, reviewStartedAt, reviewCompletedAt } = row;
  return { id, submissionNumber, draftVersion, reviewStatus, submittedAt, reviewStartedAt, reviewCompletedAt };
}
export function eventReceipt(row: ReviewEvent) { const { action, fromStatus, toStatus, feedback, note, createdAt } = row; return { action, fromStatus, toStatus, feedback, note, createdAt }; }
const messages: Record<ReviewError['code'], string> = {
  authentication: 'Please sign in again.', forbidden: 'This action is unavailable for your current account or membership.', not_found: 'Course review not found.', stale_draft: 'A newer draft version exists. Reload the saved course before submitting.', review_in_progress: 'This course already has an open review.', already_approved: 'This course review is approved and its draft is read-only.', no_changes_to_resubmit: 'Save changes to the reviewed course content before resubmitting.', conflict: 'This request conflicts with a newer review or a previously used request key. Reload to check the current state.', invalid_transition: 'This review action is not available in the expected state.', validation: 'Check your request and use the required plain-text feedback bounds.', too_large: 'This request is too large.', unavailable: 'Course review is temporarily unavailable. Your saved draft and answers are retained. Please try again.',
};
export async function reviewHttp(request: Request, kind: 'submit' | 'review', id: string) {
  try {
    if (!isSameOrigin(request)) throw new ReviewError('forbidden');
    const actor = kind === 'submit' ? await getWorkspaceUser() : await getAuthorizedAdminSession();
    if (!actor) throw new ReviewError(kind === 'submit' ? 'authentication' : 'forbidden');
    if (!UUID.test(id)) throw new ReviewError('not_found');
    return privateJson({code:'retired',error:'Course approvals are no longer required. Create and publish from your Course Studio. Legacy review history is retained.'},410);
  } catch (error) {
    const code = error instanceof ReviewError ? error.code : 'unavailable';
    const status = code === 'authentication' ? 401 : code === 'forbidden' ? 403 : code === 'not_found' ? 404 : code === 'validation' || code === 'invalid_transition' ? 400 : code === 'too_large' ? 413 : code === 'unavailable' ? 503 : 409;
    return privateJson({ code, error: messages[code] }, status);
  }
}
