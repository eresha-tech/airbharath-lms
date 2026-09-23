import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{
    courseId: string;
  }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const session = await getSession();

  if (!session) return redirect("/login");

  const isUUID = UUID_REGEX.test(courseId);

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

  const enrollmentRecord = await db.query.enrollments.findFirst({
    where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, courseObj.id)),
  });

  if (!enrollmentRecord && session.role !== "admin") {
    return redirect(`/courses/${courseObj.slug || courseObj.id}`);
  }

  // Find first lesson across sections or top-level modules
  const courseSections = (courseObj.sections as any[]) || [];
  const sortedSections = courseSections.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));

  let firstLessonId: string | null = null;

  for (const section of sortedSections) {
    const sModules = (section.modules || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
    for (const mod of sModules) {
      const sLessons = (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
      if (sLessons.length > 0) {
        firstLessonId = sLessons[0].id;
        break;
      }
    }
    if (firstLessonId) break;
  }

  if (!firstLessonId) {
    const courseModules = (courseObj.modules as any[]) || [];
    const sortedModules = courseModules.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
    for (const mod of sortedModules) {
      const sLessons = (mod.lessons || []).sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
      if (sLessons.length > 0) {
        firstLessonId = sLessons[0].id;
        break;
      }
    }
  }

  if (firstLessonId) {
    return redirect(`/dashboard/courses/${courseId}/lessons/${firstLessonId}`);
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-card p-8 md:p-12 rounded-3xl border border-border shadow-xl max-w-lg space-y-6">
        <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
          <BookOpen className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold font-outfit text-foreground">
            Welcome to {courseObj.title}
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
            Lessons and materials for this Airbharath course will be published soon.
          </p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 px-6 rounded-xl text-xs gap-2">
          <Link href="/dashboard/courses">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Enrolled Courses</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
