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
  Radio,
  CalendarClock,
  ExternalLink,
} from "lucide-react";
import EnrollButton from "@/components/EnrollButton";
import { CourseViewTracker } from "@/components/courses/CourseViewTracker";
import { formatISTDateTime } from "@/lib/lesson-availability";
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
          where: eq(courses.slug, slugOrId),
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
    if (session.role === "admin") {
      isEnrolled = true;
    } else {
      try {
        const [enrollmentObj, paidOrder] = await Promise.all([
          db.query.enrollments.findFirst({
            where: and(
              eq(enrollments.userId, session.id),
              eq(enrollments.courseId, course.id)
            ),
          }),
          db.query.orders.findFirst({
            where: and(
              eq(orders.userId, session.id),
              eq(orders.courseId, course.id),
              eq(orders.status, "paid")
            ),
          }),
        ]);

        if (enrollmentObj && enrollmentObj.status === "active") {
          isEnrolled = true;
          userOrder = paidOrder;
        }
      } catch {}
    }
  }

  const rawPrice = Number(course.price) || 0;
  const basePrice = Math.round((rawPrice / 1.18) * 100) / 100;
  const gstAmount = Math.round((rawPrice - basePrice) * 100) / 100;

  const rawSections = (course.sections as any[]) || [];
  const sortedSections = rawSections
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((sec: any) => ({
      ...sec,
      modules: (sec.modules || [])
        .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((mod: any) => ({
          ...mod,
          lessons: (mod.lessons || [])
            .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
            .map((les: any) => ({
              ...les,
              meetingUrl: isEnrolled ? les.meetingUrl : null,
            })),
        })),
    }));

  const rawCourseModules = (course.modules as any[]) || [];
  // Ensure meetingUrl is never exposed to non-enrolled / unauthenticated visitors
  const sortedModules = rawCourseModules
    .sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0))
    .map((mod: any) => ({
      ...mod,
      lessons: (mod.lessons || []).map((les: any) => ({
        ...les,
        meetingUrl: isEnrolled ? les.meetingUrl : null,
      })),
    }));

  const totalLessons =
    sortedModules.reduce(
      (acc: number, mod: any) => acc + (mod.lessons?.length || 0),
      0
    ) || 0;

  // Compute upcoming live sessions
  const now = new Date();
  const upcomingSessions = sortedModules
    .flatMap((mod: any, modIdx: number) =>
      (mod.lessons as any[] || []).filter(
        (les: any) => les.deliveryType === 'live' && les.scheduledAt && new Date(les.scheduledAt) > now
      ).map((les: any) => ({
        ...les,
        moduleName: mod.title,
        moduleIndex: modIdx + 1,
      }))
    )
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

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
      <div className="relative w-full overflow-hidden text-foreground bg-card pt-24 md:pt-28 pb-10 md:pb-16 border-b border-border">
        {course.thumbnailUrl && (
          <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay">
            <Image
              src={course.thumbnailUrl}
              alt={course.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div className="container mx-auto px-4 relative z-10 max-w-6xl space-y-6 animate-fade-up">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Link href="/courses" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Courses</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-foreground truncate max-w-xs">{course.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Hero Content */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted text-foreground rounded-full text-[10px] font-bold uppercase tracking-wider border border-border">
                  Airbharath Certified Program
                </span>
                <span className="px-3 py-1 bg-primary/15 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary/25">
                  ⚡ 100% Self-Paced
                </span>
                <span className="px-3 py-1 bg-success/15 text-success rounded-full text-[10px] font-bold uppercase tracking-wider border border-success/25">
                  Verifiable Credential
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight">
                {course.title}
              </h1>

              {course.description && (
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed font-sans max-w-2xl">
                  {course.description}
                </p>
              )}

              {/* Instant Access Notice */}
              <div className="p-4 rounded-2xl bg-muted/60 border border-border text-foreground flex items-start gap-3 shadow-xs max-w-2xl">
                <div className="p-2 bg-primary/15 rounded-xl border border-primary/25 text-primary shrink-0">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <span>Instant Curriculum Access</span>
                    <span className="text-[10px] font-extrabold uppercase bg-success/20 text-success px-2 py-0.5 rounded-full">
                      Immediate
                    </span>
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {isEnrolled
                      ? "You have full access to all curriculum modules and video lessons on your Student Dashboard."
                      : "Enroll today to instantly unlock all course modules, HD video lessons, and verifiable certification track."}
                  </p>
                </div>
              </div>

              {/* Key Specs Highlights */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center border border-border text-primary shrink-0">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Format
                    </div>
                    <div className="text-xs font-bold text-foreground">100% Self-Paced</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center border border-border text-primary shrink-0">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Curriculum
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {sortedModules.length} Modules · {totalLessons} Lessons
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center border border-border text-primary shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Credential
                    </div>
                    <div className="text-xs font-bold text-foreground">QR-Verifiable PDF</div>
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
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Practical, application-oriented industry skills</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Structured curriculum with hands-on exercises</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <span>Real-world case studies and workflow walkthroughs</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
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
                  {sortedSections.length > 0 ? `${sortedSections.length} Sections · ` : ""}{sortedModules.length} Modules · {totalLessons} Lessons
                </Badge>
              </div>

              {sortedSections.length > 0 ? (
                /* 1. Hierarchical Section-based Syllabus */
                <div className="space-y-6">
                  {sortedSections.map((sec: any, secIdx: number) => {
                    const secModules = sec.modules || [];
                    const secTotalLessons = secModules.reduce(
                      (acc: number, m: any) => acc + (m.lessons?.length || 0),
                      0
                    );

                    return (
                      <div
                        key={sec.id}
                        className="border-2 border-primary/20 rounded-3xl overflow-hidden bg-muted/10 space-y-3 p-4 sm:p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-primary/20">
                          <div className="flex items-center gap-3">
                            <span className="h-7 w-7 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center font-outfit shrink-0">
                              {secIdx + 1}
                            </span>
                            <div>
                              <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                                Section {secIdx + 1} — {sec.title}
                              </h3>
                              {sec.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {sec.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-muted-foreground shrink-0 pl-10 sm:pl-0">
                            {secModules.length} {secModules.length === 1 ? "module" : "modules"} · {secTotalLessons} lessons
                          </span>
                        </div>

                        {/* Modules Accordion within Section */}
                        <Accordion type="single" collapsible className="w-full space-y-2.5">
                          {secModules.map((mod: any, modIdx: number) => {
                            const lessonsList = mod.lessons || [];

                            return (
                              <AccordionItem
                                key={mod.id}
                                value={`sec-${sec.id}-mod-${mod.id}`}
                                className="border border-border/80 rounded-2xl overflow-hidden bg-card px-4 py-0.5 data-[state=open]:bg-card transition-colors shadow-2xs"
                              >
                                <AccordionTrigger className="hover:no-underline text-foreground font-semibold text-xs sm:text-sm py-3.5">
                                  <div className="flex items-center justify-between w-full pr-3 text-left">
                                    <div className="flex items-center gap-2.5">
                                      <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                                        Module {modIdx + 1}
                                      </span>
                                      <span className="font-bold font-outfit text-foreground text-xs sm:text-sm">
                                        {mod.title}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-muted-foreground">
                                      {lessonsList.length} Lessons
                                    </span>
                                  </div>
                                </AccordionTrigger>

                                <AccordionContent className="pt-1 pb-3">
                                  <div className="divide-y divide-border/60 bg-muted/20 rounded-xl border border-border/60 overflow-hidden">
                                    {lessonsList.map((les: any, lesIdx: number) => (
                                      <div
                                        key={les.id}
                                        className="p-3 flex items-center justify-between text-xs hover:bg-muted/40 transition-colors"
                                      >
                                        <div className="flex items-center gap-2.5 font-medium text-foreground">
                                          <span className="w-5 h-5 rounded-md bg-background border border-border text-muted-foreground flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                                            {modIdx + 1}.{lesIdx + 1}
                                          </span>
                                          <span>{les.title}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          {les.deliveryType === 'live' ? (
                                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded-full border border-rose-200 dark:border-rose-800 uppercase inline-flex items-center gap-1">
                                              <Radio className="w-2.5 h-2.5" />
                                              Live
                                            </span>
                                          ) : les.releaseAt && new Date(les.releaseAt) > now ? (
                                            <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded-full border border-amber-200 dark:border-amber-800 uppercase inline-flex items-center gap-1">
                                              <Lock className="w-2.5 h-2.5" />
                                              <span>Releases {formatISTDateTime(les.releaseAt, { shortDate: true })}</span>
                                            </span>
                                          ) : null}
                                          {les.isFreePreview ? (
                                            <span className="px-2.5 py-0.5 bg-success/15 text-success text-[10px] font-bold rounded-full border border-success/25">
                                              Free Preview
                                            </span>
                                          ) : (!les.releaseAt || new Date(les.releaseAt) <= now) ? (
                                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                              <Lock className="w-3 h-3" />
                                              <span>Enrolled</span>
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      </div>
                    );
                  })}
                </div>
              ) : sortedModules.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Modules and lessons for this course will be published shortly.
                </p>
              ) : (
                /* 2. Flat Module Syllabus for Legacy/Standalone Courses */
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
                                Module {idx + 1}
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
                                    {idx + 1}.{lesIdx + 1}
                                  </span>
                                  <span>{les.title}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  {les.deliveryType === 'live' ? (
                                    <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded-full border border-rose-200 dark:border-rose-800 uppercase inline-flex items-center gap-1">
                                      <Radio className="w-2.5 h-2.5" />
                                      Live
                                    </span>
                                  ) : les.releaseAt && new Date(les.releaseAt) > now ? (
                                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[9px] font-bold rounded-full border border-amber-200 dark:border-amber-800 uppercase inline-flex items-center gap-1">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>Releases {formatISTDateTime(les.releaseAt, { shortDate: true })}</span>
                                    </span>
                                  ) : null}
                                  {les.isFreePreview ? (
                                    <span className="px-2.5 py-0.5 bg-success/15 text-success text-[10px] font-bold rounded-full border border-success/25">
                                      Free Preview
                                    </span>
                                  ) : (!les.releaseAt || new Date(les.releaseAt) <= now) ? (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                      <Lock className="w-3 h-3" />
                                      <span>Enrolled</span>
                                    </span>
                                  ) : null}
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

            {/* Upcoming Live Sessions */}
            {upcomingSessions.length > 0 && (
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Live Sessions
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                    Upcoming Schedule
                  </h2>
                </div>

                <div className="space-y-3">
                  {upcomingSessions.map((session: any) => {
                    const sessionDate = new Date(session.scheduledAt);
                    return (
                      <div key={session.id} className="flex items-start gap-4 p-4 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex flex-col items-center justify-center min-w-[52px] bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-center">
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                            {sessionDate.toLocaleDateString('en-IN', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-foreground font-outfit leading-none">
                            {sessionDate.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-bold text-foreground font-outfit truncate">
                            {session.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold">Module {session.moduleIndex}: {session.moduleName}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {sessionDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                            {session.durationMinutes && (
                              <>
                                <span>·</span>
                                <span>{session.durationMinutes} min</span>
                              </>
                            )}
                          </div>
                        </div>
                        {isEnrolled && session.meetingUrl && (
                          <a
                            href={session.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Join</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
