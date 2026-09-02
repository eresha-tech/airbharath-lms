import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const dynamic = "force-dynamic";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CourseLayout({
  children,
  params,
}: CourseLayoutProps) {
  const { courseId } = await params;
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // Check enrollment
  const enrollmentObj = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseId)),
  });

  if (!enrollmentObj) {
    return redirect(`/courses/${courseId}`);
  }

  // Fetch course data for sidebar
  const courseObj = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        with: {
          lessons: true,
        },
      },
    },
  });

  if (!courseObj) {
    return redirect("/my-courses");
  }

  const courseModules = (courseObj.modules as any[]) || [];
  const sortedModules = courseModules
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((mod: any) => ({
      ...mod,
      lessons: (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    }));

  const formattedCourse = {
    ...courseObj,
    modules: sortedModules,
  };

  // Fetch progress
  const userProgress = await db.query.progress.findMany({
    where: and(eq(progress.userId, session.id), eq(progress.isCompleted, true)),
  });

  const completedLessonIds = userProgress.map((p: any) => p.lessonId);

  return (
    <div className="h-full">
      <Sidebar course={formattedCourse as any} completedLessons={completedLessonIds} />
      <main className="h-full pl-0 lg:pl-96">{children}</main>
    </div>
  );
}
