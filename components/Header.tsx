"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutGrid,
  ShieldCheck,
  Menu,
  X,
  User,
  ArrowRight,
  Sparkles,
  Search,
} from "lucide-react";
import { SearchInput } from "./SearchInput";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/courses", label: "All Courses", icon: LayoutGrid },
  { href: "/workspace", label: "Workspace", icon: BookOpen },
  { href: "/#benefits", label: "Platform", icon: Sparkles },
  { href: "/#how-it-works", label: "How It Works", icon: BookOpen },
  { href: "/#certificate", label: "Certificates", icon: ShieldCheck },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

import { getClientUser, ClientUser } from "@/lib/user-session-client";
import { DarkModeToggle } from "@/components/DarkModeToggle";

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<ClientUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    getClientUser()
      .then((data) => {
        if (data) {
          setUser(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border/80 shadow-[0_4px_20px_-4px_rgba(1,74,98,0.08)] dark:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
          : "bg-background/80 backdrop-blur-sm border-b border-border/50"
      }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left Brand + Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-90 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              aria-label="AirBharath LMS Homepage"
            >
              <img
                src="https://assets.airbharath.in/eresha-logo.webp"
                alt="AirBharath LMS"
                className="h-8 md:h-9 w-auto object-contain transition-transform hover:scale-105"
              />
              <span className="hidden sm:inline-block font-outfit font-extrabold text-sm md:text-base text-primary tracking-tight">
                AirBharath <span className="text-primary/70 font-semibold">LMS</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 text-xs font-semibold text-foreground/80">
              <Link href="/workspace" className={`hidden xl:block px-3 py-1.5 rounded-lg transition-colors ${pathname === "/workspace" ? "text-primary font-bold bg-muted" : "hover:text-primary hover:bg-muted"}`}>
                Workspace
              </Link>
              <Link
                href="/courses"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                  pathname === "/courses"
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : "bg-primary/10 text-primary hover:bg-primary/15 font-bold border border-primary/20"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Explore Courses</span>
              </Link>

              <Link
                href="/pricing"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === "/pricing"
                    ? "text-primary font-bold bg-muted"
                    : "hover:text-primary hover:bg-muted"
                }`}
              >
                Pricing
              </Link>

              <Link
                href="/faq"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === "/faq"
                    ? "text-primary font-bold bg-muted"
                    : "hover:text-primary hover:bg-muted"
                }`}
              >
                FAQ
              </Link>

              <Link
                href="/about"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === "/about"
                    ? "text-primary font-bold bg-muted"
                    : "hover:text-primary hover:bg-muted"
                }`}
              >
                About
              </Link>

              <Link
                href="/contact"
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  pathname === "/contact"
                    ? "text-primary font-bold bg-muted"
                    : "hover:text-primary hover:bg-muted"
                }`}
              >
                Contact
              </Link>
            </nav>
          </div>

          {/* Right Actions (Search + Theme + Auth / CTA + Mobile Menu Button) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden md:block w-44 xl:w-56">
              <SearchInput />
            </div>

            {/* Theme Switcher */}
            <DarkModeToggle />

            {/* Authenticated vs Unauthenticated Actions */}
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex border-border text-foreground hover:text-primary hover:bg-muted text-xs font-semibold h-9 rounded-xl"
                >
                  <Link href="/dashboard/courses" prefetch={true}>
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    <span>My Learning</span>
                  </Link>
                </Button>

                <Link href="/workspace/dashboard" className="hidden rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:text-primary sm:inline-flex">Workspace</Link>

                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                >
                  <Link href={user.role === "admin" ? "/admin" : "/dashboard"} prefetch={true}>
                    <User className="w-3.5 h-3.5 mr-1.5" />
                    <span>{user.role === "admin" ? "Admin Portal" : "Dashboard"}</span>
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-foreground/80 hover:text-primary hover:bg-muted text-xs font-bold h-9 px-3 sm:px-4 rounded-xl"
                >
                  <Link href="/login" prefetch={true}>Sign In</Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-xs"
                >
                  <Link href="/courses" prefetch={true} className="flex items-center gap-1.5">
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-foreground hover:text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-border bg-background/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="pt-1">
            <SearchInput />
          </div>

          <nav className="flex flex-col space-y-1 text-sm font-semibold text-foreground/90 pt-2 border-t border-border/60">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted hover:text-primary"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
            {user ? (
              <>
                <Button asChild className="w-full bg-primary text-primary-foreground font-bold h-10 rounded-xl">
                  <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
                    Go to {user.role === "admin" ? "Admin Portal" : "Student Dashboard"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full text-foreground h-10 rounded-xl">
                  <Link href="/dashboard/courses">My Learning</Link>
                </Button>
                <Button asChild variant="outline" className="w-full text-foreground h-10 rounded-xl"><Link href="/workspace/dashboard">Workspace</Link></Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="w-full text-foreground h-10 rounded-xl font-bold text-xs">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full bg-primary text-primary-foreground font-bold h-10 rounded-xl text-xs">
                  <Link href="/courses">Explore Courses</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
