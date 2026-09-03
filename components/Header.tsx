"use client";

import Link from "next/link";
import { BookMarkedIcon, LayoutGrid, Sparkles, ShieldCheck } from "lucide-react";
import { SearchInput } from "./SearchInput";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => { });
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md backdrop-saturate-150 border-b border-slate-200/70 shadow-[0_4px_20px_-4px_rgba(1,74,98,0.08)] transition-all">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex h-16 items-center justify-between gap-4">

          {/* Left Brand + Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-90 transition-all shrink-0"
            >
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-7 sm:h-8 md:h-9 w-auto object-contain transition-transform hover:scale-105"
              />
            </Link>

            {/* Navbar Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-6 text-xs font-bold text-slate-700">
              <Link
                href="/courses"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#014a62]/10 text-[#014a62] border border-[#014a62]/20 hover:bg-[#014a62] hover:text-white transition-all shadow-2xs"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>All Courses</span>
              </Link>

              <Link
                href="/#why-us"
                className="hover:text-[#014a62] transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#014a62]" />
                <span>Why Air Bharath</span>
              </Link>

              <Link
                href="/#solutions"
                className="hover:text-[#014a62] transition-colors flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#014a62]" />
                <span>Career Solutions</span>
              </Link>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="hidden sm:block">
              <SearchInput />
            </div>

            <nav className="flex items-center">
              <Link
                href="/courses"
                className="lg:hidden flex space-x-1.5 items-center text-xs font-bold text-[#014a62] bg-[#014a62]/10 border border-[#014a62]/20 rounded-xl px-3 py-2"
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Courses</span>
              </Link>

              <Link
                href="/my-courses"
                className="hidden lg:flex space-x-2 items-center text-xs font-bold text-slate-700 hover:text-[#014a62] transition-colors border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/80"
              >
                <BookMarkedIcon className="h-4 w-4 text-[#014a62]" />
                <span>My Courses</span>
              </Link>
            </nav>

            {user ? (
              <Button asChild variant="default" className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs">
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10 font-bold text-xs h-9 px-4 rounded-xl">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
