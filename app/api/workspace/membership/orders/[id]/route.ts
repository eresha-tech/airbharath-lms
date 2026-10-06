import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { UUID } from '@/lib/workspace/eligibility/model';
import { postgresFinanceStore } from '@/lib/workspace/payments/repository';
import { financialReceipt, paymentFailure } from '@/lib/workspace/payments/http';
import { PaymentError } from '@/lib/workspace/payments/model';
import { privateJson } from '@/lib/workspace/http';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await getWorkspaceUser(); if (!user) throw new PaymentError('authentication'); const { id } = await context.params; if (!UUID.test(id)) throw new PaymentError('validation');
    const order = await postgresFinanceStore.readOrder(id, user.id); if (!order) throw new PaymentError('not_found'); return privateJson({ order: financialReceipt(order) });
  } catch (error) { return paymentFailure(error); }
}
