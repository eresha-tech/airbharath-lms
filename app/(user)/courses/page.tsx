import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";
import {
  CourseCatalogClient,
  CatalogCourseItem,
} from "@/components/courses/CourseCatalogClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Certificate Courses | Airbharath LMS",
  description:
    "Explore Airbharath LMS professional certificate courses in AI Skills, Digital Marketing, Entrepreneurship, and Technical Essentials.",
};

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

    // Place combo/featured pack first, then alphabetical or standard order
    dbCourseList.sort((a: any, b: any) => {
      if (a.slug === "combo-pack") return -1;
      if (b.slug === "combo-pack") return 1;
      return 0;
    });
  } catch (err) {
    console.error("Failed to load courses from DB:", err);
  }

  // Transform real DB courses into uniform CatalogCourseItem format
  const formattedCourses: CatalogCourseItem[] = dbCourseList.map((c: any) => {
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
  });

  // Extract unique category tags from real data
  const categories = Array.from(
    new Set(
      formattedCourses
        .map((c) => c.badge || "Certificate Program")
        .filter(Boolean)
    )
  );

  return (
    <main className="flex-1 pb-20 space-y-10 sm:space-y-12">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pt-24 sm:pt-28 pb-12 sm:pb-16 border-b border-border/80">
        <div className="container mx-auto px-4 max-w-6xl space-y-4 sm:space-y-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            <span>Airbharath Professional Curriculum</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight">
            Explore All Certificate Courses
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Build practical, career-ready capabilities with self-paced HD video modules, structured practical exercises, and QR-verifiable credentials.
          </p>

          {/* Quick Value Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2 text-xs font-semibold text-foreground/80">
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>100% Self-Paced Access</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>QR-Verified PDF Certificates</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-card border border-border/80 px-3 py-1.5 rounded-full shadow-2xs">
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Industry-Aligned Projects</span>
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
              The Airbharath Standard
            </span>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-outfit text-white">
              Learn it. Understand it. Practise it. Apply it.
            </h3>
            <p className="text-xs sm:text-sm text-cyan-100/90 leading-relaxed">
              Master high-demand technical capabilities through structured video lessons. Verifiable completion credentials included with each program.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
