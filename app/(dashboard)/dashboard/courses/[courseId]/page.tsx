import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const session = await getSession();

  if (!session) return redirect("/login");

  const enrollmentRecord = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseId)),
  });

  if (!enrollmentRecord && session.role !== "admin") {
    return redirect(`/courses/${courseId}`);
  }

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
  const sortedModules = courseModules.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

  if (sortedModules.length > 0) {
    const firstModule = sortedModules[0];
    const sortedLessons = (firstModule.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

    if (sortedLessons.length > 0) {
      return redirect(
        `/dashboard/courses/${courseId}/lessons/${sortedLessons[0].id}`
      );
    }
  }

  return (
    <div className="h-full flex items-center justify-center p-12">
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold font-instrument-serif text-[#014a62]">Welcome to {courseObj.title}</h2>
        <p className="text-muted-foreground text-sm">
          Lessons for this course will be published soon.
        </p>
      </div>
    </div>
  );
}
