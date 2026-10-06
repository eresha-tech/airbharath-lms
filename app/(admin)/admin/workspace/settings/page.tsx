import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { getEligibilityFormConfig } from '@/lib/workspace/eligibility/service';
import { EligibilitySettings } from '@/components/workspace/EligibilitySettings';
import { WorkspacePlanSummary } from '@/components/workspace/WorkspacePlanSummary';
export const dynamic = 'force-dynamic';
export default async function SettingsPage() { if (!await getAuthorizedAdminSession()) redirect('/login'); const { settings } = await getEligibilityFormConfig(); return <div className="ph-no-capture space-y-7"><h1 className="text-3xl font-bold">Workspace settings</h1><WorkspacePlanSummary /><EligibilitySettings initial={{ id: settings.id, version: settings.version, config: settings.config }} /></div>; }
