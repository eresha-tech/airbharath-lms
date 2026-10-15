import { WorkspaceLanding } from '@/components/workspace/WorkspaceLanding';
import { readPublicWorkspaceInfo } from '@/lib/public/workspace';
import { publicMetadata } from '@/lib/public/metadata';
import './workspace.css';
export const dynamic = 'force-dynamic';
export const metadata = publicMetadata('/workspace', 'AirBharath Workspace — Prepare Your Aviation Course', 'Check Creator eligibility, explore memberships and prepare private course proposals and approved text lessons. Full release targeted for 9 November 2026.');
export default async function WorkspacePage() { return <WorkspaceLanding info={await readPublicWorkspaceInfo()}/>; }
