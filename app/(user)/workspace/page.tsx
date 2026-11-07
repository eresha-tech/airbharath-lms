import { WorkspaceLanding } from '@/components/workspace/WorkspaceLanding';
import { readPublicWorkspaceInfo } from '@/lib/public/workspace';
import { publicMetadata } from '@/lib/public/metadata';
import './workspace.css';
export const dynamic = 'force-dynamic';
export const metadata = publicMetadata('/workspace', 'AirBharath Workspace — Create Your Aviation Course', 'Check Creator eligibility, compare membership plans and build independently priced aviation courses. Public activation is subject to coordinated launch verification.');
export default async function WorkspacePage() { return <WorkspaceLanding info={await readPublicWorkspaceInfo()}/>; }
