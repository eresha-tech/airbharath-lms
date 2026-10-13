import { CreatorShell } from '@/components/workspace/creator/Shell';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Creator Workspace — AirBharath', robots: { index: false, follow: false } };
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const state = await requireCreatorWorkspace();
  return <CreatorShell name={state.details?.displayName || state.user.fullName || 'Creator'} editable={state.capabilities.canEditWorkspace} retainedState={state.capabilities.state}>{children}</CreatorShell>;
}
