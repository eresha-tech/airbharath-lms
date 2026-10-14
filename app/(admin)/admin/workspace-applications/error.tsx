'use client';
import {WorkspaceErrorState} from '@/components/workspace/ui/WorkspaceUI';
export default function ErrorPage({reset}:{reset:()=>void}){return <WorkspaceErrorState title='Applications unavailable' description='We could not load the application review. Your saved information is retained.' onRetry={reset}/>;}
