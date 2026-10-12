'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export function CreatorNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Creator Workspace" className="mb-10 flex flex-wrap gap-2">{[['Overview', '/workspace/dashboard'], ['My Courses', '/workspace/courses'], ['Creator Profile', '/workspace/profile'], ['Membership & refunds', '/workspace/refunds']].map(([label, href]) => {
    const active = pathname === href || (href === '/workspace/courses' && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary hover:text-primary'}`}>{label}</Link>;
  })}</nav>;
}
