import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { reviewQueue } from '@/lib/workspace/review/repository';
import { REVIEW_STATUSES, reviewLabels, type ReviewStatus } from '@/lib/workspace/review/model';
import { pageNumber } from '@/lib/workspace/creator/http';
import { PageHeading } from '@/components/workspace/creator/Content';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Workspace Course Reviews', robots: { index: false, follow: false } };
export default async function CourseReviews({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login');
  const params = await searchParams; let state;
  try {
    if (params.status && !(REVIEW_STATUSES as readonly string[]).includes(params.status)) throw new Error('invalid filter');
    state = await reviewQueue(admin.id, params.status as ReviewStatus | undefined, pageNumber(params.page));
  } catch { return <main className="ph-no-capture"><h1 className="text-3xl">Course reviews unavailable</h1><p role="status" className="mt-4">We could not verify access or load the review queue. Please try again.</p></main>; }
  const page = pageNumber(params.page); const query = params.status ? `status=${params.status}&` : '';
  return <main className="ph-no-capture space-y-8"><PageHeading eyebrow="Workspace · internal review" title="Course Reviews" description="Review submitted, immutable course versions. AirBharath approval is separate from creator eligibility, publication and regulatory approval." /><nav aria-label="Review status filters" className="flex flex-wrap gap-4 text-sm"><Link aria-current={!params.status ? 'page' : undefined} href="/admin/workspace/course-reviews">Open reviews</Link>{REVIEW_STATUSES.map(status => <Link key={status} aria-current={params.status === status ? 'page' : undefined} href={`?status=${status}`}>{reviewLabels[status]}</Link>)}</nav>{!state.rows.length ? <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">No submissions in this view.</p> : <div className="divide-y divide-border rounded-xl border border-border">{state.rows.map(({ submission: row, creatorName }) => <Link key={row.id} href={`/admin/workspace/course-reviews/${row.id}`} className="block p-6 hover:bg-muted/40"><p className="text-xs text-primary">Submission {row.submissionNumber} · {reviewLabels[row.reviewStatus]}</p><h2 className="mt-2 font-outfit text-xl">{row.title}</h2><p className="mt-3 text-sm text-muted-foreground">{creatorName || 'Creator'} · Submitted {formatWorkspaceDate(row.submittedAt)} IST{row.reviewStartedAt && ` · Review started ${formatWorkspaceDate(row.reviewStartedAt)} IST`}</p></Link>)}</div>}<nav aria-label="Review pages" className="flex gap-6 text-sm">{page > 1 && <Link href={`?${query}page=${page - 1}`}>← Previous</Link>}{state.hasNext && page < 500 && <Link href={`?${query}page=${page + 1}`}>Next →</Link>}</nav></main>;
}
