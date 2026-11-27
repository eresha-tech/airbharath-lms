'use client';

import {useId, useState} from 'react';
import {money} from '@/lib/creator-payments/presentation';
import {trendDate, trendScale, trendTick} from '@/lib/workspace/creator-analytics/chart';
import type {Trend} from '@/lib/workspace/creator-analytics/repository';

const series = {
 money: [
  {key: 'revenue', label: 'Collected revenue', color: 'hsl(var(--brand-ink))'},
  {key: 'earnings', label: 'Recorded Creator earnings', color: 'var(--trend-earnings)'},
 ],
 enrollments: [{key: 'enrollments', label: 'New course enrollments', color: 'hsl(var(--brand-ink))'}],
} as const;
const count = (value: number) => new Intl.NumberFormat('en-IN').format(value);
const width = 640, height = 208, inset = 8, bottom = height - inset;

export function TrendPlot({rows, mode}: {rows: Trend[]; mode: 'money' | 'enrollments'}) {
 const gradient = useId(), description = useId(), selection = useId();
 const lines = series[mode];
 const [selected, setSelected] = useState(() => Math.max(0, rows.findLastIndex(row => lines.some(line => row[line.key] !== 0))));
 // URL navigation can replace the reporting period without remounting this island.
 const index = Math.min(selected, rows.length - 1), current = rows[index];
 const scale = trendScale(rows.flatMap(row => lines.map(line => row[line.key])));
 const x = (i: number) => rows.length === 1 ? width / 2 : inset + i * (width - inset * 2) / (rows.length - 1);
 const y = (value: number) => inset + scale.position(value) * (height - inset * 2);
 const format = mode === 'money' ? money : count;
 const dates = [...new Set([0, Math.floor((rows.length - 1) / 4), Math.floor((rows.length - 1) / 2), Math.floor((rows.length - 1) * 3 / 4), rows.length - 1])];
 const pointString = (key: typeof lines[number]['key']) => rows.map((row, i) => `${x(i).toFixed(2)},${y(row[key]).toFixed(2)}`).join(' ');
 const label = mode === 'money' ? 'Revenue and earnings over time' : 'New enrollments over time';

 return <figure className="mt-6 min-w-0 [--trend-earnings:#047857] dark:[--trend-earnings:#34d399]">
  <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
   <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium">{lines.map((line, i) => <span key={line.key} className="inline-flex items-center gap-2"><span aria-hidden className={`w-5 border-t-[3px] ${i ? 'border-dashed' : ''}`} style={{borderColor: line.color}}/>{line.label}</span>)}</div>
   <span className="rounded-full border bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">Daily · IST</span>
  </div>

  <div className="mt-6 rounded-2xl border bg-muted/10 px-3 pb-4 pt-5 sm:px-5">
   <p className="sr-only">Scale: {format(scale.min)} to {format(scale.max)}</p>
   <div className="flex gap-2 sm:gap-3">
    <div aria-hidden className="relative h-52 w-[3.75rem] shrink-0 text-right text-[10px] tabular-nums text-muted-foreground sm:w-[4.5rem] sm:text-xs">{scale.ticks.map(tick => <span key={tick} className="absolute right-0 -translate-y-1/2 whitespace-nowrap" style={{top: `${y(tick) / height * 100}%`}}>{trendTick(tick, mode === 'money')}</span>)}</div>
    <div className="min-w-0 flex-1">
     <svg className="block h-52 w-full touch-pan-y" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label + '. Exact values are available below and in Read daily values.'}
      onPointerMove={event => {if(event.pointerType === 'touch') return; const rect = event.currentTarget.getBoundingClientRect(); const position = ((event.clientX - rect.left) / rect.width * width - inset) / (width - inset * 2); setSelected(Math.max(0, Math.min(rows.length - 1, Math.round(position * (rows.length - 1)))));}}
      onPointerDown={event => {const rect = event.currentTarget.getBoundingClientRect(); const position = ((event.clientX - rect.left) / rect.width * width - inset) / (width - inset * 2); setSelected(Math.max(0, Math.min(rows.length - 1, Math.round(position * (rows.length - 1)))));}}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={lines[0].color} stopOpacity="0.13"/><stop offset="100%" stopColor={lines[0].color} stopOpacity="0.015"/></linearGradient></defs>
      {scale.ticks.map(tick => <line key={tick} x1={inset} x2={width - inset} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'stroke-muted-foreground/45' : 'stroke-border'} strokeDasharray={tick === 0 ? undefined : '3 5'} vectorEffect="non-scaling-stroke"/>)}
      {rows.length > 1 && <polygon points={`${x(0)},${y(0)} ${pointString(lines[0].key)} ${x(rows.length - 1)},${y(0)}`} fill={`url(#${gradient})`}/>}
      {lines.map((line, i) => <polyline key={line.key} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={i ? '6 5' : undefined} vectorEffect="non-scaling-stroke" points={pointString(line.key)}/>)}
      <line x1={x(index)} x2={x(index)} y1={inset} y2={bottom} className="stroke-muted-foreground/60" strokeDasharray="3 5" vectorEffect="non-scaling-stroke"/>
      {lines.map(line => <svg aria-hidden key={line.key} x={x(index) - 6} y={y(current[line.key]) - 6} width="12" height="12" viewBox="0 0 12 12" preserveAspectRatio="xMidYMid meet" overflow="visible"><circle cx="6" cy="6" r="4" fill={line.color} className="stroke-card" strokeWidth="2"/></svg>)}
     </svg>
     <div aria-hidden className="relative mt-2 h-5 text-[10px] tabular-nums text-muted-foreground sm:text-xs">{dates.map((i, n) => <span key={i} className={`absolute whitespace-nowrap ${n > 0 && n < dates.length - 1 && n !== Math.floor((dates.length - 1) / 2) ? 'hidden sm:block' : ''}`} style={{left: `${x(i) / width * 100}%`, transform: dates.length === 1 ? 'translateX(-50%)' : n === 0 ? 'none' : n === dates.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)'}}>{trendDate(rows[i].day)}</span>)}</div>
    </div>
   </div>

   <div className="mt-5 border-t pt-4">
    <div id={selection} className="grid gap-4 sm:grid-cols-[1fr_2fr]">
     <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Selected day · IST</p><p className="mt-1 text-sm font-semibold tabular-nums">{trendDate(current.day, true)}</p><p className="mt-1 text-xs text-muted-foreground">{mode === 'money' ? `${count(current.sales)} verified ${current.sales === 1 ? 'sale' : 'sales'}` : 'Recorded course enrollments'}</p></div>
     <dl className={`grid gap-4 ${lines.length > 1 ? 'grid-cols-2' : ''}`}>{lines.map(line => <div key={line.key}><dt className="flex items-center gap-2 text-[11px] leading-5 text-muted-foreground"><span className="size-1.5 shrink-0 rounded-full" aria-hidden style={{background: line.color}}/>{line.label}</dt><dd className="mt-1 break-words font-outfit text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{format(current[line.key])}</dd></div>)}</dl>
    </div>
    <label className="mt-5 block text-xs font-medium" htmlFor={description}>Day to inspect</label>
    <input id={description} type="range" min="0" max={rows.length - 1} value={index} disabled={rows.length === 1} onChange={event => setSelected(Number(event.target.value))}
     aria-valuetext={`${trendDate(current.day, true)}. ${lines.map(line => `${line.label}: ${format(current[line.key])}`).join('. ')}`} aria-controls={selection}
     className="mt-1 block h-8 w-full cursor-pointer appearance-none bg-transparent accent-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--brand-ink))] [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[hsl(var(--brand-ink))]"/>
    <p className="text-[11px] leading-5 text-muted-foreground">Hover or tap the graph to inspect a day. Use the slider or its arrow keys for precise selection.</p>
   </div>
  </div>
  <figcaption className="mt-3 text-xs leading-6 text-muted-foreground">{trendDate(rows[0].day)}–{trendDate(rows[rows.length - 1].day)} · {mode === 'money' ? 'Indian rupees' : 'Course enrollments'}. The current day may be incomplete. This is reporting activity, not a payout schedule.</figcaption>
 </figure>;
}
