import {describe,it,expect} from 'vitest';
import {prepaidRenewalTerm,addCalendarMonthsIST,resolveMembershipAccess} from '@/lib/workspace/activation/model';
import {RENEWAL_RULE,RENEWAL_RULE_VERSION} from '@/lib/workspace/membership/model';
describe('immutable prepaid renewal calendar',()=>{
 it.each([3,6,12])('preserves remaining paid time for %i months',months=>{const end=new Date('2027-01-31T12:34:56.789Z'),paid=new Date('2026-11-09T00:00Z');expect(prepaidRenewalTerm(paid,months,[end])).toEqual({startsAt:end,endsAt:addCalendarMonthsIST(end,months)});});
 it('starts an expired renewal at verified capture and clamps month end in IST',()=>{const paid=new Date('2027-01-31T12:34:56.789Z');expect(prepaidRenewalTerm(paid,3,[new Date('2026-12-01')])).toEqual({startsAt:paid,endsAt:new Date('2027-04-30T12:34:56.789Z')});});
 it('uses every remaining unrefunded paid term, including queued renewals',()=>{const end=new Date('2027-11-09');expect(prepaidRenewalTerm(new Date('2026-11-09'),6,[new Date('2027-02-09'),end]).startsAt).toEqual(end);});
 it('has an explicit versioned rule excluding complimentary grants',()=>{expect(RENEWAL_RULE_VERSION).toBe('workspace-prepaid-renewal-v1');expect(RENEWAL_RULE).toContain('Complimentary grants do not extend or shorten paid terms');});
 it('does not grant a future renewal early when the earlier term was refunded',()=>{const now=new Date('2026-12-09'),e={profileStatus:'enabled' as const,providerMode:'test',commercialPolicyVersion:'workspace-test-noncommercial-v1',activationState:'fulfilled' as const,membership:{startsAt:new Date('2027-02-09'),endsAt:new Date('2027-05-09'),fulfilledAt:now,accessGrantedAt:now}};expect(resolveMembershipAccess(e,now,'test').hasCreatorAccess).toBe(false);expect(resolveMembershipAccess(e,e.membership.startsAt,'test').hasCreatorAccess).toBe(true);expect(resolveMembershipAccess(e,e.membership.endsAt,'test').hasCreatorAccess).toBe(false);});
});
