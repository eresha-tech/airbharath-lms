'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { actionClass } from '../creator/styles';
export function StartBuild({ draftId, submissionId }: { draftId: string; submissionId: string }) {
  const pending=useRef(false); const [busy, setBusy] = useState(false), [error, setError] = useState(''); const router = useRouter();
  async function start() {
    if(pending.current)return;pending.current=true; setBusy(true); setError('');
    try { const response = await fetch(`/api/workspace/course-drafts/${draftId}/build`, { signal: AbortSignal.timeout(15000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ approvedSubmissionId: submissionId }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not start this course build. Try again.'); router.push(`/workspace/courses/${draftId}/build`); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Could not start this course build. Try again.'); }
    finally { pending.current=false; setBusy(false); }
  }
  return <div className="mt-5"><button type="button" disabled={busy} onClick={start} className={actionClass}>{busy ? 'Starting your build…' : 'Start Building Course'}</button>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}</div>;
}
