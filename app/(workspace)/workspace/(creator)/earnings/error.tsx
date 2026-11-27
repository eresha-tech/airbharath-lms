'use client';
import Link from 'next/link';
import { WorkspaceErrorState } from '@/components/workspace/ui/WorkspaceUI';
export default function FinanceError({ reset }: {
    reset: () => void;
}) { return <div className="space-y-5"><WorkspaceErrorState title="Finance details unavailable" description="We could not confirm access or load the latest financial records. Your earnings and payment history are retained. Retry to fetch the current state." onRetry={reset}/><Link className="inline-flex min-h-11 items-center text-sm text-primary underline" href="/contact">Contact finance support</Link></div>; }
