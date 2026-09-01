import { db } from "@/lib/db";
import { users, courses, enrollments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import StudentsTable from "@/components/admin/StudentsTable";

export const dynamic = "force-dynamic";

export default async function AdminStudents() {
  const studentsList = await db.query.users.findMany({
    where: eq(users.role, "student"),
    orderBy: [desc(users.createdAt)],
  });

  const coursesList = await db.query.courses.findMany({
    orderBy: [desc(courses.createdAt)],
  });

  const enrollmentsList = await db.query.enrollments.findMany();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-instrument-serif text-[#014a62]">
          Students Directory & Course Access
        </h1>
        <p className="text-muted-foreground text-sm">
          Enroll students directly into courses, manage active enrollments, and extend course durations.
        </p>
      </div>

      <StudentsTable
        initialStudents={studentsList.map((s) => ({
          id: s.id,
          phone: s.phone,
          email: s.email,
          full_name: s.fullName,
          avatar_url: s.avatarUrl,
          created_at: s.createdAt.toISOString(),
        }))}
        courses={coursesList.map((c) => ({
          id: c.id,
          title: c.title,
          access_days: c.accessDays,
        }))}
        enrollments={enrollmentsList.map((e) => ({
          id: e.id,
          userId: e.userId,
          courseId: e.courseId,
          enrolledAt: e.enrolledAt.toISOString(),
          expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
          status: e.status,
        }))}
      />
    </div>
  );
}
