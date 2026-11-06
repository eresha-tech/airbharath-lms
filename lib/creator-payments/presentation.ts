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

export function payoutLabel(p:{state:string;provider?:string|null;providerStatus?:string|null;executionStage?:string|null;lastError?:string|null}) {
 if(!p.provider)return payoutLabels[p.state]??'Review required';
 if(p.state==='cancelled')return 'Cancelled';
 if(p.executionStage==='awaiting_authorization')return 'Awaiting independent approval';
 const labels:Record<string,string>={queued:'Queued',pending:'Awaiting RazorpayX approval',scheduled:'Scheduled',processing:'Processing',processed:'Paid',failed:'Failed',reversed:'Reversed',rejected:'Rejected',cancelled:'Cancelled',request_rejected:'Request rejected before transfer'};
 if(p.providerStatus==='processed'&&p.state!=='confirmed')return 'Verifying provider receipt';
 return p.providerStatus?labels[p.providerStatus]??'Under investigation':p.state==='approved'?p.lastError?'Needs review before submission':'Approved · awaiting automatic initiation':'Under investigation';
}
export function payoutExplanation(p:{state:string;providerStatus?:string|null;executionStage?:string|null;reason?:string|null;lastError?:string|null}) {
 if(p.executionStage==='awaiting_authorization')return 'A second Admin must approve automated execution. The amount remains reserved.';
 if(p.reason==='low_balance')return 'RazorpayX funding is insufficient. This transfer remains queued and reserved; add funds to the separate payout account. Do not create a duplicate.';
 if(p.providerStatus==='pending')return 'The payout needs approval in RazorpayX. AirBharath approval does not bypass the provider’s approval workflow.';
 if(p.providerStatus==='reversed')return 'RazorpayX reports that the transfer was reversed. Its original processed evidence is retained and the reservation has been released. A new attempt needs a new approved payout.';
 if(p.providerStatus==='request_rejected')return 'RazorpayX rejected the first request before a transfer was accepted. The reservation was released. Review account permissions or beneficiary details before approving another payout.';
 if(['failed','rejected','cancelled'].includes(p.providerStatus??''))return 'The terminal result was independently fetched from RazorpayX. The reservation is released. Review the cause before approving a separate new payout.';
 if(p.providerStatus==='processed'&&p.state==='confirmed')return 'Paid is based on an independently fetched processed status from RazorpayX. A later provider reversal will be shown here; earlier evidence is retained.';
 if(p.lastError)return 'The last provider request or evidence check needs review. The amount remains reserved while its outcome is uncertain. Retry reconciliation using the existing operation; do not make a separate bank transfer.';
 return 'The payout is processed automatically after independent Admin authorization. Submission or an API success response does not prove receipt. Provider webhooks and reconciliation update the result.';
}
