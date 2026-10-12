import 'server-only';
import { createRazorpayTestAdapter, requireTestPaymentConfiguration, testPaymentConfiguration } from '../payments/provider';
import { postgresFinanceStore } from '../payments/repository';
import { createRefundService, type RefundProvider } from './service';
import { postgresRefundStore } from './repository';
import { createRefundEventProcessor } from './events';
export function workspaceRefundRuntime() {
 const config=testPaymentConfiguration();return createRefundService(postgresRefundStore,config?createRazorpayTestAdapter(config):undefined);
}
export function refundEventProcessor(provider: RefundProvider) {
 const service=createRefundService(postgresRefundStore,provider);
 return createRefundEventProcessor(provider,postgresFinanceStore,postgresRefundStore,service);
}
export async function runWorkspaceRefundReconciliation(limit=10){
 const config=requireTestPaymentConfiguration();const provider=createRazorpayTestAdapter(config);
 return createRefundService(postgresRefundStore,provider).recoverPrepared(limit);
}
