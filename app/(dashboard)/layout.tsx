import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { StudentLayoutWrapper } from "@/components/dashboard/StudentLayoutWrapper";

export const metadata: Metadata = {
  title: "Dashboard | IRII Finishing School",
  description: "Your structural engineering learning dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SidebarProvider>
        <StudentLayoutWrapper>{children}</StudentLayoutWrapper>
      </SidebarProvider>
    </ThemeProvider>
  );
}
