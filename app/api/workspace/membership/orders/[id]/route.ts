import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { UUID } from '@/lib/workspace/eligibility/model';
import { postgresFinanceStore, readWorkspaceFinancialRefund } from '@/lib/workspace/payments/repository';
import { financialReceipt, paymentFailure } from '@/lib/workspace/payments/http';
import { financialConfiguration } from '@/lib/workspace/payments/configuration';
import { PaymentError } from '@/lib/workspace/payments/model';
import { privateJson } from '@/lib/workspace/http';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { const user = await getWorkspaceUser(); if (!user) throw new PaymentError('authentication'); const { id } = await context.params; if (!UUID.test(id)) throw new PaymentError('validation');
    const order = await postgresFinanceStore.readOrder(id, user.id); if (!order) throw new PaymentError('not_found'); const refund = await readWorkspaceFinancialRefund(id, user.id); const config = financialConfiguration('checkout'); const checkout = !refund && config && config.accountId === order.providerAccountId && config.mode === order.providerMode && order.providerOrderId ? { keyId: config.keyId, providerOrderId: order.providerOrderId } : undefined; return privateJson({ order: financialReceipt(order, refund), checkout });
  } catch (error) { return paymentFailure(error); }
}
