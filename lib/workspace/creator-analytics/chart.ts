// Display geometry only. Values remain in integer paise or enrollment counts.
export function trendScale(values: number[]) {
 const low = Math.min(0, ...values), high = Math.max(0, ...values);
 const rough = Math.max(1, (high - low) / 4);
 const magnitude = 10 ** Math.floor(Math.log10(rough));
 const step = [1, 2, 5, 10].map(n => n * magnitude).find(n => n >= rough)!;
 const min = Math.floor(low / step) * step;
 const max = Math.max(min + step, Math.ceil(high / step) * step);
 const ticks = Array.from({length: Math.round((max - min) / step) + 1}, (_, i) => max - i * step);
 return {min, max, ticks, position: (value: number) => (max - value) / (max - min)};
}

export function trendDate(value: string, full = false) {
 return new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: full ? 'long' : 'short', ...(full ? {year: 'numeric' as const} : {}), timeZone: 'Asia/Kolkata',
 }).format(new Date(value + 'T00:00:00+05:30'));
}

export function trendTick(value: number, money: boolean) {
 const amount = money ? value / 100 : value;
 const formatted = new Intl.NumberFormat('en-IN', {
  notation: Math.abs(amount) >= 10000 ? 'compact' : 'standard',
  maximumFractionDigits: money ? 2 : 0,
 }).format(Math.abs(amount));
 return `${amount < 0 ? '−' : ''}${money ? '₹' : ''}${formatted}`;
}
