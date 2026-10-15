import Image from 'next/image';
import Link from 'next/link';
import { PublicAction } from '@/components/public/PublicUI';
import type { PublicCourse } from '@/lib/public/catalog-model';
export function HeroBanner({ featured }: {
    featured?: PublicCourse;
}) {
    const href = featured ? `/courses/${encodeURIComponent(featured.slug)}` : '/courses';
    return <section className="public-hero public-hero-motion">
    <div className="public-container public-hero-grid">
    <div>
    <p className="public-eyebrow">Professional Aviation Learning</p>
    <p className="public-hero-motto" lang="sa" translate="no">ज्ञानं कर्मसु कौशलम्</p>
    <h1>Knowledge into Skill.<br />
    <span>Skill into Possibility.</span>
    </h1>
    <p className="public-copy">AirBharath combines industry-aligned <strong>aviation learning</strong> with <strong>AI-powered practice</strong> and immersive <strong>VR training</strong> innovation. Build career-ready skills, or use Creator Workspace to turn your aviation expertise into structured course drafts.</p>
    <div className="public-actions">
    <PublicAction href="/courses">Explore Courses</PublicAction>
    <PublicAction secondary href="/workspace/apply">Become a Creator</PublicAction>
    </div>
    </div>
    <figure className="public-hero-visual"><Link href={href} aria-label={featured ? `Explore ${featured.title}` : 'Explore courses'}>{featured?.thumbnailUrl ? <Image src={featured.thumbnailUrl} alt={featured.title} width={640} height={400} sizes="(max-width: 900px) 90vw, 480px" priority/> : <div className="public-course-outline">
        <p className="public-eyebrow">Your next skill</p>
        <ol>
        <li>
        <span>01</span>Find a course that fits your goals</li>
        <li>
        <span>02</span>Learn through structured lessons</li>
        <li>
        <span>03</span>Apply what you learn</li>
        </ol>
        </div>}</Link><figcaption>
    <p className="public-eyebrow">A practical place to begin</p>
    <strong><Link href={href}>{featured?.title || 'Choose your next learning path'}</Link></strong>
    <p>Explore the course curriculum, access terms and current pricing before enrolling.</p>
    <Link href={href} className="public-text-link">Explore Course<span className="sr-only">: {featured?.title || 'catalog'}</span> →</Link>
    </figcaption>
    </figure>
  </div>
    </section>;
}
