import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroBanner } from "@/components/landing/HeroBanner";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { HeadlineSection } from "@/components/landing/HeadlineSection";
import { ChallengesSection } from "@/components/landing/ChallengesSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { CoursesSection } from "@/components/landing/CoursesSection";
import { TransformationMatrix } from "@/components/landing/TransformationMatrix";
import { ExpertGuidanceSection } from "@/components/landing/ExpertGuidanceSection";
import { OutcomesSection } from "@/components/landing/OutcomesSection";
import { CareerTransitionJourney } from "@/components/landing/CareerTransitionJourney";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Home() {
  let publishedCourses: any[] = [];
  try {
    publishedCourses = await db.query.courses.findMany({
      where: eq(courses.isPublished, true),
    });
  } catch (err) {
    console.error("DB connection error on landing page:", err);
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#014a62]/20 selection:text-[#014a62]">
      <Header />

      <main className="flex-1 pt-16">
        {/* 1. HERO — ROTATING BANNER */}
        <HeroBanner />

        {/* 2. TRUST / CREDIBILITY STRIP */}
        <TrustStrip />

        {/* 3. MAIN HEADLINE + SUBHEADLINE + 4. CALLOUT BOX + 5. PRIMARY CTAs */}
        <HeadlineSection />

        {/* 6. CHALLENGES SECTION */}
        <ChallengesSection />

        {/* 7. SOLUTION SECTION */}
        <SolutionSection />

        {/* 8. COURSES WE OFFER */}
        <CoursesSection dbCourses={publishedCourses} />

        {/* 9. YOUR CAREER TRANSFORMATION */}
        <TransformationMatrix />

        {/* 10. EXPERT GUIDANCE SECTION */}
        <ExpertGuidanceSection />

        {/* 11. OUTCOMES SECTION */}
        <OutcomesSection />

        {/* 12. CAREER TRANSITION JOURNEY */}
        <CareerTransitionJourney />

        {/* 13. FAQ */}
        <LandingFAQ />

        {/* 14. FINAL CTA SECTION */}
        <FinalCTA />
      </main>

      {/* 15. FOOTER */}
      <Footer />
    </div>
  );
}
