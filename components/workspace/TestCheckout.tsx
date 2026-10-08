'use client';
import Script from 'next/script';
import { useRef, useState } from 'react';
import type { MembershipQuote } from '@/lib/workspace/membership/service';

type Checkout = { keyId: string; providerOrderId: string; amountPaise: number; currency: 'INR' };
type Result = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open(): void; on(event: 'payment.failed', handler: () => void): void };
type RazorpayConstructor = new (options: { key: string; order_id: string; amount: number; currency: string; name: string; description: string; handler(result: Result): void; modal: { ondismiss(): void } }) => RazorpayInstance;

export function TestCheckout({ quote, disabled }: { quote: MembershipQuote | null; disabled: boolean }) {
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const intent = useRef<{ input: Record<string, unknown>; orderId?: string; checkout?: Checkout } | null>(null);
  const confirming = useRef(false), inFlight = useRef(false);
  const locked = busy || !!intent.current;
  async function pay() {
    if (inFlight.current || busy || !ready || (!intent.current && (!quote || disabled))) return;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      if (!intent.current) {
        if (!quote) return;
        intent.current = { input: { planCode: quote.planCode, planVersionId: quote.planVersionId, quoteHash: quote.quoteHash, requestKey: crypto.randomUUID(), ...(quote.couponApplied ? { couponCode: quote.couponCode } : {}) } };
      }
      const current = intent.current;
      if (!current.checkout) {
        const response = await fetch('/api/workspace/membership/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current.input), cache: 'no-store' });
        const data = await response.json();
        if (!response.ok || !data.checkout) {
          if (['quote_changed', 'validation', 'capacity', 'disabled'].includes(data.code)) intent.current = null;
          throw new Error(data.error || 'Order setup needs review. Retry the same request; do not start another payment.');
        }
        current.orderId = data.order.id; current.checkout = data.checkout;
      }
      const checkout = current.checkout!;
      if (!checkout.keyId.startsWith('rzp_test_')) throw new Error('Test checkout configuration is unavailable.');
      const Razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!Razorpay) throw new Error('Checkout could not load. Retry the same request.');
      confirming.current = false;
      const instance = new Razorpay({ key: checkout.keyId, order_id: checkout.providerOrderId, amount: checkout.amountPaise, currency: checkout.currency, name: 'AirBharath Workspace', description: 'Workspace Test Mode payment', modal: { ondismiss: () => { if (!confirming.current) { inFlight.current = false; setBusy(false); setMessage('Checkout closed. Resume the same test order when ready.'); } } }, handler: result => {
        confirming.current = true;
        void (async () => {
          try {
            if (result.razorpay_order_id !== checkout.providerOrderId) throw new Error('Payment evidence requires review.');
            const response = await fetch('/api/workspace/payments/razorpay/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: current.orderId, providerPaymentId: result.razorpay_payment_id, signature: result.razorpay_signature }), cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Confirmation needs review. Do not make another payment.');
            setMessage(data.order.financialState === 'captured' ? 'Test payment captured. Membership activation remains on hold pending verified webhook evidence.' : 'Test payment received. Financial verification is pending.');
            // A payment callback must never reopen checkout, even when confirmation needs recovery.
          } catch (error) { setMessage(error instanceof Error ? error.message : 'Confirmation needs review. Do not make another payment.'); }
          finally { inFlight.current = false; setBusy(false); }
        })();
      } });
      instance.on('payment.failed', () => setMessage('Test payment failed. Retry within this checkout using the same order.'));
      instance.open();
    } catch (error) { inFlight.current = false; setBusy(false); setMessage(error instanceof Error ? error.message : 'Checkout is unavailable. Retry the same request.'); }
  }
  return <div className="ph-no-capture">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => setMessage('Checkout script was blocked or unavailable. Reload to try again.')} />
    <button type="button" onClick={() => void pay()} disabled={busy || !ready || confirming.current || (!intent.current && (disabled || !quote))} className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Processing test payment…' : intent.current ? 'Resume same test order' : 'Pay in Test Mode'}</button>
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Test Mode only. Use synthetic test payment details. This does not activate membership or creator access.</p>
    {locked && <p className="mt-2 text-xs text-muted-foreground">The accepted order keeps its original plan and price even if you change the preview.</p>}
    {message && <p role="status" className="mt-4 text-sm">{message}</p>}
  </div>;
}
