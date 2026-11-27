'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, inputClass } from '@/components/workspace/creator/Fields';
import { actionClass } from '@/components/workspace/creator/styles';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { money } from '@/lib/creator-payments/presentation';
type Action = {
    value: string;
    label: string;
};
const actionButtons: Record<string, [string, string]> = {
    approve_payout: ['Review payout approval', 'Approve monthly amount'],
    authorize_razorpayx: ['Review transfer authorization', 'Authorize transfer'],
    reconcile_razorpayx: ['Review status check', 'Check provider status'],
    trace_razorpayx: ['Review payout trace', 'Save trace for verification'],
    cancel_payout: ['Review payout cancellation', 'Cancel payout'],
    request_bank_validation:['Review bank ownership check','Start bank ownership check'],
    reconcile_bank_validation:['Review original bank check','Recheck original bank verification'],
    accept_bank_name:['Review independent ownership evidence','Record ownership review'],
    verify_payee: ['Review bank verification', 'Verify bank account'],
    reject_payee: ['Review bank rejection', 'Reject verification'],
    reveal_payee: ['Review bank access', 'Show bank details'],
    propose_adjustment: ['Review proposed correction', 'Propose correction'],
    approve_adjustment: ['Review correction approval', 'Approve correction'],
    initiate_payout: ['Review bank initiation', 'Record transfer'],
    confirm_payout: ['Review bank receipt', 'Confirm bank receipt'],
    fail_payout: ['Review failed transfer', 'Record verified failure'],
    uncertain_payout: ['Review uncertain transfer', 'Record uncertainty'],
};
export function AdminAction({ creatorId, entityId, actions, masked, amount, approval = false, adjustment = false, automated = false }: {
    creatorId: string;
    entityId: string;
    actions: Action[];
    masked?: string;
    amount?: number;
    approval?: boolean;
    adjustment?: boolean;
    automated?: boolean;
}) {
    const [ready, setReady] = useState(false);
    useEffect(() => setReady(true), []);
    const router = useRouter(), reviewButton = useRef<HTMLButtonElement>(null), errorRef = useRef<HTMLParagraphElement>(null), key = useRef({ body: '', id: '' });
    const [selected, setSelected] = useState(actions[0]?.value ?? ''), [review, setReview] = useState<Record<string, string> | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(''), [details, setDetails] = useState<{
        holder: string;
        account: string;
        ifsc: string;
    } | null>(null);
    if (!actions.length)
        return <p className="text-sm leading-7 text-muted-foreground">No action is available to your Admin account for the current state. Another independent Admin may need to continue.</p>;
    const active = actions.some(a => a.value === selected) ? selected : actions[0].value;
    const label = actions.find(a => a.value === active)?.label ?? 'Review action';
    const [reviewLabel, confirmLabel] = actionButtons[active] ?? ['Review this action', label];
    function prepare(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); setError(''); setSaved(''); setDetails(null); setReview(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }
    async function execute() { if (!review)
        return; setBusy(true); setError(''); const body = { creatorId, entityId, action: active, evidence: review.evidence, ...(approval ? { amountPaise: Math.round(Number(review.amount) * 100) } : {}), ...(adjustment ? { adjustmentPaise: Math.round(Number(review.adjustment) * 100) } : {}), ...(review.providerPayoutId?{providerPayoutId:review.providerPayoutId}:{}), ...(review.bankReference ? { bankReference: review.bankReference } : {}) }; const fingerprint = JSON.stringify(body); if (key.current.body !== fingerprint)
        key.current = { body: fingerprint, id: crypto.randomUUID() }; try {
        const response = await fetch('/api/admin/creator-settlements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, requestKey: key.current.id }) });
        const result = await response.json();
        if (!response.ok)
            throw Error(result.error ?? 'Could not record this action.');
        if (result.details) {
            setDetails(result.details);
            window.setTimeout(() => setDetails(null), 60000);
        }
        setReview(null);
        setSaved(result.replayed ? 'This request was already recorded; no duplicate action was taken.' : active === 'approve_payout' ? 'Amount approved and reserved. A second Admin must authorize the bank transfer.' : active === 'authorize_razorpayx' ? 'Transfer authorized. Automatic initiation will run next; this is not a confirmation of payment.' : active === 'reconcile_razorpayx' || active === 'trace_razorpayx' ? 'Provider check requested for the existing payout. No new transfer was authorized.' : 'Review recorded. The financial record has been refreshed.');
        router.refresh();
    }
    catch (e) {
        setReview(null);
        setError(e instanceof Error ? e.message : 'Result unknown. Retry the same action safely using the original request.');
        requestAnimationFrame(() => errorRef.current?.focus());
    }
    finally {
        setBusy(false);
    } }
    return <form onSubmit={prepare}><fieldset disabled={!ready || busy} className="min-w-0 space-y-5"><Field label="Next action"><select name="action" className={inputClass} value={active} onChange={e => { setSelected(e.target.value); setSaved(''); setDetails(null); }}>{actions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></Field>{approval && <Field label="Amount (INR)" hint="Must not exceed the reconciled available balance."><input name="amount" className={inputClass} type="number" min={automated?"1.00":"0.01"} defaultValue={amount!==undefined?(amount/100).toFixed(2):undefined} step="0.01" max="1000000" required/></Field>}{adjustment && <Field label="Signed correction (INR)" hint="Exact bank-evidenced amount; a negative value reduces proceeds."><input name="adjustment" className={inputClass} type="number" step="0.01" min="-1000000" max="1000000" required/></Field>}{['initiate_payout', 'confirm_payout'].includes(active) && <Field label="UTR / bank reference" hint="Use the original transfer reference. A duplicate reference is rejected."><input name="bankReference" className={inputClass} minLength={6} maxLength={100} required={active === 'initiate_payout'} autoComplete="off"/></Field>}{active==='trace_razorpayx'&&<Field label="Provider payout ID" hint="A lookup hint from provider support or the Dashboard. The worker must verify it independently."><input name="providerPayoutId" spellCheck={false} autoComplete="off" maxLength={85} className={inputClass} pattern="pout_[A-Za-z0-9]{6,80}" required/></Field>}<Field label="Evidence reference / review reason" hint="Reference the reviewed statement or case. Do not paste full bank account numbers."><textarea name="evidence" className={inputClass} minLength={['accept_bank_name','reconcile_bank_validation'].includes(active)?20:6} maxLength={2000} required rows={3}/></Field><p ref={errorRef} tabIndex={-1} role="alert" className={error ? 'rounded-lg border border-destructive p-4 text-sm' : 'sr-only'}>{error}</p><p role="status" aria-live="polite" aria-atomic="true" className={saved ? "rounded-lg bg-primary/5 p-4 text-sm" : "sr-only"}>{saved}</p>{details && <div className="ph-no-capture rounded-lg border p-4 text-sm"><p className="font-semibold">Audited bank access · hidden after 60 seconds</p><p className="mt-2 break-all">{details.holder}<br />{details.account}<br />{details.ifsc}</p><button type="button" className="mt-3 min-h-11 text-primary underline" onClick={() => setDetails(null)}>Hide bank details now</button></div>}<button ref={reviewButton} type="submit" className={actionClass} disabled={busy}>{reviewLabel}</button><Dialog open={!!review} onOpenChange={v => { if (!v && !busy)
        setReview(null); }}><DialogContent aria-busy={busy} onCloseAutoFocus={e => { e.preventDefault(); (error ? errorRef.current : reviewButton.current)?.focus(); }}><DialogTitle>{label}</DialogTitle><DialogDescription>{active==='request_bank_validation'?'This starts a bank ownership check for the displayed immutable account version. Live checks require separate founder authorization and confirmed account-specific fees and frequency limits. A validation payment may be billable.':active==='reconcile_bank_validation'?'This retrieves evidence for the original validation intent. It never initiates another validation payment and cannot override invalid account evidence.':active==='accept_bank_name'?'Record the secure reference for independently verified ownership of an account the bank has confirmed active. This cannot override invalid accounts or materially different names. A different Admin must approve the bank details afterward.':automated?(active==='authorize_razorpayx'?'Confirming authorizes the worker to automatically send this exact bank payout through RazorpayX. Do not make a separate manual transfer.':approval?'This approval only reserves the displayed amount; it does not send money. A different Admin must authorize the automatic bank transfer.':active==='cancel_payout'?'This cancels the reserved payout before any provider submission attempt.':active==='trace_razorpayx'?'This provides a lookup hint. The worker must independently verify the provider payout against the original amount and bank account.':'This requests reconciliation of the existing operation; it does not authorize a separate transfer.'):active==='verify_payee'?'Confirm that you checked bank ownership and the legal name against independent evidence. This verifies these details; it does not send a payout.':active==='reject_payee'?'This blocks new payouts to these bank details until the verification concern is resolved. Existing transfers still require provider tracing.':active==='reveal_payee'?'Bank details will be shown for your recorded verification purpose and hidden after 60 seconds. Keep them private.':'Check this financial record and the supporting evidence before confirming.'}</DialogDescription><dl className="space-y-4 text-sm">{masked && <div><dt className="text-muted-foreground">Beneficiary</dt><dd className="mt-1 font-semibold">{masked}</dd></div>}{(amount !== undefined || approval || adjustment) && <div><dt className="text-muted-foreground">Exact amount</dt><dd className="mt-1 text-xl font-semibold">{money(approval ? Math.round(Number(review?.amount) * 100) : adjustment ? Math.round(Number(review?.adjustment) * 100) : amount!)}</dd></div>}<div><dt className="text-muted-foreground">Evidence / reason</dt><dd className="mt-1 whitespace-pre-wrap break-words">{review?.evidence}</dd></div>{review?.providerPayoutId&&<div><dt className="text-muted-foreground">Provider lookup hint</dt><dd className="mt-1 break-all font-semibold">{review.providerPayoutId}</dd></div>}{review?.bankReference && <div><dt className="text-muted-foreground">UTR / bank reference</dt><dd className="mt-1 break-all font-semibold">{review.bankReference}</dd></div>}</dl><p className="text-xs leading-6 text-muted-foreground">Independent Admin and current-state checks run again on the server. Uncertain transfers retain their reservation until a bank trace establishes the result.</p><DialogFooter><button type="button" className="min-h-11 rounded-lg border px-4 text-sm" disabled={busy} onClick={() => setReview(null)}>Back to edit</button><button type="button" className={actionClass} disabled={busy} onClick={execute}>{busy ? 'Recording…' : confirmLabel}</button></DialogFooter></DialogContent></Dialog></fieldset></form>;
}
