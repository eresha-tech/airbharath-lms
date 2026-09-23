"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Compass,
  Briefcase,
  Award,
  Newspaper,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/app-version";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

export const studentNavGroups: NavGroup[] = [
  {
    groupTitle: "Academics",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "My Courses",
        href: "/dashboard/courses",
        icon: BookOpen,
      },
      {
        title: "Explore Courses",
        href: "/courses",
        icon: Compass,
      },
    ],
  },
  {
    groupTitle: "Career & Community",
    items: [
      {
        title: "Job Board",
        href: "/dashboard/jobs",
        icon: Briefcase,
      },
      {
        title: "Certificates",
        href: "/dashboard/certificates",
        icon: Award,
      },
      {
        title: "Student Feed",
        href: "/dashboard/feed",
        icon: Newspaper,
      },
    ],
  },
  {
    groupTitle: "Account",
    items: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export function isRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/dashboard") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

export function SidebarNav() {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 left-0 z-40 hidden lg:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
      aria-label="Student dashboard navigation"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center border-b border-sidebar-border px-4 justify-between shrink-0">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90",
            isCollapsed && "justify-center w-full"
          )}
          aria-label="Airbharath LMS Home"
        >
          <img
            src="https://assets.airbharath.in/logo.webp"
            alt="Airbharath"
            className="h-8 w-auto object-contain shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col leading-tight truncate">
              <span className="font-bold text-base tracking-tight text-foreground font-outfit">
                AirBharath
              </span>
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Student Portal
              </span>
            </div>
          )}
        </Link>

        {!isCollapsed && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collapse sidebar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Navigation Group Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {studentNavGroups.map((group, groupIdx) => (
          <div key={group.groupTitle || groupIdx} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                {group.groupTitle}
              </p>
            ) : (
              groupIdx > 0 && <div className="my-3 border-t border-sidebar-border mx-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href, item.exact);
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <TooltipProvider key={item.href} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            prefetch={true}
                            className={cn(
                              "flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="sr-only">{item.title}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-medium text-xs">
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                        isActive
                          ? "text-primary-foreground"
                          : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                      )}
                    />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Info / Placement Card */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        {!isCollapsed ? (
          <div className="p-3.5 bg-sidebar-accent/40 border border-sidebar-border rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-foreground font-bold">Placement Hub</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Complete your enrolled modules to unlock verified placement drives.
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground/60 font-mono">
              <span>AirBharath LMS</span>
              <span>v{APP_VERSION}</span>
            </div>
          </div>
        ) : (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl bg-primary/10 text-primary cursor-default">
                  <Sparkles className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                AirBharath LMS v{APP_VERSION}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </aside>
  );
}
