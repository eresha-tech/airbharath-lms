import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { workspaceBuilder } from '@/lib/workspace/builder/repository';
import { workspacePublishing } from '@/lib/workspace/publishing/repository';
import { Publishing } from '@/components/workspace/publishing/Publishing';
import { UUID } from '@/lib/workspace/eligibility/model';
export const dynamic='force-dynamic';
export const metadata={title:'Course Publishing',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const state=await requireCreatorWorkspace(),{id}=await params;if(!UUID.test(id))notFound();const tree=await workspaceBuilder().read(state.user.id,id);return <Publishing initial={await workspacePublishing().read(state.user.id,tree.project.id)} studioHref={`/workspace/courses/${id}/build`}/>;}
