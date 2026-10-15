'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const destinations = [
  { href: '/dashboard', label: 'My Learning', description: 'Courses, progress and certificates' },
  { href: '/workspace/apply', label: 'Creator Workspace', description: 'Creator profile, proposals and course drafts' },
  { href: '/dashboard/settings', label: 'Account Settings', description: 'Your profile and preferences' },
] as const;
type Props = { busy: boolean; onLogout: () => void };
export function AccountMenu({ busy, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild><button type="button" disabled={busy} className="public-account" aria-label="My Account">{busy ? 'Signing out…' : 'My Account'}<ChevronDown size={14} aria-hidden /></button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={12} collisionPadding={12} className="public-ui public-account-menu">
      {destinations.map(item => <DropdownMenuItem key={item.href} asChild><Link href={item.href} prefetch={false} className="public-account-destination" onClick={() => setOpen(false)}><span>{item.label}</span><small>{item.description}</small></Link></DropdownMenuItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled={busy} onSelect={onLogout}>Log Out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
export function MobileAccountLinks({ busy, onLogout, onNavigate }: Props & { onNavigate: () => void }) {
  return <nav aria-label="Account navigation" className="public-mobile-account">
    {destinations.map(item => <Link key={item.href} href={item.href} prefetch={false} className="public-account-destination" onClick={onNavigate}><span>{item.label}</span><small>{item.description}</small></Link>)}
    <button type="button" disabled={busy} onClick={onLogout}>{busy ? 'Signing out…' : 'Log Out'}</button>
  </nav>;
}
