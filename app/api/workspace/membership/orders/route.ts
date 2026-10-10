import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { eligibilitySameOrigin } from '@/lib/workspace/eligibility/request';
import { readJson, privateJson } from '@/lib/workspace/http';
import { parseAcceptance, PaymentError } from '@/lib/workspace/payments/model';
import { financialReceipt, paymentFailure } from '@/lib/workspace/payments/http';
import { workspacePaymentRuntime } from '@/lib/workspace/payments/runtime';
export async function POST(request: Request) {
  try {
    const runtime = workspacePaymentRuntime(); // Absent/false gate rejects before any DB or provider call.
    if (!eligibilitySameOrigin(request)) throw new PaymentError('forbidden');
    const user = await getWorkspaceUser(); if (!user) throw new PaymentError('authentication');
    let raw: unknown; try { raw = await readJson(request, 2048); } catch { throw new PaymentError('validation'); }
    const input = parseAcceptance(raw); if (!input) throw new PaymentError('validation');
    const accepted = await runtime.service.acceptOrder(user.id, input);
    const order = await runtime.service.ensureProviderOrder(user.id, accepted.id);
    return privateJson({ order: financialReceipt(order), checkout: order.providerOrderId ? { keyId: runtime.config.keyId, providerOrderId: order.providerOrderId } : undefined }, 201);
  } catch (error) { return paymentFailure(error); }
}
