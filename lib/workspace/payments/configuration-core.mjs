export function classifyWorkspaceRuntime(env = process.env) {
    if (env.VERCEL_ENV === 'preview' || (env.VERCEL === '1' && env.VERCEL_TARGET_ENV && !['production', 'development'].includes(env.VERCEL_TARGET_ENV)))
        return 'preview';
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
        // Existing immutable notices have no durable delivery receipt/lease. Never claim a sender exists.
        noticesReady: false,
    };
    return { runtime, mode: mode === 'live' || mode === 'test' ? mode : 'unconfigured', keyType, accountConfigured, webhookConfigured: (env.WORKSPACE_RAZORPAY_WEBHOOK_SECRET || '').length >= 16,
        liveModeSafe: safe && mode === 'live', testModeSafe: safe && mode === 'test', ...capabilities, reasons, noticeStatus: 'delivery_worker_not_provisioned' };
}
