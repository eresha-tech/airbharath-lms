'use client';
import { WorkspaceEmailVerification } from './WorkspaceEmailVerification';
import type { EmailStatus } from '@/lib/workspace/email/model';
import { RefundPolicyAcceptance, type RefundPolicyReceipt } from './RefundPolicyAcceptance';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MembershipCheckout } from './MembershipCheckout';
import { CreatorTermsAcceptance, type CreatorTermsReceipt } from './CreatorTermsAcceptance';
import { Check, ArrowRight, LockKeyhole } from 'lucide-react';
import { calculatePrice, formatPaise, normalizeCouponCode, type Plan } from '@/lib/workspace/membership/model';
import type { MembershipQuote } from '@/lib/workspace/membership/service';
import { trackCouponApplied, trackPlanSelected } from '@/lib/workspace/membership/analytics';

export function ActivationPreview({ plans, initialQuote, checkoutKeyId, userId, initialTermsAcceptance, initialPolicyAcceptance, initialEmailStatus }: { plans: Plan[]; initialQuote: MembershipQuote | null; checkoutKeyId?: string; userId?: string; initialTermsAcceptance?: CreatorTermsReceipt | null; initialPolicyAcceptance?: RefundPolicyReceipt | null; initialEmailStatus?: EmailStatus }) {
  const [selected, setSelected] = useState(initialQuote?.planCode || plans[0].code);
  const [quote, setQuote] = useState(initialQuote), [draft, setDraft] = useState(''), [appliedCode, setAppliedCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [destination, setDestination] = useState<string | undefined>();
  const [expired, setExpired] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [emailVerified,setEmailVerified] = useState(initialEmailStatus?.verified || false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!quote) return;
    const check = () => setExpired(Date.now() >= Date.parse(quote.expiresAt));
    check(); const timer = setInterval(check, 1000); return () => clearInterval(timer);
  }, [quote]);
  async function preview(plan: Plan, code?: string, couponAction = false) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setAppliedCode(code); setBusy(true); setQuote(null); setError(''); setDestination(undefined); setExpired(false);
    try {
      const response = await fetch('/api/workspace/membership/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planCode: plan.code, planVersionId: plan.id, ...(code ? { couponCode: code } : {}) }), signal: AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]), cache: 'no-store' });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok || !data.quote) {
        setError(data.error || 'Preview is unavailable. Please try again.');
        if (['/workspace/apply', '/workspace/eligibility-result'].includes(data.destination)) setDestination(data.destination);
        if (couponAction) trackCouponApplied(data.code || 'unavailable');
        return;
      }
      setQuote(data.quote); setAppliedCode(code);
      if (couponAction) trackCouponApplied('success');
    } catch { if (!controller.signal.aborted) { setError('We could not refresh your preview. Your coupon input is still here. Please try again.'); if (couponAction) trackCouponApplied('unavailable'); } }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  const plan = plans.find(plan => plan.code === selected)!;
  return <div className="ph-no-capture space-y-8">
    <section aria-label="Eligibility confirmed" className="rounded-xl border border-border p-5"><h2 className="font-medium">Step 1 — Eligibility confirmed</h2><p className="mt-2 text-sm text-muted-foreground">Your server-side eligibility is checked again before a new order.</p></section><WorkspaceEmailVerification initialStatus={initialEmailStatus || {email:null,verified:false,verifiedAt:null,challenge:null}} onVerified={verified=>{setEmailVerified(verified);if(verified)void preview(plans.find(p=>p.code===selected)!,appliedCode)}}/><fieldset><legend className="mb-4 text-sm font-medium">Step 3 — Choose your prepaid term</legend><div className="grid gap-4 md:grid-cols-3">{plans.map(plan => {
      const active = selected === plan.code, total = calculatePrice(plan.basePricePaise, plan.taxRateBps).totalPaise;
      return <label key={plan.id} className={`relative flex cursor-pointer flex-col rounded-2xl border p-6 transition-colors focus-within:ring-2 focus-within:ring-ring ${active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:border-primary/50'} ${!plan.available ? 'cursor-not-allowed opacity-60' : ''}`}>
        <span className="flex items-center justify-between"><span className="font-outfit text-xl font-medium">{plan.displayName}</span><input type="radio" name="workspace-plan" value={plan.code} checked={active} disabled={!plan.available} onChange={() => { setSelected(plan.code); trackPlanSelected(plan.code); void preview(plan, appliedCode); }} className="size-4 accent-current" /></span>
        <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{plan.durationMonths} calendar months</span><span className="mt-8 font-outfit text-3xl font-semibold tabular-nums">{formatPaise(total)}</span><span className="mt-2 text-sm text-muted-foreground">Inclusive of 18% GST</span><span className="mt-6 border-t border-border pt-4 text-sm tabular-nums">{formatPaise(plan.basePricePaise)} before GST · no coupon</span><span className="mt-2 text-xs text-muted-foreground">{plan.available ? 'Prepaid · no automatic renewal' : 'Currently unavailable'}</span>
      </label>;
    })}</div></fieldset>
    <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
      <section className="min-w-0 rounded-2xl border border-border bg-card p-6 sm:p-8"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Check className="size-4" aria-hidden />Eligibility confirmed</p><h2 className="mt-6 font-outfit text-2xl">Step 4 — Coupon (optional)</h2>
        <form className="mt-5" onSubmit={event => { event.preventDefault(); const code = normalizeCouponCode(draft); if (!code) { request.current?.abort(); setBusy(false); setAppliedCode(draft.trim() || ' '); setQuote(null); setError('Use a coupon code of 3–32 letters, numbers, hyphens or underscores.'); trackCouponApplied('invalid_code'); return; } void preview(plan, code, true); }}>
          <label htmlFor="workspace-coupon" className="text-sm text-muted-foreground">Workspace membership coupon</label><div className="mt-2 flex flex-wrap gap-2"><input id="workspace-coupon" value={draft} onChange={event => setDraft(event.target.value)} maxLength={32} autoComplete="off" spellCheck={false} className="ph-no-capture min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-describedby="coupon-note" /><button disabled={busy || !plan.available} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Updating…' : 'Apply'}</button></div>
          <p id="coupon-note" className="mt-3 text-xs leading-6 text-muted-foreground">Preview only. Applying a coupon does not reserve an offer, consume capacity or guarantee future availability.</p>
        </form>
        {(draft || appliedCode || error) && <button disabled={busy} onClick={() => { setDraft(''); setAppliedCode(undefined); void preview(plan); }} className="mt-4 text-sm underline underline-offset-4 disabled:opacity-50">Remove coupon and preview standard price</button>}
        <div className="mt-8 border-t border-border pt-6"><h3 className="text-sm font-semibold">When does the term begin?</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{quote?.membershipStart.summary || 'Before launch, paid terms start at launch. On or after launch, terms start on successful payment.'}</p><p className="mt-3 text-xs leading-6 text-muted-foreground">{quote?.membershipStart.rule || 'Membership start is determined by the date of successful payment. No membership has been created.'}</p></div>
      </section>
      <section aria-label="Authoritative server quote" aria-busy={busy} className="min-w-0 rounded-2xl border border-primary/30 bg-primary/5 p-6 sm:p-8"><p className="text-xs uppercase tracking-widest text-muted-foreground">Your price preview</p><h2 className="mt-3 font-outfit text-2xl">{plan.displayName}</h2>
        <div aria-live="polite" role="status">
          {busy && <p className="mt-6 text-sm">Calculating your server quote…</p>}
          {error && <p className="mt-6 rounded-xl border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
          {destination && <Link href={destination} className="mt-4 inline-block text-sm underline">Return to eligibility</Link>}
          {quote && !expired && <><dl className="mt-7 space-y-4 text-sm tabular-nums">{[['Base price', quote.basePricePaise], [quote.couponApplied ? `Coupon ${quote.couponCode}` : 'Discount', -quote.discountPaise], ['Taxable amount', quote.taxableAmountPaise], ['GST @ 18%', quote.gstAmountPaise]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="min-w-0 break-words [overflow-wrap:anywhere] text-muted-foreground">{label}</dt><dd className="shrink-0">{Number(value) < 0 ? '−' : ''}{formatPaise(Math.abs(Number(value)))}</dd></div>)}<div className="flex justify-between gap-4 border-t border-border pt-5"><dt className="font-semibold">Total</dt><dd className="font-outfit text-2xl font-semibold">{formatPaise(quote.totalPaise)}</dd></div></dl><p className="mt-4 text-xs text-muted-foreground">INR · {quote.durationMonths} calendar months · advisory, unreserved</p></>}
          {expired && <p className="mt-6 text-sm">This preview has expired. Refresh to check current eligibility, plans and coupon rules.</p>}
        </div>
        {!busy && (expired || error) && <button onClick={() => void preview(plan, appliedCode)} className="mt-5 text-sm underline underline-offset-4">Refresh preview</button>}
        <div className="mt-8 border-t border-border pt-6"><h3 className="mb-4 font-medium">Step 5 — Agree and continue</h3><CreatorTermsAcceptance onAccepted={setTermsAccepted} initialAcceptance={initialTermsAcceptance} /><RefundPolicyAcceptance onAccepted={setPolicyAccepted} initialAcceptance={initialPolicyAcceptance} />{checkoutKeyId && userId ? <MembershipCheckout keyId={checkoutKeyId} userId={userId} quote={quote} disabled={busy || expired || !plan.available || !!error || !termsAccepted || !policyAccepted || !emailVerified} /> : <><button disabled className="flex w-full items-center justify-center gap-3 rounded-xl bg-muted px-5 py-4 text-sm font-semibold text-muted-foreground"><LockKeyhole className="size-4" aria-hidden />Payments not yet enabled<ArrowRight className="size-4" aria-hidden /></button><p className="mt-4 text-xs leading-6 text-muted-foreground">Workspace payments are awaiting launch verification. No charge, membership or creator access is created by this preview.</p></>}</div>
      </section>
    </div>
  </div>;
}
