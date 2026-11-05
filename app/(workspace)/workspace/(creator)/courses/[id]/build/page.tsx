import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import {CreatorError} from '@/lib/workspace/creator/model';
import {workspaceContent} from '@/lib/workspace/creator/repository';
import { workspaceBuilder } from '@/lib/workspace/builder/repository';
import { BuildError, BUILD_APPROVAL_COPY } from '@/lib/workspace/builder/model';
import { UUID } from '@/lib/workspace/eligibility/model';
import { StartBuild } from '@/components/workspace/builder/StartBuild';
import { CourseBuilder } from '@/components/workspace/builder/Builder';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Course Builder', robots: { index: false, follow: false } };
export default async function BuildPage({ params }: { params: Promise<{ id: string }> }) {
  const state = await requireCreatorWorkspace(); const { id } = await params; if (!UUID.test(id)) notFound();
  try { return <CourseBuilder initial={await workspaceBuilder().read(state.user.id, id)} />; }
  catch (error) {
    if (error instanceof BuildError && error.code === 'not_found') {
      const source=await workspaceContent().read(state.user.id,id).catch(e=>{if(e instanceof CreatorError&&e.code==='not_found')notFound();throw e;});
      return <div className="ph-no-capture space-y-6"><Link className="text-primary underline" href={`/workspace/courses/${id}`}>Course overview</Link><h1 className="font-outfit text-3xl">{source.title}</h1><p className="text-sm leading-7 text-muted-foreground">{BUILD_APPROVAL_COPY}</p>{state.capabilities.canEditWorkspace ? <StartBuild draftId={id} /> : <p>Starting a build requires active creator access. Your saved course is retained.</p>}</div>;
    }
    return <div className="ph-no-capture space-y-4"><h1 className="font-outfit text-3xl">Course Builder unavailable</h1><p role="status">We could not verify creator access or load this build. Your saved content is retained. Please try again.</p><Link className="text-primary underline" href={`/workspace/courses/${id}`}>Course overview</Link></div>;
  }
}
