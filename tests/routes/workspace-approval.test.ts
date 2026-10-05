import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import { applicationId, adminId, updatedAt } from './workspace-fixtures';
import { approvalPreviewHash, renderApprovalEmail } from '@/lib/workspace/approval-email';

const mocks = vi.hoisted(() => ({ session: vi.fn(), findUser: vi.fn(), findFirst: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(), send: vi.fn(), after: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getSession: mocks.session }));
vi.mock('@/lib/db', () => ({ db: { query: { users: { findFirst: mocks.findUser }, workspaceApplications: { findFirst: mocks.findFirst } }, update: mocks.update } }));
vi.mock('@/lib/mailercloud', () => ({ sendMailercloudEmail: mocks.send }));
vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: mocks.after }));
import { POST as preview } from '@/app/api/admin/workspace-applications/[id]/approval-email/preview/route';
import { POST as send } from '@/app/api/admin/workspace-applications/[id]/approval-email/send/route';

const context = { params: Promise.resolve({ id: applicationId }) };
const app = { id: applicationId, fullName: '<img src=x onerror=alert(1)>', email: 'stored@example.test', applicationReference: 'WS-STORED', applicationStatus: 'approved', updatedAt, approvalEmailStatus: 'not_sent' };
function request(payload: object, origin = 'http://test.invalid') { return new Request('http://test.invalid/api/admin/workspace-applications/test', { method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(payload) }); }
function sendPayload(note = '', action = 'send', confirmed = false) { return { personalNote: note, action, confirmed, expectedUpdatedAt: updatedAt.toISOString(), previewHash: approvalPreviewHash(renderApprovalEmail(app, note), updatedAt, app.email) }; }

