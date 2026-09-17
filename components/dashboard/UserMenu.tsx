"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  Settings,
  BookOpen,
  Award,
  LogOut,
  ChevronDown,
  Loader2,
} from "lucide-react";

interface UserProfile {
  id: string;
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export function UserMenu() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.fullName || "Student";
  const displayEmail = user?.email || "";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 flex items-center gap-2.5 px-2 rounded-xl hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          aria-label="User profile menu"
        >
          <Avatar className="h-8 w-8 rounded-lg border border-border/80">
            {user?.avatarUrl && (
              <AvatarImage
                src={user.avatarUrl}
                alt={displayName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold rounded-lg">
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                initials
              )}
            </AvatarFallback>
          </Avatar>

          <div className="hidden md:flex flex-col items-start text-left text-xs leading-tight">
            <span className="font-semibold text-foreground truncate max-w-[130px]">
              {displayName}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">
              {user?.role === "admin" ? "Administrator" : "Student"}
            </span>
          </div>

          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56 p-1.5 shadow-lg border-border"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal px-2 py-1.5">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-foreground truncate">
                {displayName}
              </p>
              <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded bg-primary/10 text-primary">
                {user?.role === "admin" ? "Admin" : "Student"}
              </span>
            </div>
            {displayEmail && (
              <p className="text-[11px] text-muted-foreground truncate">
                {displayEmail}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2 rounded-md"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Profile & Account</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/courses"
              className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2 rounded-md"
            >
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              <span>My Learning</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/certificates"
              className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2 rounded-md"
            >
              <Award className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Certificates</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2 rounded-md"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-2 cursor-pointer text-xs py-2 px-2 rounded-md text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          {isLoggingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
