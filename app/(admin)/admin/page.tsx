import { db } from "@/lib/db";
import { users, enrollments, orders, lessons, progress, modules, courses } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Executive Overview | AirBharath LMS",
  description: "Executive operations dashboard, revenue analytics, and student learning metrics.",
};

export default async function AdminDashboardPage() {
  const [
    usersList,
    enrollmentsList,
    ordersList,
    lessonsList,
    progressList,
    modulesList,
    coursesList,
  ] = await Promise.all([
    db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    }),
    db.query.enrollments.findMany({
      orderBy: [desc(enrollments.enrolledAt)],
    }),
    db.query.orders.findMany({
      with: { user: true, course: true },
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.lessons.findMany(),
    db.query.progress.findMany({
      where: eq(progress.isCompleted, true),
      orderBy: [desc(progress.updatedAt)],
    }),
    db.query.modules.findMany(),
    db.query.courses.findMany(),
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
    created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    users: {
      full_name: o.user?.fullName || null,
      email: o.user?.email || null,
    },
    courses: {
      title: o.course?.title || null,
      slug: o.course?.slug || null,
    },
  }));

  const formattedUsers = usersList.map((u: any) => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
  }));

  const formattedEnrollments = enrollmentsList.map((e: any) => ({
    id: e.id,
    user_id: e.userId,
    course_id: e.courseId,
    enrolled_at: e.enrolledAt ? new Date(e.enrolledAt).toISOString() : new Date().toISOString(),
  }));

  const formattedProgress = progressList.map((p: any) => ({
    id: p.id,
    user_id: p.userId,
    lesson_id: p.lessonId,
    course_id: lessonToCourse[p.lessonId] || null,
    is_completed: p.isCompleted,
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const formattedCourses = coursesList.map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    price: Number(c.price) || 0,
    is_published: c.isPublished,
    lesson_count: courseLessonCounts[c.id] || 0,
  }));

  return (
    <AdminDashboardClient
      initialUsers={formattedUsers}
      initialEnrollments={formattedEnrollments}
      initialOrders={formattedOrders}
      initialProgress={formattedProgress}
      initialCourses={formattedCourses}
      courseLessonCounts={courseLessonCounts}
      enrollmentCompletions={enrollmentCompletions}
      lessonToCourse={lessonToCourse}
    />
  );
}
