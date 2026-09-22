"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  MessageSquare,
  Users,
  CreditCard,
  Tag,
  Briefcase,
  Rss,
  LogOut,
  ChevronLeft,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

export interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface AdminNavGroup {
  groupTitle: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    groupTitle: "Overview",
    items: [
      {
        title: "Executive Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        exact: true,
      },
      {
        title: "Analytics & Growth",
        href: "/admin/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    groupTitle: "Curriculum & Doubts",
    items: [
      {
        title: "Course Management",
        href: "/admin/courses",
        icon: BookOpen,
      },
      {
        title: "Student Doubts & QA",
        href: "/admin/doubts",
        icon: MessageSquare,
      },
    ],
  },
  {
    groupTitle: "Operations & Sales",
    items: [
      {
        title: "Student Directory",
        href: "/admin/students",
        icon: Users,
      },
      {
        title: "Orders & Invoices",
        href: "/admin/orders",
        icon: CreditCard,
      },
      {
        title: "Coupons & Discounts",
        href: "/admin/coupons",
        icon: Tag,
      },
    ],
  },
  {
    groupTitle: "Placement & Community",
    items: [
      {
        title: "Job Board",
        href: "/admin/jobs",
        icon: Briefcase,
      },
      {
        title: "Broadcast Feed",
        href: "/admin/feed",
        icon: Rss,
      },
    ],
  },
];

export function isAdminRouteActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact || href === "/admin") {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

import { track, resetUser } from "@/lib/analytics";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleCollapse } = useSidebar();

  const handleLogout = async () => {
    try {
      track("user_signed_out");
      resetUser();
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      className={cn(
        "fixed top-0 bottom-0 left-0 z-40 hidden lg:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out select-none",
        isCollapsed ? "w-20" : "w-64"
      )}
      aria-label="Admin portal navigation"
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center border-b border-sidebar-border px-4 justify-between shrink-0">
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90",
            isCollapsed && "justify-center w-full"
          )}
          aria-label="Airbharath Admin Dashboard"
        >
          <img
            src="https://assets.airbharath.in/logo.webp"
            alt="Airbharath"
            className="h-8 w-auto object-contain shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col leading-tight truncate">
              <span className="font-bold text-base tracking-tight text-foreground font-outfit">
                Airbharath
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Admin Portal
                </span>
                <span className="inline-flex items-center px-1.5 py-0.2 text-[8px] font-black bg-primary/10 text-primary rounded">
                  PRO
                </span>
              </div>
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

      {/* Admin Badge Banner (when expanded) */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">System Workspace</p>
            <p className="text-xs font-semibold text-foreground truncate">Super Administrator</p>
          </div>
        </div>
      )}

      {/* Navigation Group Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {adminNavGroups.map((group, groupIdx) => (
          <div key={group.groupTitle} className="space-y-1">
            {!isCollapsed ? (
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                {group.groupTitle}
              </p>
            ) : (
              groupIdx > 0 && <div className="my-3 border-t border-sidebar-border mx-2" />
            )}

            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = isAdminRouteActive(pathname, item.href, item.exact);
                const Icon = item.icon;

                if (isCollapsed) {
                  return (
                    <TooltipProvider key={item.href} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
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
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
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

      {/* Footer Navigation Area: Live Student Portal & Logout */}
      <div className="p-3 border-t border-sidebar-border space-y-1.5">
        {isCollapsed ? (
          <>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard"
                    className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="sr-only">Student Portal</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Switch to Student Portal
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Logout
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                Student Portal
              </span>
              <span className="text-[10px] text-muted-foreground/80 font-mono">↗</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
