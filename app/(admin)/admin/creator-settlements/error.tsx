'use client';
import { WorkspaceErrorState } from '@/components/workspace/ui/WorkspaceUI';
export default function Error({ reset }: {
    reset: () => void;
}) { return <WorkspaceErrorState title="Settlement records unavailable" description="Access or current bank records could not be confirmed. No financial action can proceed while the state is unavailable." onRetry={reset}/>; }
