import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), admin: vi.fn(), submit: vi.fn(), review: vi.fn() }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getWorkspaceUser: mocks.user }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('@/lib/workspace/review/repository', () => ({ workspaceReviews: () => ({ submit: mocks.submit, review: mocks.review }) }));
import { POST } from '@/app/api/workspace/course-drafts/[id]/submit/route';
import { PATCH } from '@/app/api/admin/workspace/course-reviews/[id]/route';
import { ReviewError } from '@/lib/workspace/review/model';
import { submissionReceipt, eventReceipt } from '@/lib/workspace/review/http';
import { content, owner, other, draftId, key, now, profileId } from './workspace-creator-fixtures';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const row = { ...content, id, draftId, userId: owner, creatorProfileId: profileId, submissionNumber: 1, draftVersion: 2, contentHash: 'a'.repeat(64), commandHash: 'b'.repeat(64), requestKey: key, currency: 'INR', reviewStatus: 'submitted' as const, version: 1, submittedAt: now, reviewStartedAt: null, reviewCompletedAt: null, createdAt: now, updatedAt: now };
beforeEach(() => { mocks.user.mockResolvedValue({ id: owner }); mocks.admin.mockResolvedValue({ id: other }); mocks.submit.mockResolvedValue(row); mocks.review.mockResolvedValue({ ...row, reviewStatus: 'under_review' }); });
function request(body: unknown, origin = 'https://example.test', method = 'POST') { return new Request('https://example.test/api/workspace/course-drafts/'+draftId+'/submit', { method, headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body) }); }
const command = { expectedDraftVersion: 2, requestKey: key };
it('uses authenticated identities, private responses and explicit mutation verbs', async () => {
  const response = await POST(request(command), { params: Promise.resolve({ id: draftId }) }); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store'); expect(mocks.submit).toHaveBeenCalledWith(owner, draftId, command);
  const body = await response.json(); expect(body.submission).toEqual(JSON.parse(JSON.stringify(submissionReceipt(row)))); expect(JSON.stringify(body)).not.toContain(owner); expect(JSON.stringify(body)).not.toContain(profileId); expect(JSON.stringify(body)).not.toContain(content.title);
  const admin = { action: 'start_review', expectedStatus: 'submitted', requestKey: key }; expect((await PATCH(request(admin,undefined,'PATCH'), { params: Promise.resolve({ id }) })).status).toBe(200); expect(mocks.review).toHaveBeenCalledWith(other,id,admin);
});
it('anonymous, persisted non-admin and cross-origin commands never invoke mutation services', async () => {
  mocks.user.mockResolvedValue(null); expect((await POST(request(command),{params:Promise.resolve({id:draftId})})).status).toBe(401); mocks.admin.mockResolvedValue(null); expect((await PATCH(request(command,undefined,'PATCH'),{params:Promise.resolve({id})})).status).toBe(403);
  mocks.user.mockResolvedValue({id:owner}); expect((await POST(request(command,'https://evil.test'),{params:Promise.resolve({id:draftId})})).status).toBe(403); expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled();
});
it('malformed identifiers, JSON/content type and oversize bodies fail safely before mutation', async () => {
  expect((await POST(request(command),{params:Promise.resolve({id:'malformed'})})).status).toBe(404);
  for (const req of [new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:'{'}),new Request('https://example.test',{method:'POST',body:'plain'})]) expect((await POST(req,{params:Promise.resolve({id:draftId})})).status).toBe(400);
  expect((await POST(request({payload:'x'.repeat(16385)}),{params:Promise.resolve({id:draftId})})).status).toBe(413); expect(mocks.submit).not.toHaveBeenCalled();
});
it.each(['stale_draft','review_in_progress','already_approved','no_changes_to_resubmit','conflict'] as const)('returns controlled %s without private error text', async code => { mocks.submit.mockRejectedValue(new ReviewError(code)); const response=await POST(request(command),{params:Promise.resolve({id:draftId})}); expect(response.status).toBe(409); expect((await response.json()).code).toBe(code); });
it('DB outage returns bounded unavailable and preserved-answer copy', async () => { mocks.review.mockRejectedValue(new Error('private SQL credential')); const response=await PATCH(request({},undefined,'PATCH'),{params:Promise.resolve({id})}); expect(response.status).toBe(503); const body=await response.json(); expect(body.code).toBe('unavailable'); expect(body.error).toContain('retained'); expect(JSON.stringify(body)).not.toMatch(/SQL|credential/); });
it('creator-visible event receipt omits all admin identities, request keys and hashes', () => {
  const event = eventReceipt({ id, submissionId:id, actorAdminUserId:other, action:'changes_requested', fromStatus:'under_review', toStatus:'changes_requested', transitionVersion:3, feedback:'Please clarify learning outcomes.', note:null, requestKey:key, commandHash:'c'.repeat(64), createdAt:now });
  for(const field of ['actorAdminUserId','id','submissionId','requestKey','commandHash']) expect(event).not.toHaveProperty(field);
});
