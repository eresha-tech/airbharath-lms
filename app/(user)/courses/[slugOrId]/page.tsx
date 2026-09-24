import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
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
import { courses, enrollments, orders, progress } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { hasCourseAccess, getBundleIncludedCourses } from "@/lib/course-access";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MarkdownContent } from "@/components/content/MarkdownContent";
import { CourseDetailNav } from "@/components/courses/CourseDetailNav";

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
  let seoTitle: string | null = null;
  let seoDescription: string | null = null;
  let shortDesc: string | null = null;
  let fallbackDesc: string | null = null;
  try {
    const course = isUUID
      ? await db.query.courses.findFirst({
          where: eq(courses.id, slugOrId),
          columns: {
            title: true,
            seoTitle: true,
            seoDescription: true,
            shortDescription: true,
            description: true,
          },
        })
      : await db.query.courses.findFirst({
          where: eq(courses.slug, slugOrId),
          columns: {
            title: true,
            seoTitle: true,
            seoDescription: true,
            shortDescription: true,
            description: true,
          },
        });
    if (course) {
      if (course.title) courseTitle = course.title;
      seoTitle = course.seoTitle;
      seoDescription = course.seoDescription;
      shortDesc = course.shortDescription;
      fallbackDesc = course.description;
    }
  } catch {}

  const finalTitle = seoTitle || `${courseTitle} | Airbharath LMS`;
  const finalDescription =
    seoDescription ||
    shortDesc ||
    fallbackDesc ||
    `Master career-ready capabilities with ${courseTitle} on Airbharath LMS. Self-paced HD video modules and QR-verifiable certificate included.`;

  return {
    title: finalTitle,
    description: finalDescription,
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
            authors: true,
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
            authors: true,
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

  // Check user enrollment and bundle access
  let isEnrolled = false;
  let userOrder: any = null;
  let accessInfo: any = null;
  const isBundle = Boolean(course.isBundle);
  const completedLessonIds = new Set<string>();

  const bundledCourses = await getBundleIncludedCourses(course.id);

  if (session) {
    try {
      const [access, paidOrder, userProgress] = await Promise.all([
        hasCourseAccess(session.id, course.id, session.role),
        db.query.orders.findFirst({
          where: and(
            eq(orders.userId, session.id),
            eq(orders.courseId, course.id),
            eq(orders.status, "paid")
          ),
        }),
        db.query.progress.findMany({
          where: eq(progress.userId, session.id),
        }),
      ]);

      (userProgress || []).forEach((p: any) => {
        if (p.isCompleted) completedLessonIds.add(p.lessonId);
      });

      accessInfo = access;
      if (access.hasAccess) {
        isEnrolled = true;
        userOrder = paidOrder;

        // If enrolled via bundle and no direct order, find the bundle order for invoice
        if (!userOrder && access.bundleCourseId) {
          userOrder = await db.query.orders.findFirst({
            where: and(
              eq(orders.userId, session.id),
              eq(orders.courseId, access.bundleCourseId),
              eq(orders.status, "paid")
            ),
          });
        }
      }
    } catch (err) {
      console.error("Error checking course access:", err);
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

  // Student progress calculation
  let completedCount = 0;
  sortedModules.forEach((m: any) => {
    m.lessons?.forEach((l: any) => {
      if (completedLessonIds.has(l.id)) completedCount++;
    });
  });
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  let firstIncompleteLessonId: string | null = null;
  for (const m of sortedModules) {
    for (const l of m.lessons || []) {
      if (!completedLessonIds.has(l.id)) {
        firstIncompleteLessonId = l.id;
        break;
      }
    }
    if (firstIncompleteLessonId) break;
  }
  const firstLessonId = sortedModules[0]?.lessons?.[0]?.id || null;
  const resumeLessonId = firstIncompleteLessonId || firstLessonId;

  const continueLearningUrl = isBundle
    ? "/my-courses"
    : resumeLessonId
    ? `/dashboard/courses/${course.id}/lessons/${resumeLessonId}`
    : `/dashboard/courses/${course.id}`;

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

  const sortedAuthors = ((course.authors as any[]) || []).sort(
    (a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)
  );

  return (
    <main className="flex-1 pb-24">
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
                  {isBundle ? "Airbharath Multi-Program Bundle" : "Airbharath Certified Program"}
                </span>
                <span className="px-3 py-1 bg-primary/15 text-primary rounded-full text-[10px] font-bold uppercase tracking-wider border border-primary/25">
                  ⚡ 100% Self-Paced
                </span>
                <span className="px-3 py-1 bg-success/15 text-success rounded-full text-[10px] font-bold uppercase tracking-wider border border-success/25">
                  {isBundle ? "Individual Credentials" : "Verifiable Credential"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight">
                {course.title}
              </h1>

              {(course.shortDescription || course.description) && (
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed font-sans max-w-2xl">
                  {course.shortDescription || course.description}
                </p>
              )}

              {/* Instant Access Notice */}
              <div className="p-4 rounded-2xl bg-muted/60 border border-border text-foreground flex items-start gap-3 shadow-xs max-w-2xl">
                <div className="p-2 bg-primary/15 rounded-xl border border-primary/25 text-primary shrink-0">
                  <PlayCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    <span>
                      {isBundle
                        ? isEnrolled
                          ? `Active Bundle Pass Enrolled`
                          : `Multi-Course Access Pass`
                        : accessInfo?.accessType === "bundle"
                        ? `Included in your ${accessInfo.bundleTitle || "Combo Pass"}`
                        : "Instant Curriculum Access"}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-success/20 text-success px-2 py-0.5 rounded-full">
                      {isEnrolled ? "Unlocked" : "Immediate"}
                    </span>
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {isBundle
                      ? isEnrolled
                        ? `Your active enrollment in ${course.title} unlocks all ${bundledCourses.length} included courses, HD video modules, and individual verifiable credentials.`
                        : `Enroll today to instantly unlock all ${bundledCourses.length} independent certificate courses included in this commercial pass.`
                      : accessInfo?.accessType === "bundle"
                      ? `Your active enrollment in ${accessInfo.bundleTitle || "the Combo Pass"} unlocks this full course, HD video modules, and verifiable credential.`
                      : isEnrolled
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
                      {isBundle ? "Programs" : "Curriculum"}
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {isBundle
                        ? `${bundledCourses.length} Full Courses`
                        : `${sortedModules.length} Modules · ${totalLessons} Lessons`}
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
                    <div className="text-xs font-bold text-foreground">
                      {isBundle ? "Individual Certificates" : "QR-Verifiable PDF"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Pricing & Primary Action Card */}
            <div id="pricing-card" className="lg:col-span-4 w-full scroll-mt-24">
              <Card className="bg-card text-card-foreground border-border/80 shadow-xl p-6 sm:p-7 space-y-6 rounded-3xl">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                    {isBundle ? "Bundle Investment" : "Course Investment"}
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
                  customRedirectUrl={isBundle ? "/my-courses" : undefined}
                  customButtonText={isBundle ? "View My Included Courses" : undefined}
                />

                {/* Progress for enrolled student */}
                {isEnrolled && !isBundle && totalLessons > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Your Progress</span>
                      <span className="text-foreground font-bold">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2 rounded-full" />
                    <Button
                      asChild
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-xs"
                    >
                      <Link href={continueLearningUrl}>
                        <PlayCircle className="w-4 h-4" />
                        <span>Continue Learning</span>
                      </Link>
                    </Button>
                  </div>
                )}

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

      {/* 2. Sticky Section Navigation Bar */}
      <CourseDetailNav
        hasInstructors={sortedAuthors.length > 0}
        hasRequirements={Boolean(course.prerequisites)}
        isEnrolled={isEnrolled}
        courseId={course.id}
        isBundle={isBundle}
        price={rawPrice}
        resumeLessonId={resumeLessonId}
      />

      {/* 3. Main Course Content Body + Secondary Sidebar */}
      <div className="container mx-auto px-4 py-10 sm:py-14 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main Left Content Area */}
          <div className="lg:col-span-8 space-y-12 sm:space-y-14">
            {/* SECTION: Overview */}
            <section id="course-overview" className="scroll-mt-28 space-y-8">
              {/* About This Course */}
              {course.aboutCourse && (
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Overview
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      About This Course
                    </h2>
                  </div>
                  <div className="pt-2 text-foreground/90 leading-relaxed font-sans">
                    <MarkdownContent content={course.aboutCourse} />
                  </div>
                </div>
              )}

              {/* What You'll Learn */}
              {(course.whatYouWillLearn || !isBundle) && (
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Learning Outcomes
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      What You&apos;ll Learn
                    </h2>
                  </div>

                  {course.whatYouWillLearn ? (
                    <div className="pt-2 text-foreground/90 leading-relaxed font-sans">
                      <MarkdownContent content={course.whatYouWillLearn} />
                    </div>
                  ) : (
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
                  )}
                </div>
              )}

              {/* Who Is This Course For? */}
              {course.whoIsThisFor && (
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Target Audience
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      Who Is This Course For?
                    </h2>
                  </div>
                  <div className="pt-2 text-foreground/90 leading-relaxed font-sans">
                    <MarkdownContent content={course.whoIsThisFor} />
                  </div>
                </div>
              )}

              {/* Optional Course Content Overview */}
              {course.contentOverview && (
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Structure &amp; Themes
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      Course Content Overview
                    </h2>
                  </div>
                  <div className="pt-2 text-foreground/90 leading-relaxed font-sans">
                    <MarkdownContent content={course.contentOverview} />
                  </div>
                </div>
              )}
            </section>

            {/* SECTION: Curriculum */}
            <section id="course-curriculum" className="scroll-mt-28 space-y-6">
              <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {isBundle ? "Bundle Composition" : "Syllabus & Modules"}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      {isBundle ? "Included Certificate Programs" : "Course Curriculum"}
                    </h2>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-xl">
                    {isBundle
                      ? `${bundledCourses.length} Included Courses`
                      : `${sortedSections.length > 0 ? `${sortedSections.length} Sections · ` : ""}${sortedModules.length} Modules · ${totalLessons} Lessons`}
                  </Badge>
                </div>

                {isBundle ? (
                  /* Dedicated Bundle Overview for Multi-Course Commercial Passes */
                  <div className="space-y-5">
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-primary flex items-center gap-2">
                        <Layers className="w-4 h-4 shrink-0" />
                        <span>{bundledCourses.length} Independent Career Programs Included</span>
                      </span>
                      <span className="text-muted-foreground font-medium">
                        Each course awards its own QR-verifiable certificate upon 100% completion
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {bundledCourses.map((bCourse: any, bIdx: number) => {
                        let bTotal = 0;
                        let bDone = 0;
                        bCourse.modules?.forEach((m: any) => {
                          m.lessons?.forEach((l: any) => {
                            bTotal++;
                            if (completedLessonIds.has(l.id)) bDone++;
                          });
                        });
                        const bPercent = bTotal > 0 ? Math.round((bDone / bTotal) * 100) : 0;

                        return (
                          <div
                            key={bCourse.id}
                            className="border border-border/80 rounded-3xl overflow-hidden bg-card hover:border-primary/40 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
                          >
                            <div>
                              {bCourse.thumbnailUrl && (
                                <div className="aspect-video relative overflow-hidden bg-muted">
                                  <Image
                                    src={bCourse.thumbnailUrl}
                                    alt={bCourse.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}

                              <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-md bg-primary/10 text-primary">
                                    Program {bIdx + 1}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-medium">
                                    {bCourse.modules?.length || 0} Modules · {bTotal} Lessons
                                  </span>
                                </div>

                                <h4 className="font-bold font-outfit text-base text-foreground line-clamp-1">
                                  {bCourse.title}
                                </h4>

                                {bCourse.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {bCourse.description}
                                  </p>
                                )}

                                {/* Progress bar for enrolled student */}
                                {isEnrolled && bTotal > 0 && (
                                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                                    <div className="flex justify-between text-[11px] font-semibold">
                                      <span className="text-muted-foreground">
                                        {bDone} of {bTotal} Lessons
                                      </span>
                                      <span className="text-foreground font-bold">{bPercent}%</span>
                                    </div>
                                    <Progress value={bPercent} className="h-1.5 rounded-full" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="p-5 pt-0 border-t border-border/50 mt-1">
                              <Button
                                asChild
                                className="w-full text-xs font-bold h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-3 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Link
                                  href={
                                    isEnrolled
                                      ? `/dashboard/courses/${bCourse.id}`
                                      : `/courses/${bCourse.slug || bCourse.id}`
                                  }
                                >
                                  <span>{isEnrolled ? "Start Learning" : "View Program Details"}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : sortedSections.length > 0 ? (
                  /* Hierarchical Section-based Syllabus for Regular Courses */
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
                          className="border-2 border-primary/20 rounded-3xl overflow-hidden bg-muted/10 space-y-3.5 p-4 sm:p-5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2 border-b border-primary/20">
                            <div className="flex items-start gap-3">
                              <span className="h-7 w-7 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center font-outfit shrink-0 mt-0.5">
                                {secIdx + 1}
                              </span>
                              <div className="space-y-1">
                                <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                                  Section {secIdx + 1} — {sec.title}
                                </h3>
                                {sec.description && (
                                  <div className="text-xs text-muted-foreground leading-relaxed">
                                    <MarkdownContent content={sec.description} />
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground shrink-0 pl-10 sm:pl-0 pt-0.5">
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

                                  <AccordionContent className="pt-1 pb-3.5 space-y-3">
                                    {mod.description && (
                                      <div className="text-xs text-muted-foreground leading-relaxed px-1">
                                        <MarkdownContent content={mod.description} />
                                      </div>
                                    )}

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

                                    {/* Practical Task Callout */}
                                    {mod.practicalTask && (
                                      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                          <span>Practical Task</span>
                                        </div>
                                        <div className="text-xs text-foreground/90 leading-relaxed font-sans">
                                          <MarkdownContent content={mod.practicalTask} />
                                        </div>
                                      </div>
                                    )}
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
                  /* 2. Flat Module Syllabus for Standalone Courses */
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

                        <AccordionContent className="pt-1 pb-4 space-y-3">
                          {mod.description && (
                            <div className="text-xs text-muted-foreground leading-relaxed px-1">
                              <MarkdownContent content={mod.description} />
                            </div>
                          )}

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

                          {/* Practical Task Callout */}
                          {mod.practicalTask && (
                            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                <span>Practical Task</span>
                              </div>
                              <div className="text-xs text-foreground/90 leading-relaxed font-sans">
                                <MarkdownContent content={mod.practicalTask} />
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
            </section>

            {/* SECTION: Instructors */}
            {sortedAuthors.length > 0 && (
              <section id="course-instructors" className="scroll-mt-28 space-y-6">
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Instructional Team
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      {sortedAuthors.length === 1 ? "Meet Your Instructor" : "Meet Your Instructors"}
                    </h2>
                  </div>

                  <div className={`grid grid-cols-1 ${sortedAuthors.length > 1 ? "sm:grid-cols-2" : ""} gap-6`}>
                    {sortedAuthors.map((author: any) => (
                      <div
                        key={author.id}
                        className="border border-border/80 rounded-2xl p-5 bg-card/60 flex flex-col sm:flex-row items-start gap-4 shadow-2xs hover:border-primary/40 transition-colors"
                      >
                        {author.photoUrl ? (
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-border/80 bg-muted">
                            <Image
                              src={author.photoUrl}
                              alt={author.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl font-outfit shrink-0">
                            {author.name?.charAt(0) || "A"}
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div>
                            <h4 className="font-bold text-base text-foreground font-outfit truncate">
                              {author.name}
                            </h4>
                            {author.designation && (
                              <p className="text-xs font-semibold text-primary">
                                {author.designation}
                              </p>
                            )}
                          </div>

                          {author.bio && (
                            <div className="text-xs text-muted-foreground leading-relaxed">
                              <MarkdownContent content={author.bio} />
                            </div>
                          )}

                          {author.profileUrl && (
                            <a
                              href={author.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline pt-1"
                            >
                              <span>View Profile</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: Requirements */}
            {course.prerequisites && (
              <section id="course-requirements" className="scroll-mt-28 space-y-6">
                <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Requirements
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                      Prerequisites
                    </h2>
                  </div>
                  <div className="pt-2 text-foreground/90 leading-relaxed font-sans">
                    <MarkdownContent content={course.prerequisites} />
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: Upcoming Live Sessions */}
            {upcomingSessions.length > 0 && (
              <section id="course-live-sessions" className="scroll-mt-28 space-y-5">
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
              </section>
            )}
          </div>

          {/* Right Sticky Sidebar: Summary, Progress & Fast Facts */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            {/* Sticky Action & Progress Card */}
            <Card className="bg-card text-card-foreground border-border/80 shadow-md p-6 space-y-5 rounded-3xl">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  {isEnrolled ? "Learning Status" : "Program Summary"}
                </span>
                <h3 className="font-bold text-lg font-outfit text-foreground">
                  {isEnrolled ? (isBundle ? "Active Pass" : "Your Enrollment") : "Ready to Begin?"}
                </h3>
              </div>

              {isEnrolled ? (
                <div className="space-y-4 pt-1">
                  {!isBundle && totalLessons > 0 && (
                    <div className="space-y-2 bg-muted/40 p-3.5 rounded-2xl border border-border/60">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">Course Completion</span>
                        <span className="text-foreground font-bold">{progressPercent}%</span>
                      </div>
                      <Progress value={progressPercent} className="h-2 rounded-full" />
                      <p className="text-[11px] text-muted-foreground">
                        {completedCount} of {totalLessons} lessons finished
                      </p>
                    </div>
                  )}

                  <Button
                    asChild
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Link href={continueLearningUrl}>
                      <PlayCircle className="w-4 h-4" />
                      <span>{isBundle ? "Explore Included Courses" : "Continue Learning"}</span>
                    </Link>
                  </Button>

                  {userOrder && (
                    <Button
                      asChild
                      variant="outline"
                      className="w-full border-border/80 hover:bg-muted font-semibold h-9 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <a
                        href={`/api/invoices/download/${userOrder.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Download Invoice (PDF)</span>
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                    <span className="text-xs text-muted-foreground font-medium">Investment:</span>
                    <span className="text-2xl font-bold font-outfit text-foreground">
                      {rawPrice === 0 ? "Free" : `₹${rawPrice.toLocaleString("en-IN")}`}
                    </span>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <a href="#pricing-card">
                      <span>Enroll Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              )}

              {/* Course Fast Facts Table */}
              <div className="pt-3 border-t border-border/60 space-y-2.5 text-xs text-foreground divide-y divide-border/40">
                <div className="flex justify-between items-center pt-1.5">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-semibold text-foreground">100% Self-Paced</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">{isBundle ? "Programs" : "Structure"}</span>
                  <span className="font-semibold text-foreground">
                    {isBundle
                      ? `${bundledCourses.length} Full Courses`
                      : `${sortedModules.length} Modules · ${totalLessons} Lessons`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-semibold text-foreground">Beginner to Advanced</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Language</span>
                  <span className="font-semibold text-foreground">English &amp; Hindi</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Access Validity</span>
                  <span className="font-semibold text-foreground">
                    {course.accessDays ? `${course.accessDays} Days` : "Lifetime Access"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Verified Certificate Showcase Card */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
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
                Earn an official certificate featuring a secure verification QR code and unique credential ID. Share directly to LinkedIn to showcase your capabilities to employers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
