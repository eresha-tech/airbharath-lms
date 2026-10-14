'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ListParams } from '@/lib/workspace/admin/pagination';

const field = 'mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm';

export function WorkspaceListFilters({ kind, params, statuses, cursorBased, showMode }: {
  kind: string;
  params: ListParams;
  statuses: { value: string; label: string }[];
  cursorBased: boolean;
  showMode: boolean;
}) {
  const source = JSON.stringify([kind, params]);
  const [draft, setDraft] = useState({ source, values: params });

  // Only a committed URL-state change resets the draft. Ordinary rerenders keep
  // unsaved typing and focus; history navigation synchronizes before rendering.
  if (draft.source !== source) setDraft({ source, values: params });
  const values = draft.source === source ? draft.values : params;
  const { q, status, sort, size, page, cursor, mode } = params;
  useEffect(() => {
    // Native history can restore form DOM values after hydration, even when
    // React's controlled value already matches the URL. Resynchronize on history
    // loads as well as back/forward-cache restores; ordinary typing is untouched.
    const historyLoad = () => (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type === 'back_forward';
    const reset = () => setDraft({ source, values: { q, status, sort, size, page, cursor, mode } });
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted || historyLoad()) reset();
    };
    if (historyLoad()) reset();
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, [source, q, status, sort, size, page, cursor, mode]);
  function update<K extends keyof ListParams>(key: K, value: ListParams[K]) {
    setDraft(previous => ({ ...previous, values: { ...previous.values, [key]: value } }));
  }

  return <form aria-label="Workspace list filters" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-6" method="get">
    <label className="text-xs xl:col-span-2">Search name, description or internal ID<input name="q" value={values.q} onChange={event => update('q', event.target.value)} maxLength={120} className={field}/></label>
    <label className="text-xs">Status<select name="status" value={values.status} onChange={event => update('status', event.target.value)} className={field}><option value="all">All statuses</option>{statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
    <label className="text-xs">Sort<select name="sort" value={values.sort} onChange={event => update('sort', event.target.value as ListParams['sort'])} className={field}><option value="newest">Newest first</option><option value="oldest">Oldest first</option>{!cursorBased && <option value="name">Name</option>}</select></label>
    <label className="text-xs">Page size<select name="size" value={values.size} onChange={event => update('size', Number(event.target.value) as ListParams['size'])} className={field}><option value="25">25</option><option value="50">50</option></select></label>
    {showMode && <label className="text-xs">Environment<select name="mode" value={values.mode} onChange={event => update('mode', event.target.value as ListParams['mode'])} className={field}><option value="live">Live</option><option value="test">Test (noncommercial)</option></select></label>}
    <button className="min-h-11 self-end rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Apply filters</button>
    <Link href="?" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4">Reset filters</Link>
  </form>;
}
