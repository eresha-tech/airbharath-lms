import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { workspaceBuilder } from '@/lib/workspace/builder/repository';
import { CourseBuilder } from '@/components/workspace/builder/Builder';
import { BuildError } from '@/lib/workspace/builder/model';
import { UUID } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Course Preview', robots: { index: false, follow: false } };
export default async function PreviewPage({params}: {params: Promise<{id:string}>}) {
  const state = await requireCreatorWorkspace(), {id} = await params; if(!UUID.test(id)) notFound();
  try { return <CourseBuilder initial={await workspaceBuilder().read(state.user.id,id)} previewOnly />; }
  catch(error) { if(error instanceof BuildError && error.code === 'not_found') notFound(); return <p role="alert">Private preview unavailable. Return to your saved Studio and retry.</p>; }
}
