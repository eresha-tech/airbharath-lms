"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { adminNavGroups, isAdminRouteActive } from "@/components/admin/AdminSidebar";
import { cn } from "@/lib/utils";
import { X, LogOut, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileOpen, closeMobile } = useSidebar();

  const handleLogout = async () => {
    closeMobile();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      window.location.href = "/login";
    }
  };

  if (!isMobileOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border shrink-0">
          <Link
            href="/admin"
            onClick={closeMobile}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <img
              src="https://assets.airbharath.in/eresha-logo.webp"
              alt="Airbharath"
              className="h-8 w-auto object-contain"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-base tracking-tight text-foreground font-outfit">
                AirBharath
              </span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Admin Portal
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeMobile}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Admin Badge Banner */}
        <div className="m-3 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">System Workspace</p>
            <p className="text-xs font-semibold text-foreground truncate">Super Administrator</p>
          </div>
        </div>

        {/* Grouped Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {adminNavGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                {group.groupTitle}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isAdminRouteActive(pathname, item.href, item.exact);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-sidebar-border space-y-1.5 shrink-0">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              Student Portal
            </span>
            <span className="text-[10px] font-mono">↗</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
