'use client';
import {WorkspaceErrorState} from '@/components/workspace/ui/WorkspaceUI';
export default function ErrorPage({reset}:{reset:()=>void}){return <WorkspaceErrorState title='Workspace administration unavailable' description='The page could not be loaded. Access has not been changed.' onRetry={reset}/>;}
