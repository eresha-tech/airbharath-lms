import { UUID } from '../eligibility/model';
import { acceptanceMatches, RefundPolicyError, currentRefundPolicy, parseRefundPolicyAcknowledgement, type RefundPolicyAcceptance } from './model';
import type { RefundPolicyIdentity } from './document';

export interface RefundPolicyStore {
  // Both acceptance and new-order acceptance serialize on the persisted user row.
  accept(userId: string, terms: RefundPolicyIdentity, now: Date): Promise<RefundPolicyAcceptance>;
}
export function createRefundPolicyService(store: RefundPolicyStore, clock = () => new Date(), current = currentRefundPolicy) {
  return {
    async accept(userId: string, command: unknown, displayedEtag: string | null) {
      if (!UUID.test(userId)) throw new RefundPolicyError('authentication');
      if (!parseRefundPolicyAcknowledgement(command)) throw new RefundPolicyError('validation');
      const terms = current(), now = clock();
      // HTTP precondition detects an old open tab. It cannot choose the stored version/hash.
      if (displayedEtag !== `"${terms.contentHash}"`) throw new RefundPolicyError('policy_changed');
      if (!Number.isFinite(now.getTime()) || now < new Date(terms.effectiveAt)) throw new RefundPolicyError('unavailable');
      const row = await store.accept(userId, terms, now);
      if (!acceptanceMatches(row, userId, terms, now)) throw new RefundPolicyError('unavailable');
      return row;
    },
  };
}
