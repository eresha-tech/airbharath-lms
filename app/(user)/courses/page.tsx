import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Users,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Certificate Courses | Airbharath LMS",
  description:
    "Explore Airbharath LMS professional certificate courses in Content Creation, AI Skills, Entrepreneurship, and MS Office Essentials taught by IIM alumni.",
};

const FEATURED_COURSES = [
  {
    id: "content-creation",
    title: "Content Creation & Digital Marketing",
    subtitle: "Create. Communicate. Grow.",
    description:
      "Learn to create purposeful content, understand digital marketing strategies, and build a powerful digital presence for yourself or your business.",
    badge: "Digital Marketing",
    modulesCount: 5,
    whoFor: "Students, creators, entrepreneurs, aviation professionals",
    slug: "ppl-theory-navigation",
    icon: Sparkles,
  },
  {
    id: "ai-skills",
    title: "AI Skills for the Future of Work",
    subtitle: "Don't Just Hear About AI. Learn to Use It.",
    description:
      "Build a practical understanding of AI and learn how AI tools support productivity, content creation, research, and everyday professional tasks.",
    badge: "AI & Productivity",
    modulesCount: 6,
    whoFor: "Professionals, job seekers, entrepreneurs, aviation crew",
    slug: "cpl-meteorology-instruments",
    icon: GraduationCap,
  },
  {
    id: "entrepreneurship",
    title: "Entrepreneurship Basics",
    subtitle: "Have an Idea? Learn What Comes Next.",
    description:
      "Understand the fundamentals of entrepreneurial thinking, customer discovery, business planning, and venture creation.",
    badge: "Venture & Business",
    modulesCount: 6,
    whoFor: "Aspiring entrepreneurs, students, working professionals",
    slug: "ppl-theory-navigation",
    icon: Award,
  },
  {
    id: "ms-office",
    title: "MS Office Essentials",
    subtitle: "Master Word, Excel & PowerPoint Like a Pro.",
    description:
      "Build total confidence in essential workplace digital tools — create professional documents, analyse spreadsheets, and design presentations.",
    badge: "Workplace Tools",
    icon: BookOpen,
    modulesCount: 5,
    whoFor: "Students, freshers, job seekers, working professionals",
    slug: "cpl-meteorology-instruments",
    icon2: ShieldCheck,
  },
];

