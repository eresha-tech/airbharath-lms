export const payoutLabels: Record<string, string> = { approved: 'Approved', initiated: 'Transfer initiated', uncertain: 'Under investigation', confirmed: 'Paid', failed: 'Failed', cancelled: 'Cancelled' };
export function money(value: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100); }
export function financeDate(value: Date | string | null) { return value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' IST' : 'Not recorded'; }
export function settlementMonth(value: Date | string) { const d = new Date(new Date(value).getTime() - 1); return d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' }); }
export type FinanceFilters = {
    page: number;
    from: string;
    to: string;
    search: string;
    status: string;
    type: string;
};
export function financeFilters(q: Record<string, string | string[] | undefined>): FinanceFilters {
    const get = (k: string) => typeof q[k] === 'string' ? (q[k] as string) : '';
    const date = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s ? s : '';
    return { page: Math.min(10000, Math.max(1, Number.parseInt(get('page')) || 1)), from: date(get('from')), to: date(get('to')), search: get('search').trim().slice(0, 100), status: get('status').slice(0, 30), type: get('type').slice(0, 30) };
}
// Prefix every potentially executable cell, including whitespace/control-prefixed formulas.
export function csvCell(value: unknown) { let s = String(value ?? ''); if (/^[\s\u0000-\u001f]*[=+@-]/.test(s))
    s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }
export function csv(rows: unknown[][]) { return '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
