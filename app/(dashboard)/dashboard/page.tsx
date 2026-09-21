import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress, certificates, jobs } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ContinueLearningCard } from "@/components/dashboard/ContinueLearningCard";
import { EnrolledCourseCard } from "@/components/dashboard/EnrolledCourseCard";
import { CertificatesCard } from "@/components/dashboard/CertificatesCard";
import { PlacementHighlightsCard } from "@/components/dashboard/PlacementHighlightsCard";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "admin") {
    redirect("/admin");
  }

  // Retrieve user enrollments
  const studentEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, session.id),
  });

  const courseIds = studentEnrollments.map((e: any) => e.courseId);

  // Retrieve enrolled courses with curriculum modules and lessons
  const enrolledCourses =
    courseIds.length > 0
      ? await db.query.courses.findMany({
          where: inArray(courses.id, courseIds),
          with: {
            modules: {
              with: {
                lessons: true,
              },
            },
          },
        })
      : [];

  // Retrieve student progress & certificates in parallel with recent jobs
  const [studentProgress, studentCertificates, recentJobs] = await Promise.all([
    db.query.progress.findMany({
      where: eq(progress.userId, session.id),
    }),
    db.query.certificates.findMany({
      where: eq(certificates.userId, session.id),
    }),
    db.query.jobs.findMany({
      orderBy: [desc(jobs.createdAt)],
      limit: 3,
    }),
  ]);

  const completedLessonIds = new Set(
    studentProgress
      .filter((p: any) => p.isCompleted)
      .map((p: any) => p.lessonId)
  );

  const now = new Date();

  // Compute status, progress percentage, and resume lesson for each course
  const coursesWithStatus = studentEnrollments
    .map((enr: any) => {
      const courseObj = enrolledCourses.find((c: any) => c.id === enr.courseId);
      if (!courseObj) return null;

      const isExpired = enr.expiresAt && new Date(enr.expiresAt) < now;

      const lessonsList: any[] = [];
      (courseObj.modules as any[])?.forEach((m: any) => {
        if (m.lessons) lessonsList.push(...m.lessons);
      });

      lessonsList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      const totalLessons = lessonsList.length;
      const completedLessons = lessonsList.filter((l) =>
        completedLessonIds.has(l.id)
      ).length;
      const percent =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      let resumeLessonId = lessonsList[0]?.id || "";
      let resumeLessonTitle = lessonsList[0]?.title || "";
      const incomplete = lessonsList.find(
        (l) => !completedLessonIds.has(l.id)
      );
      if (incomplete) {
        resumeLessonId = incomplete.id;
        resumeLessonTitle = incomplete.title;
      }

      return {
        id: courseObj.id,
        title: courseObj.title,
        slug: (courseObj as any).slug || null,
        thumbnailUrl: (courseObj as any).thumbnailUrl || null,
        enrollmentId: enr.id,
        expiresAt: enr.expiresAt,
        isExpired,
        totalLessons,
        completedLessons,
        percent,
        resumeLessonId,
        resumeLessonTitle,
      };
    })
    .filter((c: any): c is NonNullable<typeof c> => c !== null);

  // Derive metrics safely from existing real data
  const enrolledCount = coursesWithStatus.length;
  const activeCount = coursesWithStatus.filter((c) => !c.isExpired).length;
  const completedCount = coursesWithStatus.filter((c) => c.percent === 100).length;
  const allCompleted = enrolledCount > 0 && coursesWithStatus.every((c) => c.percent === 100);
  const completedLessonsCount = completedLessonIds.size;
  const totalLessonsAcrossAllCourses = coursesWithStatus.reduce(
    (acc, c) => acc + c.totalLessons,
    0
  );
  const averageProgress =
    enrolledCount > 0
      ? Math.round(
          coursesWithStatus.reduce((acc, c) => acc + c.percent, 0) / enrolledCount
        )
      : 0;
  const certificatesCount = studentCertificates.length;

  // Active course with highest continuation relevance (first in-progress, or first active)
  const continueCourse =
    coursesWithStatus.find((c) => !c.isExpired && c.percent < 100 && c.totalLessons > 0) ||
    coursesWithStatus.find((c) => !c.isExpired && c.totalLessons > 0);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Welcome Hero Section */}
      <DashboardWelcome
        userName={session.fullName || "Student"}
        hasCourses={enrolledCount > 0}
        allCompleted={allCompleted}
        continueUrl={
          continueCourse
            ? `/dashboard/courses/${continueCourse.id}/lessons/${continueCourse.resumeLessonId}`
            : undefined
        }
        continueCourseTitle={continueCourse?.title}
        continueLessonTitle={continueCourse?.resumeLessonTitle}
      />

      {/* 2. Primary Learning Focus (Visual Spotlight) */}
      {continueCourse && <ContinueLearningCard course={continueCourse} />}

      {/* 3. Key Metrics Grid */}
      <DashboardStats
        enrolledCount={enrolledCount}
        activeCount={activeCount}
        completedCount={completedCount}
        completedLessonsCount={completedLessonsCount}
        totalLessonsCount={totalLessonsAcrossAllCourses}
        averageProgress={averageProgress}
        certificatesCount={certificatesCount}
      />

      {/* 4. Enrolled Courses & Sidebar Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: My Courses */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold font-outfit text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>My Enrolled Courses</span>
            </h2>

            {enrolledCount > 0 && (
              <Link
                href="/dashboard/courses"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <span>View All ({enrolledCount})</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {coursesWithStatus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {coursesWithStatus.map((course) => (
                <EnrolledCourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <DashboardEmptyState />
          )}
        </div>

        {/* Right Column: Certificates & Career Hub */}
        <div className="space-y-6">
          <CertificatesCard certificates={studentCertificates} />
          <PlacementHighlightsCard jobs={recentJobs} />
        </div>
      </div>
    </div>
  );
}
