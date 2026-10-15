import { redirect } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { PageHeading } from '@/components/workspace/creator/Content';
import { DraftEditor } from '@/components/workspace/creator/DraftEditor';
export default async function NewCourseDraft() {
  const state = await requireCreatorWorkspace(); if (!state.capabilities.canEditWorkspace) redirect('/workspace/courses');
  return <div className="space-y-8"><PageHeading eyebrow="A new course starts here" title="Create Course Proposal" description="Describe your course, its learners and outcomes. Save a private proposal, then submit it for AirBharath review." /><DraftEditor /></div>;
}
