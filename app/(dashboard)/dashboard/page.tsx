/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase-server";
import { BookOpen, GraduationCap, Play, Trophy, ArrowRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  const [enrollmentsRes, progressRes, certificatesRes] = await Promise.all([
    supabase
      .from("enrollments")
      .select(`
        course_id,
        courses (
          id,
          title,
          thumbnail_url,
          description,
          modules (
            id,
            lessons (
              id,
              title,
              order_index
            )
          )
        )
      `)
      .eq("user_id", user.id),
    supabase
      .from("progress")
      .select("lesson_id, is_completed")
      .eq("user_id", user.id)
      .eq("is_completed", true),
    supabase
      .from("certificates")
      .select(`
        id,
        pdf_url,
        issued_at,
        courses (
          title
        )
      `)
      .eq("user_id", user.id),
  ]);

  const enrollments = enrollmentsRes.data;
  const progressList = progressRes.data;
  const certificates = certificatesRes.data;

  const completedLessonIds = new Set(progressList?.map((p) => p.lesson_id) || []);

  // Enrich enrollments with lesson progress in-memory
  const coursesWithProgress = (enrollments || []).map((enrollment: any) => {
    const course = enrollment.courses;
    if (!course) return null;

    const modules = course.modules || [];
    const lessons = modules
      .reduce((acc: any[], m: any) => {
        if (m.lessons) {
          acc.push(...m.lessons);
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

    const totalLessons = lessons.length;
    const completedLessons = lessons.filter((l: any) => completedLessonIds.has(l.id)).length;
    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Find last watched / first incomplete lesson
    let lastLessonId = lessons[0]?.id || "";
    if (lessons.length > 0) {
      const incomplete = lessons.find((l: any) => !completedLessonIds.has(l.id));
      if (incomplete) lastLessonId = incomplete.id;
    }

    return {
      ...course,
      totalLessons,
      completedLessons,
      percent,
      resumeLessonId: lastLessonId,
    };
  });

  const activeCourses = coursesWithProgress.filter((c) => c !== null);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-secondary overflow-hidden border border-border p-8 md:p-12 shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full uppercase tracking-widest shadow-sm">
            Student Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0]}!
          </h1>
          <p className="text-secondary-foreground/75 text-sm md:text-base leading-relaxed max-w-lg">
            Continue where you left off and keep architecting your structural engineering future. Your direct path to corporate placement hub is waiting.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-primary/15 to-transparent hidden md:block" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Enrolled Courses Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> Active Courses
          </h2>

          {activeCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeCourses.map((course: any, idx: number) => (
                <div
                  key={course.id}
                  className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 ease-out flex flex-col justify-between group animate-slide-up"
                  style={{ animationDelay: `${(idx + 1) * 0.1}s` }}
                >
                  <div>
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {course.thumbnail_url ? (
                        <div className="relative w-full h-full">
                          {/* Fallback to simple img but styling it beautifully to avoid linter errors since next/image needs domain configs */}
                          <img
                            src={course.thumbnail_url}
                            alt={course.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-6 space-y-4">
                      <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-1">{course.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>

                      {/* Progress Bar */}
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">{course.percent}% Complete</span>
                          <span className="text-foreground">{course.completedLessons}/{course.totalLessons} Lessons</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${course.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-border/40 mt-4 flex items-center justify-between gap-4">
                    <Link
                      href={`/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:bg-primary/95 transition-all shadow-sm hover:shadow-md hover:scale-[1.01]"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Resume Course
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/10 border border-dashed rounded-3xl p-12 text-center space-y-5 animate-scale-in">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-foreground">No enrolled courses</h3>
                <p className="text-sm text-muted-foreground">You are not enrolled in any programs yet.</p>
              </div>
              <Link href="/search/courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-4 py-2.5 bg-primary/10 rounded-xl">
                Explore Curriculum <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Certificates & Support Column */}
        <div className="space-y-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Certificates */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Certificates
            </h3>
            {certificates && certificates.length > 0 ? (
              <div className="space-y-4">
                {certificates.map((cert: any) => (
                  <div key={cert.id} className="p-4 border border-border/60 rounded-2xl flex items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{cert.courses?.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Issued {new Date(cert.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link
                      href={cert.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-extrabold text-primary hover:underline"
                    >
                      View PDF
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground space-y-3">
                <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/20" />
                <p className="text-xs font-semibold">No certificates earned yet.</p>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed px-4">Complete a course to 100% to generate your digital credentials.</p>
              </div>
            )}
          </div>

          {/* Placement Notice Hub */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground">Corporate Placement Board</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Direct recruitment channels are open for our graduates. Access placement assistance, job boards, and resume reviews.
            </p>
            <div className="flex gap-2 pt-2">
              <Link
                href="/dashboard/jobs"
                className="text-xs font-bold text-primary hover:underline"
              >
                Browse Job Board →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
