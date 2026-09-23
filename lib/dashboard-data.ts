import { cache } from "react";
import { db } from "@/lib/db";
import { enrollments, courses, progress, certificates, jobs } from "@/lib/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { getUserAccessSummary } from "@/lib/course-access";

export interface DashboardCourseStatus {
  id: string;
  title: string;
  slug: string | null;
  thumbnailUrl: string | null;
  enrollmentId: string;
  expiresAt: Date | string | null;
  isExpired: boolean;
  totalLessons: number;
  completedLessons: number;
  percent: number;
  resumeLessonId: string;
  resumeLessonTitle: string;
  bundleTitle?: string | null;
}

export interface UpcomingLiveSessionItem {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  scheduledAt: Date;
  durationMinutes: number | null;
  meetingUrl: string | null;
}

export interface UpcomingRecordedItem {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  releaseAt: Date;
}

export interface StudentDashboardData {
  coursesWithStatus: DashboardCourseStatus[];
  continueCourse: DashboardCourseStatus | null;
  metrics: {
    enrolledCount: number;
    activeCount: number;
    completedCount: number;
    allCompleted: boolean;
    completedLessonsCount: number;
    totalLessonsCount: number;
    averageProgress: number;
    certificatesCount: number;
  };
  upcomingLiveSessions: UpcomingLiveSessionItem[];
  upcomingRecordedContent: UpcomingRecordedItem[];
  studentCertificates: any[];
  recentJobs: any[];
}

/**
 * Server-side student dashboard data fetcher.
 * Wrapped with React cache() for request-scoped deduplication across server components.
 * Strictly scoped to the authenticated userId.
 */
export const getStudentDashboardData = cache(
  async (userId: string): Promise<StudentDashboardData> => {
    const now = new Date();

    // 1. Fetch user access summary (direct + bundle entitlements), enrollments, progress, certificates, and jobs
    const [accessSummary, studentEnrollments, studentProgress, studentCertificates, recentJobs] =
      await Promise.all([
        getUserAccessSummary(userId),
        db.query.enrollments.findMany({
          where: eq(enrollments.userId, userId),
        }),
        db.query.progress.findMany({
          where: eq(progress.userId, userId),
        }),
        db.query.certificates.findMany({
          where: eq(certificates.userId, userId),
        }),
        db.query.jobs.findMany({
          orderBy: [desc(jobs.createdAt)],
          limit: 3,
        }),
      ]);

    const targetCourseIds = accessSummary.effectiveCourseIds;

    // 2. Fetch accessible learning courses with curriculum modules and lessons
    const accessibleCourses =
      targetCourseIds.length > 0
        ? await db.query.courses.findMany({
            where: inArray(courses.id, targetCourseIds),
            with: {
              modules: {
                orderBy: (m: any, { asc }: any) => [asc(m.orderIndex)],
                with: {
                  lessons: {
                    orderBy: (l: any, { asc }: any) => [asc(l.orderIndex)],
                  },
                },
              },
            },
          })
        : [];

    const completedLessonIds = new Set(
      studentProgress
        .filter((p: any) => p.isCompleted)
        .map((p: any) => p.lessonId)
    );

    // 3. Compute status, progress percentage, and resume lesson for each learning course
    // Exclude courses that are pure bundle containers
    const learningCourses = accessibleCourses.filter(
      (c: any) => !c.isBundle && !accessSummary.bundleCourseIds.includes(c.id)
    );

    const coursesWithStatus: DashboardCourseStatus[] = learningCourses.map((courseObj: any) => {
      const directEnrollment = studentEnrollments.find((e: any) => e.courseId === courseObj.id);
      const bundleInfo = accessSummary.courseToBundleMap[courseObj.id];

      let isExpired = false;
      let effectiveExpiresAt: Date | string | null = null;
      let enrollmentId = directEnrollment?.id || `bundle_${courseObj.id}`;

      if (directEnrollment) {
        isExpired =
          directEnrollment.status === "expired" ||
          (directEnrollment.expiresAt !== null && new Date(directEnrollment.expiresAt) <= now);
        effectiveExpiresAt = directEnrollment.expiresAt;
      } else if (bundleInfo) {
        const parentEnrollment = studentEnrollments.find((e: any) => e.courseId === bundleInfo.bundleId);
        if (parentEnrollment) {
          enrollmentId = parentEnrollment.id;
          isExpired =
            parentEnrollment.status === "expired" ||
            (parentEnrollment.expiresAt !== null && new Date(parentEnrollment.expiresAt) <= now);
        }
        effectiveExpiresAt = bundleInfo.expiresAt || null;
      }

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
        slug: courseObj.slug || null,
        thumbnailUrl: courseObj.thumbnailUrl || null,
        enrollmentId,
        expiresAt: effectiveExpiresAt,
        isExpired: Boolean(isExpired),
        totalLessons,
        completedLessons,
        percent,
        resumeLessonId,
        resumeLessonTitle,
        bundleTitle: !directEnrollment && bundleInfo ? bundleInfo.bundleTitle : null,
      };
    });

    // 4. Derive summary metrics
    const enrolledCount = coursesWithStatus.length;
    const activeCount = coursesWithStatus.filter((c) => !c.isExpired).length;
    const completedCount = coursesWithStatus.filter((c) => c.percent === 100).length;
    const allCompleted =
      enrolledCount > 0 && coursesWithStatus.every((c) => c.percent === 100);
    const completedLessonsCount = completedLessonIds.size;
    const totalLessonsCount = coursesWithStatus.reduce(
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

    // 5. Active continuation course
    const continueCourse =
      coursesWithStatus.find(
        (c) => !c.isExpired && c.percent < 100 && c.totalLessons > 0
      ) ||
      coursesWithStatus.find((c) => !c.isExpired && c.totalLessons > 0) ||
      null;

    // 6. Extract upcoming live sessions & scheduled releases
    const upcomingLiveSessions: UpcomingLiveSessionItem[] = [];
    const upcomingRecordedContent: UpcomingRecordedItem[] = [];

    learningCourses.forEach((c: any) => {
      (c.modules as any[])?.forEach((m: any) => {
        m.lessons?.forEach((l: any) => {
          if (
            l.deliveryType === "live" &&
            l.scheduledAt &&
            new Date(l.scheduledAt) > now
          ) {
            upcomingLiveSessions.push({
              id: l.id,
              title: l.title,
              courseId: c.id,
              courseTitle: c.title,
              scheduledAt: new Date(l.scheduledAt),
              durationMinutes: l.durationMinutes || null,
              meetingUrl: l.meetingUrl || null,
            });
          } else if (
            l.deliveryType !== "live" &&
            l.releaseAt &&
            new Date(l.releaseAt) > now
          ) {
            upcomingRecordedContent.push({
              id: l.id,
              title: l.title,
              courseId: c.id,
              courseTitle: c.title,
              releaseAt: new Date(l.releaseAt),
            });
          }
        });
      });
    });

    upcomingLiveSessions.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    );

    upcomingRecordedContent.sort(
      (a, b) => a.releaseAt.getTime() - b.releaseAt.getTime()
    );

    return {
      coursesWithStatus,
      continueCourse,
      metrics: {
        enrolledCount,
        activeCount,
        completedCount,
        allCompleted,
        completedLessonsCount,
        totalLessonsCount,
        averageProgress,
        certificatesCount,
      },
      upcomingLiveSessions,
      upcomingRecordedContent,
      studentCertificates,
      recentJobs,
    };
  }
);
