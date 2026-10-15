import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicationId, adminId, updatedAt, reviewPayload } from './workspace-fixtures';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), findUser: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getSession: mocks.getSession }));
vi.mock('@/lib/db', () => ({ db: { query: { users: { findFirst: mocks.findUser }, workspaceApplications: { findMany: mocks.findMany, findFirst: mocks.findFirst } }, update: mocks.update } }));
vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: vi.fn() }));
import { GET as list } from '@/app/api/admin/workspace-applications/route';
import { GET as detail, PATCH } from '@/app/api/admin/workspace-applications/[id]/route';
const context = { params: Promise.resolve({ id: applicationId }) };
const listRequest = (query = '') => new Request(`http://test.invalid/api/admin/workspace-applications${query}`);
function patch(payload = reviewPayload, origin?: string) { return new Request(`http://test.invalid/api/admin/workspace-applications/${applicationId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(payload) }); }
describe('Workspace admin authorization and workflow', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ id: adminId, role: 'admin', phone: '919999999999' });
    mocks.findUser.mockResolvedValue({ id: adminId, role: 'admin' });
    mocks.findMany.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValue({ id: applicationId, applicationStatus: 'submitted', updatedAt });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([{ updatedAt: new Date() }]);
  });
  it.each(['anonymous', 'student', 'demoted'])('blocks %s users from list, detail, and mutations', async kind => {
    if (kind === 'anonymous') mocks.getSession.mockResolvedValue(null);
    else mocks.findUser.mockResolvedValue({ id: adminId, role: 'student' });
    expect((await list(listRequest())).status).toBe(403);
    expect((await detail(listRequest(), context)).status).toBe(403);
    expect((await PATCH(patch(), context)).status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled(); expect(mocks.findFirst).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('fails closed when persisted role verification is unavailable', async () => {
    mocks.findUser.mockRejectedValue(new Error('database unavailable'));
    expect((await list(listRequest())).status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it('paginates and filters an authorized list without loading internal notes', async () => {
    mocks.findMany.mockResolvedValue(Array.from({ length: 26 }, (_, i) => ({ id: String(i) })));
    const response = await list(listRequest('?status=under_review&search=Cabin&page=2&background=Cabin%20Crew'));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const result = await response.json();
    expect(result.applications).toHaveLength(25); expect(result.hasNextPage).toBe(true);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ limit: 26, offset: 25, where: expect.anything() }));
    expect(mocks.findMany.mock.calls[0][0].columns).not.toHaveProperty('internalNotes');
  });
  it('rejects unsupported filters and pages', async () => {
    for (const query of ['?status=activated', '?page=-1', '?page=1.5', '?readiness=invalid', '?experience=invalid', '?audience=invalid', `?search=${'x'.repeat(201)}`]) expect((await list(listRequest(query))).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it('allows an admin to view details while excluding submission secrets', async () => {
    expect((await detail(listRequest(), context)).status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ columns: { submissionKey: false, payloadHash: false } }));
  });
  it('persists controlled review values with server-assigned review identity and status timestamp', async () => {
    const response = await PATCH(patch(), context);
    expect(response.status).toBe(200);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ applicationStatus: 'under_review', reviewedBy: adminId, reviewedAt: expect.any(Date), statusChangedAt: expect.any(Date), reviewAssessments: reviewPayload.reviewAssessments }));
    expect(mocks.set.mock.calls[0][0]).not.toHaveProperty('expectedUpdatedAt');
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.where).toHaveBeenCalledWith(expect.anything());
    const guard = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(guard.sql).toContain('approval_email_status');
    expect(guard.params).toContain('sending');
  });
  it('does not change status timestamp when only notes change', async () => {
    mocks.findFirst.mockResolvedValue({ applicationStatus: 'under_review', updatedAt });
    await PATCH(patch(), context);
    expect(mocks.set.mock.calls[0][0]).not.toHaveProperty('statusChangedAt');
  });
  it('detects concurrent review edits instead of overwriting them', async () => {
    mocks.returning.mockResolvedValue([]);
    const response = await PATCH(patch(), context);
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain('Another reviewer');
  });
  it('rejects account provisioning and applicant mass assignment', async () => {
    for (const body of [{ ...reviewPayload, role: 'creator' }, { ...reviewPayload, fullName: 'Changed' }, { ...reviewPayload, applicationStatus: 'activated' }]) expect((await PATCH(patch(body), context)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('rejects a cross-origin admin mutation', async () => {
    expect((await PATCH(patch(reviewPayload, 'https://other.invalid'), context)).status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('handles missing applications and invalid identifiers', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    expect((await detail(listRequest(), context)).status).toBe(404);
    expect((await PATCH(patch(), context)).status).toBe(404);
    expect((await detail(listRequest(), { params: Promise.resolve({ id: 'invalid' }) })).status).toBe(400);
  });
  it('returns generic errors for unavailable persistence', async () => {
    mocks.findMany.mockRejectedValue(new Error('secret SQL detail'));
    const response = await list(listRequest());
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('secret SQL detail');
  });
});
