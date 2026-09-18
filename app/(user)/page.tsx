import { HeroBanner } from "@/components/landing/HeroBanner";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { CoursesSection } from "@/components/landing/CoursesSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { CareerTransitionJourney } from "@/components/landing/CareerTransitionJourney";
import { CertificateShowcase } from "@/components/landing/CertificateShowcase";
import { HeadlineSection } from "@/components/landing/HeadlineSection";
import { TransformationMatrix } from "@/components/landing/TransformationMatrix";
import { ExpertGuidanceSection } from "@/components/landing/ExpertGuidanceSection";
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
      <CoursesSection dbCourses={publishedCourses} />
      <SolutionSection />
      <CareerTransitionJourney />
      <CertificateShowcase />
      <HeadlineSection />
      <TransformationMatrix />
      <ExpertGuidanceSection />
      <LandingFAQ />
      <FinalCTA />
    </>
  );
}

