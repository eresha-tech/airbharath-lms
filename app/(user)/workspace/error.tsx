'use client';
import { EligibilityShell } from '@/components/workspace/EligibilityShell';
export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <EligibilityShell title="Workspace is temporarily unavailable" intro="We could not load your eligibility information. Please try again. If a submission was interrupted, retry the same submission to recover its result."><button onClick={reset} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Try again</button></EligibilityShell>; }
