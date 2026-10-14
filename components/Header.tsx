'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';
import { SearchInput } from './SearchInput';
import { PublicBrand } from './public/PublicUI';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { getClientUser, type ClientUser } from '@/lib/user-session-client';
import './public/public.css';
const desktopLinks = [['/courses', 'Courses'], ['/workspace', 'Workspace'], ['/pricing', 'Course Pricing'], ['/about', 'About'], ['/contact', 'Support']] as const;
const extraLinks = [['/practice', 'Practice Lab'], ['/#benefits', 'Learning features'], ['/#how-it-works', 'How learning works'], ['/#certificate', 'Certificate verification'], ['/faq', 'Learner FAQ']] as const;
export default function Header() {
    const pathname = usePathname();
    const workspace = pathname.startsWith('/workspace');
    const [user, setUser] = useState<ClientUser | null>(null);
    const [open, setOpen] = useState(false);
    const coursesLink = useRef<HTMLAnchorElement>(null);
    useEffect(() => { let active = true; getClientUser().then(value => { if (active)
        setUser(value); }).catch(() => { }); return () => { active = false; }; }, []);
    useEffect(() => { setOpen(false); }, [pathname]);
    useEffect(() => {
        const mq = matchMedia('(min-width: 1200px)');
        const close = () => { if (mq.matches)
            setOpen(false); };
        mq.addEventListener('change', close);
        return () => mq.removeEventListener('change', close);
    }, []);
    const active = (href: string) => href === '/workspace' ? workspace : pathname === href || (href === '/courses' && pathname.startsWith('/courses/'));
    const accountHref = user?.role === 'admin' ? '/admin' : user ? '/dashboard' : '/login';
    const accountLabel = user ? 'My Account' : 'Login';
    return <header className="public-ui public-header">
    <a href="#public-content" className="public-skip">Skip to content</a>
    <div className="public-container public-header-row">
      <PublicBrand />
      <nav className="public-header-nav" aria-label="Main navigation">{desktopLinks.map(([href, label]) => <Link ref={href === '/courses' ? coursesLink : undefined} key={href} href={href} aria-current={active(href) ? 'page' : undefined}>{label}</Link>)}</nav>
      <div className="public-utilities">
        <DarkModeToggle />
        <Link className="public-account" href={accountHref}>{accountLabel}</Link>
        <Link className="public-button public-header-cta" href={workspace ? '/workspace/apply' : '/courses'}>{workspace ? 'Check Eligibility' : 'Explore Courses'}</Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
    <button type="button" className="public-menu-trigger" aria-label="Open menu" aria-expanded={open}>
    <Menu size={22} aria-hidden="true"/>
    </button>
    </SheetTrigger>
          <SheetContent className="public-ui public-drawer" side="right">
            <SheetTitle className="pr-12 font-outfit text-xl">Explore AirBharath</SheetTitle>
            <SheetDescription>Courses, Creator Workspace and support.</SheetDescription>
            <div data-public-search>
    <SearchInput onNavigate={() => setOpen(false)}/>
    </div>
            <nav aria-label="Mobile navigation">{[...desktopLinks, ...extraLinks].map(([href, label]) => <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
            <div className="mt-6 grid gap-2 border-t border-border pt-5">
              <Link href={accountHref} className="public-button-secondary" onClick={() => setOpen(false)}>{accountLabel}</Link>
              {user && <>
        <Link className="public-text-link" href="/dashboard/courses" onClick={() => setOpen(false)}>My Learning</Link>
        <Link className="public-text-link" href="/workspace/dashboard" onClick={() => setOpen(false)}>My Workspace</Link>
        </>}
              <Link href={workspace ? '/workspace/apply' : '/courses'} className="public-button" onClick={() => setOpen(false)}>{workspace ? 'Check Eligibility' : 'Explore Courses'}</Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>;
}
