import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { UUID, object } from '@/lib/workspace/eligibility/model';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { readJson, privateJson } from '@/lib/workspace/http';
import { PaymentError, PROVIDER_PAYMENT_ID, HASH } from '@/lib/workspace/payments/model';
import { financialReceipt, paymentFailure } from '@/lib/workspace/payments/http';
import { workspacePaymentRuntime } from '@/lib/workspace/payments/runtime';
export async function POST(request: Request) {
  try {
    const runtime = workspacePaymentRuntime('reconciliation');
    if (!eligibilitySameOrigin(request)) throw new PaymentError('forbidden');
    const user = await getWorkspaceUser(); if (!user) throw new PaymentError('authentication');
    let raw: unknown; try { raw = await readJson(request, 1024); } catch { throw new PaymentError('validation'); }
    if (!object(raw) || Object.keys(raw).sort().join(',') !== 'orderId,providerPaymentId,signature' || typeof raw.orderId !== 'string' || !UUID.test(raw.orderId) || typeof raw.providerPaymentId !== 'string' || !PROVIDER_PAYMENT_ID.test(raw.providerPaymentId) || typeof raw.signature !== 'string' || !HASH.test(raw.signature)) throw new PaymentError('validation');
    const order = await runtime.service.confirmPayment(user.id, raw.orderId, raw.providerPaymentId, raw.signature, runtime.config.keySecret); if (!order) throw new PaymentError('unavailable');
    return privateJson({ order: financialReceipt(order) });
  } catch (error) { return paymentFailure(error); }
}
