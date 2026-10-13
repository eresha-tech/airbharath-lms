import { readGrantEvidence } from '@/lib/workspace/access/repository';
import { GrantTerms } from '@/components/workspace/GrantTerms';
import { formatPaise } from '@/lib/workspace/membership/model';
import { classifyWorkspaceRuntime } from '@/lib/workspace/payments/classification';
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
    const access = resolveMembershipAccess(row ? { refundedAt: row.refund?.confirmedAt, profileStatus: row.profile.status, activationState: row.order.activationState, providerMode: row.order.providerMode, commercialPolicyVersion: row.order.commercialPolicyVersion, membership: row.membership } : null, new Date(), classifyWorkspaceRuntime());
    const grant = await readGrantEvidence(user.id);
    const review = latestOrder?.activationState === 'held_for_review';
    const creator = creatorCapabilities(row ? { refundedAt: row.refund?.confirmedAt, profileStatus: row.profile.status, activationState: row.order.activationState, providerMode: row.order.providerMode, commercialPolicyVersion: row.order.commercialPolicyVersion, membership: row.membership } : null, new Date(), classifyWorkspaceRuntime(), review, grant);
    const unavailable = row && access.state !== 'refunded' && (row.profile.status !== 'enabled' || (!access.hasCreatorAccess && access.state !== 'expired'));
    const title = !row && grant ? creator.grantState === 'active' ? 'Complimentary Creator access' : creator.grantState === 'pending_legal' ? 'Creator Terms required' : `Complimentary access ${creator.grantState.replaceAll('_',' ')}` : access.state === 'refunded' ? 'Membership refunded' : review ? 'Payment under review' : unavailable ? 'Creator access unavailable' : access.state === 'early_access' ? 'Early Access Active' : access.state === 'active' ? 'Membership active' : access.state === 'expired' ? 'Membership expired' : latestOrder?.financialState === 'captured' ? 'Activation pending' : 'Workspace membership';
    return <div className="ph-no-capture mx-auto max-w-3xl space-y-6 py-2"><p className="text-xs uppercase tracking-widest text-primary">AirBharath Workspace</p><h1 className="font-outfit text-3xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">{!row && grant ? 'This administrative grant is complimentary. It does not create a paid membership or refundable purchase.' : access.state === 'refunded' ? creator.grantState==='active' ? 'Your full refund is confirmed. Your independent complimentary grant continues to allow Creator editing.' : 'Your full refund is confirmed. Your creator work is retained for read access; paid editing is unavailable.' : review ? 'Your payment needs review before creator access can be granted. Please contact support.' : unavailable ? 'Please contact support about your creator access.' : access.state === 'early_access' ? 'Your creator access is active. Your paid membership term begins on 9 November 2026 at 00:00 IST.' : access.state === 'expired' ? 'Your paid membership term has ended. Creator access is no longer active. Renewal is not available yet.' : access.state === 'active' ? 'Your creator access is active for the membership term below.' : 'Payment and activation are verified separately. Access begins only after fulfillment completes.'}</p>
      {row && <dl className="grid gap-5 rounded-xl border border-border p-6 sm:grid-cols-2">{[['Plan', row.order.planSnapshot.displayName], ['Original payment amount', formatPaise(row.order.totalPaise)], ['Membership starts', formatWorkspaceDate(row.membership.startsAt)], ['Membership ends', formatWorkspaceDate(row.membership.endsAt)], ['Membership status', title], ['Creator access', creator.hasCreatorAccess ? 'Active' : 'Read only or unavailable']].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl>}
      {grant && review && <p role="status" className="rounded-xl border border-border p-5 text-sm">Your separate payment remains under review. Complimentary access does not resolve its financial status. Contact Billing &amp; Support about that payment.</p>}
      {grant && <section aria-label="Complimentary access" className="space-y-4 rounded-xl border border-border p-6"><h2 className="text-xl font-semibold">Complimentary access · {creator.grantState.replaceAll('_',' ')}</h2><p className="text-sm text-muted-foreground">Administrative access is evaluated separately from paid membership.</p><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Grant starts</dt><dd>{formatWorkspaceDate(grant.startsAt)}</dd></div><div><dt className="text-sm text-muted-foreground">Grant expires</dt><dd>{formatWorkspaceDate(grant.expiresAt)}</dd></div></dl>{creator.grantState==='pending_legal'&&<GrantTerms/>}</section>}
      <Link href="/workspace/member/billing" className="inline-block text-sm underline underline-offset-4">Billing &amp; Support</Link>
      {creator.canEditWorkspace && <p className="text-sm text-muted-foreground">Next, prepare your creator profile and private course structure. Media uploads, final course approval, publication and sales are planned for the full launch.</p>}
      {creator.canViewCreatorWorkspace && <Link className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" href="/workspace/dashboard">Open Workspace</Link>}
      {!row && !latestOrder && !grant && <Link className="text-primary underline" href="/workspace/apply">Check Workspace eligibility</Link>}
    </div>;
  } catch { return <div className="ph-no-capture mx-auto max-w-3xl py-2"><h1 className="font-outfit text-3xl">Membership status unavailable</h1><p role="status" className="mt-4">We could not load your membership status. Please try again later. Access cannot be confirmed while status is unavailable.</p></div>; }
}
