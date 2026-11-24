import 'server-only';
import { createHash } from 'node:crypto';
import { bindPayoutTestScope } from './test-isolation';
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
    if (mode === 'live' && (env.DATABASE_ENV !== 'production' || env.NODE_ENV !== 'production' || env.VERCEL && env.VERCEL_ENV !== 'production'
        || ['VERCEL_ENV', 'VERCEL_TARGET_ENV'].some(key => env[key] !== undefined && env[key] !== 'production')))
        throw new CommerceError(503, 'Live payout credentials are prohibited in this environment.');
    if (mode === 'test' && (!['development', 'test'].includes(env.NODE_ENV ?? '') || env.DATABASE_ENV !== 'test'
        || ['VERCEL_ENV', 'VERCEL_TARGET_ENV'].some(key => env[key] === 'production')
        || env.VERCEL && env.VERCEL_ENV !== 'preview'
        || Object.entries(env).some(([key, value]) => key.startsWith('RAZORPAYX_LIVE_') && value === 'true')
        || env.RAZORPAY_KEY_ID && !/^rzp_test_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID)
        || env.COURSE_RAZORPAY_ACCOUNT_ID && env.COURSE_RAZORPAY_ACCOUNT_ID !== merchantId))
        throw new CommerceError(503, 'Test payouts are prohibited outside a dedicated isolated test runtime.');
    if (mode === 'live' && (env.RAZORPAYX_TEST_AUTHORIZED === 'true' || env.RAZORPAYX_TEST_SCOPE_FILE))
        throw new CommerceError(503, 'Mixed Test and Live payout configuration is prohibited.');
    const fingerprint = createHash('sha256').update(fundingAccount).digest('hex');
    const enabled = process.env.CREATOR_RAZORPAYX_ENABLED === 'true' && (mode === 'test' ? process.env.RAZORPAYX_TEST_AUTHORIZED === 'true' : process.env.RAZORPAYX_LIVE_EXECUTION_AUTHORIZED === 'true' && process.env.RAZORPAYX_LIVE_PERMISSION_REVIEWED === 'true') && env.CREATOR_RAZORPAYX_ENABLED === 'true' && (mode === 'test' ? env.RAZORPAYX_TEST_AUTHORIZED === 'true' : env.RAZORPAYX_LIVE_EXECUTION_AUTHORIZED === 'true' && env.RAZORPAYX_LIVE_PERMISSION_REVIEWED === 'true');
    const config: PayoutConfig = Object.freeze({ keyId, secret, merchantId, fundingAccount, fingerprint, scope: `${mode}:${merchantId}:${fingerprint}`, mode, transferMode: env.RAZORPAYX_TRANSFER_MODE as 'NEFT' | 'IMPS', webhookSecret, enabled });
    requirePayoutIdentity(config);
    if (['NODE_ENV','DATABASE_ENV','VERCEL','VERCEL_ENV','VERCEL_TARGET_ENV','RAZORPAYX_TEST_SCOPE_FILE',...(mode === 'test' ? ['DATABASE_URL','POSTGRES_URL'] : [])].some(key => env[key] !== process.env[key])) throw new CommerceError(503, 'Payout configuration contradicts the actual process.');
    if (mode === 'test') bindPayoutTestScope(config, env);
    return config;
}
// Rechecked for every request, including configurations retained across a kill-switch change.
export function requirePayoutIdentity(config: PayoutConfig) {
    const actual = process.env;
    if (config.keyId !== actual.RAZORPAYX_KEY_ID || config.secret !== actual.RAZORPAYX_KEY_SECRET || config.merchantId !== actual.RAZORPAYX_MERCHANT_ACCOUNT_ID
        || config.fundingAccount !== actual.RAZORPAYX_FUNDING_ACCOUNT_NUMBER || config.webhookSecret !== actual.RAZORPAYX_WEBHOOK_SECRET || config.transferMode !== actual.RAZORPAYX_TRANSFER_MODE
        || config.mode === 'live' && (actual.NODE_ENV !== 'production' || actual.DATABASE_ENV !== 'production' || actual.RAZORPAYX_TEST_AUTHORIZED === 'true' || actual.RAZORPAYX_TEST_SCOPE_FILE
            || actual.VERCEL && actual.VERCEL_ENV !== 'production' || ['VERCEL_ENV','VERCEL_TARGET_ENV'].some(key => actual[key] !== undefined && actual[key] !== 'production'))
        || config.mode === 'test' && (actual.RAZORPAYX_TEST_AUTHORIZED !== 'true' || !['development','test'].includes(actual.NODE_ENV ?? '') || actual.DATABASE_ENV !== 'test'
            || actual.VERCEL && actual.VERCEL_ENV !== 'preview' || ['VERCEL_ENV','VERCEL_TARGET_ENV'].some(key => actual[key] === 'production')
            || Object.entries(actual).some(([key,value]) => key.startsWith('RAZORPAYX_LIVE_') && value === 'true')
            || actual.RAZORPAY_KEY_ID && !/^rzp_test_[A-Za-z0-9]+$/.test(actual.RAZORPAY_KEY_ID) || actual.COURSE_RAZORPAY_ACCOUNT_ID && actual.COURSE_RAZORPAY_ACCOUNT_ID !== config.merchantId))
        throw new CommerceError(503, 'Payout configuration contradicts the actual process.');
}
export function requirePayoutExecution(config = payoutConfiguration()) { requirePayoutIdentity(config); if (!config.enabled || process.env.CREATOR_RAZORPAYX_ENABLED !== 'true'
    || (config.mode === 'test' ? process.env.RAZORPAYX_TEST_AUTHORIZED !== 'true' : process.env.RAZORPAYX_LIVE_EXECUTION_AUTHORIZED !== 'true' || process.env.RAZORPAYX_LIVE_PERMISSION_REVIEWED !== 'true'))
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
