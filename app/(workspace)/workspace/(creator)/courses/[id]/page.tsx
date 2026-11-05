import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireCreatorWorkspace} from '@/lib/workspace/creator/pages';
import {workspaceContent} from '@/lib/workspace/creator/repository';
import {readBuildSummaries} from '@/lib/workspace/builder/repository';
import {CreatorError,type DraftContent} from '@/lib/workspace/creator/model';
import {UUID} from '@/lib/workspace/eligibility/model';
import {PageHeading,DraftView} from '@/components/workspace/creator/Content';
import {DraftEditor} from '@/components/workspace/creator/DraftEditor';
import {StartBuild} from '@/components/workspace/builder/StartBuild';
import {ReviewHistory} from '@/components/workspace/review/History';
import {workspaceReviews} from '@/lib/workspace/review/repository';
export default async function OwnedDraftPage({params}:{params:Promise<{id:string}>;searchParams?:Promise<{historyPage?:string}>}){
 const state=await requireCreatorWorkspace(),{id}=await params;if(!UUID.test(id))notFound();const draft=await workspaceContent().read(state.user.id,id).catch(e=>{if(e instanceof CreatorError&&e.code==='not_found')notFound();throw e;});
 const builds=await readBuildSummaries(state.user.id,[id]),history=await workspaceReviews().history(state.user.id,id);const content:DraftContent={title:draft.title,category:draft.category as DraftContent['category'],description:draft.description,targetLearner:draft.targetLearner,learningOutcomes:draft.learningOutcomes,outline:draft.outline,tentativePricePaise:draft.tentativePricePaise};
 return <div className="ph-no-capture space-y-8"><Link href="/workspace/courses" className="text-sm text-primary underline">My Courses</Link><PageHeading eyebrow="Private course" title={draft.title} description="Build and publish independently. Set your price, preview your course and accept the publishing guidelines."/><section className="space-y-4 rounded-2xl border bg-card p-6">{!builds.available?<p role="status">Course Builder is temporarily unavailable. Please try again.</p>:builds.rows[id]?<Link href={`/workspace/courses/${id}/build`} className="text-primary underline">Open Course Studio</Link>:state.capabilities.canEditWorkspace?<StartBuild draftId={id}/>:<p>Your course is available to read. Active Creator access is required to edit.</p>}</section>{state.capabilities.canEditWorkspace?<DraftEditor initial={{id:draft.id,version:draft.version,content}}/>:<DraftView draft={draft}/>} {!!history.submissions.length&&<details className="rounded-xl border p-5"><summary>Legacy proposal and review history</summary><ReviewHistory rows={history.submissions.map(({submission,events})=>({...submission,events}))}/></details>}</div>;
}
