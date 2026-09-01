"use client";

import Link from "next/link";
import Image from "next/image";
import { BookMarkedIcon } from "lucide-react";
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
      .catch(() => {});
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-90 transition-opacity"
            >
              <img
                src="https://assets.airbharath.in/logo.webp"
                alt="Airbharath LMS"
                className="h-9 w-auto object-contain"
              />
              <span className="text-xl font-bold font-instrument-serif text-[#014a62] tracking-tight">
                Airbharath LMS
              </span>
            </Link>

            <SearchInput />
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <nav>
              <Link
                href="/my-courses"
                className="flex space-x-2 items-center text-sm font-medium text-foreground/80 hover:text-[#014a62] transition-colors border border-border rounded-md px-3 py-1.5"
              >
                <BookMarkedIcon className="h-4 w-4" />
                <span className="hidden md:block">My Courses</span>
              </Link>
            </nav>

            {user ? (
              <Button asChild variant="default" className="bg-[#014a62] hover:bg-[#01374a] text-white">
                <Link href={user.role === "admin" ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
