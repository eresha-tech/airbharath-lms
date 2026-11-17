import { requirePayoutTestDatabase } from './test-isolation';
import 'server-only';
import { CommerceError } from '@/lib/commerce/model';
import { type PayoutConfig, requirePayoutExecution } from './config';
import { providerId, type PayoutRequest } from './model';
type Bank = {
    holder: string;
    account: string;
    ifsc: string;
};
export class PayoutProviderError extends Error {
    constructor(public code: string, public httpStatus?: number) { super(code); }
}
export function razorpayXRequest(config: PayoutConfig, transport: typeof fetch = fetch) {
    return async function request(path: string, body?: unknown, idempotency?: string) {
        requirePayoutTestDatabase(config);
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 6000);
        try {
            const response = await transport('https://api.razorpay.com/v1/' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Basic ' + Buffer.from(config.keyId + ':' + config.secret).toString('base64'), 'Content-Type': 'application/json', ...(idempotency ? { 'X-Payout-Idempotency': idempotency } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: controller.signal, redirect: 'error', cache: 'no-store' });
            if (!response.ok)
                throw new PayoutProviderError(response.status === 401 || response.status === 403 ? 'provider_permission_denied' : response.status === 429 ? 'provider_rate_limited' : response.status === 409 ? 'provider_request_in_progress' : 'provider_request_rejected', response.status);
            const reader = response.body?.getReader();
            if (!reader)
                throw new PayoutProviderError('provider_response_unknown');
            const chunks: Uint8Array[] = [];
            let size = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                size += value.byteLength;
                if (size > 524288) {
                    await reader.cancel();
                    throw new PayoutProviderError('provider_response_too_large');
                }
                chunks.push(value);
            }
            return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
        }
        catch (e) {
            if (e instanceof PayoutProviderError)
                throw e;
            throw new PayoutProviderError('provider_response_unknown');
        }
        finally {
            clearTimeout(timer);
        }
    }
}
export function razorpayXPayoutAdapter(config: PayoutConfig, transport: typeof fetch = fetch) {
    const request = razorpayXRequest(config,transport);
    return {
        async contact(payeeId: string) { requirePayoutExecution(config); const body = { name: 'AirBharath Creator ' + payeeId.slice(0, 8), type: 'vendor', reference_id: payeeId }; const c = await request('contacts', body); if (c.entity !== 'contact' || c.reference_id !== payeeId || c.name !== body.name || c.type !== 'vendor' || c.active !== true)
            throw new CommerceError(409, 'Provider contact is inactive or does not match this payee.'); return providerId(c.id, 'cont'); },
        async fund(contactId: string, bank: Bank) { requirePayoutExecution(config); const f = await request('fund_accounts', { contact_id: contactId, account_type: 'bank_account', bank_account: { name: bank.holder, ifsc: bank.ifsc, account_number: bank.account } }); validateFund(f, contactId, bank); return providerId(f.id, 'fa'); },
        async verifyFund(id: string, contactId: string, bank: Bank) { providerId(id, 'fa'); const f = await request('fund_accounts/' + id); validateFund(f, contactId, bank); const c = await request('contacts/' + providerId(contactId, 'cont')); if (c.active !== true || c.id !== contactId)
            throw new CommerceError(409, 'Provider contact was deactivated.'); },
        async create(body: PayoutRequest, key: string) { requirePayoutExecution(config); if (body.account_number !== config.fundingAccount) throw new CommerceError(409, 'Payout funding account mismatch.'); return request('payouts', body, key); },
        async fetch(id: string) { return request('payouts/' + providerId(id, 'pout')); },
        async list(skip: number) { return request('payouts?' + new URLSearchParams({ account_number: config.fundingAccount, count: '100', skip: String(skip) })); },
        async inspect() { await request('contacts?count=1'); await request('fund_accounts?count=1'); await request('payouts?' + new URLSearchParams({ account_number: config.fundingAccount, count: '1' })); return { readAccess: true, creationPermissionsVerified: false, fundingBalanceVerified: false, webhookPermissionsVerified: false }; },
    };
}
function validateFund(f: Record<string, unknown>, contactId: string, bank: Bank) { const b = f.bank_account as Record<string, unknown> | undefined; if (f.entity !== 'fund_account' || f.contact_id !== contactId || f.account_type !== 'bank_account' || f.active !== true || b?.account_number !== bank.account || b.ifsc !== bank.ifsc || b.name !== bank.holder)
    throw new CommerceError(409, 'Provider fund account does not match the immutable payee version.'); }
export type PayoutAdapter = ReturnType<typeof razorpayXPayoutAdapter>;
