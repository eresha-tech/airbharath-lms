export function CreatorLoading({ title = 'Creator Workspace' }: { title?: string }) {
  return <section aria-busy="true" aria-label={`Loading ${title}`} className="space-y-6"><p role="status" className="text-sm text-muted-foreground">Loading {title}…</p><div className="h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-muted"/><div className="grid gap-4 sm:grid-cols-2"><div className="h-32 animate-pulse rounded-xl bg-muted"/><div className="h-32 animate-pulse rounded-xl bg-muted"/></div><div className="h-64 animate-pulse rounded-xl bg-muted"/></section>;
}
