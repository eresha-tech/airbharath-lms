import { readCurrentRefundPolicyAcceptance } from '@/lib/workspace/refund-policy/repository';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getWorkspaceJourneyState, getWorkspaceUser } from '@/lib/workspace/eligibility/service';
import { getCurrentPlans, getWorkspaceMembershipQuote, MembershipError } from '@/lib/workspace/membership/service';
import { financialConfiguration } from '@/lib/workspace/payments/configuration';
import { ActivationPreview } from '@/components/workspace/ActivationPreview';
import { readCurrentCreatorTermsAcceptance } from '@/lib/workspace/terms/repository';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Choose a Workspace plan — AirBharath', robots: { index: false, follow: false } };
export default async function ActivatePage() {
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fapply');
  const journey = await getWorkspaceJourneyState(user.id);
  if (journey.state !== 'eligibility_active') redirect(journey.destination);
  // Keep redirects outside the failure boundary. Missing catalog must never imply a free plan.
  let content;
  let expiredDestination: string | undefined;
  try {
    const plans = await getCurrentPlans();
    const first = plans.find(plan => plan.available);
    const quote = first ? await getWorkspaceMembershipQuote(user.id, { planCode: first.code, planVersionId: first.id }) : null;
    const initialPolicyAcceptance = await readCurrentRefundPolicyAcceptance(user.id);
    const initialTermsAcceptance = await readCurrentCreatorTermsAcceptance(user.id);
    content = <ActivationPreview plans={plans.map(({ id, code, version, displayName, durationMonths, basePricePaise, taxRateBps, currency, isCurrent, available }) => ({ id, code, version, displayName, durationMonths, basePricePaise, taxRateBps, currency, isCurrent, available }))} initialQuote={quote} initialTermsAcceptance={initialTermsAcceptance} initialPolicyAcceptance={initialPolicyAcceptance} checkoutKeyId={financialConfiguration('checkout')?.keyId} userId={user.id} />;
  } catch (error) {
    if (error instanceof MembershipError && error.code === 'eligibility_required') expiredDestination = error.destination;
    content = <div role="status" className="rounded-2xl border border-border bg-card p-8"><h2 className="font-outfit text-2xl">Plan preview is temporarily unavailable.</h2><p className="mt-3 text-sm text-muted-foreground">Please reload to try again. No payment or activation has occurred.</p><Link href="/workspace/activate" className="mt-5 inline-block underline underline-offset-4">Reload plan preview</Link></div>;
  }
  if (expiredDestination) redirect(expiredDestination);
  return <main className="ph-no-capture mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8"><Link href="/workspace" className="text-sm text-muted-foreground underline underline-offset-4">← Workspace</Link><header className="mb-10 mt-10 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Workspace / Your next step</p><h1 className="mt-4 font-outfit text-4xl font-semibold tracking-tight sm:text-6xl">A plan for your<br className="hidden sm:block" /> next chapter.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Your eligibility check is complete. Compare prepaid terms and review a price preview for your aviation teaching journey.</p></header>{content}</main>;
}
