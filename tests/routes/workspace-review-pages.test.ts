vi.mock('@/lib/workspace/admin/lists',()=>({adminList:mocks.adminList}));
import {adminListFixture} from './workspace-admin-list-fixtures';
vi.mock('@/lib/workspace/builder/repository', () => ({ readBuildSummaries: async () => ({ available: true, rows: {} }) }));
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks=vi.hoisted(()=>({adminList:vi.fn(),admin:vi.fn(),queue:vi.fn(),detail:vi.fn(),state:vi.fn(),draft:vi.fn(),history:vi.fn()}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:mocks.admin}));
vi.mock('@/lib/workspace/review/repository',()=>({reviewQueue:mocks.queue,reviewDetail:mocks.detail,workspaceReviews:()=>({history:mocks.history})}));
vi.mock('@/lib/workspace/creator/pages',()=>({requireCreatorWorkspace:mocks.state}));
vi.mock('@/lib/workspace/creator/repository',()=>({workspaceContent:()=>({read:mocks.draft})}));
vi.mock('@/lib/workspace/creator/http',()=>({pageNumber:(value?:string)=>Number(value||1)}));
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('REDIRECT:'+path);},notFound:()=>{throw new Error('NOT_FOUND');},useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}));
import Queue from '@/app/(admin)/admin/workspace/course-reviews/page';
import Detail from '@/app/(admin)/admin/workspace/course-reviews/[id]/page';
import Owned from '@/app/(workspace)/workspace/(creator)/courses/[id]/page';
import Courses from '@/app/(workspace)/workspace/(creator)/courses/page';
import { ReviewError, type ReviewStatus } from '@/lib/workspace/review/model';
import { creatorCapabilities } from '@/lib/workspace/creator/model';
import { content, evidence, owner, other, draftId, key, now, profileId, profile } from './workspace-creator-fixtures';
let status: ReviewStatus;let capability: ReturnType<typeof creatorCapabilities>;
const draft={...content,id:draftId,userId:owner,creatorProfileId:profileId,version:3,currency:'INR',status:'draft',createdAt:now,updatedAt:now};
function submission(){return{...content,id:key,draftId,userId:owner,creatorProfileId:profileId,submissionNumber:1,draftVersion:2,reviewStatus:status,submittedAt:now,reviewStartedAt:status==='submitted'?null:now,reviewCompletedAt:status==='approved'||status==='changes_requested'?now:null};}
function events(){return status==='changes_requested'?[{id:other,actorAdminUserId:other,submissionId:key,action:'changes_requested',feedback:'Please clarify the target learners.',note:null,createdAt:now}]:[];}
beforeEach(()=>{mocks.adminList.mockResolvedValue(adminListFixture());status='submitted';capability=creatorCapabilities(evidence,now,'test');mocks.admin.mockResolvedValue({id:other});mocks.state.mockImplementation(async()=>({user:{id:owner},capabilities:capability,drafts:[draft],total:1,hasNext:false,reviewStatuses:{[draftId]:status}}));mocks.draft.mockResolvedValue(draft);mocks.history.mockImplementation(async()=>({submissions:[{submission:submission(),events:events()}],hasNext:false}));mocks.queue.mockImplementation(async()=>({rows:[{submission:submission(),creatorName:'Synthetic Creator'}],hasNext:false}));mocks.detail.mockImplementation(async()=>({submission:{...submission(),title:'Immutable reviewed title'},creatorName:'Synthetic Creator',creatorStatus:'suspended',professional:profile,events:events()}));});
it.each(['submitted','under_review','approved','changes_requested'] as const)('legacy %s history remains readable without blocking Creator editing',async state=>{status=state;const html=renderToStaticMarkup(await Owned({params:Promise.resolve({id:draftId})}));expect(html).toContain('Legacy proposal and review history');expect(html).toContain('Save Draft');expect(html).toContain('Create course');expect(html).not.toContain('Submit course idea for approval');});
it('expired access retains history without an editor',async()=>{status='changes_requested';capability=creatorCapabilities(evidence,evidence.membership.endsAt,'test');const html=renderToStaticMarkup(await Owned({params:Promise.resolve({id:draftId})}));expect(html).toContain('Please clarify the target learners.');expect(html).not.toContain('Save Draft');});
it.each(['submitted','under_review','changes_requested','approved'] as const)('Admin %s review is immutable legacy inspection without approval actions',async state=>{status=state;const html=renderToStaticMarkup(await Detail({params:Promise.resolve({id:key})}));expect(html).toContain('Immutable reviewed title');expect(html).toContain('Legacy review is read only');expect(html).not.toContain('Approve course idea');expect(html).not.toContain('Request Changes');});
it('Creator library uses current build state rather than obsolete pending review',async()=>{const html=renderToStaticMarkup(await Courses({searchParams:Promise.resolve({})}));expect(html).toContain('Draft');expect(html).not.toContain('Awaiting idea approval');});
it('anonymous/demoted screens, unavailable service and malformed/missing details fail safely',async()=>{mocks.admin.mockResolvedValue(null);await expect(Queue({searchParams:Promise.resolve({})})).rejects.toThrow('REDIRECT:/login');await expect(Detail({params:Promise.resolve({id:key})})).rejects.toThrow('REDIRECT:/login');expect(mocks.queue).not.toHaveBeenCalled();mocks.admin.mockResolvedValue({id:other});await expect(Detail({params:Promise.resolve({id:'invalid'})})).rejects.toThrow('NOT_FOUND');mocks.detail.mockRejectedValue(new ReviewError('not_found'));await expect(Detail({params:Promise.resolve({id:key})})).rejects.toThrow('NOT_FOUND');mocks.detail.mockRejectedValue(new Error('SQL private secret'));const html=renderToStaticMarkup(await Detail({params:Promise.resolve({id:key})}));expect(html).toContain('Course review unavailable');expect(html).not.toMatch(/SQL|secret/);});
