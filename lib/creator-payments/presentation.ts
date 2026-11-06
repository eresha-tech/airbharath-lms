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
 if(p.state==='cancelled')return 'This payout was cancelled before provider submission and the operation is closed. Review the current balance before a separate new approval; no transfer will be initiated for this operation.';
 if(p.executionStage==='awaiting_authorization')return 'A second Admin must approve automated execution. The amount remains reserved.';
 if(p.providerStatus==='queued'&&p.reason==='low_balance')return 'RazorpayX funding is insufficient. This transfer remains queued and reserved; add funds to the separate payout account. Do not create a duplicate.';
 if(p.providerStatus==='pending')return 'The payout needs approval in RazorpayX. AirBharath approval does not bypass the provider’s approval workflow.';
 if(p.providerStatus==='reversed')return 'RazorpayX reports that the transfer was reversed. Its original processed evidence is retained and the reservation has been released. A new attempt needs a new approved payout.';
 if(p.providerStatus==='request_rejected')return 'RazorpayX rejected the first request before a transfer was accepted. The reservation was released. Review account permissions or beneficiary details before approving another payout.';
 if(['failed','rejected','cancelled'].includes(p.providerStatus??''))return 'The terminal result was independently fetched from RazorpayX. The reservation is released. Review the cause before approving a separate new payout.';
 if(p.providerStatus==='processed'&&p.state==='confirmed')return 'Paid is based on an independently fetched processed status from RazorpayX. A later provider reversal will be shown here; earlier evidence is retained.';
 if(p.lastError)return 'The last provider request or evidence check needs review. The amount remains reserved while its outcome is uncertain. Retry reconciliation using the existing operation; do not make a separate bank transfer.';
 return 'The payout is processed automatically after independent Admin authorization. Submission or an API success response does not prove receipt. Provider webhooks and reconciliation update the result.';
}

// Creator language describes the same authoritative state without provider operations.
export type CreatorPayment = {
    state: string;
    provider?: string | null;
    providerStatus?: string | null;
    executionStage?: string | null;
    lastError?: string | null;
    reason?: string | null;
};
export function creatorPayoutPresentation(p: CreatorPayment): {
    label: string;
    description: string;
    action: string;
    tone: 'neutral' | 'good' | 'review';
} {
    if (p.state === 'cancelled' || p.providerStatus === 'cancelled') return {
        label: 'Payment cancelled', tone: 'neutral',
        description: 'This payment was cancelled. Any earnings still owed will be reviewed before another payment is arranged.',
        action: 'You do not need to submit the same bank details again. Contact support if your payment is overdue.',
    };
    if (p.providerStatus === 'reversed') return {
        label: 'Payment returned', tone: 'review',
        description: 'This payment was returned. It is no longer counted in Paid to date. AirBharath will review any amount still owed before arranging another payment.',
        action: 'Check your saved bank details and change them only if they are incorrect. Contact support if you need help.',
    };
    if (p.state === 'failed' || ['failed', 'rejected', 'request_rejected'].includes(p.providerStatus ?? '')) return {
        label: 'Payment failed', tone: 'review',
        description: 'This payment did not complete. Any earnings still owed will be reviewed before another payment is arranged.',
        action: 'Check your saved bank details and change them only if they are incorrect. Contact support for help with the next payment.',
    };
    if (p.state === 'confirmed' && (!p.provider || p.providerStatus === 'processed')) return {
        label: 'Paid', tone: 'good',
        description: 'The transfer status has been confirmed as paid. This payment is included in Paid to date.',
        action: 'No action is needed if you have received it. If it is missing from your bank statement, contact support. Share the transfer reference if one is shown.',
    };
    if (p.providerStatus === 'processed' || p.state === 'confirmed') return checkingPayment();
    if (p.providerStatus === 'queued' && p.reason === 'low_balance') return {
        label: 'Payment delayed', tone: 'review',
        description: 'This delay is on AirBharath’s side; it does not mean there is a problem with your bank details. We’ll continue the payment after the delay is resolved.',
        action: 'You do not need to change your bank account for this delay. Contact support if your payment is overdue.',
    };
    if (p.providerStatus === 'pending') return {
        label: 'Awaiting payment approval', tone: 'neutral',
        description: 'This payment is waiting for approval before the bank transfer can continue.',
        action: 'AirBharath will handle this approval. You do not need to approve it or submit your bank details again.',
    };
    if (p.providerStatus === 'processing' || p.state === 'initiated') return {
        label: 'Transfer in progress', tone: 'neutral',
        description: 'Your bank transfer is in progress. This amount is not counted as Paid yet.',
        action: 'No action is needed. Check this page for updates; bank processing times can vary.',
    };
    if (p.state === 'approved' && p.lastError) return {
        label: 'Payment delayed', tone: 'review',
        description: 'AirBharath needs to finish some checks before this payment can continue. Your earnings have not been erased.',
        action: 'No action is needed unless support asks for more information. Contact support if your payment is overdue.',
    };
    if (p.state === 'approved' || ['queued', 'scheduled'].includes(p.providerStatus ?? '')) return {
        label: 'Payment being prepared', tone: 'neutral',
        description: 'AirBharath is preparing this approved amount for payment. Approval is not a completed bank transfer.',
        action: 'No action is needed. We’ll update the progress here. Contact support if your payment is overdue.',
    };
    return checkingPayment();
}
function checkingPayment() {
    return {
        label: 'We’re checking your payment', tone: 'review' as const,
        description: 'We’re checking the result of this bank transfer. The amount is still set aside and is not counted as Paid.',
        action: 'You do not need to re-enter your bank details. Contact support if your payment is overdue.',
    };
}
export function payeeGuidance(payee?: { decision: string | null }) {
    if (!payee) return 'Add the bank account where you want to receive your earnings. You can publish courses before setting up payments.';
    if (payee.decision === 'verify_payee') return 'Your bank details are verified. No action is needed unless they have changed. Monthly payments still depend on earnings and payment checks.';
    if (payee.decision === 'reject_payee') return 'Your bank details could not be verified. Check the account holder name, account number and IFSC, then save corrected details for review. Contact support if they are already correct.';
    return 'Your bank details are waiting for review before payments can start. You do not need to submit them again. Contact support if verification is delayed.';
}
export const creatorPayoutFilters = [
    ['pending', 'Payments not yet paid'], ['confirmed', 'Paid'],
    ['failed', 'Failed or returned'], ['cancelled', 'Cancelled'],
];
