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
