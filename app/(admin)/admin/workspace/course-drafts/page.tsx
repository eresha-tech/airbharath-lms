import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { inspectDrafts } from '@/lib/workspace/creator/repository';
import { pageNumber } from '@/lib/workspace/creator/http';
import { DraftList, PageHeading } from '@/components/workspace/creator/Content';
export const dynamic = 'force-dynamic';
export default async function AdminDrafts({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login');
  try { const page = pageNumber((await searchParams).page); const rows = await inspectDrafts(admin.id, undefined, page);
    return <main className="ph-no-capture space-y-8"><PageHeading eyebrow="Workspace · inspection only" title="Private Course Drafts" description="Read-only creator content. This view does not approve or publish courses." /><DraftList drafts={rows.slice(0, 20).map(row => row.draft)} editable={false} admin /><nav aria-label="Draft pages" className="flex gap-5 text-sm">{page > 1 && <Link href={`/admin/workspace/course-drafts?page=${page - 1}`}>← Previous</Link>}{rows.length > 20 && page < 500 && <Link href={`/admin/workspace/course-drafts?page=${page + 1}`}>Next →</Link>}</nav></main>;
  } catch { return <main className="ph-no-capture space-y-4"><h1 className="font-outfit text-3xl">Private Course Drafts</h1><p role="status">Draft inspection is unavailable. Check your authorization and the reviewed migration status, then reload.</p></main>; }
}
