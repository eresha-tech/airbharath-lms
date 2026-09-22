import React from "react";
import { db } from "@/lib/db";
import { users, courses, enrollments, certificates, orders, progress } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import StudentsTable from "@/components/admin/StudentsTable";
import { Users, GraduationCap, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminStudents() {
  const [
    studentsList,
    coursesList,
    enrollmentsList,
    certificatesList,
    ordersList,
    progressList,
  ] = await Promise.all([
    db.query.users.findMany({
      where: eq(users.role, "student"),
      orderBy: [desc(users.createdAt)],
    }),
    db.query.courses.findMany({
      orderBy: [desc(courses.createdAt)],
      with: {
        modules: {
          with: {
            lessons: true,
          },
        },
      },
    }),
    db.query.enrollments.findMany({
      orderBy: [desc(enrollments.enrolledAt)],
    }),
    db.query.certificates.findMany({
      orderBy: [desc(certificates.issuedAt)],
    }),
    db.query.orders.findMany({
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.progress.findMany(),
  ]);

  // Format courses with lesson IDs and total counts for progress tracking
  const formattedCourses = coursesList.map((c) => {
    const lessonIds: string[] = [];
    c.modules?.forEach((m) => {
      m.lessons?.forEach((l) => {
        lessonIds.push(l.id);
      });
    });

    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      thumbnailUrl: c.thumbnailUrl,
      access_days: c.accessDays,
      price: Number(c.price || 0),
      totalLessons: lessonIds.length,
      lessonIds,
      certificateStatus: (c.certificateStatus || "disabled") as "disabled" | "active" | "paused",
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Students & Learners Management
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Manage registered learners, monitor course completion progress, issue credentials, and grant manual course enrollments.
          </p>
        </div>
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
        courses={formattedCourses}
        enrollments={enrollmentsList.map((e) => ({
          id: e.id,
          userId: e.userId,
          courseId: e.courseId,
          enrolledAt: e.enrolledAt.toISOString(),
          expiresAt: e.expiresAt ? e.expiresAt.toISOString() : null,
          status: e.status,
        }))}
        certificates={certificatesList.map((c) => ({
          id: c.id,
          userId: c.userId,
          courseId: c.courseId,
          certificateCode: c.certificateCode,
          pdfUrl: c.pdfUrl,
          issuedAt: c.issuedAt.toISOString(),
        }))}
        orders={ordersList.map((o) => ({
          id: o.id,
          userId: o.userId,
          courseId: o.courseId,
          razorpayOrderId: o.razorpayOrderId,
          razorpayPaymentId: o.razorpayPaymentId,
          amount: o.amount,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
        }))}
        progressRecords={progressList.map((p) => ({
          userId: p.userId,
          lessonId: p.lessonId,
          isCompleted: p.isCompleted,
        }))}
      />
    </div>
  );
}
