import { db } from "@/lib/db";
import { users, enrollments, orders, lessons, progress } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import AdminDashboardClient from "@/components/admin/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [usersList, enrollmentsList, ordersList, lessonsList, progressList] = await Promise.all([
    db.query.users.findMany(),
    db.query.enrollments.findMany(),
    db.query.orders.findMany({
      with: { user: true, course: true },
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.lessons.findMany(),
    db.query.progress.findMany({ where: eq(progress.isCompleted, true) }),
  ]);

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
      lessonsCount={lessonsList.length}
      completedProgressCount={progressList.length}
    />
  );
}
