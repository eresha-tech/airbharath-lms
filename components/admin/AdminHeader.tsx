"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { Button } from "@/components/ui/button";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  LogOut,
  User,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function getAdminBreadcrumb(pathname: string): { group: string; page: string } {
  if (pathname === "/admin") {
    return { group: "Overview", page: "Executive Dashboard" };
  }
  if (pathname.startsWith("/admin/analytics")) {
    return { group: "Overview", page: "Analytics & Growth" };
  }
  if (pathname === "/admin/courses/new") {
    return { group: "Curriculum", page: "Add New Course" };
  }
  if (pathname.startsWith("/admin/courses/")) {
    return { group: "Curriculum", page: "Course Editor" };
  }
  if (pathname.startsWith("/admin/courses")) {
    return { group: "Curriculum", page: "Course Management" };
  }
  if (pathname.startsWith("/admin/doubts")) {
    return { group: "Curriculum", page: "Student Doubts & QA" };
  }
  if (pathname.startsWith("/admin/students")) {
    return { group: "Operations", page: "Student Directory & Access" };
  }
  if (pathname.startsWith("/admin/orders")) {
    return { group: "Operations", page: "Orders & Invoices" };
  }
  if (pathname.startsWith("/admin/coupons")) {
    return { group: "Marketing", page: "Coupons & Discounts" };
  }
  if (pathname.startsWith("/admin/jobs")) {
    return { group: "Placement", page: "Job Board Manager" };
  }
  if (pathname.startsWith("/admin/feed")) {
    return { group: "Community", page: "Broadcast Feed" };
  }
  return { group: "Admin", page: "Dashboard" };
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar();
  const breadcrumb = getAdminBreadcrumb(pathname);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left Area: Toggles & Breadcrumbs */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile drawer toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobile}
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar collapse toggle */}
        <div className="hidden lg:block">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Breadcrumb Context */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm">
          <span className="text-muted-foreground font-medium hidden sm:inline">
            {breadcrumb.group}
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 hidden sm:inline" />
          <span className="font-bold text-foreground font-outfit">
            {breadcrumb.page}
          </span>
        </nav>
      </div>

      {/* Right Area: Student Portal shortcut & Admin User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Switch to Live Student Portal */}
        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/80 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          <span>Student Portal</span>
        </Link>

        {/* Admin Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/40 transition-all p-0"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  AD
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/80">
            <DropdownMenuLabel className="font-normal px-2 py-1.5">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-foreground leading-none">System Admin</p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-primary/10 text-primary rounded">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-none truncate">
                  admin@airbharath.in
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs font-medium py-2">
              <Link href="/admin" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Executive Dashboard</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs font-medium py-2">
              <Link href="/dashboard" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Student View</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer rounded-xl text-xs font-semibold py-2 text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
