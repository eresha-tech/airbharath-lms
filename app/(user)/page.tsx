import Hero from "@/components/Hero";
import { CourseCard } from "@/components/CourseCard";
import { FAQSection } from "@/components/FAQSection";
import { generateSlug } from "@/lib/slug";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  let publishedCourses: any[] = [];
  try {
    publishedCourses = await db.query.courses.findMany({
      where: eq(courses.isPublished, true),
    });
  } catch (err) {
    console.error("DB connection error:", err);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        <Hero />

        {/* Courses Section */}
        <section id="curriculum" className="py-20 bg-gray-50/50 border-t border-border">
          <div className="container mx-auto px-4 max-w-6xl space-y-10">
            <div className="text-center space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1 rounded-full">
                Featured Programs
              </span>
              <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
                Airbharath Technical Courses
              </h2>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto font-sans">
                Industry-oriented aviation & engineering training with QR-verifiable certification.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publishedCourses.length > 0 ? (
                publishedCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={{
                      id: course.id,
                      title: course.title,
                      description: course.description,
                      thumbnailUrl: course.thumbnailUrl,
                      price: course.price,
                      accessDays: course.accessDays,
                    }}
                    href={`/courses/${course.slug || generateSlug(course.title)}`}
                  />
                ))
              ) : (
                <div className="col-span-full py-16 text-center border border-dashed rounded-3xl bg-white text-muted-foreground">
                  <p className="text-sm font-semibold">No published courses available right now.</p>
                  <p className="text-xs text-muted-foreground mt-1">Check back soon for new Airbharath courses.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <FAQSection />
      </main>

      <Footer />
    </div>
  );
}
