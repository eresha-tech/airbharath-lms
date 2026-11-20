import {expect,it} from 'vitest';
import {liveSponsorshipContract} from '@/lib/workspace/sponsorship/activation';
it('does not turn a flag, arbitrary legal body or release identifier into real commercial authorization',()=>{
 const env={NODE_ENV:'production',DATABASE_ENV:'production',CREATOR_SPONSORSHIP_LIVE_RELEASE:'unreviewed',RAZORPAY_KEY_ID:'rzp_live_SYNTHETIC',COURSE_RAZORPAY_ACCOUNT_ID:'acc_synthetic',CREATOR_SPONSORSHIP_ENABLED:'true'};
 expect(liveSponsorshipContract(env)).toBeNull();
 expect(liveSponsorshipContract({...env,CREATOR_SPONSORSHIP_SYNTHETIC:'true'})).toBeNull();
});
import {appendCommercialStatement} from '@/lib/creator-payments/presentation';
it('retains the ordinary statement shape and discloses original mixed shares and source corrections',()=>{
 const table=[['Course'],['Synthetic source']];
 expect(appendCommercialStatement([{commercialArrangement:'standard_0'}],table)).toEqual(table);
 const mixed=appendCommercialStatement([{commercialArrangement:'sponsored_20',commission:19528,sourcePaid:0,sourceReserved:0,sourceCorrection:2360,sourceProvenance:'purchase'}],table);
 expect(mixed[1]).toEqual(['Synthetic source','sponsored_20','195.28','0.00','0.00','23.60','purchase']);
});
