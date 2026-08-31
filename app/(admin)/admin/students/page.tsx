import { createAdminClient } from "@/lib/supabase-server";
import StudentsTable from "@/components/admin/StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminStudents() {
  const supabase = createAdminClient();

  // Fetch all students using Admin client to bypass RLS policies
  const { data: students } = await supabase
    .from("users")
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      created_at
    `)
    .eq("role", "student")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      {/* Top Section */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Students Directory</h1>
        <p className="text-muted-foreground text-sm">Monitor course enrollment and progress across all your students.</p>
      </div>

      {/* Interactive Students Table Component */}
      <StudentsTable initialStudents={students || []} />
    </div>
  );
}
