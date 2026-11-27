import { beforeEach, expect, it, vi } from 'vitest';
import { PREVIEW_DISABLED_FLAGS } from '@/lib/runtime/vercel-staging-core.mjs';
import { measureBuilderRead, withBuilderReadTiming } from '@/lib/workspace/builder/read-timing';

function staging() {
  const host = 'ep-fixture.ap-southeast-1.aws.neon.tech', database = 'airbharath_staging_lms', user = 'airbharath_staging_runtime_scoped';
  for (const [key, value] of Object.entries({ ...Object.fromEntries(PREVIEW_DISABLED_FLAGS.map(key => [key, 'false'])), NODE_ENV: 'production', DATABASE_ENV: 'staging', VERCEL: '1', VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'staging', WORKSPACE_DEPLOYMENT_PROVIDER: 'vercel', WORKSPACE_DEPLOYMENT_ENV: 'staging', WORKSPACE_VERCEL_STAGING_AUTHORIZED: 'true', DATABASE_URL: `postgresql://${user}:SYNTHETIC_ONLY@${host}/${database}?sslmode=verify-full`, STAGING_EXPECTED_DATABASE_HOST: host, STAGING_EXPECTED_DATABASE_NAME: database, STAGING_EXPECTED_DATABASE_USER: user, STAGING_DATABASE_IDENTITY: 'a'.repeat(64) })) vi.stubEnv(key, value);
}
beforeEach(() => { vi.spyOn(console, 'info').mockImplementation(() => {}); });
const request = (method = 'GET') => new Request('https://fixture.invalid/private-course?lesson=PRIVATE_ID', { method, headers: { authorization: 'PRIVATE_TOKEN' } });
it('emits sanitized request-local timings only in authorized staging', async () => {
  staging(); const response = new Response('PRIVATE_LESSON', { headers: { 'cache-control': 'no-store' } });
  expect(await withBuilderReadTiming(request(), async () => { await measureBuilderRead('lesson', async () => 'PRIVATE_SQL'); return response; })).toBe(response);
  expect(await response.text()).toBe('PRIVATE_LESSON'); expect(response.headers.get('cache-control')).toBe('no-store');
  const entry = JSON.parse(vi.mocked(console.info).mock.calls[0][0]);
  expect(entry).toMatchObject({ event: 'workspace_builder_read_timing', status: 200, aborted: false, phases: { lesson: expect.any(Number) } });
  expect(response.headers.get('X-AirBharath-Builder-Read')).toBe(entry.trace);
  expect(JSON.stringify(entry)).not.toMatch(/PRIVATE|SYNTHETIC_ONLY|postgres|fixture|authorization/);
});
it.each([{ VERCEL_ENV: 'production' }, { DATABASE_ENV: 'production' }, { VERCEL_GIT_COMMIT_REF: 'main' }, { WORKSPACE_PAYMENT_ENABLED: 'true' }, { STAGING_EXPECTED_DATABASE_HOST: 'ep-other.neon.tech' }])('does not diagnose a conflicting environment %j', async patch => {
  staging(); for (const [key, value] of Object.entries(patch)) vi.stubEnv(key, value);
  const response = await withBuilderReadTiming(request(), async () => new Response('unchanged', { status: 403 }));
  expect(response.status).toBe(403); expect(response.headers.has('X-AirBharath-Builder-Read')).toBe(false); expect(console.info).not.toHaveBeenCalled();
});
it('never instruments mutations or ordinary local runtime', async () => {
  await withBuilderReadTiming(request(), async () => new Response()); staging();
  await withBuilderReadTiming(request('PATCH'), async () => new Response()); expect(console.info).not.toHaveBeenCalled();
});
it('isolates concurrent requests and preserves response status', async () => {
  staging(); let finish!: () => void;
  const a = withBuilderReadTiming(request(), async () => { await measureBuilderRead('owner_lock', () => new Promise<void>(resolve => { finish = resolve; })); return new Response(null, { status: 403 }); });
  const b = await withBuilderReadTiming(request(), async () => { await measureBuilderRead('lesson', async () => null); return new Response(); });
  finish(); const denied = await a;
  const entries = vi.mocked(console.info).mock.calls.map(call => JSON.parse(call[0]));
  expect(Object.keys(entries[0].phases)).toEqual(['lesson']); expect(Object.keys(entries[1].phases)).toEqual(['owner_lock']);
  expect(denied.status).toBe(403); expect(b.headers.get('X-AirBharath-Builder-Read')).not.toBe(denied.headers.get('X-AirBharath-Builder-Read'));
});
it('preserves errors without logging their contents and tolerates logger failure', async () => {
  staging(); const failure = new Error('PRIVATE_SQL_AND_SECRET');
  await expect(withBuilderReadTiming(request(), () => measureBuilderRead('lesson', async () => { throw failure; }))).rejects.toBe(failure);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(failure.message);
  vi.mocked(console.info).mockImplementation(() => { throw new Error('logger unavailable'); });
  const response = new Response(); expect(await withBuilderReadTiming(request(), async () => response)).toBe(response);
});
