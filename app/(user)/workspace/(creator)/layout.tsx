import { CreatorNavigation } from '@/components/workspace/creator/Navigation';
import Link from 'next/link';
import { requireCreatorWorkspace } from '@/lib/workspace/creator/pages';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const state = await requireCreatorWorkspace();
  return <main className="ph-no-capture mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><Link href="/workspace/dashboard" className="font-outfit text-lg font-semibold">Workspace <span className="ml-2 text-xs font-normal text-muted-foreground">Creator studio</span></Link><div className="flex gap-4 text-xs text-muted-foreground"><Link href="/dashboard/courses" className="hover:text-primary">My Learning</Link><Link href="/workspace/member" className="hover:text-primary">Membership status</Link></div></div><CreatorNavigation />{!state.capabilities.canEditWorkspace && <div role="status" className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm leading-7">Your Workspace membership has expired. Renew membership to continue editing your creator content. Your saved drafts and profile remain available to read. Renewal checkout is not available yet.</div>}{children}</main>;
}
