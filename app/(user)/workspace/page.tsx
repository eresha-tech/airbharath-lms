import type { Metadata } from 'next';
import { WorkspaceLanding } from '@/components/workspace/WorkspaceLanding';
import './workspace.css';

export const metadata: Metadata = {
  title: 'AirBharath Workspace — Founding Creator Program',
  description: 'Have aviation expertise worth sharing? Apply to the AirBharath Workspace Founding Creator Program. No payment is required to apply.',
};
export default function WorkspacePage() { return <WorkspaceLanding />; }
