import type { Metadata } from "next";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { StudentLayoutWrapper } from "@/components/dashboard/StudentLayoutWrapper";

export const metadata: Metadata = {
  title: "Dashboard | AirBharath LMS",
  description: "Your aviation & technical learning dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
    </SidebarProvider>
  );
}
