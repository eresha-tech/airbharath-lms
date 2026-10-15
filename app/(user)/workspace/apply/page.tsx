export const metadata = { robots: { index: false, follow: false } };
import { redirect } from 'next/navigation';
import { EligibilityShell } from '@/components/workspace/EligibilityShell';
import { EligibilityForm } from '@/components/workspace/EligibilityForm';
import { getWorkspaceUser, getWorkspaceJourneyState, getEligibilityFormConfig } from '@/lib/workspace/eligibility/service';
export const dynamic = 'force-dynamic';
export default async function EligibilityPage() {
  const user = await getWorkspaceUser();
  if (!user) redirect('/login?callbackUrl=%2Fworkspace%2Fapply');
  const journey = await getWorkspaceJourneyState(user.id);
  if (journey.destination !== '/workspace/apply') redirect(journey.destination);
  const { settings, policy } = await getEligibilityFormConfig();
  return <EligibilityShell title="Become a Creator" intro="Start with a short aviation eligibility check using your AirBharath account. Eligibility does not activate Workspace or approve a course.">
    {journey.state === 'eligibility_expired' && <p role="status" className="mb-6 rounded-xl bg-muted p-4 text-sm">Your previous eligibility has expired. Complete a fresh check against the current rules.</p>}
    <EligibilityForm settingsId={settings.id} policyId={policy.id} config={settings.config} declarations={policy.declarations} />
  </EligibilityShell>;
}
