// An explicit authoring-only Preview contract; this grants no provider permission.
export const PREVIEW_DISABLED_FLAGS = [
  'WORKSPACE_PAYMENT_ENABLED', 'WORKSPACE_REFUND_ENABLED', 'WORKSPACE_RAZORPAY_WEBHOOK_ENABLED',
  'WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED', 'WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED',
  'WORKSPACE_RAZORPAY_TEST_AUTHORIZED', 'WORKSPACE_RAZORPAY_LIVE_AUTHORIZED', 'CREATOR_RAZORPAYX_ENABLED',
  'RAZORPAYX_TEST_AUTHORIZED', 'RAZORPAYX_LIVE_EXECUTION_AUTHORIZED', 'RAZORPAYX_LIVE_PERMISSION_REVIEWED',
  'CREATOR_BANK_VALIDATION_ENABLED', 'WORKSPACE_MEDIA_STORAGE_ENABLED', 'WORKSPACE_MEDIA_PROCESSING_ENABLED',
  'WORKSPACE_NOTICE_DELIVERY_ENABLED', 'ACADEMY_ENTITLEMENT_POLICY_ENABLED', 'CREATOR_SPONSORSHIP_SYNTHETIC',
  'WORKSPACE_LOCAL_UAT_OTP_ENABLED', 'WORKSPACE_WORKER_ENABLED',
];
const identityKeys = ['NODE_ENV', 'DATABASE_ENV', 'VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV', 'VERCEL_GIT_COMMIT_REF',
  'WORKSPACE_DEPLOYMENT_PROVIDER', 'WORKSPACE_DEPLOYMENT_ENV', 'WORKSPACE_VERCEL_STAGING_AUTHORIZED',
  'DATABASE_URL', 'POSTGRES_URL', 'STAGING_EXPECTED_DATABASE_HOST', 'STAGING_EXPECTED_DATABASE_NAME',
  'STAGING_EXPECTED_DATABASE_USER', 'STAGING_DATABASE_IDENTITY', ...PREVIEW_DISABLED_FLAGS];
export function vercelPreviewRequested(env = process.env) {
  return [env, process.env].some(e => (e.NODE_ENV === 'production' && e.VERCEL_ENV === 'preview') || e.WORKSPACE_VERCEL_STAGING_AUTHORIZED !== undefined);
}
export function vercelStagingConfiguration(env = process.env) {
  const fail = () => { throw new Error('vercel_staging_configuration_rejected'); };
  if (identityKeys.some(k => env[k] !== process.env[k])) fail();
  if (env.NODE_ENV !== 'production' || env.DATABASE_ENV !== 'staging' || env.VERCEL !== '1'
    || env.VERCEL_ENV !== 'preview' || (env.VERCEL_TARGET_ENV !== undefined && env.VERCEL_TARGET_ENV !== 'preview')
    || env.VERCEL_GIT_COMMIT_REF !== 'staging' || env.WORKSPACE_DEPLOYMENT_PROVIDER !== 'vercel'
    || env.WORKSPACE_DEPLOYMENT_ENV !== 'staging' || env.WORKSPACE_VERCEL_STAGING_AUTHORIZED !== 'true'
    || PREVIEW_DISABLED_FLAGS.some(k => env[k] !== 'false')) fail();
  for (const e of [env, process.env]) {
    if (Object.keys(e).some(k => /RAZORPAY|BANK_VALIDATION|SPONSORSHIP|ACADEMY_ENTITLEMENT|WORKSPACE_MEDIA_|WORKSPACE_LOCAL_UAT/.test(k)
      && !PREVIEW_DISABLED_FLAGS.includes(k))) fail();
    if (['WORKSPACE_SELF_HOSTED_STAGING_AUTHORIZED', 'WORKSPACE_SELF_HOSTED_PRODUCTION_AUTHORIZED',
      'WORKSPACE_PRODUCTION_ACCOUNT_ID', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN',
      'DATABASE_LOCAL_SOCKET_PATH', 'POSTGRES_URL'].some(k => e[k] !== undefined)) fail();
  }
  let url; try { url = new URL(env.DATABASE_URL); } catch { fail(); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.password || url.hash || url.port && url.port !== '5432'
    || !/^ep-[a-z0-9-]+\.[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)
    || url.hostname !== env.STAGING_EXPECTED_DATABASE_HOST || decodeURIComponent(url.pathname.slice(1)) !== env.STAGING_EXPECTED_DATABASE_NAME
    || decodeURIComponent(url.username) !== env.STAGING_EXPECTED_DATABASE_USER
    || !/^airbharath_staging_[a-z0-9_]+$/.test(env.STAGING_EXPECTED_DATABASE_NAME || '')
    || !/^airbharath_staging_[a-z0-9_]+$/.test(env.STAGING_EXPECTED_DATABASE_USER || '')
    || !/^[a-f0-9]{64}$/.test(env.STAGING_DATABASE_IDENTITY || '')
    || [...url.searchParams.keys()].some(k => k !== 'sslmode') || url.searchParams.getAll('sslmode').length !== 1
    || url.searchParams.get('sslmode') !== 'verify-full') fail();
  return { host: url.hostname, database: env.STAGING_EXPECTED_DATABASE_NAME, user: env.STAGING_EXPECTED_DATABASE_USER, identity: env.STAGING_DATABASE_IDENTITY };
}
export function vercelStagingAuthorized(env = process.env) {
  try { vercelStagingConfiguration(env); return true; } catch { return false; }
}
export function assertVercelStagingIdentity(row, expected) {
  if (!row || row.environment !== 'staging' || row.identity !== expected.identity || row.database !== expected.database
    || row.role !== expected.user || row.authenticated_role !== expected.user || row.marker_owner !== 'airbharath_staging_migrator'
    || row.marker_writable !== false || row.marker_owner_member !== false || row.restricted !== true || row.parents !== 0
    || row.owns !== 0 || row.migrator_nologin !== true || row.migrations !== 50)
    throw new Error('vercel_staging_database_identity_rejected');
}
