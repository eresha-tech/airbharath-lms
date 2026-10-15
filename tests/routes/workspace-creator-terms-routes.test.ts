import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), accept: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/workspace/terms/repository', () => ({ postgresCreatorTermsStore: { accept: mocks.accept } }));
import { POST } from '@/app/api/workspace/creator-terms/accept/route';
import { CURRENT_CREATOR_TERMS } from '@/lib/workspace/terms/document';
import { CURRENT_CREATOR_TERMS as V1_IDENTITY } from '@/lib/workspace/terms/v1';
const user = randomUUID(), origin = 'http://localhost:3000';
const request = (raw: unknown = { acknowledged: true }, headers: Record<string, string> = {}) => new Request(`${origin}/api/workspace/creator-terms/accept`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'If-Match': `"${CURRENT_CREATOR_TERMS.contentHash}"`, ...headers }, body: JSON.stringify(raw) });
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-12T12:00:00.000Z'));
  mocks.user.mockResolvedValue({ id: user, role: 'student' });
  mocks.accept.mockImplementation(async (userId, terms, now) => ({ id: randomUUID(), userId, termsVersion: terms.version, termsContentHash: terms.contentHash, acceptedAt: now, createdAt: now }));
});
afterEach(() => vi.useRealTimers());
it('requires authenticated persisted identity and same-origin command before acceptance', async () => {
  mocks.user.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.accept).not.toHaveBeenCalled();
  mocks.user.mockResolvedValue({ id: user });
  expect((await POST(request(undefined, { Origin: 'https://attacker.invalid' }))).status).toBe(403);
  expect((await POST(request(undefined, { Origin: '' }))).status).toBe(403); expect(mocks.accept).not.toHaveBeenCalled();
});
it('server selects metadata and time, minimizes response and adds no analytics', async () => {
  const response = await POST(request()), body = await response.json();
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.accept).toHaveBeenCalledWith(user, CURRENT_CREATOR_TERMS, expect.any(Date));
  expect(body.acceptance).toMatchObject({ termsVersion: CURRENT_CREATOR_TERMS.version, termsContentHash: CURRENT_CREATOR_TERMS.contentHash });
  expect(JSON.stringify(body)).not.toContain(user); expect(body.acceptance).not.toHaveProperty('id');
});
it('rejects client-selected fields, missing/stale review precondition and oversized command', async () => {
  expect((await POST(request({ acknowledged: true, userId: user }))).status).toBe(400);
  expect((await POST(request({ acknowledged: true, termsVersion: 'forged' }))).status).toBe(400);
  expect((await POST(request(undefined, { 'If-Match': '' }))).status).toBe(409);
  expect((await POST(request(undefined, { 'If-Match': '"old-text"' }))).status).toBe(409);
  expect((await POST(request(undefined, { 'If-Match': `"${V1_IDENTITY.contentHash}"` }))).status).toBe(409);
  expect((await POST(request({ acknowledged: true, extra: 'x'.repeat(512) }))).status).toBe(400); expect(mocks.accept).not.toHaveBeenCalled();
});
it('storage/configuration errors return safe retryable failure without acceptance or payment claims', async () => {
  mocks.accept.mockRejectedValue(new Error('private database detail'));
  const response = await POST(request()); expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private database detail');
});
