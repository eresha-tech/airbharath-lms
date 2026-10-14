import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getAuthorizedAdminSession } from '@/lib/admin-authorization';
import { inspectBuild } from '@/lib/workspace/builder/repository';
import { BuildError } from '@/lib/workspace/builder/model';
import { UUID, formatWorkspaceDate } from '@/lib/workspace/eligibility/model';
import { CourseBuilder } from '@/components/workspace/builder/Builder';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Private Course Build Inspection', robots: { index: false, follow: false } };
export default async function InspectCourseBuild({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthorizedAdminSession(); if (!admin) redirect('/login'); const { id } = await params; if (!UUID.test(id)) notFound();
  let tree;
  try { tree = await inspectBuild(admin.id, id); } catch (error) { if (error instanceof BuildError && error.code === 'not_found') notFound(); return <div className="ph-no-capture"><h1>Course build unavailable</h1><p role="status">We could not verify access or load this private build. Please try again.</p><Link href="/admin/workspace/course-builds" className="mt-4 inline-flex min-h-11 items-center text-primary underline">Reload saved records</Link></div>; }
  return <div className="ph-no-capture space-y-6"><p className="text-sm text-muted-foreground">{tree.inspection?.creatorName || 'Creator'} · Creator identity {tree.inspection?.creatorStatus} · Created {formatWorkspaceDate(tree.project.createdAt)} IST · Approved {tree.source.approvedAt ? formatWorkspaceDate(tree.source.approvedAt) : 'Unavailable'} IST</p><CourseBuilder initial={tree} admin /></div>;
}
