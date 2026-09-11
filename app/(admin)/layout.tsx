import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Airbharath Admin Portal",
  description: "Airbharath LMS management and metrics dashboard.",
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
    <div className="min-h-screen bg-muted/20">
      <AdminSidebar />
      <div className="pl-0 md:pl-64 min-h-screen flex flex-col">
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
