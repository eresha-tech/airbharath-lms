import { createHash } from 'node:crypto';
import { REFUND_POLICY_CATALOGUE, CURRENT_REFUND_POLICY, type RefundPolicyIdentity } from './document';

export class RefundPolicyError extends Error {
  constructor(public code: 'validation' | 'policy_changed' | 'unavailable' | 'authentication' | 'forbidden') { super(code); }
}
export function currentRefundPolicy(): RefundPolicyIdentity {
  const entry = refundPolicyDocument(CURRENT_REFUND_POLICY.version);
  if (!entry || entry.identity.contentHash !== CURRENT_REFUND_POLICY.contentHash || entry.identity.effectiveAt !== CURRENT_REFUND_POLICY.effectiveAt) throw new RefundPolicyError('unavailable');
  return CURRENT_REFUND_POLICY;
}
export function refundPolicyDocument(version: string) {
  if (!Object.hasOwn(REFUND_POLICY_CATALOGUE,version)) return undefined;
  const entry=REFUND_POLICY_CATALOGUE[version as keyof typeof REFUND_POLICY_CATALOGUE];
  if (createHash('sha256').update(entry.canonicalContent,'utf8').digest('hex') !== entry.identity.contentHash || entry.document.version !== entry.identity.version || entry.document.effectiveAt !== entry.identity.effectiveAt) throw new RefundPolicyError('unavailable');
  return entry;
}
export function parseRefundPolicyAcknowledgement(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === 1 && 'acknowledged' in raw && raw.acknowledged === true;
}
export type RefundPolicyAcceptance = { id: string; userId: string; policyVersion: string; policyContentHash: string; acceptedAt: Date; createdAt: Date };
export function acceptanceMatches(acceptance: RefundPolicyAcceptance | undefined, userId: string, terms: RefundPolicyIdentity, now: Date): acceptance is RefundPolicyAcceptance {
  return !!acceptance && acceptance.userId === userId && acceptance.policyVersion === terms.version && acceptance.policyContentHash === terms.contentHash && Number.isFinite(acceptance.acceptedAt.getTime()) && acceptance.acceptedAt <= now && acceptance.acceptedAt >= new Date(terms.effectiveAt) && acceptance.createdAt.getTime() === acceptance.acceptedAt.getTime();
}
