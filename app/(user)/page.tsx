import { HeroBanner } from '@/components/landing/HeroBanner';
import { CoursesSection } from '@/components/landing/CoursesSection';
import { WorkspaceIntroduction, LearningJourney, LearningBenefits, LearningTrust, LearnerFAQ } from '@/components/landing/LearningSections';
import { FinalCTA } from '@/components/landing/FinalCTA';
import { readPublicCatalog } from '@/lib/public/catalog';
import { publicMetadata } from '@/lib/public/metadata';
export const dynamic = 'force-dynamic';
export const metadata = publicMetadata('/', 'AirBharath — Practical Skills for Your Next Step', 'Explore self-paced AirBharath courses, build practical skills and discover Creator Workspace for aviation professionals.');
export default async function Home() {
    const catalog = await readPublicCatalog();
    const featured = [...catalog.courses].sort((a, b) => Number(b.isBundle) - Number(a.isBundle));
    return <div className="public-ui">
    <HeroBanner courses={featured}/>
    <CoursesSection catalog={catalog}/>
    <WorkspaceIntroduction />
    <LearningJourney />
    <LearningBenefits />
    <LearningTrust />
    <LearnerFAQ />
    <FinalCTA />
    </div>;
}
