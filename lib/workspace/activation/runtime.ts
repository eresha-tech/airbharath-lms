import 'server-only';
import { createWorkspaceActivationService } from './service';
import { postgresActivationStore } from './repository';
// Independent of provider reconciliation and browser redirects. No public route or scheduler is provisioned.
// Only test-authoritative development evidence is supported until the commercial launch gates are verified.
export async function runWorkspaceActivationRecovery(limit = 10) {
  if (process.env.NODE_ENV === 'production') throw new Error('activation_environment_disabled');
  return createWorkspaceActivationService(postgresActivationStore, process.env.DATABASE_ENV).runBatch(limit);
}
