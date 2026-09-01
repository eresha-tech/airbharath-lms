import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";

export const dynamic = "force-dynamic";

export default async function MyCoursesDashboardPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  const userEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, session.id),
  });

  const courseIds = userEnrollments.map((e: any) => e.courseId);

  const enrolledCourses = courseIds.length > 0
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

  const userProgress = await db.query.progress.findMany({
    where: eq(progress.userId, session.id),
  });

  const completedLessonIds = new Set(userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId));

  const coursesWithProgress = enrolledCourses.map((course: any) => {
    let total = 0;
    let done = 0;
    (course.modules as any[])?.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        total++;
        if (completedLessonIds.has(l.id)) done++;
      });
    });
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { course, percent };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#014a62]/10 text-[#014a62] rounded-2xl">
          <GraduationCap className="h-8 w-8 text-[#014a62]" />
        </div>
        <div>
          <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">My Enrolled Courses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">All courses you are currently enrolled in on Airbharath LMS.</p>
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 border border-dashed rounded-3xl p-8 space-y-4">
          <h2 className="text-xl font-bold text-foreground">No enrolled courses yet</h2>
          <p className="text-muted-foreground text-xs max-w-md mx-auto">
            You haven&apos;t enrolled in any Airbharath courses. Browse our curriculum to get started!
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-xs font-bold bg-[#014a62] text-white hover:bg-[#01374a] transition-all shadow-sm"
          >
            Browse Curriculum
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coursesWithProgress.map((item: any) => (
            <CourseCard
              key={item.course.id}
              course={{
                id: item.course.id,
                title: item.course.title,
                description: item.course.description,
                thumbnailUrl: item.course.thumbnailUrl,
                price: item.course.price,
                accessDays: item.course.accessDays,
              }}
              progress={item.percent}
              href={`/dashboard/courses/${item.course.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
