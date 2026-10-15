import { beforeEach, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('@/lib/workspace/payments/worker', () => ({ runWorkspaceFinancialWorker: mocks.run }));
import { GET } from '@/app/api/internal/workspace/reconcile/route';
const secret = 'synthetic-operational-cron-secret-at-least-32-chars';
beforeEach(() => { vi.stubEnv('CRON_SECRET', secret); });
it('rejects unsigned, cookie-only and query credentials before worker execution', async () => {
  const invalidHeaders: Record<string, string>[] = [{}, { cookie: 'ab_session=synthetic' }, { authorization: 'Bearer wrong' }];
  for (const headers of invalidHeaders) expect((await GET(new Request('https://example.invalid/api/internal/workspace/reconcile?secret='+secret, { headers }))).status).toBe(401);
  expect(mocks.run).not.toHaveBeenCalled();
});
it('uses a strong server Authorization header and safe no-store summary', async () => {
  mocks.run.mockResolvedValue({ payments: 'visited', refunds: 'visited', activation: 'visited' });
  const r = await GET(new Request('https://example.invalid/api/internal/workspace/reconcile', { headers: { authorization: `Bearer ${secret}` } }));
  expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store'); expect(JSON.stringify(await r.json())).not.toContain(secret);
});
it('redacts operational failure rather than returning environment/provider details', async () => {
  mocks.run.mockRejectedValue(Error('synthetic private provider detail'));
  const r = await GET(new Request('https://example.invalid/api/internal/workspace/reconcile', { headers: { authorization: `Bearer ${secret}` } }));
  expect(r.status).toBe(503); expect(JSON.stringify(await r.json())).not.toContain('private');
});
