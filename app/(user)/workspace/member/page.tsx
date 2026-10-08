import { creatorCapabilities } from '@/lib/workspace/creator/model';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import { readWorkspaceAccess } from '@/lib/workspace/activation/repository';
import { resolveMembershipAccess } from '@/lib/workspace/activation/model';
export const dynamic = 'force-dynamic';
export default async function WorkspaceMemberPage() {
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fmember');
  try {
    const { row, latestOrder } = await readWorkspaceAccess(user.id);
    const access = resolveMembershipAccess(row ? { profileStatus: row.profile.status, activationState: row.order.activationState, providerMode: row.order.providerMode, commercialPolicyVersion: row.order.commercialPolicyVersion, membership: row.membership } : null, new Date(), process.env.NODE_ENV === 'production' ? 'production' : process.env.DATABASE_ENV);
    const review = latestOrder?.activationState === 'held_for_review';
    const creator = creatorCapabilities(row ? { profileStatus: row.profile.status, activationState: row.order.activationState, providerMode: row.order.providerMode, commercialPolicyVersion: row.order.commercialPolicyVersion, membership: row.membership } : null, new Date(), process.env.NODE_ENV === 'production' ? 'production' : process.env.DATABASE_ENV, review);
    const unavailable = row && (row.profile.status !== 'enabled' || (!access.hasCreatorAccess && access.state !== 'expired'));
    const title = review ? 'Payment under review' : unavailable ? 'Creator access unavailable' : access.state === 'early_access' ? 'Early Access Active' : access.state === 'active' ? 'Membership active' : access.state === 'expired' ? 'Membership expired' : latestOrder?.financialState === 'captured' ? 'Activation pending' : 'Workspace membership';
    return <main className="ph-no-capture mx-auto max-w-3xl space-y-6 px-6 py-12"><p className="text-xs uppercase tracking-widest text-primary">AirBharath Workspace</p><h1 className="font-outfit text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{review ? 'Your payment needs review before creator access can be granted. Please contact support.' : unavailable ? 'Please contact support about your creator access.' : access.state === 'early_access' ? 'Your creator access is active. Your paid membership term begins on 9 November 2026 at 00:00 IST.' : access.state === 'expired' ? 'Your paid membership term has ended. Creator access is no longer active. Renewal is not available yet.' : access.state === 'active' ? 'Your creator access is active for the membership term below.' : 'Payment and activation are verified separately. Access begins only after fulfillment completes.'}</p>
      {row && <dl className="grid gap-5 rounded-xl border border-border p-6 sm:grid-cols-2">{[['Plan', row.order.planSnapshot.displayName], ['Membership starts', formatWorkspaceDate(row.membership.startsAt)], ['Membership ends', formatWorkspaceDate(row.membership.endsAt)], ['Membership status', title]].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>}
      {creator.canViewCreatorWorkspace && <Link className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" href="/workspace/dashboard">Open Workspace</Link>}
      {!row && !latestOrder && <Link className="text-primary underline" href="/workspace/apply">Check Workspace eligibility</Link>}
    </main>;
  } catch { return <main className="ph-no-capture mx-auto max-w-3xl px-6 py-12"><h1 className="font-outfit text-3xl">Membership status unavailable</h1><p role="status" className="mt-4">We could not load your membership status. Please try again later. Access cannot be confirmed while status is unavailable.</p></main>; }
}
