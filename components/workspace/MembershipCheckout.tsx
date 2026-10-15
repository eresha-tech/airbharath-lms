'use client';
import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MembershipQuote } from '@/lib/workspace/membership/service';
import { formatPaise } from '@/lib/workspace/membership/model';
import { waitForWorkspaceActivation } from '@/lib/workspace/payments/activation-watch';
import { isCouponRejection } from '@/lib/workspace/membership/preview';

type Receipt = { id: string; totalPaise: number; currency: string; financialState: string; activationState: string };
type Reply = { order?: Receipt; checkout?: { keyId: string; providerOrderId: string }; error?: string; code?: string };
type Callback = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type Checkout = { open(): void; on(event: 'payment.failed', handler: () => void): void };
type RazorpayConstructor = new (options: { key: string; order_id: string; amount: number; currency: string; name: string; description: string; handler: (result: Callback) => void; modal: { ondismiss(): void } }) => Checkout;

export function MembershipCheckout({ keyId, userId, quote, disabled, onQuoteRejected }: { keyId: string; userId: string; quote: MembershipQuote | null; disabled: boolean; onQuoteRejected?: () => void }) {
  const router = useRouter(), inFlight = useRef(false);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [checking, setChecking] = useState(false);
  const [awaitingActivation, setAwaitingActivation] = useState(false);
  const activationCheck = useRef<AbortController | null>(null);
  const storageKey = `workspace-checkout-v1:${userId}`;
  useEffect(() => () => activationCheck.current?.abort(), [storageKey]);
  async function json(path: string, body?: unknown): Promise<Reply> {
    const response = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
    const data: Reply = await response.json();
    if (!response.ok) {
      // These acceptance rejections happen before an order exists. Uncertain failures
      // and accepted-order recovery retain their original idempotency data.
      if (path === '/api/workspace/membership/orders' && (data.code === 'quote_changed' || isCouponRejection(data.code))) {
        sessionStorage.removeItem(storageKey);
        onQuoteRejected?.();
      }
      throw new Error(data.error || 'Payment processing is unavailable. Recover this request before starting another payment.');
    }
    return data;
  }
  const checkAccess = useCallback(async (confirmedPayment = false) => {
    activationCheck.current?.abort();
    const controller = new AbortController();
    activationCheck.current = controller;
    if (confirmedPayment) setAwaitingActivation(true);
    setChecking(true);
    try {
      const result = await waitForWorkspaceActivation({ signal: controller.signal, onUpdate: state => setMessage(state === 'waiting'
        ? 'Confirming your payment and activating your Workspace… You will be redirected automatically. Please do not pay again.'
        : 'We could not check membership yet. Retrying automatically; please do not pay again.') });
      if (result === 'ready') {
        try { sessionStorage.removeItem(storageKey); } catch { /* Verified access does not depend on browser storage. */ }
        router.replace('/workspace/dashboard'); router.refresh();
      } else if (result === 'authentication') setMessage('Please sign in again to check your membership. Your payment request is retained; do not pay again.');
      else if (result === 'timeout') setMessage('Your payment is still being verified. Check membership status again shortly; please do not pay again.');
    } finally {
      if (activationCheck.current === controller && !controller.signal.aborted) { activationCheck.current = null; setChecking(false); }
    }
  }, [router, storageKey]);
  async function pay() {
    if (inFlight.current || !ready || !quote) return;
    inFlight.current = true; setBusy(true); setMessage('');
    let opened = false;
    const finish = () => { inFlight.current = false; setBusy(false); };
    try {
      // Save the exact acceptance before HTTP. A lost response or reload recovers the same request/order.
      const saved = sessionStorage.getItem(storageKey);
      const pending = saved ? JSON.parse(saved) : { input: { planCode: quote.planCode, planVersionId: quote.planVersionId, quoteHash: quote.quoteHash, requestKey: crypto.randomUUID(), ...(quote.couponApplied && quote.couponCode ? { couponCode: quote.couponCode } : {}) }, orderId: null };
      sessionStorage.setItem(storageKey, JSON.stringify(pending));
      const data = pending.orderId ? await json(`/api/workspace/membership/orders/${pending.orderId}`) : await json('/api/workspace/membership/orders', pending.input);
      if (!data.order) throw new Error('Recover this payment request before continuing.');
      const order = data.order; pending.orderId = order.id; sessionStorage.setItem(storageKey, JSON.stringify(pending));
      if (order.financialState === 'captured') { await checkAccess(true); return; }
      const Constructor = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!Constructor || !data.checkout || data.checkout.keyId !== keyId || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || order.currency !== 'INR') throw new Error('Checkout is unavailable. Your existing order is retained.');
      const checkout = new Constructor({ key: keyId, order_id: data.checkout.providerOrderId, amount: order.totalPaise, currency: order.currency, name: 'AirBharath Workspace', description: `${keyId.startsWith('rzp_test_') ? 'Test Mode · ' : ''}prepaid Workspace membership`,
        handler: result => { if (result.razorpay_order_id !== data.checkout!.providerOrderId) { setMessage('Payment identifiers require review. Do not pay again.'); finish(); return; }
          void json('/api/workspace/payments/razorpay/confirm', { orderId: order.id, providerPaymentId: result.razorpay_payment_id, signature: result.razorpay_signature })
            .catch(() => { /* Genuine webhook reconciliation remains authoritative if browser confirmation fails. */ })
            .then(() => checkAccess(true)).finally(finish);
        }, modal: { ondismiss: () => { setMessage('Checkout closed. Any payment attempt remains associated with this order; retry recovers the same order.'); finish(); } } });
      checkout.on('payment.failed', () => { setMessage('The payment did not succeed. Retry uses this same provider order; no creator access has been granted.'); finish(); });
      checkout.open(); opened = true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Payment unavailable. Recover the same request before retrying.'); }
    finally { if (!opened) finish(); }
  }
  return <div className="ph-no-capture">
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setReady(true)} onError={() => setMessage('Checkout could not load. No payment was started.')} />
    {keyId.startsWith('rzp_test_') && <p className="mb-3 text-xs font-semibold text-primary">Razorpay Test Mode · no real money</p>}
    <button type="button" disabled={disabled || busy || checking || awaitingActivation || !ready || !quote} onClick={() => void pay()} className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{checking ? 'Activating your Workspace…' : awaitingActivation ? 'Payment verification pending' : busy ? 'Recovering your order…' : quote ? `Pay ${formatPaise(quote.totalPaise)}` : 'Payment unavailable'}</button>
    <p className="mt-4 text-xs leading-6 text-muted-foreground">Creator access requires verified provider capture timing and normal membership fulfillment. Checkout success alone does not grant access.</p>
    {message && <><p role="status" className="mt-4 text-sm">{message}</p><button type="button" disabled={checking} onClick={() => void checkAccess(awaitingActivation)} className="mt-3 text-sm underline">{checking ? 'Activating…' : 'Check membership status'}</button></>}
  </div>;
}
