import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress, orders, certificates } from "@/lib/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { MyCoursesView, EnrolledCourseData } from "@/components/dashboard/MyCoursesView";
import { getUserAccessSummary } from "@/lib/course-access";

export const dynamic = "force-dynamic";

export default async function MyCoursesDashboardPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // 1. Get complete course access summary (direct + bundle entitlements)
  const accessSummary = await getUserAccessSummary(session.id);

  // 2. Fetch student's progress, paid orders, certificates, and enrollments in parallel
  const [userEnrollments, userProgress, userOrders, userCertificates] = await Promise.all([
    db.query.enrollments.findMany({
      where: eq(enrollments.userId, session.id),
      orderBy: [desc(enrollments.enrolledAt)],
    }),
    db.query.progress.findMany({
      where: eq(progress.userId, session.id),
    }),
    db.query.orders.findMany({
      where: and(eq(orders.userId, session.id), eq(orders.status, "paid")),
    }),
    db.query.certificates.findMany({
      where: eq(certificates.userId, session.id),
    }),
  ]);

  const targetCourseIds = accessSummary.effectiveCourseIds;

  // 3. Fetch courses with ordered modules and lessons in one single query
  const allAccessibleCourses =
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
    userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  const now = new Date();

  // 4. Map courses with precise real progress, certificates, and bundle entitlement state
  const coursesData: EnrolledCourseData[] = [];

  for (const course of allAccessibleCourses) {
    // Bundles are access/commercial containers, never normal learning courses
    if (course.isBundle || accessSummary.bundleCourseIds.includes(course.id)) {
      continue;
    }
    const courseModules = (course.modules as any[]) || [];

    // An ended direct purchase must not shadow an independently active bundle.
    const directEnrollment = accessSummary.directCourseIds.includes(course.id)
      ? userEnrollments.find((e: any) => e.courseId === course.id)
      : undefined;
    const bundleInfo = accessSummary.courseToBundleMap[course.id];

    let isExpired = false;
    let effectiveExpiresAt: Date | string | null = null;

    if (directEnrollment) {
      isExpired =
        directEnrollment.status === "expired" ||
        (directEnrollment.expiresAt !== null && new Date(directEnrollment.expiresAt) <= now);
      effectiveExpiresAt = directEnrollment.expiresAt;
    } else if (bundleInfo) {
      const parentEnrollment = userEnrollments.find((e: any) => e.courseId === bundleInfo.bundleId);
      isExpired =
        parentEnrollment?.status === "expired" ||
        (parentEnrollment?.expiresAt !== null && parentEnrollment?.expiresAt !== undefined && new Date(parentEnrollment.expiresAt) <= now);
      effectiveExpiresAt = bundleInfo.expiresAt || null;
    }

    let totalLessons = 0;
    let completedLessons = 0;
    const allLessons: Array<{ id: string; title: string }> = [];

    courseModules.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        totalLessons++;
        allLessons.push({ id: l.id, title: l.title });
        if (completedLessonIds.has(l.id)) {
          completedLessons++;
        }
      });
    });

    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const nextIncompleteLesson = allLessons.find((l) => !completedLessonIds.has(l.id));
    const resumeLesson = nextIncompleteLesson || allLessons[0] || null;

    // Direct order, or fallback to parent bundle order
    let matchingOrder = directEnrollment ? userOrders.find((o: any) => o.courseId === course.id) : undefined;
    if (!matchingOrder && bundleInfo) {
      matchingOrder = userOrders.find((o: any) => o.courseId === bundleInfo.bundleId);
    }

    const matchingCert = userCertificates.find((c: any) => c.courseId === course.id);

    coursesData.push({
      id: course.id,
      title: course.title,
      slug: course.slug ?? null,
      description: course.description ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      percent,
      completedLessons,
      totalLessons,
      resumeLessonId: resumeLesson ? resumeLesson.id : "",
      resumeLessonTitle: resumeLesson ? resumeLesson.title : undefined,
      isExpired: Boolean(isExpired),
      expiresAt: effectiveExpiresAt,
      orderId: matchingOrder?.id ?? null,
      certificateCode: matchingCert?.certificateCode ?? null,
      certificateId: matchingCert?.id ?? null,
      bundleTitle: !directEnrollment && bundleInfo ? bundleInfo.bundleTitle : null,
    });
  }

  return <MyCoursesView courses={coursesData} />;
}
