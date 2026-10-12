'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { CURRENT_CREATOR_TERMS, creatorTermsHref } from '@/lib/workspace/terms/document';

export function CreatorTermsAcceptance({ onAccepted }: { onAccepted: (accepted: boolean) => void }) {
  const [checked, setChecked] = useState(false), [busy, setBusy] = useState(false), [saved, setSaved] = useState(false), [message, setMessage] = useState('');
  const pending = useRef(false);
  async function accept() {
    if (!checked || pending.current) return;
    pending.current = true; setBusy(true); setMessage(''); setSaved(false); onAccepted(false);
    try {
      const response = await fetch('/api/workspace/creator-terms/accept', { method: 'POST', headers: { 'Content-Type': 'application/json', 'If-Match': `"${CURRENT_CREATOR_TERMS.contentHash}"` }, body: JSON.stringify({ acknowledged: true }), cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your agreement could not be recorded. Please try again.');
      if (data.acceptance?.termsVersion !== CURRENT_CREATOR_TERMS.version || data.acceptance?.termsContentHash !== CURRENT_CREATOR_TERMS.contentHash) throw new Error('The Creator Terms changed. Reload and review the current version.');
      setSaved(true); onAccepted(true); setMessage('Your Creator Terms agreement has been recorded.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Your agreement could not be confirmed. Please retry; repeated agreement converges safely.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section aria-label="Creator Terms agreement" aria-busy={busy} className="ph-no-capture ph-sensitive mb-6 space-y-4 text-sm">
    <label className="flex items-start gap-3"><input type="checkbox" checked={checked} disabled={busy} onChange={event => { setChecked(event.target.checked); setSaved(false); onAccepted(false); setMessage(''); }} className="mt-1 size-4 shrink-0 accent-current" /><span>I agree to the AirBharath Workspace <Link href={creatorTermsHref()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Creator Terms</Link> (opens in a new tab).</span></label>
    <p className="text-xs text-muted-foreground">Version {CURRENT_CREATOR_TERMS.version}. Agreement is recorded on the server and does not start a payment.</p>
    <button type="button" disabled={!checked || busy || saved} onClick={() => void accept()} className="rounded-xl border border-border px-4 py-3 font-medium disabled:opacity-50">{busy ? 'Recording agreement…' : saved ? 'Agreement recorded' : 'Save Creator Terms agreement'}</button>
    {message && <p role="status" className="text-sm leading-6">{message}</p>}
  </section>;
}
