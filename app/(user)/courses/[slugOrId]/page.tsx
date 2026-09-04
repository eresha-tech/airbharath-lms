import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Award, ShieldCheck, CheckCircle2, Lock, FileText, Download, Sparkles, GraduationCap, Calendar } from "lucide-react";
import EnrollButton from "@/components/EnrollButton";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { courses, enrollments, orders } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <p className="text-slate-600 mt-2 font-sans">The requested Airbharath course could not be located.</p>
        <Link href="/courses" className="mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 bg-[#014a62] text-white font-bold hover:bg-[#01374a] transition-all shadow-md">
          Explore All Courses
        </Link>
      </div>
    );
  }

  // Check user enrollment and order for invoice
  let isEnrolled = false;
  let userOrder: any = null;

  if (session) {
    try {
      const enrollmentObj = await db.query.enrollments.findFirst({
        where: and(eq(enrollments.userId, session.id), eq(enrollments.courseId, course.id)),
      });
      if (enrollmentObj && enrollmentObj.status === "active") {
        isEnrolled = true;

        userOrder = await db.query.orders.findFirst({
          where: and(
            eq(orders.userId, session.id),
            eq(orders.courseId, course.id),
            eq(orders.status, "paid")
          ),
        });
      }
    } catch { }
  }

  const rawPrice = Number(course.price) || 0;
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const courseModules = (course.modules as any[]) || [];
  const sortedModules = courseModules.sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0));
  const totalLessons = sortedModules.reduce((acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0) || 0;

  return (
    <main className="flex-1">
      {/* Hero Banner Header with Course Background Image */}
      <div className="relative w-full overflow-hidden text-white py-16 md:py-24 bg-slate-900">
        {course.thumbnailUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
            {/* Light subtle dark shade overlay */}
            <div className="absolute inset-0 bg-slate-950/70" />
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10 max-w-6xl space-y-6">
          <Link
            href="/courses"
            className="inline-flex items-center text-xs font-bold text-cyan-200 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-full border border-white/15"
          >
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            All Courses
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

            {/* Left Course Information */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                <span className="px-3.5 py-1 bg-white/10 text-white rounded-full text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-md">
                  Air Bharath Certified Program
                </span>
                <span className="px-3.5 py-1 bg-cyan-400/20 text-cyan-200 rounded-full text-[11px] font-extrabold uppercase tracking-widest border border-cyan-400/30">
                  Taught by IIM Alumni
                </span>
                <span className="px-3.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[11px] font-extrabold uppercase tracking-widest border border-emerald-400/30">
                  ⚡ Self-Paced Access
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold font-instrument-serif text-white leading-tight">
                {course.title}
              </h1>

              {/* Batch Start Schedule Notice Banner */}
              <div className="p-4 md:p-5 rounded-2xl bg-amber-500/15 border border-amber-400/35 text-amber-100 flex items-start gap-3.5 shadow-lg max-w-3xl backdrop-blur-md">
                <div className="p-2.5 bg-amber-500/25 rounded-xl border border-amber-400/40 text-amber-300 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1 text-xs md:text-sm">
                  <h4 className="font-bold text-amber-300 flex flex-wrap items-center gap-2">
                    <span>🚀 Course Schedule Notice</span>
                    <span className="text-[10px] font-extrabold uppercase bg-amber-400/25 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-400/40">
                      Starts Sept 18, 2026
                    </span>
                  </h4>
                  <p className="text-amber-100/90 leading-relaxed font-medium">
                    {isEnrolled
                      ? "You are enrolled! Course video modules and lesson materials will start and become visible on your LMS Dashboard from September 18, 2026."
                      : "Course content & video lessons will start and become accessible starting 18th September 2026. Secure your enrollment today!"
                    }
                  </p>
                </div>
              </div>

              {/* Key Specs Grid */}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-white/15 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-cyan-200 uppercase tracking-wider">Pacing</div>
                    <div className="text-xs font-bold text-white">100% Self-Paced</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-cyan-200 uppercase tracking-wider">Curriculum</div>
                    <div className="text-xs font-bold text-white">{sortedModules.length} Modules · {totalLessons} Lessons</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] font-extrabold text-cyan-200 uppercase tracking-wider">Credential</div>
                    <div className="text-xs font-bold text-white">QR Verifiable PDF</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Pricing & Enrollment Card */}
            <div className="lg:col-span-4 w-full">
              <Card className="bg-white text-slate-900 border-slate-200 shadow-2xl p-6 md:p-8 space-y-6">

                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block">
                    Course Investment
                  </span>
                  <div className="text-4xl font-extrabold text-[#014a62] tracking-tight">
                    {rawPrice === 0 ? "Free" : `₹${rawPrice.toLocaleString("en-IN")}`}
                  </div>

                  {rawPrice > 0 && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5 text-slate-600 font-medium">
                      <div className="flex justify-between">
                        <span>Base Price (Excl. GST):</span>
                        <span className="font-bold text-slate-900">₹{basePrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>18% GST (CGST 9% + SGST 9%):</span>
                        <span className="font-bold text-slate-900">₹{gstAmount}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-[#014a62]">
                        <span>Total Amount (Incl. GST):</span>
                        <span>₹{rawPrice}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enrollment Button or Enrolled Actions */}
                <EnrollButton
                  courseId={course.id}
                  isEnrolled={isEnrolled}
                  price={rawPrice}
                  courseTitle={course.title}
                  initialUser={session ? { id: session.id, email: session.email } : null}
                  autoCouponCode={course.slug?.includes("combo") ? "ABCOMBO" : undefined}
                />

                {/* If user is enrolled, render Invoice Download button */}
                {isEnrolled && userOrder && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10 font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2"
                  >
                    <a href={`/api/invoices/download/${userOrder.id}`} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 text-[#014a62]" />
                      <span>Download Tax Invoice (PDF)</span>
                    </a>
                  </Button>
                )}

                <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#014a62] shrink-0" />
                    <span>Razorpay Secure Payment &amp; Auto Invoice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#014a62] shrink-0" />
                    <span>QR Verifiable Completion Certificate</span>
                  </div>
                </div>

              </Card>
            </div>

          </div>
        </div>
      </div>

      {/* Curriculum & Modules Showcase */}
      <div className="container mx-auto px-4 py-16 max-w-6xl space-y-12">
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl space-y-8">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
              Syllabus &amp; Modules
            </span>
            <h2 className="text-2xl md:text-4xl font-bold font-instrument-serif text-[#014a62] mt-3">
              Curriculum Breakdown
            </h2>
          </div>

          {sortedModules.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Modules for this course will be published soon.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full space-y-4">
              {sortedModules.map((mod: any, idx: number) => {
                const lessonsList = (mod.lessons as any[])?.sort(
                  (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
                ) || [];

                return (
                  <AccordionItem
                    key={mod.id}
                    value={`module-${mod.id}`}
                    className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50 px-6 py-1"
                  >
                    <AccordionTrigger className="hover:no-underline font-bold text-sm text-[#014a62]">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3 text-left">
                          <span className="text-xs font-mono font-bold bg-[#014a62] text-white px-2.5 py-1 rounded-md">
                            MODULE 0{idx + 1}
                          </span>
                          <span className="text-base font-bold font-instrument-serif text-[#014a62]">
                            {mod.title}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          {lessonsList.length} Lessons
                        </span>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-2 pb-4">
                      <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200/80 overflow-hidden">
                        {lessonsList.map((les: any, lesIdx: number) => (
                          <div
                            key={les.id}
                            className="p-4 flex items-center justify-between text-xs md:text-sm hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3 font-semibold text-slate-800">
                              <span className="w-6 h-6 rounded-full bg-[#014a62]/10 text-[#014a62] flex items-center justify-center text-xs font-mono font-bold shrink-0">
                                {lesIdx + 1}
                              </span>
                              <span>{les.title}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {les.isFreePreview ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                                  Free Preview
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Enrolled Only</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>
    </main>
  );
}
