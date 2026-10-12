import 'server-only';
import { createRazorpayAdapter } from '../payments/provider';
import { financialConfiguration, requireFinancialConfiguration } from '../payments/configuration';
import { postgresFinanceStore } from '../payments/repository';
import { createRefundService, type RefundProvider } from './service';
import { postgresRefundStore } from './repository';
import { createRefundEventProcessor } from './events';
export function workspaceRefundRuntime() {
 const config=financialConfiguration('refund') || financialConfiguration('reconciliation');return createRefundService(postgresRefundStore,config?createRazorpayAdapter():undefined);
}
export function refundEventProcessor(provider: RefundProvider) {
 const service=createRefundService(postgresRefundStore,provider);
 return createRefundEventProcessor(provider,postgresFinanceStore,postgresRefundStore,service);
}
export async function runWorkspaceRefundReconciliation(limit=10){
 requireFinancialConfiguration('reconciliation');const provider=createRazorpayAdapter();
 return createRefundService(postgresRefundStore,provider).recoverPrepared(limit);
}
