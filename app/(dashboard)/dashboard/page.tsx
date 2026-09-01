import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, enrollments, courses, progress, certificates } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { BookOpen, GraduationCap, Play, Trophy, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role === "admin") {
    redirect("/admin");
  }

  const studentEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.userId, session.id),
  });

  const courseIds = studentEnrollments.map((e: any) => e.courseId);

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

  const studentProgress = await db.query.progress.findMany({
    where: eq(progress.userId, session.id),
  });

  const studentCertificates = await db.query.certificates.findMany({
    where: eq(certificates.userId, session.id),
  });

  const completedLessonIds = new Set(
    studentProgress.filter((p: any) => p.isCompleted).map((p: any) => p.lessonId)
  );

  const now = new Date();

  const coursesWithStatus = studentEnrollments.map((enr: any) => {
    const courseObj = enrolledCourses.find((c: any) => c.id === enr.courseId);
    if (!courseObj) return null;

    const isExpired = enr.expiresAt && new Date(enr.expiresAt) < now;

    const lessonsList: any[] = [];
    (courseObj.modules as any[])?.forEach((m: any) => {
      if (m.lessons) lessonsList.push(...m.lessons);
    });

    lessonsList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const totalLessons = lessonsList.length;
    const completedLessons = lessonsList.filter((l) => completedLessonIds.has(l.id)).length;
    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    let resumeLessonId = lessonsList[0]?.id || "";
    const incomplete = lessonsList.find((l) => !completedLessonIds.has(l.id));
    if (incomplete) resumeLessonId = incomplete.id;

    return {
      ...courseObj,
      enrollmentId: enr.id,
      expiresAt: enr.expiresAt,
      isExpired,
      totalLessons,
      completedLessons,
      percent,
      resumeLessonId,
    };
  }).filter((c: any): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-[#014a62] overflow-hidden text-white p-8 md:p-12 shadow-xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="px-3 py-1 bg-white/10 text-cyan-200 text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/15">
            Airbharath Student Dashboard
          </span>
          <h1 className="text-3xl md:text-5xl font-bold font-instrument-serif text-white leading-tight">
            Welcome, {session.fullName || "Student"}!
          </h1>
          <p className="text-cyan-100 text-sm md:text-base leading-relaxed max-w-lg font-sans">
            Track your course progress, download QR-verifiable certificates, and renew course access.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Enrolled Courses Grid */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold font-instrument-serif text-[#014a62] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#014a62]" /> My Enrolled Courses
          </h2>

          {coursesWithStatus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {coursesWithStatus.map((course: any) => (
                <div
                  key={course.id}
                  className={`bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all duration-300 ${
                    course.isExpired ? "border-rose-200 bg-rose-50/20" : "border-border hover:shadow-lg"
                  }`}
                >
                  <div>
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#014a62]/5 flex items-center justify-center text-[#014a62]">
                          <BookOpen className="h-10 w-10" />
                        </div>
                      )}
                      {course.isExpired && (
                        <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                          <AlertTriangle className="w-8 h-8 text-amber-400 mb-1" />
                          <span className="font-bold text-sm">Access Expired</span>
                          <span className="text-[10px] text-gray-300 mt-0.5">Renew course access to resume lessons</span>
                        </div>
                      )}
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-base text-foreground font-instrument-sans line-clamp-1">
                          {course.title}
                        </h3>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          course.isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {course.isExpired ? "Expired" : "Active"}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground">
                        {course.expiresAt
                          ? `Expires: ${new Date(course.expiresAt).toLocaleDateString()}`
                          : "Lifetime Access"}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">{course.percent}% Complete</span>
                          <span className="text-foreground">{course.completedLessons}/{course.totalLessons} Lessons</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#014a62] rounded-full transition-all duration-500"
                            style={{ width: `${course.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pt-0 border-t border-border/40 mt-4">
                    {course.isExpired ? (
                      <Link
                        href={`/courses/${course.slug || course.id}`}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-enroll / Renew Access
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-[#014a62] hover:bg-[#01374a] text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Resume Course
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed rounded-3xl p-12 text-center space-y-4">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <h3 className="font-bold text-lg text-foreground">No Enrolled Courses</h3>
              <p className="text-sm text-muted-foreground">Explore our curriculum to start learning.</p>
              <Link href="/my-courses" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#014a62] underline">
                Browse Courses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Certificates Section */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-foreground font-instrument-serif flex items-center gap-2">
              <Trophy className="h-4.5 w-4.5 text-[#014a62]" /> My Certificates
            </h3>

            {studentCertificates.length > 0 ? (
              <div className="space-y-3">
                {studentCertificates.map((cert: any) => (
                  <div key={cert.id} className="p-3.5 border rounded-2xl flex items-center justify-between gap-3 bg-gray-50/50">
                    <div>
                      <div className="font-bold text-xs text-[#014a62]">{cert.certificateCode}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Issued {new Date(cert.issuedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Link
                      href={`/verify-certificate/${cert.certificateCode}`}
                      className="text-xs font-bold text-[#014a62] hover:underline"
                    >
                      Verify / View PDF
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground space-y-2">
                <GraduationCap className="h-8 w-8 mx-auto text-muted-foreground/30" />
                <p className="text-xs font-semibold">No certificates issued yet.</p>
                <p className="text-[10px] text-muted-foreground px-4">Complete 100% of a course to generate your verified certificate.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
