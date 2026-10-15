import { WorkspaceApplicationDetail } from '@/components/workspace/WorkspaceApplicationDetail';
export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceApplicationDetail id={id} />;
}
