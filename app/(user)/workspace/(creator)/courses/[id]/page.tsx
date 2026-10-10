import { readBuildSummaries } from '@/lib/workspace/builder/repository';
import { StartBuild } from '@/components/workspace/builder/StartBuild';
import { BUILD_APPROVAL_COPY } from '@/lib/workspace/builder/model';
import Link from 'next/link';
import { workspaceReviews } from '@/lib/workspace/review/repository';
import { permitsDraftEdit, reviewLabels } from '@/lib/workspace/review/model';
import { ReviewHistory } from '@/components/workspace/review/History';
import { SubmitReview } from '@/components/workspace/review/Actions';
import { pageNumber } from '@/lib/workspace/creator/http';
import { validateDraft } from '@/lib/workspace/creator/model';
import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { workspaceContent } from '@/lib/workspace/creator/repository';
import { CreatorError, type DraftContent } from '@/lib/workspace/creator/model';
import { UUID } from '@/lib/workspace/eligibility/model';
import { DraftView, PageHeading } from '@/components/workspace/creator/Content';
import { DraftEditor } from '@/components/workspace/creator/DraftEditor';
export default async function OwnedDraftPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ historyPage?: string }> }) {
  const state = await requireCreatorWorkspace(); const { id } = await params; if (!UUID.test(id)) notFound();
  const draft = await workspaceContent().read(state.user.id, id).catch(error => { if (error instanceof CreatorError && error.code === 'not_found') notFound(); throw error; });
  const content: DraftContent = { title: draft.title, category: draft.category as DraftContent['category'], description: draft.description, targetLearner: draft.targetLearner, learningOutcomes: draft.learningOutcomes, outline: draft.outline, tentativePricePaise: draft.tentativePricePaise };
  const historyPage = pageNumber((await searchParams)?.historyPage);
  const history = await workspaceReviews().history(state.user.id, id, historyPage);
  // Page 1 determines the authoritative lock even when browsing older feedback.
  const latest = (historyPage === 1 ? history : await workspaceReviews().history(state.user.id, id)).submissions[0]?.submission;
  const editable = state.capabilities.canEditWorkspace && permitsDraftEdit(latest?.reviewStatus);
  let valid = true; try { validateDraft(content); } catch { valid = false; }
  const builds = latest?.reviewStatus === 'approved' ? await readBuildSummaries(state.user.id, [id]) : null;
  return <div className="ph-no-capture space-y-8"><PageHeading eyebrow="Private course draft" title={editable ? 'Shape your course.' : 'Your retained course draft.'} description={!state.capabilities.canEditWorkspace ? 'Renew your Workspace membership to continue editing your course drafts. Renewal checkout is not available yet.' : editable ? 'Edit and explicitly save your course basics before submitting the saved version for AirBharath review.' : 'This draft is read-only while its review is open or approved.'} /><section className="rounded-xl border border-primary/25 bg-primary/5 p-6"><p className="text-xs uppercase tracking-widest text-primary">AirBharath course review</p><h2 className="mt-3 font-outfit text-xl font-semibold">{latest ? reviewLabels[latest.reviewStatus] : 'Private Draft'}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Approval does not make this course public yet. Course review is separate from membership, publication, selling-price approval and regulatory approval.</p>{editable && valid && <SubmitReview key={`${draft.id}:${draft.version}`} id={draft.id} version={draft.version} resubmit={latest?.reviewStatus === 'changes_requested'} />}{editable && !valid && <p className="mt-3 text-sm">Complete and save a valid draft before submitting.</p>}</section>{latest?.reviewStatus === 'approved' && <section className="rounded-xl border border-primary/25 bg-primary/5 p-6"><p className="text-xs uppercase tracking-widest text-primary">{builds?.rows[id] ? 'Building' : 'Approved — Ready to Build'}</p><h2 className="mt-3 font-outfit text-xl font-semibold">Build your full course.</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{BUILD_APPROVAL_COPY}</p>{!builds?.available ? <p role="status" className="mt-4 text-sm">Course Builder is temporarily unavailable. Your approved submission is retained. Please try again.</p> : builds.rows[id] ? <Link href={`/workspace/courses/${id}/build`} className="mt-5 inline-block font-semibold text-primary underline underline-offset-4">{state.capabilities.canEditWorkspace ? 'Continue Building Course' : 'Read saved course build'}</Link> : state.capabilities.canEditWorkspace ? <StartBuild draftId={id} submissionId={latest.id} /> : <p className="mt-4 text-sm">Starting a course build requires active creator access.</p>}</section>}<ReviewHistory rows={history.submissions.map(({ submission, events }) => ({ ...submission, events }))} /><nav aria-label="Review history pages" className="flex gap-5 text-sm">{historyPage > 1 && <Link href={`?historyPage=${historyPage - 1}`}>← Newer submissions</Link>}{history.hasNext && historyPage < 500 && <Link href={`?historyPage=${historyPage + 1}`}>Older submissions →</Link>}</nav>{editable ? <section id="edit-course" className="space-y-5">{latest?.reviewStatus === 'changes_requested' && <h2 className="font-outfit text-xl">Edit Course</h2>}<DraftEditor initial={{ id: draft.id, version: draft.version, content }} /></section> : <DraftView draft={draft} />}</div>;
}
