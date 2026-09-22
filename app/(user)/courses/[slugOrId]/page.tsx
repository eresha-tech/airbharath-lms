import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Award,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Download,
  Sparkles,
  GraduationCap,
  ChevronRight,
  FileCheck2,
  PlayCircle,
  Layers,
} from "lucide-react";
import EnrollButton from "@/components/EnrollButton";
import { CourseViewTracker } from "@/components/courses/CourseViewTracker";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

interface CoursePageProps {
  params: Promise<{
    slugOrId: string;
  }>;
}

export async function generateMetadata({ params }: CoursePageProps) {
  const { slugOrId } = await params;
  const isUUID = /^[0-9a-f-]{36}$/i.test(slugOrId);

  let courseTitle = "Course Details";
  try {
    const course = isUUID
      ? await db.query.courses.findFirst({
          where: eq(courses.id, slugOrId),
          columns: { title: true },
        })
      : await db.query.courses.findFirst({
          where: eq(courses.slug, slugOrId),
          columns: { title: true },
        });
    if (course?.title) courseTitle = course.title;
  } catch {}

  return {
    title: `${courseTitle} | Airbharath LMS`,
    description: `Master career-ready capabilities with ${courseTitle} on Airbharath LMS. Self-paced HD video modules and QR-verifiable certificate included.`,
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
      <div className="container mx-auto px-4 pt-28 pb-16 text-center min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold font-outfit text-foreground">
          Course Not Found
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm max-w-sm">
          The requested Airbharath course could not be located or may have been updated.
        </p>
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl mt-4 text-xs h-10 px-5 shadow-xs cursor-pointer">
          <Link href="/courses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Explore All Courses</span>
          </Link>
        </Button>
      </div>
    );
  }

  // Check user enrollment and order for invoice
  let isEnrolled = false;
  let userOrder: any = null;

  if (session) {
    try {
      const enrollmentObj = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, session.id),
          eq(enrollments.courseId, course.id)
        ),
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
    } catch {}
  }

  const rawPrice = Number(course.price) || 0;
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const courseModules = (course.modules as any[]) || [];
  const sortedModules = courseModules.sort(
    (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );
  const totalLessons =
    sortedModules.reduce(
      (acc: number, mod: any) => acc + (mod.lessons?.length || 0),
      0
    ) || 0;

  return (
    <main className="flex-1 pb-20">
      <CourseViewTracker
        courseId={course.id}
        slug={course.slug}
        title={course.title}
        price={Number(course.price) || 0}
        isFree={Number(course.price) === 0}
      />
      {/* 1. Hero Section Header */}
      <div className="relative w-full overflow-hidden text-white bg-gradient-to-br from-[#014a62] via-[#013c50] to-[#012c3b] pt-24 md:pt-28 pb-10 md:pb-16 border-b border-[#014a62]/40">
        {course.thumbnailUrl && (
          <div className="absolute inset-0 z-0 opacity-15 mix-blend-overlay">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 relative z-10 max-w-6xl space-y-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
            <Link href="/courses" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Courses</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-cyan-200/50" />
            <span className="text-white truncate max-w-xs">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Hero Content */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white/10 text-white rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border border-white/15">
                  Airbharath Certified Program
                </span>
                <span className="px-3 py-1 bg-cyan-400/20 text-cyan-200 rounded-full text-[10px] font-bold uppercase tracking-wider border border-cyan-400/30">
                  ⚡ 100% Self-Paced
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-400/30">
                  Verifiable Credential
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-outfit text-white leading-tight tracking-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-xs sm:text-sm md:text-base text-cyan-100/90 leading-relaxed font-sans max-w-2xl">
                  {course.description}
                </p>
              )}

              {/* Instant Access Notice */}
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-400/30 text-cyan-100 flex items-start gap-3 backdrop-blur-xs shadow-xs max-w-2xl">
                <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-400/30 text-cyan-300 shrink-0">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-white flex items-center gap-2">
                    <span>Instant Curriculum Access</span>
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                      Immediate
                    </span>
                  </h4>
                  <p className="text-cyan-100/80 leading-relaxed">
                    {isEnrolled
                      ? "You have full access to all curriculum modules and video lessons on your Student Dashboard."
                      : "Enroll today to instantly unlock all course modules, HD video lessons, and verifiable certification track."}
                  </p>
                </div>
              </div>

              {/* Key Specs Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/15 max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                      Format
                    </div>
                    <div className="text-xs font-bold text-white">100% Self-Paced</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                      Curriculum
                    </div>
                    <div className="text-xs font-bold text-white">
                      {sortedModules.length} Modules · {totalLessons} Lessons
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/15 text-cyan-300 shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                      Credential
                    </div>
                    <div className="text-xs font-bold text-white">QR-Verifiable PDF</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Pricing & Enrollment Card */}
            <div className="lg:col-span-4 w-full">
              <Card className="bg-card text-card-foreground border-border/80 shadow-xl p-6 sm:p-7 space-y-6 rounded-3xl">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                    Course Investment
                  </span>
                  <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight font-outfit">
                    {rawPrice === 0 ? "Free" : `₹${rawPrice.toLocaleString("en-IN")}`}
                  </div>

                  {rawPrice > 0 && (
                    <div className="bg-muted/40 p-3.5 rounded-2xl border border-border/60 text-xs space-y-1 text-muted-foreground font-medium">
                      <div className="flex justify-between">
                        <span>Base Amount (Excl. GST):</span>
                        <span className="font-semibold text-foreground">₹{basePrice}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>18% GST (CGST 9% + SGST 9%):</span>
                        <span className="font-semibold text-foreground">₹{gstAmount}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-1 font-bold text-primary">
                        <span>Total Payable:</span>
                        <span>₹{rawPrice}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Enrollment Button */}
                <EnrollButton
                  courseId={course.id}
                  isEnrolled={isEnrolled}
                  price={rawPrice}
                  courseTitle={course.title}
                  initialUser={session ? { id: session.id, email: session.email } : null}
                  autoCouponCode={course.slug?.includes("combo") ? "ABCOMBO" : undefined}
                />

                {/* Invoice download for enrolled students */}
                {isEnrolled && userOrder && (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10 font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <a
                      href={`/api/invoices/download/${userOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>Download Tax Invoice (PDF)</span>
                    </a>
                  </Button>
                )}

                {/* Security and Certificate Guarantee */}
                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                    <span>Razorpay 256-bit Secure Checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Official QR-Verifiable Certificate</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Course Body Content & Curriculum */}
      <div className="container mx-auto px-4 py-10 sm:py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Left Content Area */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10">
            {/* What You'll Learn Highlights */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Learning Outcomes
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                  What You&apos;ll Master
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Practical, application-oriented industry skills</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Structured curriculum with hands-on exercises</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Real-world case studies and workflow walkthroughs</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Verifiable PDF credential upon 100% completion</span>
                </div>
              </div>
            </div>

            {/* Curriculum Breakdown */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Syllabus &amp; Modules
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                    Course Curriculum
                  </h2>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-xl">
                  {sortedModules.length} Modules · {totalLessons} Lessons
                </Badge>
              </div>

              {sortedModules.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Modules and lessons for this course will be published shortly.
                </p>
              ) : (
                <Accordion type="single" collapsible className="w-full space-y-3">
                  {sortedModules.map((mod: any, idx: number) => {
                    const lessonsList =
                      (mod.lessons as any[])?.sort(
                        (a: any, b: any) =>
                          (a.orderIndex || 0) - (b.orderIndex || 0)
                      ) || [];

                    return (
                      <AccordionItem
                        key={mod.id}
                        value={`module-${mod.id}`}
                        className="border border-border/80 rounded-2xl overflow-hidden bg-muted/20 px-5 py-0.5 data-[state=open]:bg-muted/40 transition-colors"
                      >
                        <AccordionTrigger className="hover:no-underline text-foreground font-semibold text-sm py-4">
                          <div className="flex items-center justify-between w-full pr-3 text-left">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-mono font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-sm sm:text-base font-bold font-outfit text-foreground">
                                {mod.title}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                              {lessonsList.length} Lessons
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pt-1 pb-4">
                          <div className="divide-y divide-border/60 bg-card rounded-xl border border-border/60 overflow-hidden">
                            {lessonsList.map((les: any, lesIdx: number) => (
                              <div
                                key={les.id}
                                className="p-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-muted/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 font-medium text-foreground">
                                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                    {lesIdx + 1}
                                  </span>
                                  <span>{les.title}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {les.isFreePreview ? (
                                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                      Free Preview
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Lock className="w-3 h-3" />
                                      <span>Enrolled</span>
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

          {/* Right Sidebar Details */}
          <div className="lg:col-span-4 space-y-6">
            {/* Verified Certificate Showcase */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit">
                    Verified Credential
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Included upon 100% completion
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Receive an official certificate featuring a secure verification QR code and unique credential ID. Add it directly to your LinkedIn profile and resume to demonstrate competency to recruiters.
              </p>
            </div>

            {/* Course Fast Facts */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-3.5 shadow-xs">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                Course Summary
              </h3>

              <div className="space-y-2.5 text-xs text-foreground divide-y divide-border/50">
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-semibold">Beginner to Advanced</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-semibold">English &amp; Hindi</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-semibold text-primary">HD Video Lessons</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Access Validity</span>
                  <span className="font-semibold">
                    {course.accessDays ? `${course.accessDays} Days` : "Lifetime Access"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
