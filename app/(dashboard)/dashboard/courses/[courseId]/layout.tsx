import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ClassroomLayout } from "@/components/classroom/ClassroomLayout";

export const dynamic = "force-dynamic";

interface CourseLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    courseId: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export default async function CourseLayout({
  children,
  params,
}: CourseLayoutProps) {
  const { courseId } = await params;
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  const isUUID = UUID_REGEX.test(courseId);

  // Fetch course data for sidebar
  const courseObj = isUUID
    ? await db.query.courses.findFirst({
        where: eq(courses.id, courseId),
        with: {
          sections: {
            with: {
              modules: {
                with: {
                  lessons: true,
                },
              },
            },
          },
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      })
    : await db.query.courses.findFirst({
        where: eq(courses.slug, courseId),
        with: {
          sections: {
            with: {
              modules: {
                with: {
                  lessons: true,
                },
              },
            },
          },
          modules: {
            with: {
              lessons: true,
            },
          },
        },
      });

  if (!courseObj) {
    return redirect("/dashboard/courses");
  }

  // Check enrollment
  const enrollmentObj = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseObj.id)),
  });

  if (!enrollmentObj && session.role !== "admin") {
    return redirect(`/courses/${courseObj.slug || courseObj.id}`);
  }

  const courseSections = (courseObj.sections as any[]) || [];
  const sortedSections = courseSections
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((sec: any) => ({
      ...sec,
      modules: (sec.modules || [])
        .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((mod: any) => ({
          ...mod,
          lessons: (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
        })),
    }));

  const courseModules = (courseObj.modules as any[]) || [];
  const sortedModules = courseModules
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((mod: any) => ({
      ...mod,
      lessons: (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    }));

  const formattedCourse = {
    ...courseObj,
    sections: sortedSections,
    modules: sortedModules,
  };

  // Fetch progress
  const userProgress = await db.query.progress.findMany({
    where: and(eq(progress.userId, session.id), eq(progress.isCompleted, true)),
  });

  const completedLessonIds = userProgress.map((p: any) => p.lessonId);

  return (
    <ClassroomLayout course={formattedCourse as any} completedLessons={completedLessonIds}>
      {children}
    </ClassroomLayout>
  );
}