export default async function CoursesPage() {
  let dbCourseList: any[] = [];
  try {
    dbCourseList = await db.query.courses.findMany({
      where: eq(courses.isPublished, true),
      with: {
        modules: {
          with: {
            lessons: true,
          },
        },
      },
    });

    dbCourseList.sort((a: any, b: any) => {
      if (a.slug === "combo-pack") return -1;
      if (b.slug === "combo-pack") return 1;
      return 0;
    });
  } catch (err) {
    console.error("Failed to load courses from DB:", err);
  }

  return (
    <>
      <main className="flex-1 pt-12 pb-20">

        {/* Page Header Banner */}
        <section className="bg-gradient-to-b from-[#014a62]/10 via-[#014a62]/5 to-transparent py-14 border-b border-slate-200/80">
          <div className="container mx-auto px-4 max-w-6xl space-y-6 text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-extrabold uppercase tracking-widest">
              <GraduationCap className="w-3.5 h-3.5 text-[#014a62]" />
              Air Bharath LMS Catalog
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-instrument-serif text-[#014a62] tracking-tight">
              All Certificate Courses
            </h1>

            <p className="text-base md:text-lg text-slate-700 max-w-2xl mx-auto leading-relaxed">
              Taught by IIM alumni and industry practitioners. Build practical, career-ready capabilities with self-paced learning and QR-verified credentials.
            </p>

            {/* Quick Stats Strip */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Self-Paced Learning
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-[#014a62]" />
                QR-Verified PDF Certificates
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
                <Award className="w-4 h-4 text-amber-600" />
                Taught by IIM Alumni
              </span>
            </div>
          </div>
        </section>

        {/* Course Directory Grid */}
        <section className="py-14">
          <div className="container mx-auto px-4 max-w-6xl space-y-10">

            {/* If DB has courses, render DB courses alongside featured programs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {dbCourseList.length > 0
                ? dbCourseList.map((c: any) => {
                  const totalLessons = c.modules?.reduce(
                    (acc: number, m: any) => acc + (m.lessons?.length || 0),
                    0
                  ) || 0;

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl hover:border-[#014a62]/30 transition-all overflow-hidden flex flex-col justify-between"
                    >
                      {/* Course Thumbnail Image Header */}
                      <div className="h-48 md:h-52 relative bg-slate-900 overflow-hidden">
                        {c.thumbnailUrl ? (
                          <img
                            src={c.thumbnailUrl}
                            alt={c.title}
                            className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#014a62] to-[#026282]" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-white bg-[#014a62]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md">
                            Verified Certificate
                          </span>
                          <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-amber-400/40 flex items-center gap-1.5 shadow-sm">
                            <span className="line-through text-amber-200/60 text-[10px]">₹{c.slug === 'combo-pack' || Number(c.price) > 2000 ? '3,300' : '1,999'}</span>
                            <span>₹{c.price || '825'}</span>
                          </span>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4">
                          <h2 className="text-xl md:text-2xl font-bold font-instrument-serif text-white leading-tight drop-shadow-md">
                            {c.title}
                          </h2>
                        </div>
                      </div>

                      <div className="p-7 space-y-5 flex-1 flex flex-col justify-between">
                        {c.description && (
                          <p className="text-xs md:text-sm text-slate-600 line-clamp-3 leading-relaxed font-sans font-normal">
                            {c.description}
                          </p>
                        )}

                        <div className="space-y-4 pt-2 border-t border-slate-100">
                          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-[#014a62]" />
                              <span>{c.modules?.length || 0} Modules</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#014a62]" />
                              <span>{totalLessons} Lessons</span>
                            </div>
                          </div>

                          <Button
                            asChild
                            className="w-full bg-[#014a62] hover:bg-[#01374a] text-white font-bold h-11 rounded-xl shadow-xs flex items-center justify-center gap-2"
                          >
                            <Link href={`/courses/${c.slug || c.id}`}>
                              <span>Explore Course Details</span>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
                : FEATURED_COURSES.map((fc) => {
                  const Icon = fc.icon || BookOpen;
                  return (
                    <div
                      key={fc.id}
                      className="bg-white rounded-3xl border border-slate-200/90 shadow-md hover:shadow-xl hover:border-[#014a62]/30 transition-all p-8 flex flex-col justify-between space-y-6"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20">
                            {fc.badge}
                          </span>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            Self-Paced
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h2 className="text-2xl font-bold font-instrument-serif text-[#014a62]">
                            {fc.title}
                          </h2>
                          <p className="text-xs font-bold text-slate-800 italic">
                            {fc.subtitle}
                          </p>
                        </div>

                        <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans">
                          {fc.description}
                        </p>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-medium text-slate-700">
                          <span className="font-bold text-[#014a62]">Who it&apos;s for: </span>
                          {fc.whoFor}
                        </div>
                      </div>

                      <Button
                        asChild
                        className="w-full bg-[#014a62] hover:bg-[#01374a] text-white font-bold h-11 rounded-xl shadow-xs flex items-center justify-center gap-2"
                      >
                        <Link href={`/courses/${fc.slug}`}>
                          <span>Explore Course Details</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
            </div>

            {/* Trust Footer Box */}
            <div className="bg-[#014a62] text-white rounded-3xl p-8 md:p-10 text-center space-y-3 shadow-xl">
              <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-300">
                The Airbharath Promise
              </span>
              <h3 className="text-xl md:text-3xl font-bold font-instrument-serif text-white">
                Learn it. Understand it. Practise it. Apply it.
              </h3>
              <p className="text-xs md:text-sm text-cyan-100 max-w-xl mx-auto">
                Build new capabilities without pausing your career. Certificate included upon successful completion.
              </p>
            </div>
          </div>
        </section>

      </main>
    </>
  );
}
