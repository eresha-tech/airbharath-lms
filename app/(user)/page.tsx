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
    <>
      <HeroBanner />
      <TrustStrip />
      <HeadlineSection />
      <ChallengesSection />
      <SolutionSection />
      <CoursesSection dbCourses={publishedCourses} />
      <TransformationMatrix />
      <ExpertGuidanceSection />
      <OutcomesSection />
      <CareerTransitionJourney />
      <LandingFAQ />
      <FinalCTA />
    </>
  );
}
