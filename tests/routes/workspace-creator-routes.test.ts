import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), create: vi.fn(), update: vi.fn(), saveProfile: vi.fn(), overview: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/workspace/creator/repository', () => ({ workspaceContent: () => mocks }));
import { GET as list, POST } from '@/app/api/workspace/course-drafts/route';
import { GET, PATCH } from '@/app/api/workspace/course-drafts/[id]/route';
import { GET as profileRead, PUT } from '@/app/api/workspace/profile-details/route';
import { CreatorError } from '@/lib/workspace/creator/model';
import { content, now, owner, other, key, draftId, profileId, profile } from './workspace-creator-fixtures';
const row = { ...content, id: draftId, userId: owner, creatorProfileId: profileId, requestKey: key, creationHash: 'private-creation-hash', version: 5, currency: 'INR', status: 'draft', createdAt: now, updatedAt: now };
function request(body?: unknown, method = 'POST', origin = 'https://example.test') { return new Request('https://example.test/api/workspace/course-drafts', { method, headers: { origin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
const context = { params: Promise.resolve({ id: draftId }) };
beforeEach(() => { mocks.user.mockResolvedValue({ id: owner, role: 'student' }); mocks.read.mockResolvedValue(row); mocks.create.mockResolvedValue(row); mocks.update.mockResolvedValue({ ...row, version: 6 }); mocks.saveProfile.mockResolvedValue({ ...profile, userId: owner, creatorProfileId: profileId, version: 1 }); mocks.overview.mockResolvedValue({ drafts: [row], details: { ...profile, userId: owner, version: 1 }, total: 1, hasNext: false, capabilities: { canEditWorkspace: true } }); });
it('anonymous cannot read/create/edit/list/profile and receives no-store responses', async () => {
  mocks.user.mockResolvedValue(null);
  for (const response of await Promise.all([list(request(undefined, 'GET')), GET(request(undefined, 'GET'), context), POST(request({ requestKey: key, content })), PATCH(request({ expectedVersion: 5, content }, 'PATCH'), context), PUT(request({ expectedVersion: 0, content: profile }, 'PUT')), profileRead(request(undefined, 'GET'))])) { expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('no-store'); }
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
});
it('uses the persisted owner; API receipts omit identity, request keys and hashes', async () => {
  const created = await POST(request({ requestKey: key, content })); expect(created.status).toBe(200); expect(mocks.create).toHaveBeenCalledWith(owner, key, content);
  const body = await created.json(); expect(body.draft).toMatchObject({ id: draftId, status: 'draft', currency: 'INR' }); for (const field of ['userId', 'creatorProfileId', 'requestKey', 'creationHash']) expect(body.draft).not.toHaveProperty(field);
  expect((await GET(request(undefined, 'GET'), context)).status).toBe(200); expect(mocks.read).toHaveBeenCalledWith(owner, draftId);
  expect((await PATCH(request({ expectedVersion: 5, content }, 'PATCH'), context)).status).toBe(200); expect(mocks.update).toHaveBeenCalledWith(owner, draftId, 5, content);
  expect((await PUT(request({ expectedVersion: 0, content: profile }, 'PUT'))).status).toBe(200); expect(mocks.saveProfile).toHaveBeenCalledWith(owner, 0, profile);
  expect((await (await profileRead(request(undefined, 'GET'))).json()).profile).not.toHaveProperty('userId');
});
it('forged ownership, published status and stale or invalid commands are rejected before saving', async () => {
  for (const body of [{ requestKey: key, content, userId: other }, { requestKey: key, content: { ...content, userId: other } }, { requestKey: key, content: { ...content, status: 'published' } }, { requestKey: 'bad', content }]) expect((await POST(request(body))).status).toBe(400);
  expect((await PUT(request({ expectedVersion: 0, content: { ...profile, creatorProfileId: other } }, 'PUT'))).status).toBe(400); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.saveProfile).not.toHaveBeenCalled();
});
it('cross-origin mutation, oversized streamed JSON and malformed input fail safely', async () => {
  expect((await POST(request({ requestKey: key, content }, 'POST', 'https://attacker.test'))).status).toBe(403);
  expect((await POST(request({ padding: 'x'.repeat(196_608) }))).status).toBe(413);
  expect((await POST(new Request('https://example.test/api/workspace/course-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' }))).status).toBe(400);
  expect((await POST(new Request('https://example.test/api/workspace/course-drafts', { method: 'POST', body: 'text' }))).status).toBe(400); expect(mocks.create).not.toHaveBeenCalled();
});
it('owner-only missing drafts use non-enumerating 404, including invalid UUID', async () => {
  mocks.read.mockRejectedValue(new CreatorError('not_found')); mocks.update.mockRejectedValue(new CreatorError('not_found'));
  expect((await GET(request(undefined, 'GET'), context)).status).toBe(404); expect((await PATCH(request({ expectedVersion: 5, content }, 'PATCH'), context)).status).toBe(404);
  const response = await GET(request(undefined, 'GET'), { params: Promise.resolve({ id: 'forged' }) }); expect(response.status).toBe(404); expect(await response.json()).toMatchObject({ error: 'Draft not found.' });
});
it('expired/suspended writes, conflict and database outages return bounded failures without SQL', async () => {
  for (const [code, status] of [['restricted', 403], ['conflict', 409]] as const) { mocks.update.mockRejectedValue(new CreatorError(code)); expect((await PATCH(request({ expectedVersion: 5, content }, 'PATCH'), context)).status).toBe(status); }
  mocks.create.mockRejectedValue(new Error('private SQL connection credentials')); const failure = await POST(request({ requestKey: key, content })); expect(failure.status).toBe(503); expect(JSON.stringify(await failure.json())).not.toContain('SQL');
});
it('list pagination is bounded and only passes the current persisted account', async () => {
  expect((await list(new Request('https://example.test/api/workspace/course-drafts?page=2'))).status).toBe(200); expect(mocks.overview).toHaveBeenCalledWith(owner, 2);
  for (const page of ['0', '-1', '501', '1.2', 'NaN']) expect((await list(new Request(`https://example.test/api/workspace/course-drafts?page=${page}`))).status).toBe(400);
});
