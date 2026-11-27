'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UserRound, BookOpen, BadgeCheck, BarChart3, MessageCircle, Bell } from 'lucide-react';
export const creatorLinks = [
  { label: 'Overview', href: '/workspace/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', href: '/workspace/profile', icon: UserRound },
  { label: 'My Courses', href: '/workspace/courses', icon: BookOpen },
  { label: 'Analytics', href: '/workspace/analytics', icon: BarChart3, MessageCircle, Bell },
  { label: 'Learner Reviews', href: '/workspace/reviews', icon: BookOpen },
  { label: 'Earnings & Payouts', href: '/workspace/earnings', icon: BadgeCheck },
  { label: 'Settings', href: '/workspace/settings', icon: UserRound },
  { label: 'Notifications', href: '/workspace/notifications', icon: Bell },
  { label: 'Support & Help', href: '/workspace/support', icon: MessageCircle },
  { label: 'Membership', href: '/workspace/member', icon: BadgeCheck },
];
export function creatorSection(pathname: string) {
  if (pathname.endsWith('/build')) return 'Course Studio';
  if(pathname.endsWith('/preview'))return 'Course preview';
  if(pathname.endsWith('/publishing'))return 'Course publishing';
  if (pathname === '/workspace/courses/new') return 'New course';
  if (pathname.startsWith('/workspace/courses/')) return 'Course';
  if (pathname === '/workspace/member/billing' || pathname === '/workspace/refunds') return 'Billing & Support';
  return creatorLinks.find(link => (pathname === link.href || (['/workspace/earnings','/workspace/settings','/workspace/analytics','/workspace/support','/workspace/notifications'].includes(link.href) && pathname.startsWith(link.href+'/'))))?.label || 'Creator Workspace';
}
export function CreatorNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Creator Workspace" className="space-y-1">{creatorLinks.map(({ label, href, icon: Icon }) => {
    const active = pathname === href || (['/workspace/earnings','/workspace/settings','/workspace/analytics','/workspace/support','/workspace/notifications'].includes(href) && pathname.startsWith(href+'/')) || (href === '/workspace/courses' && pathname.startsWith(`${href}/`)) || (href === '/workspace/member' && (pathname.startsWith(`${href}/`) || pathname === '/workspace/refunds'));
    return <Link key={href} prefetch={href==='/workspace/analytics'?false:undefined} href={href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon aria-hidden className="size-4 shrink-0" />{label}</Link>;
  })}</nav>;
}
