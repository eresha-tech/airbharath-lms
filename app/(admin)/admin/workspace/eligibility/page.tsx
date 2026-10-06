import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { ADMIN_FILTERS, listEligibilityAttempts, parseAdminList } from '@/lib/workspace/eligibility/service';
import { formatWorkspaceDate, CATEGORIES, EXPERIENCE_OPTIONS } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export default async function EligibilityAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!await getAuthorizedAdminSession()) redirect('/login');
  const params = await searchParams; const url = new URL('https://local.invalid');
  for (const key of ['filter', 'page']) if (typeof params[key] === 'string') url.searchParams.set(key, params[key]);
  const input = parseAdminList(url);
  if (!input) return <p role="alert">Invalid eligibility filter or page. <Link href="/admin/workspace/eligibility">Reset filters</Link></p>;
  const data = await listEligibilityAttempts(input.filter, input.page);
  return <div className="ph-no-capture space-y-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-muted-foreground">Workspace</p><h1 className="mt-2 text-3xl font-bold">Eligibility history</h1></div><Link href="/admin/workspace/settings" className="rounded-xl border px-4 py-3 text-sm">Eligibility settings</Link></div><p className="text-sm text-muted-foreground">Automatic decisions only. Legacy manual applications remain separate. Dates use Asia/Kolkata (IST).</p>
    <form className="flex flex-wrap gap-3"><label className="text-sm">Filter <select name="filter" defaultValue={input.filter} className="ml-2 rounded-lg border bg-background p-3">{ADMIN_FILTERS.map(filter => <option key={filter} value={filter}>{filter.replaceAll('_', ' ')}</option>)}</select></label><button className="rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">Apply filter</button></form>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-muted"><tr>{['Account', 'Category', 'Experience', 'Result', 'Decision', 'Deadline', 'Rules'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{data.attempts.map(row => <tr key={row.id} className="border-t"><td className="p-4"><Link href={`/admin/workspace/eligibility/${row.id}`} className="font-semibold underline underline-offset-4">{row.fullName || 'Account'}</Link><p className="mt-1 text-xs text-muted-foreground">{row.email || row.phone}</p></td><td className="p-4">{CATEGORIES.find(([code]) => code === row.category)?.[1]}</td><td className="p-4">{EXPERIENCE_OPTIONS.find(([code]) => code === row.experienceOption)?.[1]}</td><td className="p-4 capitalize">{row.result}</td><td className="p-4">{formatWorkspaceDate(row.decidedAt)}</td><td className="p-4">{formatWorkspaceDate((row.eligibleUntil || row.reapplyAt)!)}</td><td className="p-4">v{row.settingsVersion}</td></tr>)}</tbody></table>{!data.attempts.length && <p className="p-8 text-sm text-muted-foreground">No attempts match this filter.</p>}</div>
    <nav aria-label="Eligibility pagination" className="flex items-center gap-5 text-sm">{input.page > 1 && <Link className="underline" href={`?filter=${input.filter}&page=${input.page - 1}`}>Previous</Link>}<span>Page {input.page}</span>{data.hasNext && <Link className="underline" href={`?filter=${input.filter}&page=${input.page + 1}`}>Next</Link>}</nav>
  </div>;
}
