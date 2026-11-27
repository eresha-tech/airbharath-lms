import {describe,it,expect} from 'vitest';
import {analyticsFilters,analyticsQuery,indiaDate,completionRate,salesComparison,courseStatus,metricDefinitions} from '@/lib/workspace/creator-analytics/model';
const now=new Date('2026-11-06T20:00:00Z');
describe('Creator reporting periods and safe selections',()=>{
 it('uses India midnight and exclusive end boundaries across UTC days',()=>{
  expect(indiaDate(now)).toBe('2026-11-07');const f=analyticsFilters({range:'7'},now);
  expect(f.from).toBe('2026-11-01');expect(f.to).toBe('2026-11-07');expect(f.days).toBe(7);
  expect(new Date(f.start).toISOString()).toBe('2026-10-31T18:30:00.000Z');expect(new Date(f.end).toISOString()).toBe('2026-11-07T18:30:00.000Z');
  expect(f.previous).toBe('2026-10-25T00:00:00+05:30');
 });
 it.each(['7','30','90','month'])('accepts %s preset without trusting supplied custom dates',range=>{const f=analyticsFilters({range,from:'malformed',to:'malformed'},now);expect(f.to).toBe('2026-11-07');expect(f.days).toBeGreaterThan(0);});
 it('validates custom leap days and an inclusive one-day window',()=>{const f=analyticsFilters({range:'custom',from:'2024-02-29',to:'2024-02-29'},now);expect(f.days).toBe(1);expect(f.end).toBe('2024-03-01T00:00:00+05:30');});
 it.each([
  {range:'custom',from:'2026-02-30',to:'2026-03-01'},
  {range:'custom',from:'2026-11-08',to:'2026-11-08'},
  {range:'custom',from:'2026-11-04',to:'2026-11-01'},
  {range:'custom',from:'2020-01-01',to:'2026-11-01'},
  {range:'custom'}, {range:'all'}, {tab:'private'}, {page:'-1'}, {page:'1 OR true'},
  {course:'not-a-course'}, {creator:'not-an-owner'},
 ])('rejects invalid or unbounded filters %j',params=>{expect(()=>analyticsFilters(params,now)).toThrow();});
 it('keeps URL filters and resets pagination without injecting a target Creator',()=>{const f=analyticsFilters({range:'90',tab:'sales',page:'2'},now),q=new URLSearchParams(analyticsQuery(f,{view:'students',page:1}));expect(q.get('tab')).toBe('students');expect(q.get('range')).toBe('90');expect(q.get('page')).toBe('1');expect(q.get('creator')).toBe('');});
});
describe('honest metric presentation',()=>{
 it('never divides by an empty curriculum or enrollment cohort',()=>{expect(completionRate(0,0)).toBeNull();expect(completionRate(1,3)).toBe(33.3);});
 it('does not manufacture comparisons for new courses, zero periods or absent history',()=>{const f=analyticsFilters({range:'7'},now);expect(salesComparison(5,0,'2020-01-01',f)).toBeNull();expect(salesComparison(0,5,'2020-01-01',f)).toBeNull();expect(salesComparison(5,3,null,f)).toBeNull();expect(salesComparison(5,3,f.start,f)).toBeNull();expect(salesComparison(5,3,'2020-01-01',f)).toEqual({difference:2,previous:3});});
 it('provides readable course statuses and explicit, shared evidence limits',()=>{expect(courseStatus('live')).toBe('Published');expect(courseStatus('historical')).toBe('Historical sales only');const definitions=metricDefinitions.map(d=>d[1]).join(' ');expect(definitions).toContain('complimentary');expect(definitions).toContain('No watch time');expect(definitions).toContain('retired');expect(definitions).toContain('0%');});
});