describe('Controlled Workspace approval email workflow', () => {
  beforeEach(() => {
    mocks.session.mockResolvedValue({ id: adminId, role: 'admin', fullName: 'Test Admin' });
    mocks.findUser.mockResolvedValue({ id: adminId, role: 'admin' });
    mocks.findFirst.mockResolvedValue({ ...app });
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([{ id: applicationId, approvalEmailStatus: 'sent', approvalEmailSentBy: adminId }]);
    mocks.send.mockResolvedValue({ success: true });
  });

  it.each(['anonymous', 'applicant', 'student', 'demoted'])('blocks %s from preview and send using persisted authorization', async role => {
    if (role === 'anonymous' || role === 'applicant') mocks.session.mockResolvedValue(null);
    else mocks.findUser.mockResolvedValue({ id: adminId, role: 'student' });
    expect((await preview(request({}), context)).status).toBe(403);
    expect((await send(request(sendPayload()), context)).status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('fails closed if admin role lookup fails', async () => {
    mocks.findUser.mockRejectedValue(new Error('private SQL details'));
    expect((await send(request(sendPayload()), context)).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(['submitted', 'under_review', 'declined', 'invited_to_activate'])('blocks approval communication for %s', async status => {
    mocks.findFirst.mockResolvedValue({ ...app, applicationStatus: status });
    expect((await preview(request({}), context)).status).toBe(409);
    expect((await send(request(sendPayload()), context)).status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.send).not.toHaveBeenCalled();
  });
  it('previews the real stored applicant and exact escaped template without sending', async () => {
    const response = await preview(request({ personalNote: '<script>alert(1)</script>\nWelcome.' }), context);
    expect(response.status).toBe(200);
    const email = await response.json();
    expect(email.recipient).toBe('stored@example.test'); expect(email.applicationReference).toBe('WS-STORED');
    expect(email.html).toContain('&lt;img'); expect(email.html).toContain('&lt;script&gt;'); expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('creator approval does not automatically approve individual courses');
    expect(email.html).toContain('Workspace activation'); expect(email.html).not.toContain('₹');
    expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it('sends only the previewed template to the stored recipient and records successful admin attribution', async () => {
    const note = 'Welcome to our founding cohort.';
    expect((await send(request(sendPayload(note)), context)).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: app.email, name: app.fullName, html: renderApprovalEmail(app, note).html, privateDelivery: true }));
    expect(mocks.set.mock.calls[0][0]).toMatchObject({ approvalEmailStatus: 'sending', approvalEmailAttemptedBy: adminId, approvalEmailPersonalNote: note });
    expect(mocks.set.mock.calls[1][0]).toMatchObject({ approvalEmailStatus: 'sent', approvalEmailSentAt: expect.any(Date), approvalEmailSentBy: adminId });
    for (const [changes] of mocks.set.mock.calls) expect(changes).not.toHaveProperty('applicationStatus');
    const claim = new PgDialect().sqlToQuery(mocks.where.mock.calls[0][0]);
    expect(claim.sql).toContain('approval_email_status'); expect(claim.sql).toContain('updated_at');
    expect(claim.params).toContain('approved'); expect(claim.params).toContain('not_sent');
    const completion = new PgDialect().sqlToQuery(mocks.where.mock.calls[1][0]);
    expect(completion.sql).toContain('approval_email_attempt_id');
  });
  it('prevents a concurrent claim loser from sending', async () => {
    mocks.returning.mockResolvedValueOnce([]);
    expect((await send(request(sendPayload()), context)).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('allows only one send when two admins race with the same preview', async () => {
    mocks.returning.mockResolvedValueOnce([{ id: applicationId }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ approvalEmailStatus: 'sent' }]);
    const results = await Promise.all([send(request(sendPayload()), context), send(request(sendPayload()), context)]);
    expect(results.map(response => response.status).sort()).toEqual([200, 409]);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it('does not permit automatic duplicate sends or retries', async () => {
    for (const status of ['sending', 'sent', 'failed']) {
      mocks.findFirst.mockResolvedValue({ ...app, approvalEmailStatus: status });
      expect((await send(request(sendPayload()), context)).status).toBe(409);
    }
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([['sent', 'resend'], ['failed', 'retry']])('requires confirmation for %s, then permits explicit %s', async (status, action) => {
    mocks.findFirst.mockResolvedValue({ ...app, approvalEmailStatus: status });
    expect((await send(request(sendPayload('', action)), context)).status).toBe(409);
    expect((await send(request(sendPayload('', action, true)), context)).status).toBe(200);
    expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it.each(['provider_rejected', 'timeout', 'delivery_unknown', 'not_configured'])('records safe %s failure without changing creator approval', async category => {
    mocks.send.mockResolvedValue({ success: false, errorCategory: category });
    mocks.returning.mockResolvedValueOnce([{ id: applicationId }]).mockResolvedValueOnce([{ approvalEmailStatus: 'failed', approvalEmailErrorCategory: category }]);
    const response = await send(request(sendPayload()), context);
    expect(response.status).toBe(502);
    expect(mocks.set.mock.calls[1][0]).toMatchObject({ approvalEmailStatus: 'failed', approvalEmailErrorCategory: category });
    expect(mocks.set.mock.calls[1][0]).not.toHaveProperty('approvalEmailSentAt');
    for (const [changes] of mocks.set.mock.calls) expect(changes).not.toHaveProperty('applicationStatus');
  });
  it('retains a claimed Sending state when provider acceptance cannot be persisted', async () => {
    mocks.returning.mockResolvedValueOnce([{ id: applicationId }]).mockRejectedValueOnce(new Error('private SQL'));
    const response = await send(request(sendPayload()), context);
    expect(response.status).toBe(503); expect(mocks.set).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(await response.json())).not.toContain('private SQL');
  });
  it('rejects changed notes or stale application state after preview', async () => {
    expect((await send(request({ ...sendPayload(), personalNote: 'Changed after preview' }), context)).status).toBe(409);
    expect((await send(request({ ...sendPayload(), expectedUpdatedAt: '2026-01-01T00:00:00.000Z' }), context)).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('invalidates the preview if its stored recipient changed', async () => {
    mocks.findFirst.mockResolvedValue({ ...app, email: 'changed@example.test' });
    expect((await send(request(sendPayload()), context)).status).toBe(409);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([{ personalNote: 'x'.repeat(1001) }, { personalNote: '\u0001' }, { personalNote: {} }, { email: 'attacker@example.test' }, { html: '<h1>custom</h1>' }])('rejects invalid notes and uncontrolled fields', async payload => {
    expect((await preview(request(payload), context)).status).toBe(400);
    expect((await send(request({ ...sendPayload(), ...payload }), context)).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it('rejects cross-origin preview and sending', async () => {
    expect((await preview(request({}, 'https://other.invalid'), context)).status).toBe(403);
    expect((await send(request(sendPayload(), 'https://other.invalid'), context)).status).toBe(403);
  });
  it('handles missing applications and invalid IDs', async () => {
    mocks.findFirst.mockResolvedValue(undefined);
    expect((await preview(request({}), context)).status).toBe(404);
    expect((await send(request(sendPayload()), context)).status).toBe(404);
    expect((await send(request(sendPayload()), { params: Promise.resolve({ id: 'bad' }) })).status).toBe(400);
  });
});
