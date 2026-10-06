import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), journey: vi.fn(), recover: vi.fn(), submit: vi.fn(), limit: vi.fn(), decision: vi.fn(), after: vi.fn(), admin: vi.fn(), list: vi.fn(), detail: vi.fn(), config: vi.fn(), publish: vi.fn() }));
vi.mock('next/server', async importOriginal => ({ ...await importOriginal<typeof import('next/server')>(), after: mocks.after }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/eligibility/service', async () => {
  const model = await import('@/lib/workspace/eligibility/model');
  class EligibilityError extends Error { constructor(public code: string, public fields?: Record<string, string>) { super(code); } }
  return { EligibilityError, getWorkspaceUser: mocks.user, getWorkspaceJourneyState: mocks.journey, recoverSubmission: mocks.recover, submitEligibility: mocks.submit, eligibilityReceipt: (a: Record<string, unknown>) => Object.fromEntries(['id', 'result', 'reasons', 'decidedAt', 'eligibleUntil', 'reapplyAt'].map(key => [key, a[key]])), getEligibilityFormConfig: mocks.config, publishSettings: mocks.publish, listEligibilityAttempts: mocks.list, getAdminEligibilityAttempt: mocks.detail,
    parseAdminList: (url: URL) => { const filter = url.searchParams.get('filter') || 'all', page = Number(url.searchParams.get('page') || 1); return ['all', 'eligible', 'ineligible', 'current_eligible', 'expired', 'cooldown_active'].includes(filter) && Number.isInteger(page) && page >= 1 && page <= 500 ? { filter, page } : null; }, model };
});
vi.mock('@/lib/workspace/eligibility/limiter', () => ({ consumeEligibilityLimit: mocks.limit }));
vi.mock('@/lib/workspace/eligibility/analytics-server', () => ({ trackEligibilityDecision: mocks.decision }));
import { POST } from '@/app/api/workspace/eligibility/route';
import { GET as journeyGET } from '@/app/api/workspace/journey/route';
import { GET as currentGET } from '@/app/api/workspace/eligibility/current/route';
import { GET as listGET } from '@/app/api/admin/workspace/eligibility/route';
import { GET as detailGET } from '@/app/api/admin/workspace/eligibility/[attemptId]/route';
import { GET as settingsGET, POST as settingsPOST } from '@/app/api/admin/workspace/settings/route';
import { EligibilityError } from '@/lib/workspace/eligibility/service';
import { evaluateEligibility, validateSubmission } from '@/lib/workspace/eligibility/model';
import { input, now, userId, setting, policy, key } from './workspace-eligibility-fixtures';
const validated = validateSubmission(input); if (!validated.success) throw new Error('fixture');
const attempt = { id: key, ...evaluateEligibility(validated.data, setting.config, now), payloadHash: 'private', submissionKey: key, professionalProfileUrl: input.professionalProfileUrl };
function request(body: unknown = input, origin = 'https://example.test') { return new Request('https://example.test/api/workspace/eligibility', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://example.test'); mocks.user.mockResolvedValue({ id: userId }); mocks.recover.mockResolvedValue(null); mocks.limit.mockResolvedValue({ status: 'allowed' }); mocks.submit.mockResolvedValue({ attempt, created: true }); mocks.admin.mockResolvedValue(null); mocks.after.mockReset(); mocks.after.mockImplementation(callback => callback()); mocks.config.mockResolvedValue({ settings: setting, policy });
});
describe('public eligibility API', () => {
  it('requires an authenticated persisted user and same-origin mutations', async () => {
    expect((await POST(request(input, 'https://attacker.test'))).status).toBe(403); expect(mocks.user).not.toHaveBeenCalled();
    mocks.user.mockResolvedValue(null); expect((await POST(request())).status).toBe(401); expect(mocks.limit).not.toHaveBeenCalled();
    expect((await journeyGET()).status).toBe(401); expect((await currentGET()).status).toBe(401); expect(mocks.journey).not.toHaveBeenCalled();
  });
  it('malformed/declaration/forged input never calls the limiter or decision writer', async () => {
    for (const body of [{ ...input, declarations: { ...input.declarations, adult: false } }, { ...input, experienceMonths: 999 }, { ...input, userId: 'another-user' }, { ...input, professionalProfileUrl: 'http://localhost/' }]) expect((await POST(request(body))).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.decision).not.toHaveBeenCalled();
  });
  it('recovers matching owned history even when the limiter is unavailable, without another analytics event', async () => {
    mocks.recover.mockResolvedValue(attempt); mocks.limit.mockResolvedValue({ status: 'unavailable' });
    const response = await POST(request()); expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toMatchObject({ attempt: { id: key }, created: false }); expect(mocks.recover).toHaveBeenCalledWith(userId, validated.data);
    expect(mocks.limit).not.toHaveBeenCalled(); expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.after).not.toHaveBeenCalled();
  });
  it('fails closed on provider failure and returns Retry-After on rate limitation', async () => {
    mocks.limit.mockResolvedValue({ status: 'unavailable' }); expect((await POST(request())).status).toBe(503);
    mocks.limit.mockResolvedValue({ status: 'limited', retryAfter: 77 }); const response = await POST(request()); expect(response.status).toBe(429); expect(response.headers.get('Retry-After')).toBe('77'); expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('uses the account owner, returns only the receipt and emits a post-commit decision', async () => {
    const response = await POST(request()); expect(response.status).toBe(201); expect(mocks.submit).toHaveBeenCalledWith(userId, validated.data);
    const text = await response.text(); expect(text).not.toMatch(/private|submissionKey|professionalProfileUrl/); expect(mocks.after).toHaveBeenCalledOnce(); expect(mocks.decision).toHaveBeenCalledWith(key, 'eligible');
    mocks.submit.mockResolvedValue({ attempt, created: false }); await POST(request()); expect(mocks.after).toHaveBeenCalledOnce();
  });
  it('safe conflict/validation/storage failures produce no result or event', async () => {
    mocks.recover.mockRejectedValueOnce(new EligibilityError('conflict')); expect((await POST(request())).status).toBe(409);
    mocks.submit.mockRejectedValueOnce(new EligibilityError('validation', { professionalProfileUrl: 'Required' })); expect((await POST(request())).status).toBe(400);
    mocks.submit.mockRejectedValueOnce(new Error('private database details')); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private database'); expect(mocks.after).not.toHaveBeenCalled();
  });
  it('journey/current reads use only the persisted account, ignoring requested identities', async () => {
    mocks.journey.mockResolvedValue({ state: 'eligibility_required' }); expect((await currentGET()).status).toBe(200); expect((await journeyGET()).status).toBe(200); expect(mocks.journey).toHaveBeenCalledWith(userId);
    mocks.journey.mockRejectedValue(new Error('private')); expect((await currentGET()).status).toBe(503); expect((await journeyGET()).status).toBe(503);
  });
});
describe('persisted-admin eligibility APIs', () => {
  it('denies anonymous/student/demoted users through the authorization helper', async () => {
    expect((await listGET(new Request('https://example.test/api/admin/workspace/eligibility'))).status).toBe(403);
    expect((await detailGET(new Request('https://example.test'), { params: Promise.resolve({ attemptId: key }) })).status).toBe(403);
    expect((await settingsGET()).status).toBe(403); expect((await settingsPOST(request())).status).toBe(403); expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('validates filters/IDs and returns 404 for missing attempts', async () => {
    mocks.admin.mockResolvedValue({ id: userId });
    expect((await listGET(new Request('https://example.test?filter=membership'))).status).toBe(400);
    expect((await detailGET(new Request('https://example.test'), { params: Promise.resolve({ attemptId: 'invalid' }) })).status).toBe(400);
    mocks.detail.mockResolvedValue(null); expect((await detailGET(new Request('https://example.test'), { params: Promise.resolve({ attemptId: key }) })).status).toBe(404);
    mocks.list.mockResolvedValue({ attempts: [] }); expect((await listGET(new Request('https://example.test?filter=current_eligible&page=2'))).status).toBe(200); expect(mocks.list).toHaveBeenCalledWith('current_eligible', 2);
  });
  it('publishes only bounded versioned settings with same-origin and optimistic safety', async () => {
    mocks.admin.mockResolvedValue({ id: userId }); const body = { expectedSettingsId: setting.id, requestKey: key, config: setting.config };
    expect((await settingsPOST(request(body, 'https://attacker.test'))).status).toBe(403);
    expect((await settingsPOST(request({ ...body, config: { ...setting.config, minimumExperienceMonths: 0 } }))).status).toBe(400);
    mocks.publish.mockResolvedValue({ ...setting, version: 2 }); expect((await settingsPOST(request(body))).status).toBe(201); expect(mocks.publish).toHaveBeenCalledWith(userId, body);
    mocks.publish.mockRejectedValueOnce(new EligibilityError('conflict')); expect((await settingsPOST(request(body))).status).toBe(409);
    mocks.publish.mockRejectedValueOnce(new EligibilityError('authentication')); expect((await settingsPOST(request(body))).status).toBe(403);
  });
});
