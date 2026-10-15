import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { reviewDetail } from '@/lib/workspace/review/repository';
import { categoryLabel } from '@/lib/workspace/creator/model';
import { ReviewError, reviewLabels } from '@/lib/workspace/review/model';
import { UUID, formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import { DraftView, PageHeading } from '@/components/workspace/creator/Content';
import { ReviewHistory } from '@/components/workspace/review/History';
import { AdminReviewActions } from '@/components/workspace/review/Actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Course Review', robots: { index: false, follow: false } };
export default async function CourseReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login'); const { id } = await params; if (!UUID.test(id)) notFound();
  const state = await reviewDetail(admin.id, id).catch(error => { if (error instanceof ReviewError && error.code === 'not_found') notFound(); return null; });
  if (!state) return <div className="ph-no-capture"><h1 className="text-3xl">Course review unavailable</h1><p role="status" className="mt-4">We could not verify access or load this review. Please try again.</p><Link href="/admin/workspace/course-reviews" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Reload saved records</Link></div>;
  const row = state.submission;
  return <div className="ph-no-capture space-y-8"><PageHeading eyebrow={`Workspace · submission ${row.submissionNumber}`} title={reviewLabels[row.reviewStatus]} description="Internal AirBharath course review only. Approval does not publish the course, approve its selling price or represent DGCA, airline, government or regulatory approval." /><section className="rounded-xl border border-border p-6"><h2 className="font-outfit text-xl">Creator context</h2><p className="mt-3 font-medium">{state.professional?.displayName || state.creatorName || 'Creator'}</p><p className="mt-2 text-sm text-muted-foreground">Creator identity: {state.creatorStatus}. Current professional profile for context; submitted course content below is immutable.</p>{state.professional && <><p className="mt-3 text-sm">{state.professional.professionalHeadline}</p><p className="mt-2 text-sm text-muted-foreground">{categoryLabel(state.professional.primaryAviationCategory)}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{state.professional.shortBio}</p></>}<p className="mt-4 text-xs text-muted-foreground">Draft version {row.draftVersion} · Submitted {formatWorkspaceDate(row.submittedAt)} IST{row.reviewStartedAt && ` · Started ${formatWorkspaceDate(row.reviewStartedAt)} IST`}{row.reviewCompletedAt && ` · Completed ${formatWorkspaceDate(row.reviewCompletedAt)} IST`}</p></section><DraftView draft={{ ...row, version: row.draftVersion }} snapshot /><ReviewHistory rows={[{ ...row, events: state.events }]} /><AdminReviewActions key={`${row.id}:${row.reviewStatus}`} id={row.id} status={row.reviewStatus} /></div>;
}
