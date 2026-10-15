'use client';
import {WorkspaceErrorState} from '@/components/workspace/ui/WorkspaceUI';
export default function ErrorPage({reset}:{reset:()=>void}){return <WorkspaceErrorState title='Refund administration unavailable' description='We could not load financial evidence. Do not repeat an uncertain refund; reload to check its saved state.' onRetry={reset}/>;}
