'use client';
import { useEffect, useRef, useState } from 'react';
import type { EmailStatus } from '@/lib/workspace/email/model';
import { PendingLabel } from './ui/WorkspaceUI';
export function WorkspaceEmailVerification({ initialStatus, onVerified }: { initialStatus: EmailStatus; onVerified: (verified: boolean) => void }) {
  const [status, setStatus] = useState(initialStatus), [email, setEmail] = useState(initialStatus.email || ''), [code, setCode] = useState('');
  const [editing, setEditing] = useState(!initialStatus.verified), [busy, setBusy] = useState<'request' | 'confirm' | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [now, setNow] = useState<number | null>(null), pending = useRef(false);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer); }, []);
  const resendAt = Date.parse(status.resendAt || status.challenge?.resendAt || '');
  const remaining = now === null || !Number.isFinite(resendAt) ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expiresAt = Date.parse(status.challenge?.expiresAt || '');
  const sameEmail = email.trim().toLowerCase() === status.email?.trim().toLowerCase();
  const expired = now !== null && (!Number.isFinite(expiresAt) || now >= expiresAt);
  const usable = !!status.challenge && status.challenge.state === 'accepted' && sameEmail && now !== null && !expired;
  async function submit(action: 'request' | 'confirm') {
    if (pending.current || (action === 'confirm' && (!usable || Date.now() >= expiresAt))) return;
    pending.current = true; setBusy(action); setError(''); setMessage('');
    try {
      const r = await fetch(`/api/workspace/email/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action === 'request' ? { email } : { challengeId: status.challenge?.id, code }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await r.json();
      if (r.status === 429 && Number.isInteger(data.retryAfter) && data.retryAfter > 0 && data.retryAfter <= 3600) setStatus(previous => ({ ...previous, resendAt: new Date(Date.now() + data.retryAfter * 1000).toISOString() }));
      if (!r.ok || !data.status) throw Error(data.error || 'We could not complete email verification. Please try again.');
      const next = data.status as EmailStatus; setStatus(next); setEmail(next.email || email); setCode(''); onVerified(next.verified);
      if (next.verified) { setEditing(false); setMessage('Email verified.'); }
      else setMessage('Verification code requested. Check your inbox; delivery may take a moment.');
    } catch (e) { setError(e instanceof Error && !['TimeoutError','AbortError','TypeError','SyntaxError'].includes(e.name) ? e.message : 'Email verification is unavailable. Your email is still here. Please retry.'); onVerified(false); }
    finally { pending.current = false; setBusy(null); }
  }
  const field = 'mt-2 w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 focus-visible:ring-2 focus-visible:ring-ring';
  const button = 'mt-3 min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50';
  return <section aria-label="Verify Workspace email" aria-busy={!!busy} className="ph-no-capture ph-sensitive min-w-0 rounded-2xl border border-border bg-card p-6"><h2 className="font-outfit text-xl font-semibold">Step 2 — Verify email</h2>
    {status.verified && !editing ? <><p className="mt-3 break-all text-sm">Email verified · {status.email}</p><button type="button" onClick={() => { setEditing(true); onVerified(false); setMessage(''); }} className="mt-3 min-h-11 text-sm underline">Change email</button></> : <>
      <p className="mt-3 text-sm text-muted-foreground">Verify the email you want to use for Workspace before starting a new membership purchase. Phone login stays the same.</p>
      <form className="mt-4" onSubmit={e => { e.preventDefault(); void submit('request'); }}><label htmlFor="workspace-email" className="text-sm">Email address</label><input id="workspace-email" name="email" spellCheck={false} autoCapitalize="none" type="email" autoComplete="email" required maxLength={254} value={email} disabled={!!busy} onChange={e => { setEmail(e.target.value); setMessage(''); onVerified(false); }} aria-describedby={'workspace-email-error'+(status.challenge?' workspace-email-challenge-status':'')} className={field}/><button disabled={!!busy || remaining > 0} className={button}>{busy === 'request' ? <PendingLabel>Sending…</PendingLabel> : remaining > 0 ? `Resend in ${remaining}s` : status.challenge ? 'Resend verification code' : 'Send verification code'}</button></form>
      {status.challenge && <><p id="workspace-email-challenge-status" role="status" className="mt-4 break-words text-sm text-muted-foreground">{!sameEmail ? 'The current code belongs to the previous email. Request a new code for the address above.' : expired ? 'This verification code has expired. Request a new code.' : status.challenge.state !== 'accepted' ? 'Code delivery is not yet confirmed. Request a new code when resend is available.' : `Enter the code sent to ${status.email}.`}</p><form className="mt-5" onSubmit={e => { e.preventDefault(); void submit('confirm'); }}><label htmlFor="workspace-email-code" className="text-sm">Six-digit verification code</label><input id="workspace-email-code" name="verificationCode" spellCheck={false} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={!!busy || !usable} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} aria-describedby="workspace-email-error workspace-email-challenge-status" className={`${field} tracking-widest`}/><button disabled={!!busy || !usable || code.length !== 6} className={button}>{busy === 'confirm' ? <PendingLabel>Verifying…</PendingLabel> : 'Verify email'}</button></form></>}
    </>}
    <p id="workspace-email-error" role={error ? 'alert' : undefined} className="mt-3 text-sm text-destructive">{error}</p><p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>
  </section>;
}
