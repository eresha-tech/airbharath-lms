import { createHash } from 'node:crypto';
export const SYNTHETIC_AGREEMENT_VERSION = 'synthetic-sponsored-creator-v1';
// This is a test fixture contract, never the founder's review addendum or a live legal registration.
export const SYNTHETIC_AGREEMENT_BODY = 'SYNTHETIC ONLY. Complimentary editing starts on acceptance for the offered term. New course quotes use the offered fixed 0% or Creator 80% / AirBharath 20% arrangement after supplied tax and actual gateway evidence. Sponsored sales continue after grant expiry. Verified paid membership permanently replaces sponsorship with 0%; later expiry or refund never revives it. Historical orders retain their terms. Full refunds reverse commission. No real tax model, bank debit or future-earnings offset is authorized. Settlement is disabled pending legal/accounting approval.';
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const SYNTHETIC_AGREEMENT_HASH = sha256(SYNTHETIC_AGREEMENT_BODY);
export type Arrangement = 'standard_0' | 'sponsored_20';
export type CommercialSnapshot = { version: 1; synthetic: true; quoteId: string; arrangement: Arrangement; agreementId: string | null; effectiveEventId: string | null; scope: string; legalVersion: string; legalHash: string; calculationVersion: 'fixed-share-paise-v1' };
export class SponsorshipError extends Error { constructor(public status: number, message: string) { super(message); } }
export type AllocationEvidence = { grossPaise: number; taxPaise: number; feePaise: number | null; feeTaxPaise: number | null; refundedPaise: number; refundTaxPaise: number; confirmedLossPaise?: number; approvedAdjustmentPaise?: number };
export function allocateSponsored(e: AllocationEvidence) {
 const money = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 100000000;
 if (e.feePaise === null || e.feeTaxPaise === null) throw new SponsorshipError(409, 'Actual gateway fee evidence is pending.');
 if (![e.grossPaise,e.taxPaise,e.feePaise,e.feeTaxPaise,e.refundedPaise,e.refundTaxPaise,e.confirmedLossPaise??0].every(money) || e.taxPaise>e.grossPaise || e.refundedPaise>e.grossPaise || e.refundTaxPaise>e.taxPaise || e.feeTaxPaise>e.feePaise) throw new SponsorshipError(409,'Invalid supplied financial evidence.');
 if(!Number.isSafeInteger(e.approvedAdjustmentPaise??0)||Math.abs(e.approvedAdjustmentPaise??0)>100000000)throw new SponsorshipError(409,'Invalid adjustment evidence.');
 if(e.refundedPaise&&(e.confirmedLossPaise??0)>0)throw new SponsorshipError(409,'Refund and chargeback overlap needs independent review.');
 const distributablePaise=e.grossPaise-e.taxPaise-e.refundedPaise+e.refundTaxPaise-e.feePaise-(e.confirmedLossPaise??0)+(e.approvedAdjustmentPaise??0);
 const commissionPaise=e.refundedPaise===e.grossPaise?0:Number((BigInt(Math.max(distributablePaise,0))*BigInt(2000)+BigInt(5000))/BigInt(10000));
 return {distributablePaise,creatorPaise:distributablePaise-commissionPaise,commissionPaise};
}
export const offerDeadline = (secondApproval: Date) => new Date(secondApproval.getTime()+14*86400000);
export const quoteDeadline = (frozenAt: Date) => new Date(frozenAt.getTime()+15*60000);
