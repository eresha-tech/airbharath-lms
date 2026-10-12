export function validNoticeEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(value) && !value.includes('..');
}
export function noticePublicOrigin(value, runtime) {
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || u.pathname !== '/') return null;
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['development', 'test'].includes(runtime) && ['localhost', '127.0.0.1'].includes(u.hostname))) return null;
    return u.origin;
  } catch { return null; }
}
export function noticeDeliveryReadiness(env, runtime) {
  const reasons = [];
  if (!['production', 'development', 'test'].includes(runtime)) reasons.push('notice_runtime_unclassified');
  if ((env.MAILERCLOUD_API_KEY || '').length < 16) reasons.push('notice_credentials_missing');
  if (!validNoticeEmail(env.MAILERCLOUD_SENDER_EMAIL)) reasons.push('notice_sender_missing_or_invalid');
  if (env.WORKSPACE_NOTICE_SENDER_VERIFIED !== 'true') reasons.push('notice_sender_verification_required');
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(env.WORKSPACE_NOTICE_PROVIDER_SCOPE || '')) reasons.push('notice_provider_scope_missing');
  if (!noticePublicOrigin(env.NEXT_PUBLIC_BASE_URL, runtime)) reasons.push('notice_origin_invalid');
  const name = env.MAILERCLOUD_SENDER_NAME || 'AirBharath Workspace';
  if (name.length > 100 || /[\r\n\u0000-\u001f]/.test(name)) reasons.push('notice_sender_name_invalid');
  return { noticeImplementationPresent: true, noticeConfigurationReady: reasons.length === 0,
    noticeDeliveryAuthorized: reasons.length === 0 && env.WORKSPACE_NOTICE_DELIVERY_ENABLED === 'true',
    noticeWorkerScheduled: false, noticeActualAcceptanceVerified: false, noticeRecipientVerificationAvailable: false,
    noticesReady: false, noticeStatus: 'operational_verification_pending', noticeReasons: reasons };
}
