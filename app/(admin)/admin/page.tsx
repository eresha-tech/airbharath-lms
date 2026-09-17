import { db } from "@/lib/db";
import { users, enrollments, orders, lessons, progress, modules } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [usersList, enrollmentsList, ordersList, lessonsList, progressList, modulesList] = await Promise.all([
    db.query.users.findMany(),
    db.query.enrollments.findMany(),
    db.query.orders.findMany({
      with: { user: true, course: true },
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.lessons.findMany(),
    db.query.progress.findMany({ where: eq(progress.isCompleted, true) }),
    db.query.modules.findMany(),
  ]);

  // Map modules to courses
  const moduleToCourse: Record<string, string> = {};
  modulesList.forEach((m: any) => {
    moduleToCourse[m.id] = m.courseId;
  });

  // Calculate actual lesson count per course
  const courseLessonCounts: Record<string, number> = {};
  const lessonToCourse: Record<string, string> = {};
  lessonsList.forEach((l: any) => {
    const cId = moduleToCourse[l.moduleId];
    if (cId) {
      lessonToCourse[l.id] = cId;
      courseLessonCounts[cId] = (courseLessonCounts[cId] || 0) + 1;
    }
  });

  // Calculate completed lessons per user per course
  const enrollmentCompletions: Record<string, number> = {};
  progressList.forEach((p: any) => {
    const cId = lessonToCourse[p.lessonId];
    if (cId) {
      const key = `${p.userId}_${cId}`;
      enrollmentCompletions[key] = (enrollmentCompletions[key] || 0) + 1;
    }
  });

  const formattedOrders = ordersList.map((o: any) => ({
    id: o.id,
    user_id: o.userId,
    course_id: o.courseId,
    amount: o.amount,
    status: o.status,
    created_at: o.createdAt,
    users: {
      full_name: o.user?.fullName,
      email: o.user?.email,
    },
    courses: {
      title: o.course?.title,
    },
  }));

  const formattedUsers = usersList.map((u: any) => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    created_at: u.createdAt,
  }));

  const formattedEnrollments = enrollmentsList.map((e: any) => ({
    id: e.id,
    user_id: e.userId,
    course_id: e.courseId,
    enrolled_at: e.createdAt,
  }));

  return (
    <AdminDashboardClient
      initialUsers={formattedUsers}
      initialEnrollments={formattedEnrollments}
      initialOrders={formattedOrders}
      courseLessonCounts={courseLessonCounts}
      enrollmentCompletions={enrollmentCompletions}
    />
  );
}
