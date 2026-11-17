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
    const enabled = env.CREATOR_RAZORPAYX_ENABLED === 'true' && (mode === 'test' ? env.RAZORPAYX_TEST_AUTHORIZED === 'true' : env.RAZORPAYX_LIVE_EXECUTION_AUTHORIZED === 'true' && env.RAZORPAYX_LIVE_PERMISSION_REVIEWED === 'true');
    const config: PayoutConfig = Object.freeze({ keyId, secret, merchantId, fundingAccount, fingerprint, scope: `${mode}:${merchantId}:${fingerprint}`, mode, transferMode: env.RAZORPAYX_TRANSFER_MODE as 'NEFT' | 'IMPS', webhookSecret, enabled });
    if (mode === 'test') bindPayoutTestScope(config, env);
    return config;
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
