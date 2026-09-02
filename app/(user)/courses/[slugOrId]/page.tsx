import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Award, ShieldCheck } from "lucide-react";
import EnrollButton from "@/components/EnrollButton";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{
    slugOrId: string;
  }>;
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { slugOrId } = await params;
  return {
    title: `Course Details | Airbharath LMS`,
    description: "Accelerate your career with Airbharath LMS technical courses and certifications.",
  };
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { slugOrId } = await params;
  const session = await getSession();

  const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);

  let course: any = null;
  try {
    course = isUUID
      ? await db.query.courses.findFirst({
          where: eq(courses.id, slugOrId),
          with: {
            modules: {
              with: {
                lessons: true,
              },
            },
          },
        })
      : await db.query.courses.findFirst({
          where: eq(courses.slug, slugOrId),
          with: {
            modules: {
              with: {
                lessons: true,
              },
            },
          },
        });
  } catch (err) {
    console.error("Course fetch error:", err);
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-24 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold font-instrument-serif text-[#014a62]">Course Not Found</h1>
        <p className="text-slate-600 mt-2">The requested Airbharath course could not be located.</p>
        <Link href="/courses" className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 bg-[#014a62] text-white font-bold hover:bg-[#01374a] transition-all shadow-md">
          Explore All Courses
        </Link>
      </div>
    );
  }

  // Check user enrollment
  let isEnrolled = false;
  let enrollmentObj = null;
  if (session) {
    try {
      enrollmentObj = await db.query.enrollments.findFirst({
        where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, course.id)),
      });
      if (enrollmentObj && enrollmentObj.status === 'active') {
        isEnrolled = true;
      }
    } catch {}
  }

  const rawPrice = Number(course.price) || 0;
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const courseModules = (course.modules as any[]) || [];
  const totalLessons = courseModules.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0) || 0;

  return (
    <main className="flex-1 pt-16">
        {/* Hero Header */}
        <div className="relative w-full overflow-hidden bg-[#014a62] text-white py-16 md:py-24">
          {course.thumbnailUrl && (
            <div className="absolute inset-0 opacity-15 mix-blend-overlay">
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#01374a] via-[#014a62] to-[#026282] opacity-95" />

          <div className="container mx-auto px-4 relative z-10">
            <Link
              href="/"
              className="inline-flex items-center text-xs font-bold text-cyan-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-full border border-white/15 mb-6"
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to Courses
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-wrap gap-2.5">
                  <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    Airbharath LMS Certified
                  </span>
                  {course.accessDays ? (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-amber-400/30">
                      ⏱ {course.accessDays} Days Course Access
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-emerald-400/30">
                      ♾ Lifetime Access
                    </span>
                  )}
                </div>

                <h1 className="text-3xl md:text-5xl font-bold font-instrument-serif text-white leading-tight">
                  {course.title}
                </h1>

                <p className="text-base md:text-lg text-cyan-100 max-w-3xl leading-relaxed font-sans">
                  {course.description || "Master core concepts and hands-on skills with Airbharath LMS structured modules."}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-white/15 max-w-2xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">Access Duration</div>
                      <div className="text-sm font-bold text-white">
                        {course.accessDays ? `${course.accessDays} Days` : "Lifetime"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">Curriculum</div>
                      <div className="text-sm font-bold text-white">{totalLessons} Lessons</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">Certificate</div>
                      <div className="text-sm font-bold text-white">QR Verifiable</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout / Enrollment Card */}
              <div className="lg:col-span-4">
                <div className="bg-white text-gray-900 rounded-3xl p-8 shadow-2xl border border-gray-100 flex flex-col gap-6">
                  
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">Course Investment</span>
                    <div className="text-4xl font-black text-[#014a62]">
                      {rawPrice === 0 ? "Free" : `₹${rawPrice.toLocaleString("en-IN")}`}
                    </div>

                    {rawPrice > 0 && (
                      <div className="bg-gray-50 p-3 rounded-xl border text-xs space-y-1 text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Base Price (Excl. GST):</span>
                          <span className="font-bold text-foreground">₹{basePrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>18% GST (CGST 9% + SGST 9%):</span>
                          <span className="font-bold text-foreground">₹{gstAmount}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-bold text-[#014a62]">
                          <span>Total (Incl. GST):</span>
                          <span>₹{rawPrice}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <EnrollButton
                    courseId={course.id}
                    isEnrolled={isEnrolled}
                    price={rawPrice}
                    courseTitle={course.title}
                    initialUser={session ? { id: session.id, email: session.email } : null}
                  />

                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-muted-foreground font-semibold">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-[#014a62]" />
                      <span>Razorpay Secure Payment & Instant Invoice</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#014a62]" />
                      <span>QR Code Verifiable Completion Certificate</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules & Curriculum */}
        <div className="container mx-auto px-4 py-16 max-w-6xl space-y-12">
          <div className="bg-card rounded-3xl p-8 border border-border/80 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold font-instrument-serif text-[#014a62]">Course Modules & Lessons</h2>
            
            {(courseModules.length === 0) ? (
              <p className="text-sm text-muted-foreground italic">Modules for this course will be published soon.</p>
            ) : (
              <div className="space-y-4">
                {courseModules.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((mod: any, idx: number) => (
                  <div key={mod.id} className="border rounded-2xl overflow-hidden bg-gray-50/50">
                    <div className="p-4 bg-muted/40 font-bold text-sm text-[#014a62] flex justify-between">
                      <span>Module {idx + 1}: {mod.title}</span>
                      <span className="text-xs text-muted-foreground font-normal">{mod.lessons?.length || 0} Lessons</span>
                    </div>
                    <div className="divide-y bg-white">
                      {mod.lessons?.sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((les: any, lesIdx: number) => {
                        return (
                          <div key={les.id} className="p-4 flex items-center justify-between text-xs hover:bg-gray-50">
                            <div className="flex items-center gap-3 font-semibold">
                              <span className="w-6 h-6 rounded-full bg-[#014a62]/10 text-[#014a62] flex items-center justify-center text-[10px] font-bold">
                                {lesIdx + 1}
                              </span>
                              <span>{les.title}</span>
                            </div>

                            {les.isFreePreview && (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                                Free Preview
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
  );
}
