import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { inspectDrafts } from '@/lib/workspace/creator/repository';
import { UUID, formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import { DraftView, PageHeading } from '@/components/workspace/creator/Content';
export const dynamic = 'force-dynamic';
export default async function AdminDraft({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login'); const { id } = await params; if (!UUID.test(id)) notFound();
  const rows = await inspectDrafts(admin.id, id).catch(() => null);
  if (!rows) return <div className="ph-no-capture"><h1 className="text-3xl">Draft unavailable</h1><p role="status" className="mt-4">We could not verify access or load this draft. Please try again later.</p><Link href="/admin/workspace/course-drafts" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Reload saved records</Link></div>;
  const row = rows[0]; if (!row) notFound();
  return <div className="ph-no-capture space-y-8"><PageHeading eyebrow="Workspace · inspection only" title="Private Course Draft" description="Read-only inspection. No course approval or publication actions are available." /><dl className="grid gap-5 rounded-xl border border-border p-6 sm:grid-cols-2">{[['Creator', row.creatorName || 'Account'], ['Creator identity', row.creatorStatus], ['Owner account', row.draft.userId], ['Creator profile', row.draft.creatorProfileId], ['Created', formatWorkspaceDate(row.draft.createdAt)], ['Updated', formatWorkspaceDate(row.draft.updatedAt)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 break-words text-sm">{value}</dd></div>)}</dl><DraftView draft={row.draft} /></div>;
}
