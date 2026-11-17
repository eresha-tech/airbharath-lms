import {expect,it} from 'vitest';
import {allocateSponsored} from '@/lib/workspace/sponsorship/model';
it('allocates evidenced proceeds and cumulative refunds using the original fixed share',()=>{
 expect(allocateSponsored({grossPaise:118000,taxPaise:18000,feePaise:2360,feeTaxPaise:360,refundedPaise:0,refundTaxPaise:0})).toEqual({distributablePaise:97640,creatorPaise:78112,commissionPaise:19528});
});
import {assertSyntheticSponsorshipRuntime} from '@/lib/workspace/sponsorship/config';
it('rejects real execution and production classifications before any database/provider work',()=>{
 expect(()=>assertSyntheticSponsorshipRuntime({NODE_ENV:'test',DATABASE_ENV:'test'})).toThrow();
 for(const flags of [{NODE_ENV:'production'},{DATABASE_ENV:'production'},{VERCEL_ENV:'production'},{VERCEL:'1'}]) expect(()=>assertSyntheticSponsorshipRuntime({NODE_ENV:'test',DATABASE_ENV:'test',CREATOR_SPONSORSHIP_SYNTHETIC:'true',...flags})).toThrow();
});
it('distinguishes missing fee evidence from actual zero and reverses full-refund commission',()=>{
 expect(()=>allocateSponsored({grossPaise:118000,taxPaise:18000,feePaise:null,feeTaxPaise:null,refundedPaise:0,refundTaxPaise:0})).toThrow('pending');
 expect(allocateSponsored({grossPaise:118000,taxPaise:18000,feePaise:0,feeTaxPaise:0,refundedPaise:0,refundTaxPaise:0})).toEqual({distributablePaise:100000,creatorPaise:80000,commissionPaise:20000});
 expect(allocateSponsored({grossPaise:118000,taxPaise:18000,feePaise:2360,feeTaxPaise:360,refundedPaise:118000,refundTaxPaise:18000})).toEqual({distributablePaise:-2360,creatorPaise:-2360,commissionPaise:0});
});
import {offerDeadline,quoteDeadline} from '@/lib/workspace/sponsorship/model';
it.each([[1,0,1],[2,0,2],[3,1,2],[4,1,3],[5,1,4],[7,1,6],[11,2,9]])('conserves %i positive paise with only one rounded share', (gross,commission,creator)=>{
 expect(allocateSponsored({grossPaise:gross,taxPaise:0,feePaise:0,feeTaxPaise:0,refundedPaise:0,refundTaxPaise:0})).toEqual({distributablePaise:gross,creatorPaise:creator,commissionPaise:commission});
});
it('uses exact elapsed offer and quote lifetimes across calendar boundaries',()=>{
 expect(offerDeadline(new Date('2026-12-25T23:59:59.123Z')).toISOString()).toBe('2027-01-08T23:59:59.123Z');
 expect(quoteDeadline(new Date('2026-12-31T23:55:00.000Z')).toISOString()).toBe('2027-01-01T00:10:00.000Z');
});
it.each([{feePaise:-1},{feeTaxPaise:2361},{refundedPaise:118001},{taxPaise:118001},{refundedPaise:1,confirmedLossPaise:1},{grossPaise:NaN}])('rejects unsafe or overlapping supplied evidence %j',changes=>{
 expect(()=>allocateSponsored({grossPaise:118000,taxPaise:18000,feePaise:2360,feeTaxPaise:360,refundedPaise:0,refundTaxPaise:0,...changes})).toThrow();
});
