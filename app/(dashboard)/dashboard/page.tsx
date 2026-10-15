import { getSession } from "@/lib/auth";
import { hasPersistedAdminRole } from "@/lib/admin-authorization";
import { getStudentDashboardData } from "@/lib/dashboard-data";
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
import { UpcomingSessionsCard } from "@/components/dashboard/UpcomingSessionsCard";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (await hasPersistedAdminRole(session)) {
    redirect("/admin");
  }

  const {
    coursesWithStatus,
    continueCourse,
    metrics,
    upcomingLiveSessions,
    upcomingRecordedContent,
    studentCertificates,
    recentJobs,
  } = await getStudentDashboardData(session.id);

  const enrolledCount = metrics.enrolledCount;
  const activeCount = metrics.activeCount;
  const completedCount = metrics.completedCount;
  const allCompleted = metrics.allCompleted;
  const completedLessonsCount = metrics.completedLessonsCount;
  const totalLessonsAcrossAllCourses = metrics.totalLessonsCount;
  const averageProgress = metrics.averageProgress;
  const certificatesCount = metrics.certificatesCount;

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

        {/* Right Column: Upcoming Live Sessions, Scheduled Releases, Certificates & Career Hub */}
        <div className="space-y-6">
          <UpcomingSessionsCard
            liveSessions={upcomingLiveSessions}
            upcomingContent={upcomingRecordedContent}
          />
          <CertificatesCard certificates={studentCertificates} />
          <PlacementHighlightsCard jobs={recentJobs} />
        </div>
      </div>
    </div>
  );
}
