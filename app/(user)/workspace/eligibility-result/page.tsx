export const metadata = { robots: { index: false, follow: false } };
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { EligibilityShell } from '@/components/workspace/EligibilityShell';
import { getWorkspaceUser, getWorkspaceJourneyState } from '@/lib/workspace/eligibility/service';
import { formatWorkspaceDate, REASON_LABELS } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export default async function EligibilityResult() {
  const user = await getWorkspaceUser(); if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fapply');
  const journey = await getWorkspaceJourneyState(user.id);
  if (['/workspace/member', '/workspace/dashboard'].includes(journey.destination)) redirect(journey.destination);
  if (!['eligibility_active', 'ineligible_cooldown'].includes(journey.state) || !journey.attempt) redirect('/workspace/apply');
  const attempt = journey.attempt; const eligible = journey.state === 'eligibility_active';
  return <EligibilityShell title={eligible ? 'You meet the eligibility requirements.' : 'Eligibility requirements not met yet.'} intro={eligible ? 'Your aviation background meets the current automated onboarding rules. Choose your membership plan and preview pricing. Workspace payments are awaiting launch verification.' : 'This decision uses your submitted answers and the rules in effect when you submitted.'}>
    <section className="rounded-2xl border border-border bg-card p-7 sm:p-10">{eligible ? <CheckCircle2 aria-hidden className="size-8 text-primary" /> : <Clock3 aria-hidden className="size-8 text-muted-foreground" />}
      <h2 className="mt-6 text-xl font-semibold">{eligible ? 'Eligibility valid until' : 'You can check again from'}</h2><p className="mt-3 text-lg">{formatWorkspaceDate((eligible ? attempt.eligibleUntil : attempt.reapplyAt)!)} IST</p>
      {!eligible && <ul className="mt-6 list-disc space-y-2 pl-5 text-sm leading-6">{attempt.reasons.map(reason => <li key={reason}>{REASON_LABELS[reason]}</li>)}</ul>}
      <p className="mt-7 border-t border-border pt-6 text-sm leading-7 text-muted-foreground">Eligibility is a self-declared assessment. It does not grant creator access, activate membership or approve courses. No payment is required for this check.</p>
      <Link href={eligible ? '/workspace/activate' : '/workspace'} className="mt-7 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">{eligible ? 'Choose a plan' : 'Back to Workspace'}</Link>
    </section>
  </EligibilityShell>;
}
