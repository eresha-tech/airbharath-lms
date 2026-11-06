import {describe,it,expect} from 'vitest';
import {financeFilters,csv,csvCell,settlementMonth,payoutLabels} from '@/lib/creator-payments/presentation';
describe('finance statements and navigation',()=>{
 it('rejects invalid calendar dates and bounds independent history pages',()=>{
  expect(financeFilters({from:'2026-02-30',to:'2026-03-31',page:'999999',search:' hello '})).toMatchObject({from:'',to:'2026-03-31',page:10000,search:'hello'});
  expect(financeFilters({page:'-5'}).page).toBe(1);
 });
 it('neutralizes formula cells including whitespace and control prefixes',()=>{
  for(const value of ['=1+1',' +cmd','\t@SUM(A1)','\r\n-1+2'])expect(csvCell(value)).toBe('"\''+value+'"');
  expect(csv([['title','quoted"field'],['Aircraft','2026-11-06']])).toContain('"quoted""field"');
 });
 it('keeps initiation distinct from confirmed receipt and uses previous IST settlement month',()=>{
  expect(payoutLabels.initiated).toBe('Transfer initiated');expect(payoutLabels.confirmed).toBe('Paid');
  expect(settlementMonth('2026-10-31T18:30:00Z')).toBe('October 2026');
 });
});
it('describes provider statuses, uncertain response, separate funding and later reversals accurately',async()=>{
 const {payoutLabel,payoutExplanation}=await import('@/lib/creator-payments/presentation');
 expect(payoutLabel({provider:'razorpayx',state:'approved',executionStage:'awaiting_authorization'})).toBe('Awaiting independent approval');
 expect(payoutLabel({provider:'razorpayx',state:'uncertain',providerStatus:'processed'})).not.toBe('Paid');
 expect(payoutLabel({provider:'razorpayx',state:'confirmed',providerStatus:'processed'})).toBe('Paid');
 expect(payoutLabel({provider:'razorpayx',state:'failed',providerStatus:'reversed'})).toBe('Reversed');
 expect(payoutExplanation({state:'uncertain',providerStatus:'queued',reason:'low_balance'})).toContain('separate payout account');
 expect(payoutExplanation({state:'uncertain',lastError:'provider_response_unknown'})).toContain('remains reserved');
});

it.each([
 ['approved',null,'Payment being prepared'],
 ['uncertain','queued','Payment being prepared'],
 ['uncertain','pending','Awaiting payment approval'],
 ['uncertain','scheduled','Payment being prepared'],
 ['initiated','processing','Transfer in progress'],
 ['uncertain',null,'We’re checking your payment'],
 ['confirmed','processed','Paid'],
 ['failed','failed','Payment failed'],
 ['failed','rejected','Payment failed'],
 ['failed','request_rejected','Payment failed'],
 ['failed','reversed','Payment returned'],
 ['cancelled',null,'Payment cancelled'],
])('gives Creators a clear label for %s / %s without changing the financial state',async(state,providerStatus,label)=>{
 const {creatorPayoutPresentation}=await import('@/lib/creator-payments/presentation');
 const view=creatorPayoutPresentation({provider:'razorpayx',state,providerStatus});expect(view.label).toBe(label);expect(view.description.length).toBeGreaterThan(30);expect(view.action.length).toBeGreaterThan(30);
 expect(JSON.stringify(view)).not.toMatch(/RazorpayX|funding account|reconciliation|independent GET|idempotency/);
});
it('never labels a Creator payment Paid from approval, a POST response, or inconsistent provider projection',async()=>{
 const {creatorPayoutPresentation}=await import('@/lib/creator-payments/presentation');
 for(const state of ['approved','initiated','uncertain','failed'])expect(creatorPayoutPresentation({provider:'razorpayx',state,providerStatus:'processed'}).label).not.toBe('Paid');
 expect(creatorPayoutPresentation({provider:'razorpayx',state:'confirmed',providerStatus:null}).label).not.toBe('Paid');
 expect(creatorPayoutPresentation({state:'confirmed'}).label).toBe('Paid');
});
it('assigns a funding delay to AirBharath and asks for no redundant bank change',async()=>{
 const {creatorPayoutPresentation,payoutExplanation}=await import('@/lib/creator-payments/presentation');
 const p={provider:'razorpayx',state:'uncertain',providerStatus:'queued',reason:'low_balance'};
 expect(creatorPayoutPresentation(p)).toMatchObject({label:'Payment delayed',tone:'review'});
 expect(creatorPayoutPresentation(p).description).toContain('AirBharath’s side');expect(creatorPayoutPresentation(p).action).toContain('do not need to change your bank account');
 expect(payoutExplanation(p)).toContain('add funds to the separate payout account');
 expect(payoutExplanation({...p,state:'confirmed',providerStatus:'processed'})).not.toContain('insufficient');
});
it('explains the next step for each bank verification decision and keeps course publication separate',async()=>{
 const {payeeGuidance}=await import('@/lib/creator-payments/presentation');
 expect(payeeGuidance()).toContain('publish courses before');expect(payeeGuidance({decision:null})).toContain('do not need to submit them again');
 expect(payeeGuidance({decision:'reject_payee'})).toContain('save corrected details');expect(payeeGuidance({decision:'verify_payee'})).toContain('No action is needed');
});

it('never tells Admin to execute an already cancelled operation',async()=>{const {payoutExplanation}=await import('@/lib/creator-payments/presentation');expect(payoutExplanation({state:'cancelled',executionStage:'done'})).toContain('operation is closed');expect(payoutExplanation({state:'cancelled',executionStage:'done'})).not.toContain('processed automatically');});
