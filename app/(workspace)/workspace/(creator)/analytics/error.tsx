'use client';
import { WorkspaceErrorState } from '@/components/workspace/ui/WorkspaceUI';
export default function ErrorPage({reset}:{reset:()=>void}){return <WorkspaceErrorState title="Analytics unavailable" description="We could not confirm access or load current analytics. No estimated numbers are shown. Retry to read the latest saved records." onRetry={reset}/>;}
