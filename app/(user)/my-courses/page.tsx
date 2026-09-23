import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, progress } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/CourseCard";

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // Fetch user enrollments with nested course data and progress in parallel
  let userEnrollments: any[] = [];
  let userProgress: any[] = [];

  try {
    const [enrollmentRes, progressRes] = await Promise.all([
      db.query.enrollments.findMany({
        where: eq(enrollments.userId, session.id),
        with: {
          course: {
            with: {
              modules: {
                with: {
                  lessons: true,
                },
              },
            },
          },
        },
      }),
      db.query.progress.findMany({
        where: eq(progress.userId, session.id),
      }),
    ]);
    userEnrollments = enrollmentRes;
    userProgress = progressRes;
  } catch (err) {
    console.error("MyCourses data fetch error:", err);
  }

  const completedLessonIds = new Set(userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId));

  const coursesWithProgress = userEnrollments
    .filter((e: any) => e.course)
    .map((e: any) => {
      const course = e.course;
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
    <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-outfit text-foreground">My Enrolled Courses</h1>
              <p className="text-xs text-muted-foreground">Access your active learning programs on Airbharath LMS</p>
            </div>
          </div>

          {coursesWithProgress.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border border-dashed rounded-3xl space-y-4">
              <h2 className="text-xl font-bold text-foreground">No enrolled courses yet</h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Explore Airbharath LMS programs to start learning today.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
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
      </main>
  );
}
