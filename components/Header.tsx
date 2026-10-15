'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';
import { SearchInput } from './SearchInput';
import { PublicBrand } from './public/PublicUI';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { AccountMenu, MobileAccountLinks } from './public/AccountMenu';
import { completeLogoutNavigation } from '@/app/(auth)/login/actions';
import { resetUser } from '@/lib/analytics';
import { clearClientUser, subscribeClientUser, getClientUser, type ClientUser } from '@/lib/user-session-client';
import './public/public.css';
const desktopLinks = [['/courses', 'Courses'], ['/workspace', 'Workspace'], ['/pricing', 'Course Pricing'], ['/about', 'About'], ['/contact', 'Support']] as const;
const extraLinks = [['/practice', 'Practice Lab'], ['/#benefits', 'Learning features'], ['/#how-it-works', 'How learning works'], ['/#certificate', 'Certificate verification'], ['/faq', 'Learner FAQ']] as const;
export default function Header() {
    const pathname = usePathname();
    const workspace = pathname.startsWith('/workspace');
    const [user, setUser] = useState<ClientUser | null>(null);
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false), [logoutError, setLogoutError] = useState('');
    const logoutPending = useRef(false);
    async function logout() {
      if (logoutPending.current) return;
      logoutPending.current = true; setLoggingOut(true); setLogoutError(''); setOpen(false);
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
        if (!response.ok) throw new Error('logout_failed');
        clearClientUser(); resetUser();
        const result = await completeLogoutNavigation();
        if (result?.error) throw new Error('logout_unconfirmed');
      } catch { setLogoutError('We could not finish signing out. Please try again.'); }
      finally { logoutPending.current = false; setLoggingOut(false); }
    }
    const coursesLink = useRef<HTMLAnchorElement>(null);
    useEffect(() => {
        let active = true;
        const unsubscribe = subscribeClientUser(value => { if (active) setUser(value); });
        getClientUser().then(value => { if (active) setUser(value); });
        return () => { active = false; unsubscribe(); };
    }, []);
    useEffect(() => { setOpen(false); }, [pathname]);
    useEffect(() => {
        const updateScrolled = () => setScrolled(window.scrollY > 16);
        updateScrolled();
        window.addEventListener('scroll', updateScrolled, { passive: true });
        return () => window.removeEventListener('scroll', updateScrolled);
    }, []);
    useEffect(() => {
        const mq = matchMedia('(min-width: 1200px)');
        const close = () => { if (mq.matches)
            setOpen(false); };
        mq.addEventListener('change', close);
        return () => mq.removeEventListener('change', close);
    }, []);
    const active = (href: string) => href === '/workspace' ? workspace : pathname === href || (href === '/courses' && pathname.startsWith('/courses/'));
    return <header className="public-ui public-header" data-scrolled={scrolled}>
    <a href="#public-content" className="public-skip">Skip to content</a>
    <div className="public-container public-header-row">
      <PublicBrand />
      <nav className="public-header-nav" aria-label="Main navigation">{desktopLinks.map(([href, label]) => <Link ref={href === '/courses' ? coursesLink : undefined} key={href} href={href} aria-current={active(href) ? 'page' : undefined}>{label}</Link>)}</nav>
      <div className="public-utilities">
        <DarkModeToggle />
        <div className="public-account-control">{user ? <AccountMenu busy={loggingOut} onLogout={() => void logout()} /> : <Link className="public-account" href="/login" prefetch={false}>Login</Link>}</div>
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
              {user ? <MobileAccountLinks busy={loggingOut} onLogout={() => void logout()} onNavigate={() => setOpen(false)} /> : <Link href="/login" prefetch={false} className="public-button-secondary" onClick={() => setOpen(false)}>Login</Link>}
              <Link href={workspace ? '/workspace/apply' : '/courses'} className="public-button" onClick={() => setOpen(false)}>{workspace ? 'Check Eligibility' : 'Explore Courses'}</Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
    {logoutError && <p role="alert" className="public-account-error">{logoutError} <button type="button" onClick={() => void logout()}>Retry sign out</button></p>}
  </header>;
}
