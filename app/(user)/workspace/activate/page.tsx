import {resolveJourney} from '@/lib/workspace/eligibility/model';
import {cookies} from 'next/headers';
import {PLAN_INTENT_COOKIE,selectedPlan} from '@/lib/workspace/membership/plan-intent';
import { FULL_WORKSPACE_LAUNCH } from '@/lib/workspace/launch-copy';
import { WorkspaceLaunchNotice } from '@/components/workspace/ui/WorkspaceUI';
import { readContactEmail } from '@/lib/workspace/email/contact';
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
export default async function ActivatePage({searchParams=Promise.resolve({})}:{searchParams?:Promise<{renew?:string}>}) {
  const renewal=(await searchParams).renew==='1';
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fapply');
  const journey = await getWorkspaceJourneyState(user.id);
  if(journey.state!=='eligibility_active'&&(!renewal||['financial_review','activation_pending','creator_unavailable'].includes(journey.state)))redirect(journey.destination);
  const eligibility=journey.state==='eligibility_active'?journey:resolveJourney(true,journey.attempt,new Date());
  if (eligibility.state !== 'eligibility_active') redirect(eligibility.destination+(renewal?'?renew=1':''));
  // Keep redirects outside the failure boundary. Missing catalog must never imply a free plan.
  let content;
  let expiredDestination: string | undefined;
  try {
    const plans = await getCurrentPlans();
    const intent=selectedPlan((await cookies()).get(PLAN_INTENT_COOKIE)?.value);
    const first = intent ? plans.find(plan => plan.code===intent && plan.available) : plans.find(plan => plan.available);
    const quote = first ? await getWorkspaceMembershipQuote(user.id, { planCode: first.code, planVersionId: first.id }) : null;
    const initialContactEmail = await readContactEmail(user.id);
    const initialPolicyAcceptance = await readCurrentRefundPolicyAcceptance(user.id);
    const initialTermsAcceptance = await readCurrentCreatorTermsAcceptance(user.id);
    content = <>{intent&&!first&&<p role="status" className="mb-6 rounded-xl border border-border p-4">Your selected Creator plan is no longer available. Choose an available plan below and review a new quote before continuing.</p>}<ActivationPreview eligibilityValidUntil={journey.attempt?.eligibleUntil?.toISOString()} initialContactEmail={initialContactEmail} plans={plans.map(({ id, code, version, displayName, durationMonths, basePricePaise, taxRateBps, currency, isCurrent, available }) => ({ id, code, version, displayName, durationMonths, basePricePaise, taxRateBps, currency, isCurrent, available }))} initialQuote={quote} initialTermsAcceptance={initialTermsAcceptance} initialPolicyAcceptance={initialPolicyAcceptance} checkoutKeyId={financialConfiguration('checkout')?.keyId} userId={user.id} /></>;
  } catch (error) {
    if (error instanceof MembershipError && error.code === 'eligibility_required') expiredDestination = error.destination;
    content = <div role="status" className="rounded-2xl border border-border bg-card p-8"><h2 className="font-outfit text-2xl">Plan preview is temporarily unavailable.</h2><p className="mt-3 text-sm text-muted-foreground">Please reload to try again. No payment or activation has occurred.</p><Link href="/workspace/activate" className="mt-5 inline-block underline underline-offset-4">Reload plan preview</Link></div>;
  }
  if (expiredDestination) redirect(expiredDestination);
  return <section className="ph-no-capture mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8"><Link href="/workspace" className="text-sm text-muted-foreground underline underline-offset-4">← Workspace</Link><header className="mb-10 mt-10 max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Workspace / Your next step</p><h1 className="mt-4 font-outfit text-4xl font-semibold tracking-tight sm:text-6xl">Your next<br className="hidden sm:block" /> prepaid term.</h1><p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Your eligibility check is complete. Compare prepaid terms and review a price preview for your aviation teaching journey.</p><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Choose an authoritative prepaid quote below. Membership start rules appear in the quote; historical dates and existing payment safeguards are unchanged. {FULL_WORKSPACE_LAUNCH}</p><Link href="/workspace/pricing" className="mt-4 inline-block underline">Compare Creator plans</Link></header><div className="mb-8"><WorkspaceLaunchNotice/></div>{content}</section>;
}
