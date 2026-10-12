import { createHash } from 'node:crypto';
import { CREATOR_TERMS_CANONICAL_CONTENT, CURRENT_CREATOR_TERMS, type CreatorTermsIdentity } from './document';

export class CreatorTermsError extends Error {
  constructor(public code: 'validation' | 'terms_changed' | 'unavailable' | 'authentication' | 'forbidden') { super(code); }
}
export function currentCreatorTerms(): CreatorTermsIdentity {
  if (createHash('sha256').update(CREATOR_TERMS_CANONICAL_CONTENT, 'utf8').digest('hex') !== CURRENT_CREATOR_TERMS.contentHash) throw new CreatorTermsError('unavailable');
  return CURRENT_CREATOR_TERMS;
}
export function parseCreatorTermsAcknowledgement(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === 1 && 'acknowledged' in raw && raw.acknowledged === true;
}
export type CreatorTermsAcceptance = { id: string; userId: string; termsVersion: string; termsContentHash: string; acceptedAt: Date; createdAt: Date };
export function acceptanceMatches(acceptance: CreatorTermsAcceptance | undefined, userId: string, terms: CreatorTermsIdentity, now: Date): acceptance is CreatorTermsAcceptance {
  return !!acceptance && acceptance.userId === userId && acceptance.termsVersion === terms.version && acceptance.termsContentHash === terms.contentHash && Number.isFinite(acceptance.acceptedAt.getTime()) && acceptance.acceptedAt <= now && acceptance.acceptedAt >= new Date(terms.effectiveAt) && acceptance.createdAt.getTime() === acceptance.acceptedAt.getTime();
}
