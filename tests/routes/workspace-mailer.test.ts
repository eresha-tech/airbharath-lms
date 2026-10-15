import { describe, expect, it, vi } from 'vitest';
import { sendMailercloudEmail } from '@/lib/mailercloud';
const email = { to: 'stored@example.test', name: 'Stored applicant', subject: 'Controlled subject', html: '<p>Controlled body</p>', privateDelivery: true };
describe('Bounded private Workspace email delivery', () => {
  it('does not contact a live service when configuration is missing', async () => {
    expect(await sendMailercloudEmail(email)).toMatchObject({ success: false, errorCategory: 'not_configured' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('bounds the request and treats provider acceptance separately from delivery', async () => {
    vi.stubEnv('MAILERCLOUD_API_KEY', 'test-only');
    const fetch = vi.fn().mockResolvedValue(new Response('{"id":"test"}', { status: 202 })); vi.stubGlobal('fetch', fetch);
    expect(await sendMailercloudEmail(email)).toEqual({ success: true });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload.email.recipients.to[0].email).toBe(email.to);
  });
  it('does not expose or log provider rejection bodies or recipient PII', async () => {
    vi.stubEnv('MAILERCLOUD_API_KEY', 'test-only');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private token and applicant details', { status: 500 })));
    const log = vi.spyOn(console, 'log'); const warn = vi.spyOn(console, 'warn');
    expect(await sendMailercloudEmail(email)).toEqual({ success: false, errorCategory: 'provider_rejected' });
    expect(log).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  });
  it('aborts an unresponsive provider after eight seconds with a safe category', async () => {
    vi.stubEnv('MAILERCLOUD_API_KEY', 'test-only');
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    })));
    const result = await sendMailercloudEmail(email);
    expect(result).toEqual({ success: false, errorCategory: 'timeout' });
  }, 10000);
});
