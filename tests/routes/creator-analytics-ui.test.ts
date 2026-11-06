import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {TrendChart,MetricCards,Definitions} from '@/components/workspace/analytics/Analytics';
import {trendScale,trendTick} from '@/lib/workspace/creator-analytics/chart';
it('provides an accessible revenue chart with readable daily source values and negative earnings',()=>{
 const html=renderToStaticMarkup(createElement(TrendChart,{rows:[{day:'2026-11-01',sales:1,revenue:10000,earnings:8000,enrollments:1},{day:'2026-11-02',sales:0,revenue:0,earnings:-8000,enrollments:0}]}));
 expect(html).toContain('role="img"');expect(html).toContain('Read daily values');expect(html).toContain('<caption');expect(html).toContain('current day');expect(html).toContain('₹100.00');expect(html).toContain('-₹80.00');expect(html).not.toContain('watch time');
 expect(html).toContain('type="range"');expect(html).toContain('Day to inspect');expect(html).toContain('2 November 2026');expect(html).toContain('Recorded Creator earnings: -₹80.00');expect(html).toContain('stroke-dasharray="6 5"');
});
it('uses genuine no-activity and unconfigured financial states instead of a fabricated chart',()=>{
 const rows=[{day:'2026-11-01',sales:0,revenue:0,earnings:0,enrollments:0}];
 expect(renderToStaticMarkup(createElement(TrendChart,{rows}))).toContain('No recorded activity');
 const html=renderToStaticMarkup(createElement(TrendChart,{rows,available:false}));expect(html).toContain('unavailable');expect(html).not.toContain('₹0.00');expect(html).not.toContain('<svg');
});
it('keeps enrollment charts distinct from activity or watch-time claims',()=>{const html=renderToStaticMarkup(createElement(TrendChart,{mode:'enrollments',rows:[{day:'2026-11-01',sales:0,revenue:0,earnings:0,enrollments:2}]}));expect(html).toContain('New enrollments over time');expect(html).toContain('<circle');expect(html).toContain('One learner can enroll');expect(html).not.toContain('daily active');});
it('reuses accessible cards and expandable metric definitions',()=>{expect(renderToStaticMarkup(createElement(MetricCards,{items:[{label:'Complimentary origin',value:'Not recorded',hint:'Unknown origin is not free'}]}))).toContain('Not recorded');const html=renderToStaticMarkup(createElement(Definitions));expect(html).toContain('<details');expect(html).toContain('How these numbers are counted');expect(html).toContain('not a historical activity log');});
it('keeps negative adjustments, paise and high values inside a zero-based readable scale',()=>{
 for(const values of [[10000,-8000,0],[0,-8000],[1,0],[123456789,55555555],[0,0]]){
  const scale=trendScale(values);expect(scale.min).toBeLessThanOrEqual(0);expect(scale.max).toBeGreaterThanOrEqual(0);expect(scale.max).toBeGreaterThan(scale.min);
  expect(scale.ticks).toContain(0);expect(scale.ticks.length).toBeLessThanOrEqual(7);
  for(const value of values){expect(scale.position(value)).toBeGreaterThanOrEqual(0);expect(scale.position(value)).toBeLessThanOrEqual(1);}
 }
 expect(trendTick(1,true)).toBe('₹0.01');expect(trendTick(-1,true)).toBe('−₹0.01');
});
it('uses whole enrollment ticks and a visible point for a single observed day',()=>{
 const scale=trendScale([0,1,3]);expect(scale.ticks.every(Number.isInteger)).toBe(true);
 const html=renderToStaticMarkup(createElement(TrendChart,{mode:'enrollments',rows:[{day:'2026-11-01',sales:0,revenue:0,earnings:0,enrollments:1}]}));
 expect(html).toContain('disabled=""');expect(html).toContain('New course enrollments: 1');expect(html).toContain('<circle');expect(html).not.toContain('NaN');expect(html).not.toContain('<polygon');
});
