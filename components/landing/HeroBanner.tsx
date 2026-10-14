import { FeaturedCourseCarousel } from './FeaturedCourseCarousel';
import { PublicAction } from '@/components/public/PublicUI';
import type { PublicCourse } from '@/lib/public/catalog-model';
export function HeroBanner({ courses }: {
    courses: PublicCourse[];
}) {
    return <section className="public-hero">
    <div className="public-container public-hero-grid">
    <div>
    <p className="public-eyebrow">AirBharath · Professional learning</p>
    <h1>Learn skills that<br />
    <span>move your career forward.</span>
    </h1>
    <p className="public-copy">Explore industry-relevant courses, build practical skills and take your next step with AirBharath.</p>
    <div className="public-actions">
    <PublicAction href="/courses">Explore Courses</PublicAction>
    <PublicAction secondary href="/workspace">Become a Creator</PublicAction>
    </div>
    <p className="public-hero-note">Learn at your pace. Put your knowledge into practice.</p>
    </div>
    <FeaturedCourseCarousel courses={courses}/>

  </div>
    </section>;
}
