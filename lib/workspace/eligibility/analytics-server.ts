import { createHash } from 'node:crypto';
import { serverTrack } from '@/lib/analytics-server';
import { EVALUATOR_VERSION, ELIGIBILITY_POLICY_VERSION } from './model';
export async function trackEligibilityDecision(id: string, result: 'eligible' | 'ineligible') {
  try { await serverTrack(`workspace-eligibility:${createHash('sha256').update(id).digest('hex')}`,
    result === 'eligible' ? 'workspace_eligibility_passed' : 'workspace_eligibility_failed',
    { feature: 'workspace', eventVersion: '2', evaluatorVersion: EVALUATOR_VERSION, policyVersion: ELIGIBILITY_POLICY_VERSION, $process_person_profile: false }); }
  catch { /* Committed eligibility never depends on telemetry. */ }
}
