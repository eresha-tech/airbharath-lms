export const POSTHOG_PROXY_PATH = '/api/telemetry';

export function getPostHogCloud(host?: string) {
  try {
    const url = new URL(host || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.pathname !== '/') return null;
    if (url.hostname !== 'us.i.posthog.com' && url.hostname !== 'eu.i.posthog.com') return null;
    const region = url.hostname.startsWith('eu.') ? 'eu' : 'us';
    return { host: url.origin, assetHost: `https://${region}-assets.i.posthog.com`, uiHost: `https://${region}.posthog.com` };
  } catch {
    return null;
  }
}

export function getPostHogConfig() {
  // Keep development activity out of the live project unless explicitly enabled.
  if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_POSTHOG_ENABLE_DEV !== 'true') return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key === 'your-posthog-key' || key === 'your_posthog_project_api_key') return null;
  const cloud = getPostHogCloud(process.env.NEXT_PUBLIC_POSTHOG_HOST);
  return cloud ? { key, ...cloud } : null;
}
