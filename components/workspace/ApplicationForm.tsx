'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AVIATION_BACKGROUNDS, EXPERIENCE_RANGES, COURSE_READINESS, TEACHING_EXPERIENCE, AUDIENCE_STATUS, AUDIENCE_CHANNELS, AUDIENCE_SIZES, CONSENT_ACCURACY, CONSENT_CONTACT } from '@/lib/workspace/options';
import { emptyApplication, STEP_FIELDS, TEXT_FIELDS, UUID_PATTERN, validateStep, type ApplicationInput, type FieldErrors } from '@/lib/workspace/validation';
import { trackWorkspace, type WorkspaceEvent } from '@/lib/workspace/analytics';

const steps = ['About You', 'Your Course Idea', 'Creator Readiness', 'Audience & Intent'];
const headings = ['Let’s start with your aviation background.', 'What would you like to teach?', 'Where are you in your creator journey?', 'Tell us about your audience.'];
const stepDescriptions = ['Your professional experience helps us understand your perspective.', 'A clear idea and a useful learner outcome matter more than a polished pitch.', 'You can apply whether your course is ready or it’s still an idea.', 'Audience size is not the primary criterion for creator selection.'];
const controlClass = 'min-h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ApplicationForm() {
  const [data, setData] = useState<ApplicationInput>(emptyApplication);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [keyConflict, setKeyConflict] = useState(false);
  const [reference, setReference] = useState('');
  const started = useRef(false);
  const submitted = useRef(false);
  const completed = useRef(new Set<number>());
  const viewed = useRef(new Set<number>());
  const submissionKey = useRef('');
  const form = useRef<HTMLFormElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (reference) successHeading.current?.focus(); }, [reference]);
  useEffect(() => { if (!viewed.current.has(step)) { viewed.current.add(step); trackWorkspace('workspace_step_viewed', undefined, step + 1); } }, [step]);
  const hasUnsavedAnswers = started.current && !reference;
  useEffect(() => {
    if (!hasUnsavedAnswers) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [hasUnsavedAnswers]);

  function update<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    if (!started.current) { started.current = true; trackWorkspace('workspace_application_started'); }
    setData(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setServerError('');
  }
  function focusErrors(nextErrors: FieldErrors) {
    trackWorkspace('workspace_validation_failed', undefined, step + 1, { failureCategory: 'validation' });
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`#ws-${first}`)?.focus());
  }
  function moveTo(next: number) {
    setStep(next); setErrors({}); setServerError('');
    requestAnimationFrame(() => heading.current?.focus());
  }
  function trackCompletion(index: number) {
    if (!completed.current.has(index)) {
      completed.current.add(index);
      trackWorkspace(`workspace_step_${index + 1}_completed` as WorkspaceEvent, data, index + 1);
    }
  }
  function getKey() {
    if (submissionKey.current) return submissionKey.current;
    try { submissionKey.current = sessionStorage.getItem('workspace-submission-key') || ''; } catch { /* Memory key still works in private browsing. */ }
    if (!UUID_PATTERN.test(submissionKey.current)) submissionKey.current = crypto.randomUUID();
    try { sessionStorage.setItem('workspace-submission-key', submissionKey.current); } catch { /* No application answers are stored. */ }
    return submissionKey.current;
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitted.current) return;
    const stepErrors = validateStep(data, step);
    if (Object.keys(stepErrors).length) { focusErrors(stepErrors); return; }
    trackCompletion(step);
    if (step < 3) { moveTo(step + 1); return; }
    const allErrors = Object.assign({}, ...steps.map((_, i) => validateStep(data, i))) as FieldErrors;
    if (Object.keys(allErrors).length) {
      const invalidStep = STEP_FIELDS.findIndex(keys => keys.some(k => !!allErrors[k]));
      setStep(Math.max(0, invalidStep)); focusErrors(allErrors); return;
    }
    submitted.current = true; setSubmitting(true); setServerError(''); setKeyConflict(false);
    trackWorkspace('workspace_submission_attempted', data);
    let failureCategory = 'network';
    try {
      const response = await fetch('/api/workspace/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, submissionKey: getKey() }), signal: AbortSignal.timeout(20_000) });
      failureCategory = response.status === 409 ? 'conflict' : response.status === 429 ? 'rate_limited' : response.status === 400 ? 'validation' : response.status >= 500 ? 'unavailable' : 'unknown';
      const result = await response.json();
      if (!response.ok) {
        if (result.errors && typeof result.errors === 'object') {
          const invalidStep = STEP_FIELDS.findIndex(keys => keys.some(k => !!result.errors[k]));
          if (invalidStep >= 0) setStep(invalidStep);
          focusErrors(result.errors);
        }
        setKeyConflict(response.status === 409);
        throw new Error(result.error || 'Your application could not be saved. Please try again.');
      }
      if (typeof result.applicationReference !== 'string' || result.status !== 'submitted') throw new Error('We could not confirm your submission. Please try again.');
      trackWorkspace('workspace_application_submitted', data);
      setReference(result.applicationReference);
      try { sessionStorage.removeItem('workspace-submission-key'); } catch { /* Receipt remains on screen. */ }
    } catch (error) { trackWorkspace('workspace_submission_failed', undefined, undefined, { failureCategory }); setServerError(failureCategory === 'network' ? 'We could not confirm your submission. Your answers are still here. Please retry to check whether it was saved.' : error instanceof Error ? error.message : 'We could not confirm your submission. Please retry.'); }
    finally { submitted.current = false; setSubmitting(false); }
  }
  function field(key: keyof typeof TEXT_FIELDS, label: string, options: { type?: string; textarea?: boolean; placeholder?: string; hint?: string; wide?: boolean; autoComplete?: string } = {}) {
    const error = errors[key];
    const properties = {
      id: `ws-${key}`, name: key, value: data[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, e.target.value),
      required: TEXT_FIELDS[key].required, maxLength: TEXT_FIELDS[key].max, placeholder: options.placeholder,
      'aria-invalid': !!error, 'aria-describedby': error ? `ws-${key}-error` : options.hint ? `ws-${key}-hint` : undefined,
      className: `${controlClass} ${error ? 'border-red-600 dark:border-red-400' : ''}`,
      autoComplete: options.autoComplete || 'off', spellCheck: !['email', 'professionalProfileUrl', 'sampleContentUrl'].includes(key),
    };
    return <div className={`space-y-2 ${options.wide ? 'sm:col-span-2' : ''}`} key={key}>
      <label htmlFor={properties.id} className="block text-sm font-medium">{label}{' '}<span className="ml-2 text-xs font-normal text-muted-foreground">{TEXT_FIELDS[key].required ? 'Required' : 'Optional'}</span></label>
      {options.textarea ? <Textarea {...properties} rows={4} /> : <Input {...properties} type={options.type || 'text'} inputMode={options.type === 'tel' ? 'tel' : options.type === 'email' ? 'email' : undefined} />}
      {options.hint && <p id={`ws-${key}-hint`} className="text-xs leading-5 text-muted-foreground">{options.hint}</p>}
      {error && <p id={`ws-${key}-error`} className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>;
  }
  function select(key: 'aviationBackground' | 'yearsExperience' | 'courseReadiness' | 'teachingExperienceType' | 'audienceStatus' | 'audienceSize', label: string, choices: readonly string[], wide = true) {
    return <div key={key} className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}><label htmlFor={`ws-${key}`} className="block text-sm font-medium">{label}{' '}<span className="ml-2 text-xs font-normal text-muted-foreground">Required</span></label><select id={`ws-${key}`} name={key} required value={data[key]} onChange={e => update(key, e.target.value)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `ws-${key}-error` : undefined} className={`${controlClass} ${errors[key] ? 'border-red-600 dark:border-red-400' : ''}`}><option value="">Select an option</option>{choices.map(v => <option key={v} value={v}>{v}</option>)}</select>{errors[key] && <p id={`ws-${key}-error`} className="text-xs text-red-700 dark:text-red-300">{errors[key]}</p>}</div>;
  }

  if (reference) return <div className="ph-no-capture rounded-3xl border border-primary/30 bg-card p-7 sm:p-10" role="status"><div className="mb-7 flex size-14 items-center justify-center rounded-full bg-primary/15"><CheckCircle2 aria-hidden="true" className="size-7 text-primary" /></div><h3 ref={successHeading} tabIndex={-1} className="workspace-heading rounded-lg text-4xl font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">You&apos;re in.</h3><p className="mt-4 text-xl font-medium">Your Workspace Creator application has been received.</p><p className="mt-5 text-sm leading-7 text-muted-foreground">Thanks for applying to join the AirBharath Workspace Founding Creator Program. Our team will review your aviation background, course idea and creator profile.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">If your application is selected, we&apos;ll contact you with the next steps for activating your Workspace.</p><dl className="my-7 space-y-3 rounded-xl bg-muted/50 p-5 text-sm"><div><dt className="text-muted-foreground">Application ID</dt><dd className="mt-1 break-all font-mono font-semibold">{reference}</dd></div><div><dt className="text-muted-foreground">Application Status</dt><dd className="mt-1 font-semibold">Submitted</dd></div></dl><p className="mb-6 text-xs leading-6 text-muted-foreground">Please keep your application ID. Receipt email delivery depends on availability. Application receipt is not creator approval.</p><Button asChild className="h-12 rounded-xl"><Link href="/">Back to AirBharath<ArrowRight aria-hidden="true" /></Link></Button></div>;
  return <form ref={form} onSubmit={submit} noValidate className="ph-no-capture ph-sensitive rounded-3xl border border-border bg-card p-5 shadow-[0_16px_60px_-35px_rgba(26,23,64,.2)] sm:p-8" aria-labelledby="ws-step-heading" aria-busy={submitting}>
    <ol className="grid grid-cols-4 gap-2 border-b border-border pb-6" aria-label="Application progress">{steps.map((title, i) => <li key={title} aria-current={step === i ? 'step' : undefined}><span className={`mb-2 flex size-7 items-center justify-center rounded-full text-xs font-semibold ${i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{i < step ? <Check aria-hidden="true" className="size-3.5" /> : i + 1}</span><span className={`block text-[10px] leading-4 sm:text-xs ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{title}</span><span className={`mt-3 block h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} /></li>)}</ol>
    <div className="pb-7 pt-6"><p className="mb-3 font-mono text-xs text-muted-foreground">STEP 0{step + 1} OF 04</p><h3 id="ws-step-heading" ref={heading} tabIndex={-1} className="text-xl font-semibold leading-tight rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-2xl">{headings[step]}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{stepDescriptions[step]}</p></div>
    <fieldset disabled={submitting} className="grid gap-5 sm:grid-cols-2"><legend className="sr-only">{steps[step]}</legend>
      {step === 0 && <>
        {field('fullName', 'Full name', { autoComplete: 'name', wide: true })}
        {field('email', 'Email address', { type: 'email', autoComplete: 'email' })}
        {field('mobile', 'Mobile number', { type: 'tel', autoComplete: 'tel', placeholder: '+91 98765 43210' })}
        {field('city', 'City', { autoComplete: 'address-level2' })}
        {field('country', 'Country', { autoComplete: 'country-name' })}
        {select('aviationBackground', 'Aviation background', AVIATION_BACKGROUNDS)}
        {field('currentRole', 'Current / most recent aviation role', { wide: true })}
        {field('organisation', 'Current / most recent organisation', { wide: true })}
        {select('yearsExperience', 'Years of aviation experience', EXPERIENCE_RANGES)}
        {field('professionalProfileUrl', 'LinkedIn / professional profile', { type: 'url', wide: true, placeholder: 'https://', hint: 'Encouraged: a professional profile helps us understand your aviation experience.' })}
      </>}
      {step === 1 && <>
        {field('proposedCourseTopic', 'Proposed course topic', { wide: true, placeholder: 'Cabin Crew Interview Preparation' })}
        {field('courseDescription', 'Describe the course', { textarea: true, wide: true, hint: 'What do you intend to teach? Tell us about the subjects and practical knowledge you’ll share.' })}
        {field('targetLearner', 'Who is the course for?', { textarea: true, wide: true, hint: 'Describe the learner audience and any experience they should already have.' })}
        {field('learnerOutcome', 'What should a learner be able to do after completing your course?', { textarea: true, wide: true })}
      </>}
      {step === 2 && <>
        {select('courseReadiness', 'Course readiness', COURSE_READINESS)}
        {select('teachingExperienceType', 'Teaching / training experience', TEACHING_EXPERIENCE)}
        {data.teachingExperienceType && data.teachingExperienceType !== TEACHING_EXPERIENCE[2] && field('teachingExperienceDescription', 'Tell us briefly about your teaching or training experience', { textarea: true, wide: true })}
        {field('sampleContentUrl', 'Existing course / sample content link', { type: 'url', wide: true, placeholder: 'https://', hint: 'YouTube, a course platform, your website, portfolio or a cloud-hosted sample. We won’t automatically scrape the link.' })}
      </>}
      {step === 3 && <>
        {select('audienceStatus', 'Do you have a professional network, learner base or audience you could introduce your course to?', AUDIENCE_STATUS)}
        {data.audienceStatus === 'Yes' && <>
          <fieldset className="sm:col-span-2"><legend className="mb-3 text-sm font-medium">Where is your audience? <span className="text-xs font-normal text-muted-foreground">Required · select all that apply</span></legend><div id="ws-audienceChannels" tabIndex={-1} className="grid gap-2 sm:grid-cols-2">{AUDIENCE_CHANNELS.map(channel => <label key={channel} className={`workspace-check-label flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm ${data.audienceChannels.includes(channel) ? 'border-primary bg-primary/10' : 'border-border'}`}><input type="checkbox" name="audienceChannels" value={channel} checked={data.audienceChannels.includes(channel)} onChange={e => update('audienceChannels', e.target.checked ? [...data.audienceChannels, channel] : data.audienceChannels.filter(c => c !== channel))} className="workspace-checkbox" aria-describedby={errors.audienceChannels ? 'ws-audienceChannels-error' : undefined} />{channel}</label>)}</div>{errors.audienceChannels && <p id="ws-audienceChannels-error" className="mt-2 text-xs text-red-700 dark:text-red-300">{errors.audienceChannels}</p>}</fieldset>
          {select('audienceSize', 'Approximate total audience / community size', AUDIENCE_SIZES)}
        </>}
        {field('joiningReason', 'Why do you want to become an AirBharath Workspace Creator?', { textarea: true, wide: true })}
        {field('additionalInformation', 'Anything else you would like us to know?', { textarea: true, wide: true })}
        <div className="space-y-5 border-t border-border pt-6 sm:col-span-2">{(['consentAccuracy', 'consentContact'] as const).map((key, i) => <div key={key}><label className="workspace-check-label flex cursor-pointer items-start gap-3 text-xs leading-6"><input id={`ws-${key}`} name={key} type="checkbox" required checked={data[key]} onChange={e => update(key, e.target.checked)} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `ws-${key}-error` : undefined} className="workspace-checkbox" /><span>{i === 0 ? CONSENT_ACCURACY : CONSENT_CONTACT}<span className="ml-1 font-semibold">(Required)</span></span></label>{errors[key] && <p id={`ws-${key}-error`} className="mt-2 text-xs text-red-700 dark:text-red-300">{errors[key]}</p>}</div>)}<p className="text-xs leading-6 text-muted-foreground">Read our <Link className="text-foreground underline underline-offset-4" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy (opens in a new tab)</Link>. No payment is required to apply.</p></div>
      </>}
    </fieldset>
    {(serverError || errors.form) && <div role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">{serverError || errors.form}{keyConflict && <Button type="button" variant="outline" className="mt-3 block" onClick={() => { submissionKey.current = crypto.randomUUID(); try { sessionStorage.setItem('workspace-submission-key', submissionKey.current); } catch { /* Memory fallback */ } setKeyConflict(false); setServerError(''); }}>Start a fresh submission</Button>}</div>}
    {Object.values(errors).some(Boolean) && <p role="alert" className="mt-4 text-xs text-red-700 dark:text-red-300">Please check the highlighted fields before continuing.</p>}
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">{step > 0 ? <Button type="button" variant="ghost" disabled={submitting} className="h-12 rounded-xl" onClick={() => moveTo(step - 1)}><ArrowLeft aria-hidden="true" />Previous</Button> : <span className="text-xs text-muted-foreground">Four short steps.</span>}<Button type="submit" disabled={submitting} className="h-12 rounded-xl px-5">{submitting ? <><Loader2 aria-hidden="true" className="animate-spin" />Submitting…</> : <>{step === 3 ? 'Submit Application' : 'Next step'}<ArrowRight aria-hidden="true" /></>}</Button></div>
  </form>;
}
