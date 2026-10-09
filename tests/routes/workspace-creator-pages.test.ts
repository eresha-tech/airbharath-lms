import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ state: vi.fn(), content: vi.fn(), admin: vi.fn(), inspect: vi.fn() }));
vi.mock('@/lib/workspace/review/repository', () => ({ workspaceReviews: () => ({ history: async () => ({ submissions: [], hasNext: false }) }) }));
vi.mock('@/lib/workspace/creator/pages', () => ({ requireCreatorWorkspace: mocks.state }));
vi.mock('@/lib/workspace/creator/repository', () => ({ workspaceContent: () => ({ read: mocks.content }), inspectDrafts: mocks.inspect }));
vi.mock('@/lib/workspace/creator/http', () => ({ pageNumber: (value?: string) => Number(value || 1) }));
vi.mock('@/lib/admin-authorization', () => ({ getAuthorizedAdminSession: mocks.admin }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); }, notFound: () => { throw new Error('NOT_FOUND'); }, useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), usePathname: () => '/workspace/dashboard' }));
import Dashboard from '@/app/(user)/workspace/(creator)/dashboard/page';
import NewDraft from '@/app/(user)/workspace/(creator)/courses/new/page';
import OwnedDraft from '@/app/(user)/workspace/(creator)/courses/[id]/page';
import Profile from '@/app/(user)/workspace/(creator)/profile/page';
import Layout from '@/app/(user)/workspace/(creator)/layout';
import AdminList from '@/app/(admin)/admin/workspace/course-drafts/page';
import AdminDetail from '@/app/(admin)/admin/workspace/course-drafts/[id]/page';
import { CreatorError, creatorCapabilities } from '@/lib/workspace/creator/model';
import { content, evidence, now, owner, draftId, profileId, profile } from './workspace-creator-fixtures';
const row = { ...content, id: draftId, userId: owner, creatorProfileId: profileId, version: 5, currency: 'INR', status: 'draft', createdAt: now, updatedAt: now };
let state: Record<string, unknown>;
beforeEach(() => { state = { user: { id: owner, fullName: 'Account suggestion' }, profileId, evidence, capabilities: creatorCapabilities(evidence, now, 'test'), planName: 'Quarterly', drafts: [row], total: 1, hasNext: false, details: { ...profile, version: 1 } }; mocks.state.mockImplementation(async () => state); mocks.content.mockResolvedValue(row); mocks.admin.mockResolvedValue(null); mocks.inspect.mockResolvedValue([{ draft: row, creatorName: 'Creator', creatorStatus: 'enabled' }]); });
it('dashboard has actual count, membership dates, early access notice, draft links and no invented analytics', async () => {
  const html = renderToStaticMarkup(await Dashboard()); expect(html).toContain('Early Access Active'); expect(html).toContain('Your paid membership term begins on 9 November 2026.'); expect(html).toContain('Quarterly'); expect(html).toContain('Create Course'); expect(html).toContain(content.title); expect(html).not.toMatch(/Revenue|Sales|Payout|Completion rate|DGCA/);
});
it('expired creator sees retained profile/draft content without an editor or create CTA', async () => {
  state.capabilities = creatorCapabilities(evidence, evidence.membership.endsAt, 'test');
  expect(renderToStaticMarkup(await Dashboard())).not.toContain('Create Course'); const html = renderToStaticMarkup(await OwnedDraft({ params: Promise.resolve({ id: draftId }) })); expect(html).toContain(content.description); expect(html).toContain('Renew your Workspace membership'); expect(html).not.toContain('<form'); const profileHtml = renderToStaticMarkup(await Profile()); expect(profileHtml).toContain(profile.shortBio); expect(profileHtml).not.toContain('Save Profile'); await expect(NewDraft()).rejects.toThrow('REDIRECT:/workspace/courses');
});
it('editor is bounded, explicitly saved and labels price as tentative; profile suggestion is not persisted', async () => {
  const html = renderToStaticMarkup(await NewDraft()); for (const text of ['Course Basics', 'Target Learner', 'Learning Outcomes', 'Course Outline', 'Tentative Price', 'Save Draft', 'separate AirBharath review']) expect(html).toContain(text); expect(html).not.toMatch(/<button[^>]*>[^<]*(?:Publish|Approve|Checkout|Upload)/i);
  state.details = null; const profileHtml = renderToStaticMarkup(await Profile()); expect(profileHtml).toContain('Account suggestion'); expect(profileHtml).toContain('Nothing is saved until'); expect(profileHtml).toContain('Save Profile');
});
it('owned draft page uses server-derived owner and cross-owner/malformed IDs render not found', async () => {
  await OwnedDraft({ params: Promise.resolve({ id: draftId }) }); expect(mocks.content).toHaveBeenCalledWith(owner, draftId);
  mocks.content.mockRejectedValue(new CreatorError('not_found')); await expect(OwnedDraft({ params: Promise.resolve({ id: draftId }) })).rejects.toThrow('NOT_FOUND'); await expect(OwnedDraft({ params: Promise.resolve({ id: 'invalid' }) })).rejects.toThrow('NOT_FOUND');
});
it('shell preserves My Learning and membership status, highlights current navigation and explains retention', async () => {
  state.capabilities = creatorCapabilities(evidence, evidence.membership.endsAt, 'test'); const html = renderToStaticMarkup(await Layout({ children: 'Synthetic content' })); expect(html).toContain('My Learning'); expect(html).toContain('/workspace/member'); expect(html).toContain('aria-current="page"'); expect(html).toContain('ph-no-capture'); expect(html).toContain('Your Workspace membership has expired');
});
it('admin draft list/detail require persisted authorization; inspection has no write actions and handles failure', async () => {
  await expect(AdminList({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT:/login'); await expect(AdminDetail({ params: Promise.resolve({ id: draftId }) })).rejects.toThrow('REDIRECT:/login'); expect(mocks.inspect).not.toHaveBeenCalled();
  mocks.admin.mockResolvedValue({ id: owner }); const html = renderToStaticMarkup(await AdminDetail({ params: Promise.resolve({ id: draftId }) })); expect(html).toContain('Creator'); expect(html).toContain('Owner account'); expect(html).toContain(content.description); expect(html).not.toContain('<form'); mocks.inspect.mockRejectedValue(new Error('private SQL credential')); const failure = renderToStaticMarkup(await AdminList({ searchParams: Promise.resolve({}) })); expect(failure).toContain('Draft inspection is unavailable'); expect(failure).not.toContain('SQL');
});
