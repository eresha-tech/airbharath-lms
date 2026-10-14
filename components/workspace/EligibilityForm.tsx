'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CATEGORIES, DECLARATIONS, EXPERIENCE_OPTIONS, PROFESSIONAL_STATUSES, type SettingsConfig } from '@/lib/workspace/eligibility/model';
import { trackEligibilityStarted } from '@/lib/workspace/eligibility/analytics';
const control = 'mt-2 min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
export function EligibilityForm({ settingsId, policyId, config, declarations }: { settingsId: string; policyId: string; config: SettingsConfig; declarations: Record<keyof typeof DECLARATIONS, string> }) {
  const router = useRouter();
  const started = useRef(false);
  const submission = useRef<{ key: string; body: string } | null>(null);
  const [category, setCategory] = useState(''); const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false); const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState(''); const [errors, setErrors] = useState<Record<string, string>>({});
  function start() { if (!started.current) { started.current = true; trackEligibilityStarted(); } }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    if (!submission.current) {
      const key = crypto.randomUUID();
      const answers = Object.fromEntries(['category', 'aviationProfession', 'experienceOption', 'professionalStatus', 'professionalStatusDetail', 'professionalProfileUrl', 'teachingCategory', 'courseIdea'].map(name => [name, String(form.get(name) || '')]));
      submission.current = { key, body: JSON.stringify({ ...answers, submissionKey: key, settingsId, policyId, declarations: Object.fromEntries(Object.keys(declarations).map(key => [key, form.get(key) === 'on'])) }) };
    }
    setBusy(true); setMessage(''); setErrors({});
    try {
      const response = await fetch('/api/workspace/eligibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: submission.current.body, signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      if (response.ok && data.attempt?.id) { router.replace('/workspace/eligibility-result'); router.refresh(); return; }
      if (response.status === 400) { submission.current = null; setUncertain(false); setErrors(data.errors || {}); }
      else if ([401, 403, 409, 429].includes(response.status)) { submission.current = null; setUncertain(false); }
      else setUncertain(true);
      setMessage(data.error || 'Eligibility is temporarily unavailable. Your answers are still here.');
    } catch { setUncertain(true); setMessage('We could not confirm the result. Your answers are still here. Retry the same submission.'); }
    finally { setBusy(false); }
  }
  function fieldError(name: string) { return errors[name] ? <p id={`${name}-error`} className="mt-2 text-sm text-destructive">{errors[name]}</p> : null; }
  function props(name: string) { return { name, id: name, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? `${name}-error` : undefined }; }
  return <form onSubmit={submit} onFocus={start} className="ph-no-capture space-y-8 rounded-2xl border border-border bg-card p-6 sm:p-9">
    <div className="border-b border-border pb-6"><h2 className="font-outfit text-xl font-semibold">Workspace Eligibility Check</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The current minimum is {config.minimumExperienceMonths} months of aviation experience. This is a self-declared eligibility check, with no payment.</p></div>
    {message && <div role="alert" tabIndex={-1} className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6">{message}{errors.form && <p>{errors.form}</p>}<p className="mt-2"><a className="underline" href="/workspace/apply">Reload the current form</a> · <Link className="underline" href="/login?callbackUrl=%2Fworkspace%2Fapply">Sign in again</Link></p></div>}
    <fieldset disabled={busy || uncertain} className="space-y-6 disabled:opacity-70">
      <div><label htmlFor="category" className="text-sm font-semibold">Aviation profession</label><select {...props('category')} required value={category} onChange={e => setCategory(e.target.value)} className={control}><option value="">Choose your profession</option>{CATEGORIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>{fieldError('category')}</div>
      {category === 'other_aviation' && <div><label htmlFor="aviationProfession" className="text-sm font-semibold">Specify your aviation profession</label><input {...props('aviationProfession')} required maxLength={120} className={control} />{fieldError('aviationProfession')}</div>}
      <div><label htmlFor="experienceOption" className="text-sm font-semibold">Aviation experience</label><select {...props('experienceOption')} required defaultValue="" className={control}><option value="">Choose your experience</option>{EXPERIENCE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>{fieldError('experienceOption')}</div>
      <div><label htmlFor="professionalStatus" className="text-sm font-semibold">Current professional status</label><select {...props('professionalStatus')} required value={status} onChange={e => setStatus(e.target.value)} className={control}><option value="">Choose your status</option>{PROFESSIONAL_STATUSES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><p className="mt-2 text-xs text-muted-foreground">Working, independent and retired professionals can qualify on the same rules.</p>{fieldError('professionalStatus')}</div>
      {status === 'other' && <div><label htmlFor="professionalStatusDetail" className="text-sm font-semibold">Additional context (optional)</label><input {...props('professionalStatusDetail')} maxLength={120} className={control} />{fieldError('professionalStatusDetail')}</div>}
      <div><label htmlFor="professionalProfileUrl" className="text-sm font-semibold">Professional profile URL{!config.profileRequired && ' (optional)'}</label><input {...props('professionalProfileUrl')} required={config.profileRequired} type="url" maxLength={2048} placeholder="https://www.linkedin.com/in/your-profile" className={control} /><p className="mt-2 text-xs leading-5 text-muted-foreground">A LinkedIn profile or another public professional page. We store the link for onboarding context; this check does not fetch or verify it.</p>{fieldError('professionalProfileUrl')}</div>
      <div><label htmlFor="teachingCategory" className="text-sm font-semibold">What aviation subject would you teach?</label><select {...props('teachingCategory')} required defaultValue="" className={control}><option value="">Choose a teaching category</option>{CATEGORIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>{fieldError('teachingCategory')}</div>
      <div><label htmlFor="courseIdea" className="text-sm font-semibold">First course title or idea</label><input {...props('courseIdea')} required maxLength={200} className={control} /><p className="mt-2 text-xs text-muted-foreground">Up to 200 characters. An idea is enough; no course is created here.</p>{fieldError('courseIdea')}</div>
      <fieldset className="space-y-4 border-t border-border pt-6"><legend className="mb-4 text-lg font-semibold">Eligibility declarations</legend>{Object.entries(declarations).map(([key, label]) => <div key={key}><label className="workspace-check-label flex items-start gap-3 text-sm leading-6"><input type="checkbox" required name={key} aria-invalid={!!errors[`declarations.${key}`]} aria-describedby={errors[`declarations.${key}`] ? `declarations.${key}-error` : undefined} className="workspace-checkbox" />{label}</label>{fieldError(`declarations.${key}`)}</div>)}{fieldError('declarations')}</fieldset>
    </fieldset>
    <p className="text-xs leading-6 text-muted-foreground">We use your account, professional information, answers and declarations to assess eligibility, record the decision and administer onboarding. Authorized admins can review this history. Form answers, contact details and profile links are excluded from Workspace analytics. Marketing consent is not required. Read our <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>.</p>
    {uncertain && <p role="status" className="text-sm">Your submitted answers are held unchanged while we recover the result.</p>}
    <button disabled={busy} className="min-h-12 w-full rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Checking eligibility…' : uncertain ? 'Retry the same submission' : 'Check eligibility'}</button>
  </form>;
}
