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
  { href: "/#benefits", label: "Platform", icon: Sparkles },
  { href: "/#how-it-works", label: "How It Works", icon: BookOpen },
  { href: "/#certificate", label: "Certificates", icon: ShieldCheck },
  { href: "/faq", label: "FAQ" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; role: string; fullName?: string; email?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(1,74,98,0.08)]"
          : "bg-white/80 backdrop-blur-sm border-b border-slate-200/50"
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
                src="https://assets.airbharath.in/logo.webp"
                alt="AirBharath LMS"
                className="h-8 md:h-9 w-auto object-contain transition-transform hover:scale-105"
              />
              <span className="hidden sm:inline-block font-outfit font-extrabold text-sm md:text-base text-primary tracking-tight">
                AirBharath <span className="text-primary/70 font-semibold">LMS</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1 text-xs font-semibold text-slate-700">
              <Link
                href="/courses"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                  pathname === "/courses"
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-primary/10 text-primary hover:bg-primary/15 font-bold border border-primary/20"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Explore Courses</span>
              </Link>

              <Link
                href="/#benefits"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors"
              >
                Platform
              </Link>

              <Link
                href="/#how-it-works"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors"
              >
                How It Works
              </Link>

              <Link
                href="/#certificate"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors"
              >
                Certificates
              </Link>

              <Link
                href="/faq"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors"
              >
                FAQ
              </Link>

              <Link
                href="/about"
                className="px-3 py-1.5 rounded-lg hover:text-primary hover:bg-slate-100 transition-colors"
              >
                About
              </Link>
            </nav>
          </div>

          {/* Right Actions (Search + Auth / CTA + Mobile Menu Button) */}
          <div className="flex items-center space-x-2.5 sm:space-x-4">
            <div className="hidden md:block w-48 xl:w-60">
              <SearchInput />
            </div>

            {/* Authenticated vs Unauthenticated Actions */}
            {user ? (
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-50 text-xs font-semibold h-9 rounded-xl"
                >
                  <Link href="/dashboard/courses">
                    <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" />
                    <span>My Learning</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                >
                  <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
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
                  className="text-slate-700 hover:text-primary hover:bg-slate-100 text-xs font-bold h-9 px-3 sm:px-4 rounded-xl"
                >
                  <Link href="/login">Sign In</Link>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-9 px-3.5 sm:px-4 rounded-xl shadow-xs"
                >
                  <Link href="/courses" className="flex items-center gap-1.5">
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
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-primary hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
        <div className="lg:hidden border-b border-slate-200 bg-white/98 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="pt-1">
            <SearchInput />
          </div>

          <nav className="flex flex-col space-y-1 text-sm font-semibold text-slate-700 pt-2 border-t border-slate-100">
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
                      : "hover:bg-slate-100 hover:text-primary"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <>
                <Button asChild className="w-full bg-primary text-white font-bold h-10 rounded-xl">
                  <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>
                    Go to {user.role === "admin" ? "Admin Portal" : "Student Dashboard"}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full text-slate-700 h-10 rounded-xl">
                  <Link href="/dashboard/courses">My Enrolled Courses</Link>
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="w-full text-slate-700 h-10 rounded-xl font-bold text-xs">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild className="w-full bg-primary text-white font-bold h-10 rounded-xl text-xs">
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
