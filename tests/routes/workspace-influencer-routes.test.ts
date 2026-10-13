import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ admin: vi.fn(), save: vi.fn(), list: vi.fn() }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/membership/influencers', () => ({ saveInfluencer: mocks.save, listInfluencers: mocks.list }));
import { GET, POST, PATCH } from '@/app/api/admin/workspace/influencers/route';
import { actorId, requestKey } from './workspace-membership-fixtures';
const origin = 'http://localhost:3000';
const definition = { displayName: 'Synthetic', description: null, status: 'active' };
const request = (body: unknown, source = origin) => new Request(origin + '/api/admin/workspace/influencers', { method: 'POST', headers: { origin: source, 'content-type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_BASE_URL', origin); mocks.admin.mockResolvedValue({ id: actorId }); mocks.list.mockResolvedValue([]); mocks.save.mockResolvedValue({ id: requestKey, ...definition, version: 1, createdBy: actorId }); });
it.each([null, undefined])('anonymous or missing persisted admin cannot access any influencer handler', async actor => {
  mocks.admin.mockResolvedValue(actor); expect((await GET()).status).toBe(403); expect((await POST(request({ id: requestKey, definition }))).status).toBe(403); expect((await PATCH(request({ id: requestKey, definition, expectedVersion: 1 }))).status).toBe(403); expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled();
});
it('same-origin commands use persisted actor, version guards and private responses', async () => {
  const created = await POST(request({ id: requestKey, definition })); expect(created.status).toBe(201); expect(created.headers.get('cache-control')).toBe('no-store'); expect(JSON.stringify(await created.json())).not.toContain('createdBy');
  expect(mocks.save).toHaveBeenCalledWith(actorId, requestKey, definition, undefined);
  expect((await PATCH(request({ id: requestKey, definition, expectedVersion: 1 }))).status).toBe(200);
  expect((await PATCH(request({ id: requestKey, definition }))).status).toBe(400);
  expect((await POST(request({ id: requestKey, definition, expectedVersion: 1 }))).status).toBe(400);
  expect((await POST(request({ id: requestKey, definition }, 'https://outside.example.invalid'))).status).toBe(403);
});
it('forged attribution inputs and oversized data are refused', async () => {
  expect((await POST(request({ id: 'forged', definition }))).status).toBe(400);
  expect((await POST(request({ id: requestKey, definition, actorId }))).status).toBe(400);
  expect((await POST(request({ id: requestKey, definition: { ...definition, description: 'x'.repeat(5000) } }))).status).toBe(400);
});
