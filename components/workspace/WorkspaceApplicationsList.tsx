'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { APPLICATION_STATUSES, STATUS_LABELS, AVIATION_BACKGROUNDS, COURSE_READINESS, EXPERIENCE_RANGES, AUDIENCE_STATUS } from '@/lib/workspace/options';
import type { ApplicationSummary } from '@/lib/workspace/types';

const emptyFilters = { search: '', status: '', background: '', readiness: '', experience: '', audience: '' };
export function WorkspaceApplicationsList() {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ ...query, page: String(page) });
    fetch(`/api/admin/workspace-applications?${params}`, { signal: AbortSignal.any([controller.signal,AbortSignal.timeout(15000)]), cache: 'no-store' })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not load applications.'); return data; })
      .then(data => { if(controller.signal.aborted)return; setApplications(data.applications); setHasNext(data.hasNextPage); })
      .catch(err => { if (!controller.signal.aborted) setError(['TimeoutError','AbortError','TypeError','SyntaxError'].includes(err.name)?'Applications could not be loaded. Please retry.':err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, reload]);
  function applyFilters(event: FormEvent) { event.preventDefault(); setPage(1); setQuery({ ...filters }); }
  return <div className="ph-no-capture space-y-6">
    <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center"><div><div className="mb-2 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><Briefcase aria-hidden="true" className="size-5 text-primary" /></span><h1 className="text-2xl font-bold sm:text-3xl">Workspace Applications</h1></div><p className="text-sm text-muted-foreground">Review the Founding Creator cohort. Decisions stay separate from account provisioning.</p></div><Button asChild variant="outline"><Link href="/workspace">View public page<ArrowRight aria-hidden="true" /></Link></Button></div>
    <form onSubmit={applyFilters} className="space-y-4 rounded-2xl border border-border bg-card p-5" aria-label="Filter applications"><div><label className="mb-2 block text-xs font-semibold" htmlFor="ws-search">Search applications</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input id="ws-search" className="h-10 pl-9" placeholder="Name, email, course topic or application ID" maxLength={200} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{([
      ['status', 'Status', APPLICATION_STATUSES], ['background', 'Aviation background', AVIATION_BACKGROUNDS],
      ['readiness', 'Course readiness', COURSE_READINESS], ['experience', 'Experience', EXPERIENCE_RANGES], ['audience', 'Audience', AUDIENCE_STATUS],
    ] as const).map(([key, title, options]) => <div key={key}><label className="mb-2 block text-xs font-semibold" htmlFor={`ws-filter-${key}`}>{title}</label><select id={`ws-filter-${key}`} value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">All</option>{options.map(value => <option key={value} value={value}>{key === 'status' ? STATUS_LABELS[value as keyof typeof STATUS_LABELS] : value}</option>)}</select></div>)}</div><div className="flex gap-3"><Button type="submit">Apply filters</Button><Button type="button" variant="ghost" onClick={() => { setFilters(emptyFilters); setQuery({ ...emptyFilters }); setPage(1); }}>Reset</Button></div></form>
    {loading ? <div role="status" className="flex items-center gap-3 rounded-2xl border border-border p-10 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Loading applications…</div> : error ? <div role="alert" className="rounded-2xl border border-border p-8"><p className="mb-4 text-sm">{error}</p><Button onClick={() => setReload(r => r + 1)}>Try again</Button></div> : <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card" tabIndex={0} role="region" aria-label="Workspace applications table"><table className="w-full min-w-[1120px] text-left text-xs"><caption className="sr-only">Workspace creator applications, page {page}</caption><thead className="border-b border-border bg-muted/50"><tr>{['Applicant / ID', 'Aviation background', 'Proposed course', 'Experience', 'Readiness', 'Audience', 'Status', 'Submitted', 'Action'].map(title => <th key={title} scope="col" className="px-4 py-4 font-semibold">{title}</th>)}</tr></thead><tbody>{applications.map(app => <tr key={app.id} className="border-b border-border last:border-0 hover:bg-muted/30"><td className="max-w-[220px] px-4 py-5"><p className="break-words font-semibold">{app.fullName}</p><p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{app.applicationReference}</p>{app.potentialDuplicate && <p className="mt-2 text-amber-800 dark:text-amber-300">Possible duplicate</p>}</td><td className="max-w-[160px] px-4 py-5">{app.aviationBackground}</td><td className="max-w-[180px] break-words px-4 py-5 font-medium">{app.proposedCourseTopic}</td><td className="px-4 py-5">{app.yearsExperience}</td><td className="max-w-[150px] px-4 py-5">{app.courseReadiness}</td><td className="px-4 py-5">{app.audienceStatus}{app.audienceSize && <p className="mt-1 text-muted-foreground">{app.audienceSize}</p>}</td><td className="px-4 py-5"><span className="inline-block rounded-md bg-primary/10 px-2 py-1 font-medium">{STATUS_LABELS[app.applicationStatus]}</span></td><td className="whitespace-nowrap px-4 py-5">{new Date(app.submittedAt).toLocaleDateString('en-IN')}</td><td className="px-4 py-5"><Button asChild size="sm" variant="outline"><Link href={`/admin/workspace-applications/${app.id}`} aria-label={`Review ${app.fullName}'s application`}>Review<ArrowRight aria-hidden="true" /></Link></Button></td></tr>)}{!applications.length && <tr><td colSpan={9} className="px-8 py-14 text-center"><p className="text-base font-semibold">No applications found.</p><p className="mt-2 text-sm text-muted-foreground">Try different filters, or check back after applications arrive.</p></td></tr>}</tbody></table></div>
      <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Page {page} · up to 25 applications per page</p><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button><Button variant="outline" disabled={!hasNext} onClick={() => setPage(p => p + 1)}>Next</Button></div></div>
    </>}
  </div>;
}
