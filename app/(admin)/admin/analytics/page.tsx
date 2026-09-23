import React from "react";
import { db } from "@/lib/db";
import {
  modules,
  lessons,
  enrollments,
  progress,
  orders,
  users,
  courses,
  certificates,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import AnalyticsClient, {
  AnalyticsOrder,
  AnalyticsEnrollment,
  AnalyticsProgress,
  AnalyticsCourse,
  AnalyticsUser,
  AnalyticsCertificate,
} from "@/components/admin/AnalyticsClient";
import { queryPostHogBehavioralMetrics } from "@/lib/posthog-query";
import { LineChart } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics & Reports | AirBharath LMS",
  description: "Executive analytics, cohort syllabus progression, verified financial reporting, and product analytics.",
};

export default async function AdminAnalyticsPage() {
  const [
    modulesList,
    lessonsList,
    enrollmentsList,
    progressList,
    ordersList,
    usersList,
    coursesList,
    certificatesList,
    initialBehavioralMetrics,
  ] = await Promise.all([
    db.query.modules.findMany(),
    db.query.lessons.findMany(),
    db.query.enrollments.findMany({
      orderBy: [desc(enrollments.enrolledAt)],
    }),
    db.query.progress.findMany({
      where: eq(progress.isCompleted, true),
      orderBy: [desc(progress.updatedAt)],
    }),
    db.query.orders.findMany({
      with: { user: true, course: true },
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    }),
    db.query.courses.findMany(),
    db.query.certificates.findMany({
      orderBy: [desc(certificates.issuedAt)],
    }),
    queryPostHogBehavioralMetrics("30d"),
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

  const formattedOrders: AnalyticsOrder[] = ordersList.map((o: any) => ({
    id: o.id,
    user_id: o.userId,
    course_id: o.courseId,
    amount: Number(o.amount) || 0,
    status: o.status,
    razorpay_order_id: o.razorpayOrderId,
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

  const formattedEnrollments: AnalyticsEnrollment[] = enrollmentsList.map((e: any) => ({
    id: e.id,
    user_id: e.userId,
    course_id: e.courseId,
    enrolled_at: e.enrolledAt ? new Date(e.enrolledAt).toISOString() : new Date().toISOString(),
  }));

  const formattedProgress: AnalyticsProgress[] = progressList.map((p: any) => ({
    id: p.id,
    user_id: p.userId,
    lesson_id: p.lessonId,
    course_id: lessonToCourse[p.lessonId] || null,
    is_completed: p.isCompleted,
    updated_at: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
  }));

  const formattedCourses: AnalyticsCourse[] = coursesList.map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    price: Number(c.price) || 0,
    is_published: c.isPublished,
    certificate_status: c.certificateStatus || "disabled",
    lesson_count: courseLessonCounts[c.id] || 0,
  }));

  const formattedUsers: AnalyticsUser[] = usersList.map((u: any) => ({
    id: u.id,
    full_name: u.fullName,
    email: u.email,
    role: u.role,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
  }));

  const formattedCertificates: AnalyticsCertificate[] = certificatesList.map((c: any) => ({
    id: c.id,
    user_id: c.userId,
    course_id: c.courseId,
    certificate_number: c.certificateCode || "",
    status: c.status || "issued",
    issued_by: c.issuedBy || null,
    issued_at: c.issuedAt ? new Date(c.issuedAt).toISOString() : new Date().toISOString(),
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <LineChart className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Analytics & Reports
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Audited database metrics and PostHog product telemetry for AirBharath academy.
          </p>
        </div>
      </div>

      <AnalyticsClient
        initialOrders={formattedOrders}
        initialEnrollments={formattedEnrollments}
        initialProgress={formattedProgress}
        initialCourses={formattedCourses}
        initialUsers={formattedUsers}
        initialCertificates={formattedCertificates}
        initialBehavioralMetrics={initialBehavioralMetrics}
        courseLessonCounts={courseLessonCounts}
        enrollmentCompletions={enrollmentCompletions}
        lessonToCourse={lessonToCourse}
      />
    </div>
  );
}
