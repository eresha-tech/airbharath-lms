import { createHash } from 'node:crypto';
import { CommerceError } from '@/lib/commerce/model';
export const providerStates = ['queued', 'pending', 'scheduled', 'processing', 'processed', 'failed', 'reversed', 'rejected', 'cancelled'] as const;
export type ProviderState = typeof providerStates[number];
export type PayoutRequest = {
    account_number: string;
    fund_account_id: string;
    amount: number;
    currency: 'INR';
    mode: 'NEFT' | 'IMPS';
    purpose: 'payout';
    queue_if_low_balance: true;
    reference_id: string;
    narration: string;
};
export type PayoutFact = {
    id: string;
    fundAccountId: string;
    amount: number;
    status: ProviderState;
    reference: string;
    mode: string;
    utr: string | null;
    fees: number | null;
    tax: number | null;
    reason: string | null;
};
export function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
export function providerId(value: unknown, prefix: string): string { if (typeof value !== 'string' || !new RegExp(`^${prefix}_[A-Za-z0-9]{6,80}$`).test(value))
    throw new CommerceError(409, 'Provider identity requires reconciliation.'); return value; }
export function payoutFact(value: unknown): PayoutFact {
    const p = value as Record<string, unknown>;
    if (!p || p.entity !== 'payout' || p.currency !== 'INR' || !Number.isSafeInteger(p.amount) || Number(p.amount) < 100 || !providerStates.includes(p.status as ProviderState) || typeof p.reference_id !== 'string' || typeof p.mode !== 'string')
        throw new CommerceError(409, 'Provider payout evidence is incomplete.');
    const amount = (n: unknown) => n === null || n === undefined ? null : typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : (() => { throw new CommerceError(409, 'Invalid provider fee evidence.'); })();
    const reason = (p.status_details as {
        reason?: unknown;
    } | undefined)?.reason;
    return { id: providerId(p.id, 'pout'), fundAccountId: providerId(p.fund_account_id, 'fa'), amount: Number(p.amount), status: p.status as ProviderState, reference: p.reference_id, mode: p.mode, utr: typeof p.utr === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(p.utr) ? p.utr : null, fees: amount(p.fees), tax: amount(p.tax), reason: typeof reason === 'string' && /^[a-z0-9_]{1,100}$/.test(reason) ? reason : null };
}
export function matchesIntent(f: PayoutFact, r: PayoutRequest) { if (f.fundAccountId !== r.fund_account_id || f.amount !== r.amount || f.reference !== r.reference_id || f.mode !== r.mode)
    throw new CommerceError(409, 'Provider payout does not match the authorized intent.'); }
export function payoutState(status: ProviderState) { return status === 'processed' ? 'confirmed' : ['failed', 'reversed', 'rejected', 'cancelled'].includes(status) ? 'failed' : status === 'processing' ? 'initiated' : 'uncertain'; }
export function mayObserve(previous: string | null, next: string) { if (['failed', 'reversed', 'cancelled', 'rejected'].includes(previous ?? ''))
    return next === previous || previous === 'reversed' && next === 'failed'; if (previous === 'processed')
    return ['processed', 'reversed', 'failed'].includes(next); return true; }
