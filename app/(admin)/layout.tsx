import type { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/Sidebar";

export const metadata: Metadata = {
  title: "IRII Admin Portal",
  description: "IRII management and metrics dashboard.",
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Fetch user role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
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
