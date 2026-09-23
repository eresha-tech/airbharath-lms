import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { ClassroomLayout } from "@/components/classroom/ClassroomLayout";
import { hasCourseAccess } from "@/lib/course-access";

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

  // Check enrollment / bundle entitlement
  const access = await hasCourseAccess(session.id, courseObj.id, session.role);

  if (!access.hasAccess) {
    return redirect(`/courses/${courseObj.slug || courseObj.id}`);
  }

  // A bundle is an access pass, not a normal classroom course
  if (courseObj.isBundle) {
    const { getBundleIncludedCourses } = await import("@/lib/course-access");
    const bundledCourses = await getBundleIncludedCourses(courseObj.id);
    if (bundledCourses.length > 0) {
      return redirect(`/dashboard/courses/${bundledCourses[0].id}`);
    }
    return redirect("/my-courses");
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

