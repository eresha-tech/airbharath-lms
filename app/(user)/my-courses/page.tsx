import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, progress, courseBundleItems } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Play, CheckCircle2, Layers, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserAccessSummary } from "@/lib/course-access";

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  const session = await getSession();

  if (!session) {
    return redirect("/login");
  }

  // 1. Get complete course access summary (direct + bundle entitlements)
  const accessSummary = await getUserAccessSummary(session.id);
  const targetCourseIds = accessSummary.effectiveCourseIds;

  let allAccessibleCourses: any[] = [];
  let userProgress: any[] = [];
  let bundleCoursesList: any[] = [];

  try {
    const [coursesRes, progressRes, bundlesRes] = await Promise.all([
      targetCourseIds.length > 0
        ? db.query.courses.findMany({
            where: inArray(courses.id, targetCourseIds),
            with: {
              modules: {
                with: {
                  lessons: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      db.query.progress.findMany({
        where: (progress, { eq }) => eq(progress.userId, session.id),
      }),
      accessSummary.bundleCourseIds.length > 0
        ? db.query.courses.findMany({
            where: inArray(courses.id, accessSummary.bundleCourseIds),
          })
        : Promise.resolve([]),
    ]);
    allAccessibleCourses = coursesRes;
    userProgress = progressRes;
    bundleCoursesList = bundlesRes;
  } catch (err) {
    console.error("MyCourses data fetch error:", err);
  }

  const completedLessonIds = new Set(
    userProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  // Filter out any course that is a bundle itself — bundles are access containers, not learning courses
  const learningCourses = allAccessibleCourses.filter(
    (course: any) => !course.isBundle && !accessSummary.bundleCourseIds.includes(course.id)
  );

  const coursesWithProgressMap: Record<string, any> = {};
  learningCourses.forEach((course: any) => {
    let total = 0;
    let done = 0;
    const lessonsList: any[] = [];
    (course.modules as any[])?.forEach((m: any) => {
      m.lessons?.forEach((l: any) => {
        total++;
        lessonsList.push(l);
        if (completedLessonIds.has(l.id)) done++;
      });
    });
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    const nextIncomplete = lessonsList.find((l) => !completedLessonIds.has(l.id));
    const resumeLessonId = nextIncomplete ? nextIncomplete.id : lessonsList[0]?.id || "";

    coursesWithProgressMap[course.id] = {
      course,
      percent,
      completedLessons: done,
      totalLessons: total,
      resumeLessonId,
    };
  });

  // Group by enrolled bundles
  const bundleGroups = accessSummary.bundleCourseIds.map((bundleId) => {
    const bundleCourse = bundleCoursesList.find((b) => b.id === bundleId);
    const childIds = accessSummary.bundleToCoursesMap[bundleId] || [];
    const items = childIds
      .map((cId) => coursesWithProgressMap[cId])
      .filter(Boolean);
    return {
      bundleId,
      title: bundleCourse?.title || "Course Bundle",
      description: bundleCourse?.description || "",
      items,
    };
  }).filter((bg) => bg.items.length > 0);

  // Standalone courses (not belonging to any of user's active bundles)
  const standaloneItems = learningCourses
    .filter((course: any) => !accessSummary.courseToBundleMap[course.id])
    .map((course: any) => coursesWithProgressMap[course.id])
    .filter(Boolean);

  const hasAnyCourses = learningCourses.length > 0;

  return (
    <main className="flex-1 pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl space-y-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 text-primary rounded-2xl">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-outfit text-foreground">My Enrolled Courses</h1>
            <p className="text-xs text-muted-foreground">Access your active learning programs on Airbharath LMS</p>
          </div>
        </div>

        {!hasAnyCourses ? (
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
          <div className="space-y-12">
            {/* 1. Bundles Sections */}
            {bundleGroups.map((bundle) => (
              <section key={bundle.bundleId} className="space-y-5">
                <div className="p-5 bg-card border border-border/80 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      <Layers className="w-3 h-3" />
                      <span>Commercial Access Bundle</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      {bundle.title}
                    </h2>
                    {bundle.description && (
                      <p className="text-xs text-muted-foreground max-w-2xl">
                        {bundle.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs font-bold px-3 py-1.5 rounded-xl self-start sm:self-auto shrink-0">
                    {bundle.items.length} Courses Included
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bundle.items.map((item: any) => (
                    <div
                      key={item.course.id}
                      className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="aspect-video relative overflow-hidden bg-muted group">
                          {item.course.thumbnailUrl ? (
                            <Image
                              src={item.course.thumbnailUrl}
                              alt={item.course.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
                              <BookOpen className="h-10 w-10 opacity-50" />
                            </div>
                          )}

                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {item.percent === 100 ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Completed</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] uppercase font-bold shadow-xs">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 sm:p-6 space-y-3.5">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              Included with {bundle.title}
                            </span>
                            <h3 className="font-bold text-base font-outfit text-foreground line-clamp-1">
                              {item.course.title}
                            </h3>
                            {item.course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.course.description}
                              </p>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-muted-foreground">
                                {item.completedLessons} of {item.totalLessons} Lessons
                              </span>
                              <span className="text-foreground font-bold">{item.percent}%</span>
                            </div>
                            <Progress value={item.percent} className="h-2 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="p-5 sm:p-6 pt-0 border-t border-border/50 mt-1">
                        <Button
                          asChild
                          className="w-full text-xs font-bold h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-3 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Link
                            href={
                              item.resumeLessonId
                                ? `/dashboard/courses/${item.course.id}/lessons/${item.resumeLessonId}`
                                : `/dashboard/courses/${item.course.id}`
                            }
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>{item.completedLessons > 0 ? "Resume Lesson" : "Start Course"}</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* 2. Standalone Courses Section */}
            {standaloneItems.length > 0 && (
              <section className="space-y-5">
                {bundleGroups.length > 0 && (
                  <div className="border-t border-border pt-8">
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      Additional Enrolled Courses
                    </h2>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {standaloneItems.map((item: any) => (
                    <div
                      key={item.course.id}
                      className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div className="aspect-video relative overflow-hidden bg-muted group">
                          {item.course.thumbnailUrl ? (
                            <Image
                              src={item.course.thumbnailUrl}
                              alt={item.course.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
                              <BookOpen className="h-10 w-10 opacity-50" />
                            </div>
                          )}

                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {item.percent === 100 ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Completed</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] uppercase font-bold shadow-xs">
                                In Progress
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="p-5 sm:p-6 space-y-3.5">
                          <div className="space-y-1">
                            <h3 className="font-bold text-base font-outfit text-foreground line-clamp-1">
                              {item.course.title}
                            </h3>
                            {item.course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.course.description}
                              </p>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span className="text-muted-foreground">
                                {item.completedLessons} of {item.totalLessons} Lessons
                              </span>
                              <span className="text-foreground font-bold">{item.percent}%</span>
                            </div>
                            <Progress value={item.percent} className="h-2 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="p-5 sm:p-6 pt-0 border-t border-border/50 mt-1">
                        <Button
                          asChild
                          className="w-full text-xs font-bold h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-3 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Link
                            href={
                              item.resumeLessonId
                                ? `/dashboard/courses/${item.course.id}/lessons/${item.resumeLessonId}`
                                : `/dashboard/courses/${item.course.id}`
                            }
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>{item.completedLessons > 0 ? "Resume Lesson" : "Start Course"}</span>
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

