"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/dashboard/UserMenu";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Compass,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getBreadcrumb(pathname: string): { group: string; page: string } {
  if (pathname === "/dashboard") {
    return { group: "Academics", page: "Overview" };
  }
  if (pathname.startsWith("/dashboard/courses")) {
    return { group: "Academics", page: "My Courses" };
  }
  if (pathname.startsWith("/dashboard/certificates")) {
    return { group: "Career", page: "Certificates" };
  }
  if (pathname.startsWith("/dashboard/jobs")) {
    return { group: "Career", page: "Job Board" };
  }
  if (pathname.startsWith("/dashboard/feed")) {
    return { group: "Community", page: "Student Feed" };
  }
  if (pathname.startsWith("/dashboard/settings")) {
    return { group: "Account", page: "Settings" };
  }
  if (pathname.startsWith("/courses")) {
    return { group: "Academics", page: "Explore Catalog" };
  }
  return { group: "Student Portal", page: "Dashboard" };
}

export function DashboardHeader() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left Area: Toggles & Breadcrumb */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMobile}
          className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
          aria-label="Open mobile navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Desktop sidebar toggle button */}
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

      {/* Right Area: Catalog link & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/courses"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Explore Catalog</span>
        </Link>

        <div className="h-4 w-px bg-border hidden sm:block" />

        <UserMenu />
      </div>
    </header>
  );
}
