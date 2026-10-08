import { redirect } from 'next/navigation';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
import { PageHeading } from '@/components/workspace/creator/Content';
import { DraftEditor } from '@/components/workspace/creator/DraftEditor';
export default async function NewCourseDraft() {
  const state = await requireCreatorWorkspace(); if (!state.capabilities.canEditWorkspace) redirect('/workspace/courses');
  return <div className="space-y-8"><PageHeading eyebrow="A new course starts here" title="Create Course Draft" description="Capture the basics of your aviation course. This is a private draft, with no public publication or checkout." /><DraftEditor /></div>;
}
