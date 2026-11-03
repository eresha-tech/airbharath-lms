import { redirect } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { PageHeading } from '@/components/workspace/creator/Content';
import { DraftEditor } from '@/components/workspace/creator/DraftEditor';
export default async function NewCourseDraft() {
  const state = await requireCreatorWorkspace(); if (!state.capabilities.canEditWorkspace) redirect('/workspace/courses');
  return <div className="space-y-8"><PageHeading eyebrow="A new course starts here" title="Propose a course idea" description="Describe your course, its learners and outcomes. Save your course idea, then send it for approval before you build lessons." /><DraftEditor /></div>;
}
