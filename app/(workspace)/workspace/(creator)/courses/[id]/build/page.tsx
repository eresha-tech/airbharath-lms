import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { ReviewError } from '@/lib/workspace/review/model';
import { workspaceReviews } from '@/lib/workspace/review/repository';
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
      // This scoped history call distinguishes an owned approved course with no
      // build yet from a guessed/cross-user draft identifier.
      let history;
      try { history = await workspaceReviews().history(state.user.id, id); }
      catch (historyError) {
        if (historyError instanceof ReviewError && historyError.code === 'not_found') notFound();
        return <div className="ph-no-capture"><h1>Course Builder unavailable</h1><p role="status">We could not verify the approved course. Please try again.</p><Link href={`/workspace/courses/${id}`} className="mt-4 inline-flex min-h-11 items-center text-primary underline">Reload course overview</Link></div>;
      }
      const source = history.submissions[0]?.submission;
      if (source?.reviewStatus !== 'approved') notFound();
      return <div className="ph-no-capture space-y-6"><Link className="text-primary underline" href={`/workspace/courses/${id}`}>Course overview</Link><h1 className="font-outfit text-3xl">{source.title}</h1><p className="text-sm leading-7 text-muted-foreground">{BUILD_APPROVAL_COPY}</p>{state.capabilities.canEditWorkspace ? <StartBuild draftId={id} submissionId={source.id} /> : <p>Starting a build requires active creator access. Your approved course is retained.</p>}</div>;
    }
    return <div className="ph-no-capture space-y-4"><h1 className="font-outfit text-3xl">Course Builder unavailable</h1><p role="status">We could not verify creator access or load this build. Your saved content is retained. Please try again.</p><Link className="text-primary underline" href={`/workspace/courses/${id}`}>Course overview</Link></div>;
  }
}
