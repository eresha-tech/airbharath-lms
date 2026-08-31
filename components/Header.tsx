/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { BookMarkedIcon, BookOpen } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "./SearchInput";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>("student");
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const email = user.email?.toLowerCase() || "";
        const isAdmin = email.startsWith("admin@") ||
          email.endsWith("@irii.in") ||
          email === "irii.edtech@gmail.com";
        setRole(isAdmin ? "admin" : "student");

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role) {
          setRole(profile.role);
        }
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const email = currentUser.email?.toLowerCase() || "";
        const isAdmin = email.startsWith("admin@") ||
          email.endsWith("@irii.in") ||
          email === "irii.edtech@gmail.com";
        setRole(isAdmin ? "admin" : "student");

        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", currentUser.id)
          .single();
        if (profile?.role) {
          setRole(profile.role);
        }
      } else {
        setRole("student");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:opacity-90 transition-opacity"
            >
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">
                IRII
              </span>
            </Link>

            <SearchInput />
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <nav>
              <Link
                href="/my-courses"
                className="flex space-x-2 items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors md:border md:border-border md:rounded-md md:px-4 md:py-2"
              >
                <BookMarkedIcon className="h-4 w-4" />
                <span className="hidden md:block">My Courses</span>
              </Link>
            </nav>

            {user ? (
              <Button asChild variant="default" size="default">
                <Link href={role === "admin" ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="default">
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
