import { noticeDeliveryReadiness } from '../refund-notifications/configuration-core.mjs';
// Protected deployment configuration is an attestation, not provider permission.
// The actual process must carry the same reviewed identity as the supplied config.
function selfHostedProduction(env) {
    const keys = ['NODE_ENV', 'DATABASE_ENV', 'WORKSPACE_DEPLOYMENT_PROVIDER', 'WORKSPACE_DEPLOYMENT_ENV', 'WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED', 'WORKSPACE_PRODUCTION_ACCOUNT_ID',
        'WORKSPACE_RAZORPAY_MODE', 'WORKSPACE_RAZORPAY_ACCOUNT_ID', 'WORKSPACE_RAZORPAY_KEY_ID', 'WORKSPACE_RAZORPAY_TEST_AUTHORIZED',
        'RAZORPAY_KEY_ID', 'COURSE_RAZORPAY_ACCOUNT_ID', 'RAZORPAYX_KEY_ID', 'RAZORPAYX_MERCHANT_ACCOUNT_ID', 'RAZORPAYX_TEST_AUTHORIZED', 'RAZORPAYX_TEST_SCOPE_FILE',
        'VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV'];
    if (keys.some(key => env[key] !== process.env[key])) return false;
    if (env.NODE_ENV !== 'production' || env.DATABASE_ENV !== 'production' || env.WORKSPACE_DEPLOYMENT_PROVIDER !== 'self-hosted'
        || env.WORKSPACE_DEPLOYMENT_ENV !== 'production' || env.WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED !== 'true'
        || ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV'].some(key => env[key] !== undefined)) return false;
    const account = env.WORKSPACE_PRODUCTION_ACCOUNT_ID;
    if (!/^acc_[A-Za-z0-9]{6,80}$/.test(account || '') || env.WORKSPACE_RAZORPAY_ACCOUNT_ID !== account
        || env.WORKSPACE_RAZORPAY_MODE !== 'live' || !/^rzp_live_[A-Za-z0-9]{6,80}$/.test(env.WORKSPACE_RAZORPAY_KEY_ID || '')
        || env.WORKSPACE_RAZORPAY_TEST_AUTHORIZED === 'true' || env.RAZORPAYX_TEST_AUTHORIZED === 'true' || env.RAZORPAYX_TEST_SCOPE_FILE !== undefined) return false;
    if (env.RAZORPAY_KEY_ID !== undefined && (!/^rzp_live_[A-Za-z0-9]{6,80}$/.test(env.RAZORPAY_KEY_ID) || env.COURSE_RAZORPAY_ACCOUNT_ID !== account)) return false;
    if (env.COURSE_RAZORPAY_ACCOUNT_ID !== undefined && env.COURSE_RAZORPAY_ACCOUNT_ID !== account) return false;
    if (env.RAZORPAYX_KEY_ID !== undefined && (!/^rzp_live_[A-Za-z0-9]{6,80}$/.test(env.RAZORPAYX_KEY_ID) || env.RAZORPAYX_MERCHANT_ACCOUNT_ID !== account)) return false;
    return env.RAZORPAYX_MERCHANT_ACCOUNT_ID === undefined || env.RAZORPAYX_MERCHANT_ACCOUNT_ID === account;
}
// Staging authoring requires actual-process authorization and no financial credentials.
function selfHostedStaging(env) {
    const identity = ['NODE_ENV', 'DATABASE_ENV', 'WORKSPACE_DEPLOYMENT_PROVIDER', 'WORKSPACE_DEPLOYMENT_ENV', 'WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED'];
    if (identity.some(key => env[key] !== process.env[key])) return false;
    const forbidden = ['WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED', 'WORKSPACE_PRODUCTION_ACCOUNT_ID', 'VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV',
        'WORKSPACE_RAZORPAY_MODE', 'WORKSPACE_RAZORPAY_ACCOUNT_ID', 'WORKSPACE_RAZORPAY_KEY_ID', 'WORKSPACE_RAZORPAY_KEY_SECRET', 'WORKSPACE_RAZORPAY_WEBHOOK_SECRET',
        'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'COURSE_RAZORPAY_ACCOUNT_ID', 'COURSE_RAZORPAY_WEBHOOK_SECRET',
        'RAZORPAYX_KEY_ID', 'RAZORPAYX_KEY_SECRET', 'RAZORPAYX_MERCHANT_ACCOUNT_ID', 'RAZORPAYX_FUNDING_ACCOUNT_NUMBER', 'RAZORPAYX_WEBHOOK_SECRET', 'RAZORPAYX_TEST_SCOPE_FILE'];
    return env.NODE_ENV === 'production' && env.DATABASE_ENV === 'staging' && env.WORKSPACE_DEPLOYMENT_PROVIDER === 'self-hosted'
        && env.WORKSPACE_DEPLOYMENT_ENV === 'staging' && env.WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED === 'true'
        && forbidden.every(key => env[key] === undefined && process.env[key] === undefined);
}
export function classifyWorkspaceRuntime(env = process.env) {
    if ([env, process.env].some(config => config.WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED !== undefined || config.WORKSPACE_DEPLOYMENT_ENV === 'staging'))
        return selfHostedStaging(env) ? 'staging' : 'unclassified';
    if (env.VERCEL_ENV === 'preview' || (env.VERCEL === '1' && env.VERCEL_TARGET_ENV && !['production', 'development'].includes(env.VERCEL_TARGET_ENV)))
        return 'preview';
    if (['WORKSPACE_DEPLOYMENT_PROVIDER', 'WORKSPACE_DEPLOYMENT_ENV', 'WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED', 'WORKSPACE_PRODUCTION_ACCOUNT_ID'].some(key => env[key] !== undefined))
        return selfHostedProduction(env) ? 'production' : 'unclassified';
    if (env.NODE_ENV === 'production' && env.DATABASE_ENV === 'production' && env.VERCEL === '1' && env.VERCEL_ENV === 'production' && (!env.VERCEL_TARGET_ENV || env.VERCEL_TARGET_ENV === 'production'))
        return 'production';
    if (env.NODE_ENV !== 'production' && ['development', 'test'].includes(env.DATABASE_ENV || '') && (!env.VERCEL_ENV || env.VERCEL_ENV === 'development') && env.VERCEL !== '1')
        return env.DATABASE_ENV;
    return 'unclassified';
}
const flags = { checkout: 'WORKSPACE_PAYMENT_ENABLED', refund: 'WORKSPACE_REFUND_ENABLED', webhook: 'WORKSPACE_RAZORPAY_WEBHOOK_ENABLED', reconciliation: 'WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED' };
// Safe diagnostics contain only enums, booleans and fixed reason codes. Never spread env/config.
export function workspaceFinancialReadiness(env = process.env) {
    const runtime = classifyWorkspaceRuntime(env), mode = env.WORKSPACE_RAZORPAY_MODE;
    const keyId = env.WORKSPACE_RAZORPAY_KEY_ID || '';
    const keyType = /^rzp_test_[A-Za-z0-9]{6,80}$/.test(keyId) ? 'test' : /^rzp_live_[A-Za-z0-9]{6,80}$/.test(keyId) ? 'live' : keyId ? 'invalid' : 'missing';
    const accountConfigured = /^acc_[A-Za-z0-9]{6,80}$/.test(env.WORKSPACE_RAZORPAY_ACCOUNT_ID || '');
    const reasons = [];
    if (!['test', 'live'].includes(mode || ''))
        reasons.push('workspace_mode_missing_or_invalid');
    if (keyType !== mode)
        reasons.push('mode_key_mismatch');
    if (!accountConfigured)
        reasons.push('workspace_account_missing_or_invalid');
    if ((env.WORKSPACE_RAZORPAY_KEY_SECRET || '').length < 16)
        reasons.push('missing_workspace_key_secret');
    if ((env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET || '').length < 16)
        reasons.push('webhook_secret_missing');
    if (mode === 'live' && runtime !== 'production')
        reasons.push(runtime === 'preview' ? 'preview_live_credentials_forbidden' : 'live_requires_production_classification');
    if (mode === 'test' && !['development', 'test'].includes(runtime))
        reasons.push('production_using_test_mode');
    if (mode === 'test' && env.WORKSPACE_RAZORPAY_TEST_AUTHORIZED !== 'true')
        reasons.push('test_not_authorized');
    if ((mode === 'test' && env.WORKSPACE_RAZORPAY_LIVE_AUTHORIZED === 'true') || (mode === 'live' && env.WORKSPACE_RAZORPAY_TEST_AUTHORIZED === 'true'))
        reasons.push('contradictory_mode_authorization');
    if (env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET && (env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET === env.WORKSPACE_RAZORPAY_KEY_SECRET || env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET === env.RAZORPAY_WEBHOOK_SECRET)) reasons.push('workspace_webhook_secret_not_distinct');
    const safe = reasons.length === 0;
    const mutations = safe && (mode === 'test' || env.WORKSPACE_RAZORPAY_LIVE_AUTHORIZED === 'true');
    if (safe && mode === 'live' && !mutations)
        reasons.push('live_not_authorized');
    const capabilities = {
        checkoutReady: mutations && env[flags.checkout] === 'true',
        refundMutationReady: mutations && env[flags.refund] === 'true',
        webhookReady: safe && env[flags.webhook] === 'true',
        reconciliationReady: safe && env[flags.reconciliation] === 'true',
        // Preserve the existing default; an explicit false independently stops refund reads/recovery.
        refundReconciliationReady: safe && env[flags.reconciliation] === 'true' && (env.WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED === undefined || env.WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED === 'true'),
    };
    return { runtime, mode: mode === 'live' || mode === 'test' ? mode : 'unconfigured', keyType, accountConfigured, webhookConfigured: (env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET || '').length >= 16,
        liveModeSafe: safe && mode === 'live', testModeSafe: safe && mode === 'test', ...capabilities, reasons, ...noticeDeliveryReadiness(env, runtime) };
}
