import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPostHogConfig } from '@/lib/posthog-config';
import { GET, POST } from '@/app/api/telemetry/[...path]/route';

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn() }));
vi.mock('posthog-js', () => ({ default: sdk }));

function configure(region = 'us') {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test_not_a_real_key');
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', `https://${region}.i.posthog.com`);
}
const context = (path = ['i', 'v0', 'e']) => ({ params: Promise.resolve({ path }) });

describe('PostHog configuration and browser integration', () => {
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_POSTHOG_ENABLE_DEV', 'false'); });

  it('does not initialize or capture with real-looking credentials in local development unless opted in', async () => {
    configure();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubGlobal('window', {});
    vi.resetModules();
    await import('@/instrumentation-client');
    const { track, identifyUser, resetUser } = await import('@/lib/analytics');
    track('workspace_page_view'); identifyUser('test'); resetUser();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(sdk.identify).not.toHaveBeenCalled();
    expect(sdk.reset).not.toHaveBeenCalled();
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_ENABLE_DEV', 'true');
    expect(getPostHogConfig()).not.toBeNull();
  });

  it('initializes production browser analytics with a same-origin URL and the matching cloud UI', async () => {
    configure('eu');
    vi.resetModules();
    await import('@/instrumentation-client');
    expect(sdk.init).toHaveBeenCalledWith('phc_test_not_a_real_key', expect.objectContaining({ api_host: '/api/telemetry', ui_host: 'https://eu.posthog.com', disable_session_recording: true }));
  });

  it.each(['http://us.i.posthog.com', 'https://us.i.posthog.com.attacker.test', 'https://user:password@us.i.posthog.com', 'https://us.i.posthog.com/private', 'https://us.i.posthog.com?redirect=evil', 'your-posthog-host'])('rejects invalid or untrusted upstream host %s', host => {
    configure(); vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', host);
    expect(getPostHogConfig()).toBeNull();
  });

  it.each(['', 'your-posthog-key', 'your_posthog_project_api_key'])('does not initialize for missing/placeholder key %s', key => {
    configure(); vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', key);
    expect(getPostHogConfig()).toBeNull();
  });
});

describe('PostHog same-origin proxy', () => {
  beforeEach(() => { configure(); });

  it('forwards the event body and query without leaking LMS credentials or upstream cookies', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{"status":1}', { headers: { 'Content-Type': 'application/json', 'Set-Cookie': 'upstream=private' } }));
    vi.stubGlobal('fetch', fetch);
    const response = await POST(new Request('https://local.test/api/telemetry/i/v0/e/?retry_count=1', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'ab_session=private', Authorization: 'Bearer private' }, body: '{"event":"workspace_page_view"}' }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 1 });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://us.i.posthog.com/i/v0/e/?retry_count=1');
    expect(options.headers.get('cookie')).toBeNull();
    expect(options.headers.get('authorization')).toBeNull();
    expect(await options.body.text()).toBe('{"event":"workspace_page_view"}');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.redirect).toBe('manual');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('uses the EU region for flag requests when configured', async () => {
    configure('eu');
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    expect((await GET(new Request('https://local.test/api/telemetry/flags/?v=2'), context(['flags']))).status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe('https://eu.i.posthog.com/flags/?v=2');
  });

  it('makes no upstream request when development analytics is disabled', async () => {
    vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('NEXT_PUBLIC_POSTHOG_ENABLE_DEV', 'false');
    const response = await GET(new Request('https://local.test/api/telemetry/flags'), context(['flags']));
    expect(response.status).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('routes SDK remote configuration to the regional asset host for this project only', async () => {
    configure('eu');
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const response = await GET(new Request('https://local.test/api/telemetry/array/phc_test_not_a_real_key/config'), context(['array', 'phc_test_not_a_real_key', 'config']));
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe('https://eu-assets.i.posthog.com/array/phc_test_not_a_real_key/config');
    expect((await GET(new Request('https://local.test/api/telemetry/array/other-project/config'), context(['array', 'other-project', 'config']))).status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not proxy arbitrary paths', async () => {
    expect((await GET(new Request('https://local.test/api/telemetry/private'), context(['private']))).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects oversized event batches before contacting the provider', async () => {
    const response = await POST(new Request('https://local.test/api/telemetry/e', { method: 'POST', body: 'x'.repeat(1_048_577) }), context(['e']));
    expect(response.status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles provider failure without exposing errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private provider details')));
    const response = await GET(new Request('https://local.test/api/telemetry/flags'), context(['flags']));
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('');
  });

  it('does not redirect the browser to a blocked upstream domain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'https://us.i.posthog.com/other' } })));
    expect((await GET(new Request('https://local.test/api/telemetry/flags'), context(['flags']))).status).toBe(502);
  });

  it('preserves throttling status and retry timing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429, headers: { 'Retry-After': '60' } })));
    const response = await GET(new Request('https://local.test/api/telemetry/flags'), context(['flags']));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
  });
});
