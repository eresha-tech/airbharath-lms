import { notFound } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { workspaceContent } from '@/lib/workspace/creator/repository';
import { CreatorError, type DraftContent } from '@/lib/workspace/creator/model';
import { UUID } from '@/lib/workspace/eligibility/model';
import { DraftView, PageHeading } from '@/components/workspace/creator/Content';
import { DraftEditor } from '@/components/workspace/creator/DraftEditor';
export default async function OwnedDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const state = await requireCreatorWorkspace(); const { id } = await params; if (!UUID.test(id)) notFound();
  const draft = await workspaceContent().read(state.user.id, id).catch(error => { if (error instanceof CreatorError && error.code === 'not_found') notFound(); throw error; });
  const content: DraftContent = { title: draft.title, category: draft.category as DraftContent['category'], description: draft.description, targetLearner: draft.targetLearner, learningOutcomes: draft.learningOutcomes, outline: draft.outline, tentativePricePaise: draft.tentativePricePaise };
  return <div className="space-y-8"><PageHeading eyebrow="Private course draft" title={state.capabilities.canEditWorkspace ? 'Shape your course.' : 'Your retained course draft.'} description={state.capabilities.canEditWorkspace ? 'Edit and explicitly save your course basics. Publication will require a separate AirBharath review.' : 'Renew your Workspace membership to continue editing your course drafts. Renewal checkout is not available yet.'} />{state.capabilities.canEditWorkspace ? <DraftEditor initial={{ id: draft.id, version: draft.version, content }} /> : <DraftView draft={draft} />}</div>;
}
