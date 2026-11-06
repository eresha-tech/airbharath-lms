import 'server-only';
import { createHash } from 'node:crypto';
import { CommerceError } from '@/lib/commerce/model';
export type PayoutConfig = {
    keyId: string;
    secret: string;
    merchantId: string;
    fundingAccount: string;
    fingerprint: string;
    scope: string;
    mode: 'test' | 'live';
    transferMode: 'NEFT' | 'IMPS';
    webhookSecret: string;
    enabled: boolean;
};
export function payoutConfiguration(env: Record<string, string | undefined> = process.env): PayoutConfig {
    const keyId = env.RAZORPAYX_KEY_ID ?? '', secret = env.RAZORPAYX_KEY_SECRET ?? '', merchantId = env.RAZORPAYX_MERCHANT_ACCOUNT_ID ?? '', fundingAccount = env.RAZORPAYX_FUNDING_ACCOUNT_NUMBER ?? '', webhookSecret = env.RAZORPAYX_WEBHOOK_SECRET ?? '';
    if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId) || secret.length < 16 || !/^acc_[A-Za-z0-9_]{6,100}$/.test(merchantId) || !/^\d{5,35}$/.test(fundingAccount) || webhookSecret.length < 32 || !['NEFT', 'IMPS'].includes(env.RAZORPAYX_TRANSFER_MODE ?? ''))
        throw new CommerceError(503, 'RazorpayX protected configuration is incomplete.');
    const mode = keyId.startsWith('rzp_live_') ? 'live' : 'test';
    if (mode === 'live' && (env.DATABASE_ENV !== 'production' || env.NODE_ENV !== 'production' || env.VERCEL && env.VERCEL_ENV !== 'production'))
        throw new CommerceError(503, 'Live payout credentials are prohibited in this environment.');
    const fingerprint = createHash('sha256').update(fundingAccount).digest('hex');
    const enabled = env.CREATOR_RAZORPAYX_ENABLED === 'true' && (mode === 'test' ? env.RAZORPAYX_TEST_AUTHORIZED === 'true' : env.RAZORPAYX_LIVE_EXECUTION_AUTHORIZED === 'true' && env.RAZORPAYX_LIVE_PERMISSION_REVIEWED === 'true');
    return { keyId, secret, merchantId, fundingAccount, fingerprint, scope: `${mode}:${merchantId}:${fingerprint}`, mode, transferMode: env.RAZORPAYX_TRANSFER_MODE as 'NEFT' | 'IMPS', webhookSecret, enabled };
}
export function requirePayoutExecution(config = payoutConfiguration()) { if (!config.enabled)
    throw new CommerceError(503, 'RazorpayX execution awaits protected configuration and founder authorization.'); return config; }
export function payoutReadiness(env: Record<string, string | undefined> = process.env) {
    try {
        const c = payoutConfiguration(env);
        return { configured: true, mode: c.mode, executionEnabled: c.enabled, permissionsVerified: false, fundingVerified: false, webhookDeliveryVerified: false };
    }
    catch {
        return { configured: false, mode: null, executionEnabled: false, permissionsVerified: false, fundingVerified: false, webhookDeliveryVerified: false };
    }
}
