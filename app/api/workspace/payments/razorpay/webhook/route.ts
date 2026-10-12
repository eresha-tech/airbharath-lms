import { createHash } from 'node:crypto';
import { PaymentError, minimizeWebhook, verifyHmac } from '@/lib/workspace/payments/model';
import { readWebhookBody, paymentFailure } from '@/lib/workspace/payments/http';
import { workspacePaymentRuntime } from '@/lib/workspace/payments/runtime';
import { privateJson } from '@/lib/workspace/http';
export async function POST(request: Request) {
  try {
    const runtime = workspacePaymentRuntime('webhook');
    const bytes = await readWebhookBody(request);
    // Raw bytes first. No session/Origin dependency, and no JSON parsing before signature verification.
    if (!verifyHmac(bytes, request.headers.get('x-razorpay-signature'), runtime.config.webhookSecret)) throw new PaymentError('signature');
    const eventId = request.headers.get('x-razorpay-event-id'); if (!eventId || !/^[A-Za-z0-9_-]{1,100}$/.test(eventId)) throw new PaymentError('validation');
    let raw: unknown; try { raw = JSON.parse(bytes.toString('utf8')); } catch { throw new PaymentError('validation'); }
    const parsed = minimizeWebhook(raw, runtime.config.accountId, runtime.config.mode); if (!parsed) throw new PaymentError('provider_mismatch');
    const received = await runtime.store.receiveEvent(runtime.config, { eventId, type: parsed.type, hash: createHash('sha256').update(bytes).digest('hex'), evidence: parsed.evidence }, new Date());
    // Durable inbox receipt is committed. A separately deployed worker performs provider reconciliation.
    return privateJson({ received: true, state: received.anomaly ? 'needs_review' : received.event.processingState }, received.anomaly ? 409 : ['processed', 'ignored'].includes(received.event.processingState) ? 200 : 202);
  } catch (error) { return paymentFailure(error); }
}
