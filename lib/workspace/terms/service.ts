import { UUID } from '../eligibility/model';
import { acceptanceMatches, CreatorTermsError, currentCreatorTerms, parseCreatorTermsAcknowledgement, type CreatorTermsAcceptance } from './model';
import type { CreatorTermsIdentity } from './document';

export interface CreatorTermsStore {
  // Both acceptance and new-order acceptance serialize on the persisted user row.
  accept(userId: string, terms: CreatorTermsIdentity, now: Date): Promise<CreatorTermsAcceptance>;
}
export function createCreatorTermsService(store: CreatorTermsStore, clock = () => new Date(), current = currentCreatorTerms) {
  return {
    async accept(userId: string, command: unknown, displayedEtag: string | null) {
      if (!UUID.test(userId)) throw new CreatorTermsError('authentication');
      if (!parseCreatorTermsAcknowledgement(command)) throw new CreatorTermsError('validation');
      const terms = current(), now = clock();
      // HTTP precondition detects an old open tab. It cannot choose the stored version/hash.
      if (displayedEtag !== `"${terms.contentHash}"`) throw new CreatorTermsError('terms_changed');
      if (!Number.isFinite(now.getTime()) || now < new Date(terms.effectiveAt)) throw new CreatorTermsError('unavailable');
      const row = await store.accept(userId, terms, now);
      if (!acceptanceMatches(row, userId, terms, now)) throw new CreatorTermsError('unavailable');
      return row;
    },
  };
}
