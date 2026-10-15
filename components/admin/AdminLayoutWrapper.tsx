"use client";

import { usePathname } from 'next/navigation';
import { AdminWorkspaceShell, workspaceAdminRoute } from './WorkspaceShell';
import { useSidebar } from "@/components/providers/sidebar-provider";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const path = usePathname();
  if (workspaceAdminRoute(path)) return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Sidebar */}
      <AdminSidebar />

      {/* Mobile Drawer Navigation */}
      <AdminMobileNav />

      {/* Main Content Frame */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <AdminHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
