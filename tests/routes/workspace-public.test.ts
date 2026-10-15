import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applicant, applicationId } from './workspace-fixtures';
import { validateApplication } from '@/lib/workspace/validation';
import { applicationPayloadHash } from '@/lib/workspace/reference';

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), values: vi.fn(), returning: vi.fn(), insert: vi.fn(), onConflict: vi.fn(), after: vi.fn(), receipt: vi.fn(), update: vi.fn(), analytics: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: { workspaceApplications: { findFirst: mocks.findFirst } }, insert: mocks.insert, update: mocks.update } }));
vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: mocks.after }));
vi.mock('@/lib/workspace/receipt', () => ({ sendApplicationReceipt: mocks.receipt }));
vi.mock('@/lib/workspace/analytics-server', () => ({ trackWorkspaceServer: mocks.analytics }));
import { POST } from '@/app/api/workspace/applications/route';
function request(payload: unknown = applicant, origin?: string) {
  return new Request('http://test.invalid/api/workspace/applications', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) }, body: JSON.stringify(payload) });
}
describe('Public Workspace application endpoint', () => {
  beforeEach(() => {
    mocks.findFirst.mockResolvedValue(undefined);
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ onConflictDoNothing: mocks.onConflict });
    mocks.onConflict.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([{ id: applicationId, applicationReference: 'WS-ABCDEF1234567890ABCD' }]);
    mocks.receipt.mockResolvedValue(false);
  });
  it('persists a valid application in Submitted status and returns only public receipt data', async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ applicationReference: 'WS-ABCDEF1234567890ABCD', status: 'submitted' });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ applicationStatus: 'submitted', email: applicant.email, mobile: '919876543210', consentAccuracy: true, consentContact: true, consentAccuracyAt: expect.any(Date), consentContactAt: expect.any(Date), submissionKey: applicant.submissionKey, potentialDuplicate: false }));
    expect(mocks.after).toHaveBeenCalledTimes(1);
    await mocks.after.mock.calls[0][0]();
    expect(mocks.analytics).toHaveBeenCalledExactlyOnceWith('workspace_application_saved', applicationId, { applicationStatus: 'submitted' });
  });
  it.each([
    { fullName: '' }, { learnerOutcome: '' }, { aviationBackground: 'invalid' },
    { sampleContentUrl: 'javascript:alert(1)' }, { consentContact: false },
    { applicationStatus: 'approved' }, { internalNotes: 'self-approved' }, { reviewedBy: applicationId },
    { reviewAssessments: { aviationCredibilityAssessment: 'Strong' } },
  ])('rejects malformed or privileged payload fields: %j', async patch => {
    const response = await POST(request({ ...applicant, ...patch }));
    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
  it('permits a repeated email/mobile and marks it internally without exposing prior records', async () => {
    mocks.findFirst.mockResolvedValue({ id: applicationId });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ potentialDuplicate: true }));
    expect(await response.json()).not.toHaveProperty('potentialDuplicate');
  });
  it('recovers a matching retry without a second application or receipt email', async () => {
    const parsed = validateApplication(applicant);
    if (!parsed.success) throw new Error('Invalid fixture');
    mocks.returning.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ applicationReference: 'WS-EXISTING', payloadHash: applicationPayloadHash(parsed.data) });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ applicationReference: 'WS-EXISTING', status: 'submitted' });
    expect(mocks.onConflict).toHaveBeenCalledOnce();
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.analytics).not.toHaveBeenCalled();
  });
  it('does not disclose a reference when a key is replayed with a different payload', async () => {
    mocks.returning.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ applicationReference: 'WS-PRIVATE', payloadHash: 'different-payload' });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain('WS-PRIVATE');
  });
  it('redacts database failures and does not send a receipt for failed persistence', async () => {
    mocks.returning.mockRejectedValue(new Error('private database internals'));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private database internals');
    expect(mocks.after).not.toHaveBeenCalled();
  });
  it('does not fail an accepted application when receipt delivery fails', async () => {
    mocks.receipt.mockRejectedValue(new Error('mailer unavailable'));
    const response = await POST(request());
    expect(response.status).toBe(201);
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined();
  });
  it('rejects cross-origin submissions before reading or writing data', async () => {
    const response = await POST(request(applicant, 'https://other.invalid'));
    expect(response.status).toBe(403);
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('accepts the public host when Next reconstructs an internal request URL', async () => {
    const response = await POST(new Request('http://localhost:3100/api/workspace/applications', {
      method: 'POST', headers: { 'Content-Type': 'application/json', host: '127.0.0.1:3100', origin: 'http://127.0.0.1:3100' },
      body: JSON.stringify(applicant),
    }));
    expect(response.status).toBe(201);
  });
  it('rejects invalid JSON and oversized payloads before persistence', async () => {
    for (const body of ['invalid-json', JSON.stringify({ text: 'x'.repeat(33_000) })]) {
      const response = await POST(new Request('http://test.invalid/api/workspace/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }));
      expect(response.status).toBe(400);
    }
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
