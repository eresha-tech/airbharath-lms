'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { APPLICATION_STATUSES, STATUS_LABELS, REVIEW_OPTIONS, REVIEW_LABELS, DECISION_REASONS, CONSENT_ACCURACY, CONSENT_CONTACT, type ApplicationStatus, type ReviewAssessments, type ReviewKey } from '@/lib/workspace/options';
import type { ApplicationDetail } from '@/lib/workspace/types';
import { isHttpUrl } from '@/lib/workspace/validation';
import { ApprovalCommunication } from './ApprovalCommunication';
import { WorkspaceLoading } from './ui/WorkspaceUI';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-6"><h2 className="mb-5 border-b border-border pb-4 text-lg font-semibold">{title}</h2><dl className="grid gap-5 sm:grid-cols-2">{children}</dl></section>;
}
function Value({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return <div className={wide ? 'sm:col-span-2' : ''}><dt className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</dt><dd className="whitespace-pre-wrap break-words text-sm leading-7">{value || <span className="text-muted-foreground">Not provided</span>}</dd></div>;
}
function ProfessionalLink({ url }: { url: string | null }) {
  if (!url || !isHttpUrl(url)) return <>Not provided</>;
  return <a className="inline-flex max-w-full items-start gap-2 break-all text-sm underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">{url}<ExternalLink aria-hidden="true" className="mt-1 size-3.5 shrink-0" /><span className="sr-only">(opens in a new tab)</span></a>;
}
const controlClass = 'min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const formatDate = (date: string | null) => date ? new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : 'Not yet recorded';

export function WorkspaceApplicationDetail({ id }: { id: string }) {
  const pending = useRef(false);
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [status, setStatus] = useState<ApplicationStatus>('submitted');
  const [assessments, setAssessments] = useState<ReviewAssessments>({});
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [reload, setReload] = useState(0);
  const [communicating, setCommunicating] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(''); setSaved(false); setSaveError(''); setConflict(false);
    fetch(`/api/admin/workspace-applications/${id}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]), cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not load application.'); return result.application as ApplicationDetail; })
      .then(data => { if (controller.signal.aborted) return; setApp(data); setStatus(data.applicationStatus); setAssessments(data.reviewAssessments); setNotes(data.internalNotes); setReason(data.decisionReason); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(['TimeoutError','AbortError','TypeError','SyntaxError'].includes(error.name) ? 'We could not load this application. Please retry.' : error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reload]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!app || pending.current || saving || communicating || app.approvalEmailStatus === 'sending') return;
    pending.current = true; setSaving(true); setSaved(false); setSaveError('');
    try {
      const response = await fetch(`/api/admin/workspace-applications/${id}`, { signal: AbortSignal.timeout(15000), method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationStatus: status, reviewAssessments: assessments, internalNotes: notes, decisionReason: reason, expectedUpdatedAt: app.updatedAt }) });
      const result = await response.json();
      if (!response.ok) { setConflict(response.status === 409); throw new Error(result.error || 'Could not save review.'); }
      setApp({ ...app, applicationStatus: status, reviewAssessments: assessments, internalNotes: notes, decisionReason: reason, updatedAt: result.updatedAt, reviewedAt: result.updatedAt, ...(status !== app.applicationStatus ? { statusChangedAt: result.updatedAt } : {}) });
      setSaved(true);
    } catch (error) { setSaveError(error instanceof Error && !['TimeoutError','AbortError','TypeError','SyntaxError'].includes(error.name) ? error.message : 'Could not confirm the review save. Your edits are still here. Retry or reload to check the saved state.'); }
    finally { pending.current = false; setSaving(false); }
  }
  function changed() { setSaved(false); }
  const back = <Button asChild variant="ghost" className="-ml-3"><Link href="/admin/workspace-applications"><ArrowLeft aria-hidden="true" />All applications</Link></Button>;
  if (loading) return <div className="ph-no-capture space-y-6">{back}<WorkspaceLoading title="application"/></div>;
  if (loadError || !app) return <div className="ph-no-capture space-y-6">{back}<div role="alert"><p className="mb-4">{loadError || 'Application not found.'}</p><Button onClick={() => setReload(r => r + 1)}>Try again</Button></div></div>;
  return <div className="ph-no-capture ph-sensitive space-y-6">
    {back}
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center"><div><p className="mb-2 break-all font-mono text-xs text-muted-foreground">{app.applicationReference}</p><h1 className="break-words text-2xl font-bold sm:text-3xl">{app.fullName}</h1><p className="mt-2 text-sm text-muted-foreground">Founding Creator application · submitted {formatDate(app.submittedAt)}</p></div><span className="self-start rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold sm:self-auto">{STATUS_LABELS[app.applicationStatus]}</span></header>
    {app.potentialDuplicate && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">A previous application used this email and mobile number. Review for a possible duplicate; this is not an automatic rejection.</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[1.15fr_1fr]">
      <div className="space-y-5">
        <Section title="Applicant"><Value label="Email" value={<a className="break-all underline underline-offset-4" href={`mailto:${app.email}`}>{app.email}</a>} /><Value label="Mobile" value={app.mobile} /><Value label="City / country" value={`${app.city}, ${app.country}`} /><Value label="Aviation background" value={app.aviationBackground} /><Value label="Current / most recent role" value={app.currentRole} /><Value label="Organisation" value={app.organisation} /><Value label="Experience" value={app.yearsExperience} /><Value label="Professional profile" value={<ProfessionalLink url={app.professionalProfileUrl} />} wide /></Section>
        <Section title="Course Idea"><Value label="Proposed course" value={app.proposedCourseTopic} wide /><Value label="Description" value={app.courseDescription} wide /><Value label="Target learner" value={app.targetLearner} wide /><Value label="Learner outcome" value={app.learnerOutcome} wide /></Section>
        <Section title="Creator Readiness"><Value label="Course readiness" value={app.courseReadiness} wide /><Value label="Teaching / training experience" value={app.teachingExperienceType} wide /><Value label="Experience details" value={app.teachingExperienceDescription} wide /><Value label="Sample content" value={<ProfessionalLink url={app.sampleContentUrl} />} wide /></Section>
        <Section title="Audience"><Value label="Audience status" value={app.audienceStatus} /><Value label="Approximate audience size" value={app.audienceSize} /><Value label="Channels" value={app.audienceChannels.join(', ')} wide /></Section>
        <Section title="Intent"><Value label="Why Workspace?" value={app.joiningReason} wide /><Value label="Additional information" value={app.additionalInformation} wide /></Section>
        <Section title="Consent & Receipt"><Value label="Accuracy confirmation" value={`${app.consentAccuracy ? 'Confirmed' : 'Not confirmed'} · ${formatDate(app.consentAccuracyAt)}\n${CONSENT_ACCURACY}`} wide /><Value label="Contact permission" value={`${app.consentContact ? 'Confirmed' : 'Not confirmed'} · ${formatDate(app.consentContactAt)}\n${CONSENT_CONTACT}`} wide /><Value label="Consent version" value={app.consentVersion} /><Value label="Receipt email sent" value={formatDate(app.receiptSentAt)} /></Section>
      </div>
      <div className="space-y-5"><form onSubmit={save} className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-label="Internal application review" aria-busy={saving}>
        <div className="border-b border-border pb-5"><div className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-5 text-primary" /><h2 className="text-lg font-semibold">Internal Review</h2></div><p className="mt-3 text-xs leading-6 text-muted-foreground">Visible only to authorized admins. Human reviewers make the decision; no automatic acceptance score.</p></div>
        <fieldset disabled={saving || conflict || communicating || app.approvalEmailStatus === 'sending'} className="space-y-5"><legend className="sr-only">Assessment and decision</legend>
          <div><label htmlFor="ws-review-status" className="mb-2 block text-sm font-semibold">Application status</label><select id="ws-review-status" className={controlClass} value={status} onChange={e => { setStatus(e.target.value as ApplicationStatus); changed(); }}>{APPLICATION_STATUSES.map(value => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2">{(Object.keys(REVIEW_OPTIONS) as ReviewKey[]).map(key => <div key={key}><label htmlFor={`ws-review-${key}`} className="mb-2 block text-xs font-medium">{REVIEW_LABELS[key]}</label><select id={`ws-review-${key}`} className={controlClass} value={assessments[key] || REVIEW_OPTIONS[key][REVIEW_OPTIONS[key].length - 1]} onChange={e => { setAssessments({ ...assessments, [key]: e.target.value }); changed(); }}>{REVIEW_OPTIONS[key].map(value => <option key={value} value={value}>{value}</option>)}</select></div>)}</div>
          <div><label htmlFor="ws-decision-reason" className="mb-2 block text-sm font-medium">Internal decision reason <span className="text-xs text-muted-foreground">Optional</span></label><select id="ws-decision-reason" className={controlClass} value={reason} onChange={e => { setReason(e.target.value); changed(); }}><option value="">No reason selected</option>{DECISION_REASONS.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
          <div><label htmlFor="ws-internal-notes" className="mb-2 block text-sm font-medium">Internal notes</label><Textarea id="ws-internal-notes" rows={6} maxLength={10000} className={controlClass} value={notes} onChange={e => { setNotes(e.target.value); changed(); }} placeholder="Evidence, follow-up questions and review context…" /></div>
          <p className="rounded-lg bg-muted/60 p-4 text-xs leading-6 text-muted-foreground">Changing status records a decision only. It does not create an account, grant permissions, send a status email or collect payment. “Invited to Activate” records an invitation handled manually by your team.</p>
        </fieldset>
        {saveError && <div role="alert" className="rounded-lg border border-red-300 p-4 text-sm text-red-700 dark:text-red-300"><p>{saveError}</p>{conflict && <Button type="button" variant="outline" className="mt-3" onClick={() => setReload(r => r + 1)}>Discard my edits and reload</Button>}</div>}
        {saved && <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">Review saved.</p>}
        <Button type="submit" disabled={saving || conflict || communicating || app.approvalEmailStatus === 'sending'} className="h-11 w-full">{saving ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Save aria-hidden="true" />} {saving ? 'Saving…' : 'Save review'}</Button>
        <div className="space-y-2 border-t border-border pt-5 text-xs text-muted-foreground"><p>Last reviewed: {formatDate(app.reviewedAt)}</p><p>Last status change: {formatDate(app.statusChangedAt)}</p><p>Last updated: {formatDate(app.updatedAt)}</p></div>
      </form><ApprovalCommunication app={app} dirty={saving || conflict || status !== app.applicationStatus || notes !== app.internalNotes || reason !== app.decisionReason || JSON.stringify(assessments) !== JSON.stringify(app.reviewAssessments)} onBusy={setCommunicating} onReload={() => setReload(r => r + 1)} onUpdate={changes => setApp(previous => previous ? { ...previous, ...changes } : previous)} /></div>
    </div>
  </div>;
}
