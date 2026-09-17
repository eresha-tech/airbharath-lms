import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/providers/sidebar-provider";
import { AdminLayoutWrapper } from "@/components/admin/AdminLayoutWrapper";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Airbharath Admin Portal",
  description: "Airbharath LMS management, curriculum, and metrics dashboard.",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  if (session.role !== "admin") {
    return redirect("/dashboard");
  }

  return (
    <SidebarProvider>
      <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
    </SidebarProvider>
  );
}

