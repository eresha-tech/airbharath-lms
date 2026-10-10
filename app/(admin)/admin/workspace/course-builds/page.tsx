import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { inspectBuilds } from '@/lib/workspace/builder/repository';
import { pageNumber } from '@/lib/workspace/creator/http';
import { PageHeading } from '@/components/workspace/creator/Content';
import { formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Workspace Course Builds', robots: { index: false, follow: false } };
export default async function CourseBuilds({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login');
  const page = pageNumber((await searchParams).page); let state;
  try { state = await inspectBuilds(admin.id, page); } catch { return <main className="ph-no-capture"><h1 className="text-3xl">Course builds unavailable</h1><p role="status" className="mt-4">We could not verify access or load course builds. Please try again.</p></main>; }
  return <main className="ph-no-capture space-y-8"><PageHeading eyebrow="Workspace · read-only inspection" title="Course Builds" description="Private structured content derived from approved submissions. Inspection does not approve publication or allow editing." />{!state.rows.length ? <p className="rounded-xl border border-dashed border-border p-8 text-sm">No course builds yet.</p> : <div className="divide-y divide-border rounded-xl border border-border">{state.rows.map(({ project, source, creatorName, moduleCount, lessonCount }) => <Link key={project.id} href={`/admin/workspace/course-builds/${project.id}`} className="block p-6 hover:bg-muted/40"><p className="text-xs text-primary">Building · Approved submission #{source.submissionNumber}</p><h2 className="mt-2 font-outfit text-xl">{source.title}</h2><p className="mt-3 text-sm text-muted-foreground">{creatorName || 'Creator'} · {moduleCount} modules · {lessonCount} lessons · Started {formatWorkspaceDate(project.createdAt)} IST</p></Link>)}</div>}<nav aria-label="Build pages" className="flex gap-6 text-sm">{page > 1 && <Link href={`?page=${page - 1}`}>← Previous</Link>}{state.hasNext && page < 500 && <Link href={`?page=${page + 1}`}>Next →</Link>}</nav></main>;
}
