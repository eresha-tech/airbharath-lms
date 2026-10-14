'use client';
import {WorkspaceErrorState} from '@/components/workspace/ui/WorkspaceUI';
export default function ErrorPage({reset}:{reset:()=>void}){return <WorkspaceErrorState title='Workspace unavailable' description='We could not load your Workspace. Your saved work is retained. Creator access cannot be confirmed while status is unavailable.' onRetry={reset}/>;}
