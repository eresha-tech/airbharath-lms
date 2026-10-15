import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { PricingView, type PricingCourseItem } from "@/components/pricing/PricingView";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pricing & Plans | AirBharath",
  description:
    "Transparent pricing for AirBharath professional certificate courses. Complete 18% GST compliance, verifiable credentials, and instant invoice generation.",
};

const FEATURED_FALLBACK_COURSES: PricingCourseItem[] = [
  {
    id: "combo-pack",
    title: "All-in-One Professional Skill Combo Pass",
    slug: "combo-pack",
    price: 1999,
    description: "Access all 4 certificate programs in one bundle.",
    modulesCount: 23,
    lessonsCount: 78,
    badge: "Comprehensive Bundle",
  },
  {
    id: "ai-skills",
    title: "AI Skills for the Future of Work",
    slug: "ai-skills",
    price: 825,
    description: "Practical AI workflows and productivity tools.",
    modulesCount: 6,
    lessonsCount: 24,
    badge: "Certificate Course",
  },
  {
    id: "content-creation",
    title: "Content Creation & Digital Marketing",
    slug: "content-creation",
    price: 825,
    description: "Digital presence and high-impact content strategies.",
    modulesCount: 5,
    lessonsCount: 18,
    badge: "Certificate Course",
  },
  {
    id: "ms-office",
    title: "MS Office Essentials",
    slug: "ms-office",
    price: 825,
    description: "Spreadsheets, executive presentations, and documentation.",
    modulesCount: 5,
    lessonsCount: 16,
    badge: "Certificate Course",
  },
  {
    id: "entrepreneurship",
    title: "Entrepreneurship Basics",
    slug: "entrepreneurship",
    price: 825,
    description: "Venture foundations, business models, and validation.",
    modulesCount: 6,
    lessonsCount: 20,
    badge: "Certificate Course",
  },
];

export default async function PricingPage() {
  let dbCourses: any[] = [];

  try {
    dbCourses = await db.query.courses.findMany({
      where: eq(courses.isPublished, true),
      with: {
        modules: {
          with: {
            lessons: true,
          },
        },
      },
    });

    dbCourses.sort((a: any, b: any) => {
      if (a.slug === "combo-pack") return -1;
      if (b.slug === "combo-pack") return 1;
      return 0;
    });
  } catch (err) {
    console.error("Pricing page courses fetch error:", err);
  }

  const formattedCourses: PricingCourseItem[] =
    dbCourses.length > 0
      ? dbCourses.map((c: any) => {
          const modulesCount = c.modules?.length || 0;
          const lessonsCount =
            c.modules?.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 0;

          return {
            id: c.id,
            title: c.title,
            slug: c.slug || c.id,
            description: c.description || null,
            price: Number(c.price) || 825,
            modulesCount,
            lessonsCount,
            badge: c.slug?.includes("combo") ? "Comprehensive Bundle" : "Certificate Course",
          };
        })
      : FEATURED_FALLBACK_COURSES;

  return <PricingView courses={formattedCourses} />;
}
