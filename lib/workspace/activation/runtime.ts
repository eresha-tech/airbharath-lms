import 'server-only';
import type { ProviderContext } from '../payments/model';
import { createWorkspaceActivationService } from './service';
import { postgresActivationStore } from './repository';
// Independent of provider reconciliation and browser redirects. No public route or scheduler is provisioned.
// Only test-authoritative development evidence is supported until the commercial launch gates are verified.
export async function runWorkspaceActivationRecovery(limit = 10, context?: ProviderContext) {
  if (process.env.NODE_ENV === 'production') throw new Error('activation_environment_disabled');
  const scope = context || { accountId: process.env.WORKSPACE_RAZORPAY_ACCOUNT_ID || '', mode: process.env.WORKSPACE_RAZORPAY_MODE as 'test' };
  return createWorkspaceActivationService(postgresActivationStore, process.env.DATABASE_ENV, () => new Date(), scope).runBatch(limit);
}
