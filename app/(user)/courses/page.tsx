import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sparkles,
  BookOpen,
} from "lucide-react";
import {
  CourseCatalogClient,
  CatalogCourseItem,
} from "@/components/courses/CourseCatalogClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Certificate Courses | Airbharath LMS",
  description:
    "Explore Airbharath LMS professional certificate courses in Aviation, AI Skills, Digital Marketing, and Technical Essentials taught by IIM alumni.",
};

const FEATURED_FALLBACK_COURSES: CatalogCourseItem[] = [
  {
    id: "content-creation",
    title: "Content Creation & Digital Marketing",
    description:
      "Learn to create purposeful content, understand digital marketing strategies, and build a powerful digital presence for yourself or your business.",
    badge: "Digital Marketing",
    modulesCount: 5,
    lessonsCount: 18,
    price: 825,
    slug: "content-creation",
  },
  {
    id: "ai-skills",
    title: "AI Skills for the Future of Work",
    description:
      "Build a practical understanding of AI and learn how AI tools support productivity, content creation, research, and everyday professional tasks.",
    badge: "AI & Productivity",
    modulesCount: 6,
    lessonsCount: 24,
    price: 825,
    slug: "ai-skills",
  },
  {
    id: "entrepreneurship",
    title: "Entrepreneurship Basics",
    description:
      "Understand the fundamentals of entrepreneurial thinking, customer discovery, business planning, and venture creation.",
    badge: "Venture & Business",
    modulesCount: 6,
    lessonsCount: 20,
    price: 825,
    slug: "entrepreneurship",
  },
  {
    id: "ms-office",
    title: "MS Office Essentials",
    description:
      "Build total confidence in essential workplace digital tools — create professional documents, analyse spreadsheets, and design presentations.",
    badge: "Workplace Tools",
    modulesCount: 5,
    lessonsCount: 16,
    price: 825,
    slug: "ms-office",
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

  // Transform DB courses into uniform CatalogCourseItem format
  const formattedCourses: CatalogCourseItem[] =
    dbCourseList.length > 0
      ? dbCourseList.map((c: any) => {
          const modulesCount = c.modules?.length || 0;
          const lessonsCount =
            c.modules?.reduce(
              (acc: number, m: any) => acc + (m.lessons?.length || 0),
              0
            ) || 0;

          return {
            id: c.id,
            title: c.title,
            slug: c.slug || c.id,
            description: c.description || null,
            thumbnailUrl: c.thumbnailUrl || null,
            price: Number(c.price) || 0,
            accessDays: c.accessDays || null,
            modulesCount,
            lessonsCount,
            badge: c.slug?.includes("combo")
              ? "Comprehensive Pack"
              : "Certificate Program",
          };
        })
      : FEATURED_FALLBACK_COURSES;

  // Extract unique category tags
  const categories = Array.from(
    new Set(
      formattedCourses
        .map((c) => c.badge || "Certificate Program")
        .filter(Boolean)
    )
  );

  return (
    <main className="flex-1 pb-20 space-y-12">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pt-12 pb-14 border-b border-border/80">
        <div className="container mx-auto px-4 max-w-6xl space-y-5 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span>Airbharath Professional Curriculum</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight">
            Explore All Certificate Courses
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Taught by IIM alumni and industry specialists. Build practical,
            career-ready capabilities with self-paced learning and QR-verified
            credentials.
          </p>

          {/* Quick Value Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-foreground/80">
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% Self-Paced</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>QR-Verified PDF Certificates</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Taught by IIM Alumni</span>
            </span>
          </div>
        </div>
      </section>

      {/* Catalog Directory Section */}
      <section className="container mx-auto px-4 max-w-6xl space-y-12">
        <CourseCatalogClient
          courses={formattedCourses}
          categories={categories}
        />

        {/* Airbharath Trust Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#014a62] via-[#013c50] to-[#012c3b] text-white p-8 sm:p-12 text-center space-y-3 shadow-md border border-[#014a62]/40">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2.5 max-w-2xl mx-auto">
            <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-300">
              The Airbharath Promise
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-outfit text-white">
              Learn it. Understand it. Practise it. Apply it.
            </h3>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              Build high-demand technical capabilities without interrupting your
              routine. Verifiable credentials included with each program.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
