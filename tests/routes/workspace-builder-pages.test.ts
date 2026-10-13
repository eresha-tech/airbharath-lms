import { createElement } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks=vi.hoisted(()=>({state:vi.fn(),history:vi.fn(),read:vi.fn(),admin:vi.fn(),inspect:vi.fn(),list:vi.fn(),summaries:vi.fn(),draft:vi.fn()}));
vi.mock('@/lib/workspace/creator/pages',()=>({requireCreatorWorkspace:mocks.state}));
vi.mock('@/lib/workspace/review/repository',()=>({workspaceReviews:()=>({history:mocks.history})}));
vi.mock('@/lib/workspace/creator/repository',()=>({workspaceContent:()=>({read:mocks.draft})}));
vi.mock('@/lib/workspace/builder/repository',()=>({workspaceBuilder:()=>({read:mocks.read}),readBuildSummaries:mocks.summaries,inspectBuild:mocks.inspect,inspectBuilds:mocks.list}));
vi.mock('@/lib/admin-authorization',()=>({getAuthorizedAdminSession:mocks.admin}));
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');},redirect:(path:string)=>{throw new Error('REDIRECT:'+path);},useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
import Build from '@/app/(workspace)/workspace/(creator)/courses/[id]/build/page';
import Owned from '@/app/(workspace)/workspace/(creator)/courses/[id]/page';
import List from '@/app/(admin)/admin/workspace/course-builds/page';
import Detail from '@/app/(admin)/admin/workspace/course-builds/[id]/page';
import { metadata as creatorMeta } from '@/app/(workspace)/workspace/(creator)/courses/[id]/build/page';
import { metadata as adminMeta } from '@/app/(admin)/admin/workspace/course-builds/[id]/page';
import { CourseBuilder } from '@/components/workspace/builder/Builder';
import { DraftList } from '@/components/workspace/creator/Content';
import { BuildError } from '@/lib/workspace/builder/model';
import type { BuildTree } from '@/lib/workspace/builder/service';
import { content,evidence,owner,other,key,draftId,profileId,now } from './workspace-creator-fixtures';
import { creatorCapabilities } from '@/lib/workspace/creator/model';
let tree:BuildTree;let state:ReturnType<typeof creatorCapabilities>;
const draft={...content,id:draftId,userId:owner,creatorProfileId:profileId,version:3,currency:'INR',status:'draft' as const,requestKey:key,creationHash:'a'.repeat(64),createdAt:now,updatedAt:now};
beforeEach(()=>{
 tree={project:{id:key,draftId,approvedSubmissionId:other,status:'building',version:1,createdAt:now,updatedAt:now},source:{...content,id:other,currency:'INR',submissionNumber:1,approvedAt:now},modules:[{id:profileId,title:'Approved outline module',description:'Approved scope',position:0,version:1,createdAt:now,updatedAt:now}],lessons:[{id:owner,moduleId:profileId,title:'Saved private lesson',summary:'Private plan',position:0,version:1,createdAt:now,updatedAt:now}],canEdit:true,inspection:{creatorName:'Synthetic Creator',creatorStatus:'enabled'}};
 state=creatorCapabilities(evidence,now,'test');mocks.state.mockImplementation(async()=>({user:{id:owner},capabilities:state}));mocks.read.mockResolvedValue(tree);mocks.admin.mockResolvedValue({id:other});mocks.inspect.mockResolvedValue({...tree,canEdit:false});mocks.list.mockResolvedValue({rows:[{project:tree.project,source:tree.source,creatorName:'Synthetic Creator',moduleCount:1,lessonCount:1}],hasNext:false});mocks.summaries.mockResolvedValue({available:true,rows:{}});mocks.draft.mockResolvedValue(draft);mocks.history.mockResolvedValue({submissions:[{submission:{...tree.source,draftId,version:3,reviewStatus:'approved',submittedAt:now},events:[]}],hasNext:false});
});
it('creator shell renders private approved context, actual counts and practical responsive editor',async()=>{
 const html=renderToStaticMarkup(await Build({params:Promise.resolve({id:draftId})}));expect(mocks.read).toHaveBeenCalledWith(owner,draftId);for(const text of ['ph-no-capture','Building','Approved submission #','Course structure','Saved private lesson','1 modules','1 lessons','Add Module','Add Lesson','Final course content will require a separate publication review','Major changes','Approved course reference','Tentative price'])expect(html).toContain(text);expect(html).toContain('xl:grid-cols');expect(html).not.toMatch(/>Publish<|Upload|Checkout|Completion percentage|DGCA/);expect(creatorMeta.robots).toEqual({index:false,follow:false});
});
it('expired and admin build remains readable with no mutation controls',()=>{
 for(const admin of [false,true]){const html=renderToStaticMarkup(createElement(CourseBuilder,{initial:{...tree,canEdit:false},admin}));expect(html).toContain('Saved private lesson');expect(html).not.toContain('Add Module');expect(html).not.toContain('Add Lesson');expect(html).not.toContain('Delete empty module');expect(html).not.toContain('Move module');expect(html).toContain(admin?'Read-only admin inspection':'Editing requires active creator access');}
});
it('approved owned course starts once, existing project continues, unavailable schema never advertises a false empty build',async()=>{
 let html=renderToStaticMarkup(await Owned({params:Promise.resolve({id:draftId})}));expect(html).toContain('Start Building Course');expect(html).toContain('Approved — Ready to Build');mocks.summaries.mockResolvedValue({available:true,rows:{[draftId]:{projectId:key,moduleCount:1,lessonCount:1}}});html=renderToStaticMarkup(await Owned({params:Promise.resolve({id:draftId})}));expect(html).toContain('Continue Building Course');expect(html).not.toContain('Start Building Course');mocks.summaries.mockResolvedValue({available:false,rows:{}});html=renderToStaticMarkup(await Owned({params:Promise.resolve({id:draftId})}));expect(html).toContain('Course Builder is temporarily unavailable');expect(html).not.toContain('Start Building Course');
});
it('library has derived Building and Approved ready states without any public course link',()=>{
 const ready=renderToStaticMarkup(createElement(DraftList,{drafts:[draft],editable:true,reviewStatuses:{[draftId]:'approved'}}));expect(ready).toContain('Approved — Ready to Build');const building=renderToStaticMarkup(createElement(DraftList,{drafts:[draft],editable:true,reviewStatuses:{[draftId]:'approved'},builds:{[draftId]:{projectId:key,moduleCount:1,lessonCount:1}}}));expect(building).toContain(`/workspace/courses/${draftId}/build`);expect(building).toContain('Continue Building');expect(building).not.toMatch(/href="\/courses\/|Published|Live|Selling/);
});
it('missing project can start only from owned approved history; expired creator cannot create; malformed IDs stop',async()=>{
 mocks.read.mockRejectedValue(new BuildError('not_found'));let html=renderToStaticMarkup(await Build({params:Promise.resolve({id:draftId})}));expect(html).toContain('Start Building Course');state=creatorCapabilities(evidence,evidence.membership.endsAt,'test');html=renderToStaticMarkup(await Build({params:Promise.resolve({id:draftId})}));expect(html).not.toContain('Start Building Course');mocks.history.mockResolvedValue({submissions:[],hasNext:false});await expect(Build({params:Promise.resolve({id:draftId})})).rejects.toThrow('NOT_FOUND');await expect(Build({params:Promise.resolve({id:'invalid'})})).rejects.toThrow('NOT_FOUND');
});
it('persisted admin list/detail include owner, counts and timestamps and never edit; anonymous or demoted access fails',async()=>{
 const list=renderToStaticMarkup(await List({searchParams:Promise.resolve({})}));expect(list).toContain('Synthetic Creator');expect(list).toContain('1 modules');const detail=renderToStaticMarkup(await Detail({params:Promise.resolve({id:key})}));expect(detail).toContain('Synthetic Creator');expect(detail).toContain('Created');expect(detail).toContain('Read-only admin inspection');expect(detail).not.toContain('Add Module');expect(detail).not.toContain('Publish');expect(adminMeta.robots).toEqual({index:false,follow:false});mocks.admin.mockResolvedValue(null);await expect(List({searchParams:Promise.resolve({})})).rejects.toThrow('REDIRECT:/login');mocks.admin.mockResolvedValue({id:other});mocks.inspect.mockRejectedValue(new BuildError('forbidden'));expect(renderToStaticMarkup(await Detail({params:Promise.resolve({id:key})}))).toContain('could not verify access');
});
it('unknown creator/admin errors expose safe unavailable state, not SQL',async()=>{
 mocks.read.mockRejectedValue(new Error('SQL private secret'));mocks.inspect.mockRejectedValue(new Error('SQL private secret'));for(const html of [renderToStaticMarkup(await Build({params:Promise.resolve({id:draftId})})),renderToStaticMarkup(await Detail({params:Promise.resolve({id:key})}))]){expect(html).toContain('unavailable');expect(html).not.toMatch(/SQL|secret/);}
});
