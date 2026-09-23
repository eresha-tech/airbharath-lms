"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { studentNavGroups, isRouteActive } from "./SidebarNav";
import { Sparkles } from "lucide-react";

export function MobileSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, setMobileOpen, closeMobile } = useSidebar();

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full"
      >
        {/* Brand Header */}
        <SheetHeader className="h-16 flex flex-row items-center border-b border-sidebar-border px-4 justify-between shrink-0 space-y-0 text-left">
          <SheetTitle asChild>
            <Link
              href="/dashboard"
              onClick={closeMobile}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <img
                src="https://assets.airbharath.in/eresha-logo.webp"
                alt="Airbharath"
                className="h-8 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col leading-tight truncate">
                <span className="font-bold text-base tracking-tight text-foreground font-outfit">
                  AirBharath
                </span>
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                  Student Portal
                </span>
              </div>
            </Link>
          </SheetTitle>
        </SheetHeader>

        {/* Navigation Group Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {studentNavGroups.map((group, groupIdx) => (
            <div key={group.groupTitle || groupIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">
                {group.groupTitle}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isRouteActive(pathname, item.href, item.exact);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={closeMobile}
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

        {/* Footer Info */}
        <div className="p-3 border-t border-sidebar-border shrink-0">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
