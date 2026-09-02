import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { enrollments, courses, progress, orders } from "@/lib/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import Link from "next/link";
import { GraduationCap, BookOpen, Download, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

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

  const [userProgress, userOrders] = await Promise.all([
    db.query.progress.findMany({
      where: eq(progress.userId, session.id),
    }),
    db.query.orders.findMany({
      where: and(eq(orders.userId, session.id), eq(orders.status, "paid")),
    }),
  ]);

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
    const matchingOrder = userOrders.find((o: any) => o.courseId === course.id);

    return { course, percent, order: matchingOrder };
  });

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-[#014a62]/10 text-[#014a62] rounded-2xl shrink-0">
            <GraduationCap className="h-8 w-8 text-[#014a62]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-instrument-serif text-[#014a62]">My Enrolled Courses</h1>
            <p className="text-slate-600 text-xs md:text-sm font-medium mt-0.5">
              Track progress, access video modules, and download completion tax invoices.
            </p>
          </div>
        </div>

        <Button asChild className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold h-11 px-6 rounded-xl text-xs shadow-xs">
          <Link href="/courses">Explore More Courses</Link>
        </Button>
      </div>

      {enrolledCourses.length === 0 ? (
        <Card className="text-center py-16 bg-white border border-dashed rounded-3xl p-8 space-y-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#014a62]">No enrolled courses yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600 text-xs md:text-sm max-w-md mx-auto font-medium">
              You haven&apos;t enrolled in any Airbharath LMS courses. Explore our professional curriculum to get started!
            </p>
            <Button asChild className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold rounded-xl text-xs px-6 h-11">
              <Link href="/courses">Browse Airbharath Courses</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesWithProgress.map(({ course, percent, order }) => (
            <Card key={course.id} className="bg-white border-slate-200/90 shadow-md hover:shadow-xl hover:border-[#014a62]/30 transition-all flex flex-col justify-between p-6 rounded-3xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20">
                    Active Course
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    {percent}% Completed
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold font-instrument-serif text-[#014a62] line-clamp-2">
                    {course.title}
                  </h3>
                  {course.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1 font-sans">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Course Progress</span>
                    <span className="text-[#014a62]">{percent}%</span>
                  </div>
                  <Progress value={percent} className="h-2 bg-slate-100" />
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <Button asChild className="w-full bg-[#014a62] hover:bg-[#01374a] text-white font-bold h-11 rounded-xl text-xs shadow-xs flex items-center justify-center gap-2">
                  <Link href={`/dashboard/courses/${course.id}`}>
                    <span>Continue Learning</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                {order && (
                  <Button asChild variant="outline" className="w-full border-slate-200 text-slate-700 hover:text-[#014a62] hover:bg-slate-50 font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-1.5">
                    <a href={`/api/invoices/download/${order.id}`} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5 text-[#014a62]" />
                      <span>Download Tax Invoice (PDF)</span>
                    </a>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
