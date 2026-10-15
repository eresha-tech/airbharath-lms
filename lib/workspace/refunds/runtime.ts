import 'server-only';
import { createRazorpayAdapter } from '../payments/provider';
import { financialConfiguration, requireFinancialConfiguration } from '../payments/configuration';
import { postgresFinanceStore } from '../payments/repository';
import { createRefundService, type RefundProvider } from './service';
import { postgresRefundStore } from './repository';
import { createRefundEventProcessor } from './events';
export function workspaceRefundRuntime() {
 const config=financialConfiguration('refund') || financialConfiguration('refund_reconciliation');return createRefundService(postgresRefundStore,config?createRazorpayAdapter():undefined);
}
export function refundEventProcessor(provider: RefundProvider) {
 if (!financialConfiguration('refund_reconciliation')) return undefined;
 const service=createRefundService(postgresRefundStore,provider);
 const process=createRefundEventProcessor(provider,postgresFinanceStore,postgresRefundStore,service);
 return async (event: Parameters<typeof process>[0]) => { requireFinancialConfiguration('refund_reconciliation'); await process(event); };
}
export async function runWorkspaceRefundReconciliation(limit=10){
 requireFinancialConfiguration('refund_reconciliation');const provider=createRazorpayAdapter();
 return createRefundService(postgresRefundStore,provider).recoverPrepared(limit);
}
