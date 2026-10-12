import 'server-only';
import type { ProviderContext } from '../payments/model';
import { requireFinancialConfiguration } from '../payments/configuration';
import { classifyWorkspaceRuntime } from '../payments/classification';
import { createWorkspaceActivationService } from './service';
import { postgresActivationStore } from './repository';
export async function runWorkspaceActivationRecovery(limit = 10, context?: ProviderContext) {
  const config = requireFinancialConfiguration('reconciliation');
  if (context && (context.mode !== config.mode || context.accountId !== config.accountId)) throw new Error('activation_provider_context_mismatch');
  return createWorkspaceActivationService(postgresActivationStore, classifyWorkspaceRuntime(), () => new Date(), config).runBatch(limit);
}
