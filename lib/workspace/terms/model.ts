import { createHash } from 'node:crypto';
import { CREATOR_TERMS_CATALOGUE, CURRENT_CREATOR_TERMS, type CreatorTermsIdentity } from './document';

export class CreatorTermsError extends Error {
  constructor(public code: 'validation' | 'terms_changed' | 'unavailable' | 'authentication' | 'forbidden') { super(code); }
}
export function currentCreatorTerms(): CreatorTermsIdentity {
  const entry = creatorTermsDocument(CURRENT_CREATOR_TERMS.version);
  if (!entry || entry.identity.contentHash !== CURRENT_CREATOR_TERMS.contentHash || entry.identity.effectiveAt !== CURRENT_CREATOR_TERMS.effectiveAt) throw new CreatorTermsError('unavailable');
  return CURRENT_CREATOR_TERMS;
}
export function creatorTermsDocument(version: string) {
  if (!Object.hasOwn(CREATOR_TERMS_CATALOGUE, version)) return undefined;
  const entry = CREATOR_TERMS_CATALOGUE[version as keyof typeof CREATOR_TERMS_CATALOGUE];
  if (createHash('sha256').update(entry.canonicalContent, 'utf8').digest('hex') !== entry.identity.contentHash || entry.document.version !== entry.identity.version || entry.document.effectiveAt !== entry.identity.effectiveAt) throw new CreatorTermsError('unavailable');
  return entry;
}
export function parseCreatorTermsAcknowledgement(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw).length === 1 && 'acknowledged' in raw && raw.acknowledged === true;
}
export type CreatorTermsAcceptance = { id: string; userId: string; termsVersion: string; termsContentHash: string; acceptedAt: Date; createdAt: Date };
export function acceptanceMatches(acceptance: CreatorTermsAcceptance | undefined, userId: string, terms: CreatorTermsIdentity, now: Date): acceptance is CreatorTermsAcceptance {
  return !!acceptance && acceptance.userId === userId && acceptance.termsVersion === terms.version && acceptance.termsContentHash === terms.contentHash && Number.isFinite(acceptance.acceptedAt.getTime()) && acceptance.acceptedAt <= now && acceptance.acceptedAt >= new Date(terms.effectiveAt) && acceptance.createdAt.getTime() === acceptance.acceptedAt.getTime();
}
