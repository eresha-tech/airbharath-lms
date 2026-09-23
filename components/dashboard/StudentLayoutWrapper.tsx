"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { MobileSidebar } from "@/components/dashboard/MobileSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { cn } from "@/lib/utils";

export function StudentLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  // Hide the global student dashboard topbar/sidebar inside specific course & lesson classroom view
  const isCourseOrLessonView =
    pathname.startsWith("/dashboard/courses/") || pathname.includes("/lessons/");

  if (isCourseOrLessonView) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop Sidebar */}
      <SidebarNav />

      {/* Mobile Drawer Navigation */}
      <MobileSidebar />

      {/* Main Content Frame */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <DashboardHeader />
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
