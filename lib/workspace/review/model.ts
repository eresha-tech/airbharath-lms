import { version } from '../creator/model';
import { UUID } from '../eligibility/model';
export const REVIEW_STATUSES = ['submitted', 'under_review', 'changes_requested', 'approved'] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];
export type ReviewAction = 'start_review' | 'request_changes' | 'approve';
export class ReviewError extends Error {
  constructor(public code: 'authentication' | 'forbidden' | 'not_found' | 'stale_draft' | 'review_in_progress' | 'already_approved' | 'no_changes_to_resubmit' | 'conflict' | 'invalid_transition' | 'validation' | 'too_large' | 'unavailable') { super(code); }
}
export function permitsDraftEdit(status?: ReviewStatus | null) { return !status || status === 'changes_requested'; }
export const reviewLabels: Record<ReviewStatus, string> = { submitted: 'Submitted for Review', under_review: 'AirBharath Review in Progress', changes_requested: 'Changes Requested', approved: 'AirBharath Course Review Approved' };
function object(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ReviewError('validation'); return value as Record<string, unknown>; }
function exact(input: Record<string, unknown>, fields: string[]) { if (Object.keys(input).some(key => !fields.includes(key))) throw new ReviewError('validation'); }
function requestKey(value: unknown) { if (typeof value !== 'string' || !UUID.test(value)) throw new ReviewError('validation'); return value; }
function expectedVersion(value: unknown) { try { const v = version(value); if (!v) throw new ReviewError('validation'); return v; } catch { throw new ReviewError('validation'); } }
function plain(value: unknown, min: number, max: number) {
  if (typeof value !== 'string') throw new ReviewError('validation');
  const text = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
  if (text.length < min || text.length > max || /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new ReviewError('validation'); return text;
}
export function submitCommand(value: unknown) {
  const input = object(value); exact(input, ['expectedDraftVersion', 'requestKey']);
  return { expectedDraftVersion: expectedVersion(input.expectedDraftVersion), requestKey: requestKey(input.requestKey) };
}
export type SubmitCommand = ReturnType<typeof submitCommand>;
export type AdminCommand = { action: ReviewAction; expectedStatus: 'submitted' | 'under_review'; requestKey: string; feedback: string | null; note: string | null };
export function adminCommand(value: unknown): AdminCommand {
  const input = object(value);
  if (!['start_review', 'request_changes', 'approve'].includes(String(input.action))) throw new ReviewError('validation');
  const action = input.action as ReviewAction;
  exact(input, ['action', 'expectedStatus', 'requestKey', ...(action === 'request_changes' ? ['feedback'] : action === 'approve' ? ['note'] : [])]);
  const expectedStatus = action === 'start_review' ? 'submitted' : 'under_review';
  if (input.expectedStatus !== expectedStatus) throw new ReviewError('invalid_transition');
  return { action, expectedStatus, requestKey: requestKey(input.requestKey), feedback: action === 'request_changes' ? plain(input.feedback, 10, 2000) : null, note: action === 'approve' && input.note !== undefined ? plain(input.note, 0, 1000) || null : null };
}
