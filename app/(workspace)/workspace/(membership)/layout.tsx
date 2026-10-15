import { redirect } from 'next/navigation';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { workspaceContent } from '@/lib/workspace/creator/repository';
import { CreatorError } from '@/lib/workspace/creator/model';
import { CreatorShell } from '@/components/workspace/creator/Shell';
import Header from '@/components/Header';
import { Footer } from '@/components/Footer';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Workspace Membership — AirBharath', robots: { index: false, follow: false } };
export default async function MembershipLayout({ children }: { children: React.ReactNode }) {
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fmember');
  let state;
  try { state = await workspaceContent().overview(user.id); }
  catch (error) { if (!(error instanceof CreatorError) || error.code !== 'restricted') throw new Error('Workspace access could not be loaded. Please try again.'); }
  if (state) return <CreatorShell name={state.details?.displayName || user.fullName || 'Creator'} editable={state.capabilities.canEditWorkspace} retainedState={state.capabilities.state}>{children}</CreatorShell>;
  return <div className="min-h-screen bg-background text-foreground"><Header /><main id="public-content" tabIndex={-1} className="mx-auto max-w-4xl px-5 pb-16 pt-28">{children}</main><Footer /></div>;
}
