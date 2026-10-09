import Link from 'next/link';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { workspaceContent } from '@/lib/workspace/creator/repository';
import { pageNumber } from '@/lib/workspace/creator/http';
import { DraftList, PageHeading, actionClass } from '@/components/workspace/creator/Content';
export default async function MyCourses({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const context = await requireCreatorWorkspace(); const page = pageNumber((await searchParams).page); const state = page === 1 ? context : await workspaceContent().overview(context.user.id, page);
  return <div className="space-y-8"><PageHeading eyebrow="Your course library" title="My Courses" description="Owned, private drafts. Publication and course selling are not available in Basic Workspace.">{state.capabilities.canEditWorkspace && <Link className={actionClass} href="/workspace/courses/new">Create Course</Link>}</PageHeading><p className="text-sm text-muted-foreground">{state.total} private {state.total === 1 ? 'draft' : 'drafts'}</p><DraftList drafts={state.drafts} editable={state.capabilities.canEditWorkspace} reviewStatuses={state.reviewStatuses} /><nav aria-label="Draft pages" className="flex gap-6 text-sm">{page > 1 && <Link href={`/workspace/courses?page=${page - 1}`}>← Previous</Link>}{state.hasNext && page < 500 && <Link href={`/workspace/courses?page=${page + 1}`}>Next →</Link>}</nav></div>;
}
