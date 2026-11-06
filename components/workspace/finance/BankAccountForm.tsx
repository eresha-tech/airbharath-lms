'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SETTLEMENT_COPY } from '@/lib/creator-payments/model';
import { useRouter } from 'next/navigation';
import { Field, inputClass } from '@/components/workspace/creator/Fields';
import { actionClass } from '@/components/workspace/creator/styles';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
const secondary = 'min-h-11 rounded-lg border px-4 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring';
export function BankAccountForm({ creatorId, existing }: {
    creatorId: string;
    existing: boolean;
}) {
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    const router = useRouter(), reviewButton = useRef<HTMLButtonElement>(null), form = useRef<HTMLFormElement>(null), errorRef = useRef<HTMLParagraphElement>(null), key = useRef({ body: '', id: '' });
    const [editing, setEditing] = useState(!existing), [review, setReview] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false), [data, setData] = useState({ holder: '', account: '', ifsc: '' });
    function fail(message: string) { setError(message); requestAnimationFrame(() => errorRef.current?.focus()); }
    function prepare(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget), account = String(f.get('account') ?? ''); if (account !== f.get('confirm')) {
        fail('The account numbers do not match. Re-enter both account numbers.');
        return;
    } setData({ holder: String(f.get('holder') ?? '').trim(), account, ifsc: String(f.get('ifsc') ?? '').toUpperCase() }); setError(''); setReview(true); }
    async function save() { setBusy(true); setError(''); const body = { action: 'save_payee', creatorId, ...data, acknowledged: true }; const fingerprint = JSON.stringify(body); if (key.current.body !== fingerprint)
        key.current = { body: fingerprint, id: crypto.randomUUID() }; try {
        const response = await fetch('/api/workspace/earnings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, requestKey: key.current.id }) });
        const result = await response.json();
        if (!response.ok)
            throw Error(result.error ?? 'Could not save bank details. Please retry.');
        form.current?.reset();
        setData({ holder: '', account: '', ifsc: '' });
        setReview(false);
        setEditing(false);
        setSaved(true);
        key.current = { body: '', id: '' };
        router.refresh();
    }
    catch (e) {
        setReview(false);
        fail(e instanceof Error ? e.message : 'The result is unknown. Retry the same details to safely check this request.');
    }
    finally {
        setBusy(false);
    } }
    return <section className="rounded-2xl border bg-card p-6 sm:p-8"><h2 className="font-outfit text-xl font-semibold">{existing ? 'Change receiving account' : 'Add your payout account'}</h2><p className={saved ? "mt-4 rounded-lg bg-primary/5 p-4 text-sm" : "sr-only"} role="status" aria-live="polite" aria-atomic="true">{saved ? "Bank details saved. We’ll review them before making payments." : ""}</p>{!editing ? <button ref={reviewButton} disabled={!ready} onClick={() => { setEditing(true); setSaved(false); }} className={`${actionClass} mt-5`}>{existing || saved ? 'Change bank account' : 'Add bank account'}</button> : <form ref={form} onSubmit={prepare} className="mt-5" autoComplete="off"><fieldset disabled={!ready || busy} className="min-w-0 space-y-5"><p className="text-sm leading-7 text-muted-foreground">Saving bank details requires a recent phone verification. If you’re asked to verify again, sign in and return here within 10 minutes. <Link className="text-primary underline" href="/login?redirect=/workspace/settings/payout-account">Verify phone if requested</Link></p><div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Account holder legal name" hint="Use the name shown on your bank account."><input name="holder" className={inputClass} required minLength={3} maxLength={100} autoComplete="off"/></Field></div><Field label="Bank account number"><input name="account" className={inputClass} required pattern="[0-9]{9,18}" inputMode="numeric" maxLength={18} autoComplete="off"/></Field><Field label="Confirm account number"><input name="confirm" className={inputClass} required pattern="[0-9]{9,18}" inputMode="numeric" maxLength={18} autoComplete="off"/></Field><Field label="IFSC" hint="11-character Indian bank branch code."><input name="ifsc" spellCheck={false} className={`${inputClass} uppercase`} required pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" maxLength={11} autoComplete="off"/></Field></div><div className="rounded-xl bg-muted/40 p-4 text-sm leading-7"><h3 className="font-semibold">Monthly payment policy</h3><p className="mt-2">AirBharath takes 0% sales commission. Course tax and actual payment processing fees reduce your earnings; fee tax is included once. Previous-month earnings are reviewed for payment after bank and payment checks. An arrival date is not guaranteed. Delays do not erase earnings, and membership expiry does not stop valid amounts owed.</p><details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 font-medium text-primary">Read full accepted settlement policy</summary><p className="mt-2">{SETTLEMENT_COPY}</p><p className="mt-2">Verified bank details are securely shared with RazorpayX to process automatic bank payments.</p><p className="mt-2">The stated schedule is a proposed review target, subject to the disclosed checks; bank receipt is not guaranteed.</p></details><Link href="/contact" className="text-primary underline">Help with bank verification or a delayed payment</Link></div><label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 size-4 accent-primary" type="checkbox" name="acknowledged" required/>I own or am authorized to receive funds in this account and accept the displayed monthly settlement policy.</label><p ref={errorRef} tabIndex={-1} role="alert" className={error ? 'rounded-lg border border-destructive p-4 text-sm focus-visible:ring-2 focus-visible:ring-ring' : 'sr-only'}>{error}</p><div className="flex flex-wrap gap-3"><button ref={reviewButton} type="submit" disabled={busy} className={actionClass}>Review bank details</button>{existing && <button type="button" className={secondary} onClick={() => { form.current?.reset(); setEditing(false); setData({ holder: '', account: '', ifsc: '' }); }}>Cancel</button>}</div></fieldset></form>}<Dialog open={review} onOpenChange={v => { if (!busy)
        setReview(v); }}><DialogContent aria-busy={busy} onCloseAutoFocus={e => { e.preventDefault(); (error ? errorRef.current : reviewButton.current)?.focus(); }}><DialogTitle>{existing ? 'Confirm bank account change' : 'Confirm payout account'}</DialogTitle><DialogDescription>Your bank details will be saved securely for review. Payments already approved will keep their original bank account.</DialogDescription><dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Account holder</dt><dd className="mt-1 font-medium">{data.holder}</dd></div><div><dt className="text-muted-foreground">Account</dt><dd className="mt-1 font-medium">Ending {data.account.slice(-4)} · {data.ifsc}</dd></div></dl><p className="text-sm leading-6">Check the account holder name and receiving account. We’ll review these details before making payments.</p><DialogFooter><button className={secondary} disabled={busy} onClick={() => setReview(false)}>Back to edit</button><button className={actionClass} disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Confirm and save account'}</button></DialogFooter></DialogContent></Dialog></section>;
}
