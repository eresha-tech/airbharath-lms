import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/mailercloud', () => ({ sendMailercloudEmail: mocks.send }));
import { sendApplicationReceipt } from '@/lib/workspace/receipt';
describe('Workspace application receipt', () => {
  it('skips delivery when the existing mailer is not configured', async () => {
    expect(await sendApplicationReceipt({ fullName: 'Test', email: 'test@example.test', applicationReference: 'WS-TEST' })).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('escapes applicant-provided HTML and states acceptance is not guaranteed', async () => {
    vi.stubEnv('MAILERCLOUD_API_KEY', 'test-only'); mocks.send.mockResolvedValue({ success: true });
    expect(await sendApplicationReceipt({ fullName: '<img src=x>', email: 'test@example.test', applicationReference: 'WS-TEST' })).toBe(true);
    const email = mocks.send.mock.calls[0][0];
    expect(email.html).toContain('&lt;img src=x&gt;'); expect(email.html).not.toContain('<img src=x>');
    expect(email.html).toContain('does not guarantee acceptance'); expect(email.html).toContain('WS-TEST');
  });
});
