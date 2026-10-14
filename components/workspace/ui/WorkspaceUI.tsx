import type { ReactNode } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export const FULL_WORKSPACE_LAUNCH = 'Full AirBharath Workspace launches 9 November 2026.';
export const EARLY_ACCESS_PREPARATION = 'Early Access lets you create your profile, prepare course proposals and build approved private courses before the full release.';
export function WorkspaceLaunchNotice({ compact = false }: { compact?: boolean }) {
  return <section aria-label="Full Workspace launch" className="rounded-xl border border-border bg-muted/30 p-4"><h2 className="font-outfit text-base font-semibold">{FULL_WORKSPACE_LAUNCH}</h2>{!compact && <><p className="mt-2 text-sm leading-6 text-muted-foreground">{EARLY_ACCESS_PREPARATION}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">Media uploads, publication and course selling are planned for the full release. These features are not available during Early Access.</p></>}</section>;
}
export function PendingLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center justify-center gap-2"><Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none"/>{children}</span>;
}
export function WorkspaceLoading({ title = 'Workspace', className = '' }: { title?: string; className?: string }) {
  return <section aria-busy="true" aria-label={`Loading ${title}`} className={`min-w-0 space-y-6 ${className}`}><p role="status" className="text-sm text-muted-foreground">Loading {title}…</p><div aria-hidden className="space-y-6 motion-reduce:[&_*]:animate-none"><div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-muted"/><div className="grid gap-4 sm:grid-cols-2"><div className="h-28 animate-pulse rounded-xl bg-muted"/><div className="h-28 animate-pulse rounded-xl bg-muted"/></div><div className="h-64 animate-pulse rounded-xl bg-muted"/></div></section>;
}
export function WorkspaceErrorState({ title = 'Workspace unavailable', description = 'We could not load this page. Your saved information is retained. Please try again.', onRetry, href }: { title?: string; description?: string; onRetry?: () => void; href?: string }) {
  return <section className="ph-no-capture space-y-5 rounded-xl border border-border p-6"><h1 className="font-outfit text-2xl font-semibold">{title}</h1><p role="alert" className="text-sm leading-7 text-muted-foreground">{description}</p>{onRetry ? <button type="button" onClick={onRetry} className="min-h-11 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Try again</button> : href ? <Link href={href} className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium">Reload this page</Link> : null}</section>;
}
