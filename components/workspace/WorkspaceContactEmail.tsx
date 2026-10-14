'use client';
import { useState } from 'react';
import { normalizeEmail } from '@/lib/workspace/email/model';

export function WorkspaceContactEmail({ initialEmail, onReady }: { initialEmail: string | null; onReady: (email: string | null) => void }) {
  const [draft, setDraft] = useState(initialEmail || ''), [saved, setSaved] = useState(initialEmail);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const email = normalizeEmail(draft);
    if (!email) { setError('Enter a valid contact email address.'); onReady(null); return; }
    setBusy(true); setError(''); setMessage(''); onReady(null);
    try {
      const response = await fetch('/api/workspace/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const data = await response.json(), contact = normalizeEmail(data.email);
      if (!response.ok || !contact) throw new Error('save_failed');
      setSaved(contact); setDraft(contact); setMessage('Contact email saved.'); onReady(contact);
    } catch { setError('We could not save your contact email. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="workspace-contact-title" className="rounded-xl border border-border p-5">
    <h2 id="workspace-contact-title" className="font-medium">Contact email</h2>
    <p id="workspace-contact-note" className="mt-2 text-sm text-muted-foreground">Keep your contact details up to date. Email OTP is not required for membership checkout. Payment and refund status is available in Billing &amp; Support after purchase.</p>
    <form onSubmit={save} className="mt-4">
      <label htmlFor="workspace-contact-email" className="text-sm">Email address</label>
      <div className="mt-2 flex flex-wrap gap-3"><input id="workspace-contact-email" type="email" required maxLength={254} autoComplete="email" value={draft} disabled={busy} onChange={event => { setDraft(event.target.value); setMessage(''); setError(''); onReady(normalizeEmail(event.target.value) === saved ? saved : null); }} aria-describedby="workspace-contact-note workspace-contact-feedback" aria-invalid={!!error} className="ph-no-capture min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /><button disabled={busy || (!!saved && normalizeEmail(draft) === saved)} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Saving…' : 'Save contact email'}</button></div>
      <p id="workspace-contact-feedback" role={error ? 'alert' : 'status'} className={`mt-3 text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{error || message || (saved && normalizeEmail(draft) === saved ? 'Contact email saved.' : 'Save your contact email before continuing.')}</p>
    </form>
  </section>;
}
