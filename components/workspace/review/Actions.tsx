'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReviewStatus, ReviewAction } from '@/lib/workspace/review/model';
import { inputClass } from '../creator/Fields';
const button = 'rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50';
function useCommand() {
  const router = useRouter(); const retry = useRef<{ context: string; key: string } | null>(null); const inflight = useRef(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [conflict, setConflict] = useState(false);
  async function send(url: string, method: string, command: object) {
    if (inflight.current || conflict) return;
    const context = JSON.stringify({ url, command });
    if (retry.current?.context !== context) retry.current = { context, key: crypto.randomUUID() };
    inflight.current = true; setBusy(true); setMessage('Saving review action…');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...command, requestKey: retry.current.key }) });
      const result = await response.json();
      if (!response.ok) { setMessage(typeof result.error === 'string' ? result.error : 'We could not confirm this action. Please retry.'); setConflict(response.status === 409); return; }
      setMessage('Saved. Refreshing the current review…'); router.refresh();
    } catch { setMessage('We could not confirm this action. Your answers are still here. Retry the same action or reload to check its saved state.'); }
    finally { inflight.current = false; setBusy(false); }
  }
  return { busy, message, conflict, send };
}
function Notice({ message, conflict }: { message: string; conflict: boolean }) { return <>{message && <p role="status" aria-live="polite" className="mt-4 text-sm leading-6">{message}</p>}{conflict && <button type="button" onClick={() => window.location.reload()} className="mt-3 text-sm text-primary underline">Reload current review (unsaved answers will be replaced)</button>}</>; }
export function SubmitReview({ id, version, resubmit }: { id: string; version: number; resubmit: boolean }) {
  const [confirming, setConfirming] = useState(false); const command = useCommand();
  return <div className="mt-5">{!confirming ? <button className={button} onClick={() => setConfirming(true)}>{resubmit ? 'Resubmit for Review' : 'Submit for AirBharath Review'}</button> : <div className="space-y-4 rounded-lg border border-primary/30 p-5"><p className="text-sm leading-7">You are submitting the currently saved course version {version} to AirBharath for review. You will not be able to edit it while review is in progress. Save any edits first.</p><p className="text-sm leading-7 text-muted-foreground">Course approval is separate from publication and does not represent DGCA, airline, government or regulatory approval.</p><div className="flex flex-wrap gap-4"><button disabled={command.busy || command.conflict} className={button} onClick={() => command.send(`/api/workspace/course-drafts/${id}/submit`, 'POST', { expectedDraftVersion: version })}>{command.busy ? 'Submitting…' : 'Confirm submission'}</button><button disabled={command.busy} className="text-sm underline" onClick={() => setConfirming(false)}>Cancel</button></div></div>}<Notice message={command.message} conflict={command.conflict} /></div>;
}
export function AdminReviewActions({ id, status }: { id: string; status: ReviewStatus }) {
  const command = useCommand(); const [feedback, setFeedback] = useState(''); const [note, setNote] = useState(''); const [approve, setApprove] = useState(false);
  function send(action: ReviewAction) { return command.send(`/api/admin/workspace/course-reviews/${id}`, 'PATCH', { action, expectedStatus: status, ...(action === 'request_changes' ? { feedback } : action === 'approve' ? { note } : {}) }); }
  if (status === 'approved' || status === 'changes_requested') return <p className="text-sm text-muted-foreground">This submission is complete and read-only.</p>;
  return <section className="rounded-xl border border-border bg-card p-6"><h2 className="font-outfit text-xl font-semibold">Review decision</h2>{status === 'submitted' ? <button disabled={command.busy || command.conflict} className={`${button} mt-5`} onClick={() => send('start_review')}>Start Review</button> : <fieldset disabled={command.busy || command.conflict} className="mt-5 space-y-6"><form onSubmit={event => { event.preventDefault(); send('request_changes'); }} className="space-y-3"><label htmlFor="review-feedback" className="block text-sm font-semibold">Changes needed · creator-visible feedback</label><textarea id="review-feedback" required minLength={10} maxLength={2000} rows={5} value={feedback} onChange={event => setFeedback(event.target.value)} className={inputClass} /><p className="text-xs text-muted-foreground">10–2,000 characters of plain text. Explain what the creator should change.</p><button disabled={feedback.trim().length < 10} className={button}>Request Changes</button></form><div className="space-y-3 border-t border-border pt-6"><label htmlFor="review-note" className="block text-sm font-semibold">Approval note · optional, creator-visible</label><textarea id="review-note" maxLength={1000} rows={3} value={note} onChange={event => setNote(event.target.value)} className={inputClass} /><p className="text-xs leading-6 text-muted-foreground">Up to 1,000 characters. Approval does not publish a course, set a selling price or confer regulatory approval.</p>{approve ? <div className="space-y-3"><p className="text-sm">Confirm AirBharath approval of this submitted version for the next preparation stage.</p><button className={button} onClick={() => send('approve')}>Confirm Course Review Approval</button><button className="ml-4 text-sm underline" onClick={() => setApprove(false)}>Cancel</button></div> : <button className={button} onClick={() => setApprove(true)}>Approve Course Review</button>}</div></fieldset>}<Notice message={command.message} conflict={command.conflict} /></section>;
}
