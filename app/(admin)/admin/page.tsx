/* eslint-disable @typescript-eslint/no-explicit-any */
import { createAdminClient } from "@/lib/supabase-server";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // Fetch real data from the database in parallel using Admin Client to bypass RLS
  const [
    usersRes,
    enrollmentsRes,
    ordersRes,
    lessonsRes,
    progressRes
  ] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role, created_at"),
    supabase.from("enrollments").select("id, user_id, course_id, enrolled_at"),
    supabase.from("orders").select(`
      id,
      user_id,
      course_id,
      amount,
      status,
      created_at,
      users (
        full_name,
        email
      ),
      courses (
        title
      )
    `).order("created_at", { ascending: false }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
    supabase.from("progress").select("*", { count: "exact", head: true }).eq("is_completed", true)
  ]);

  const users = usersRes.data;
  const enrollments = enrollmentsRes.data;
  const orders = ordersRes.data;
  const lessonsCount = lessonsRes.count;
  const completedProgressCount = progressRes.count;

  return (
    <AdminDashboardClient
      initialUsers={users || []}
      initialEnrollments={enrollments || []}
      initialOrders={orders || []}
      lessonsCount={lessonsCount || 0}
      completedProgressCount={completedProgressCount || 0}
    />
  );
}
