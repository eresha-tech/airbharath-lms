import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress, orders, certificates } from "@/lib/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { MyCoursesView, EnrolledCourseData } from "@/components/dashboard/MyCoursesView";

export const dynamic = "force-dynamic";

export default async function MyCoursesDashboardPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // Fetch student's enrollments (ordered by newest first)
  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, session.id),
    orderBy: [desc(enrollments.enrolledAt)],
  });

  const courseIds = userEnrollments.map((e: any) => e.courseId);

  // Fetch courses with ordered modules and lessons
  const enrolledCourses = courseIds.length > 0
    ? await db.query.courses.findMany({
        where: inArray(courses.id, courseIds),
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

  // Fetch progress, paid orders, and issued certificates in parallel
  const [userProgress, userOrders, userCertificates] = await Promise.all([
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

  const completedLessonIds = new Set(
    userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  // Map courses with precise real progress and navigation state
  const rawCourses: (EnrolledCourseData | null)[] = userEnrollments.map((enrollment: any) => {
    const course = enrolledCourses.find((c: any) => c.id === enrollment.courseId);
    if (!course) return null;

    const isExpired =
      enrollment.status === "expired" ||
      (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date());

    let totalLessons = 0;
    let completedLessons = 0;
    const allLessons: Array<{ id: string; title: string }> = [];

    (course.modules as any[])?.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        totalLessons++;
        allLessons.push({ id: l.id, title: l.title });
        if (completedLessonIds.has(l.id)) {
          completedLessons++;
        }
      });
    });

    // Preserve exact standard calculation: completed / total * 100
    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find resume lesson: first incomplete lesson, or fallback to first lesson in sequence
    const nextIncompleteLesson = allLessons.find((l) => !completedLessonIds.has(l.id));
    const resumeLesson = nextIncompleteLesson || allLessons[0] || null;

    const matchingOrder = userOrders.find((o: any) => o.courseId === course.id);
    const matchingCert = userCertificates.find((c: any) => c.courseId === course.id);

    const courseItem: EnrolledCourseData = {
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
      expiresAt: enrollment.expiresAt,
      orderId: matchingOrder?.id ?? null,
      certificateCode: matchingCert?.certificateCode ?? null,
      certificateId: matchingCert?.id ?? null,
    };

    return courseItem;
  });

  const coursesData: EnrolledCourseData[] = rawCourses.filter(
    (item): item is EnrolledCourseData => item !== null
  );

  return <MyCoursesView courses={coursesData} />;
}
