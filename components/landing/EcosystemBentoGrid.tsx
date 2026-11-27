import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Compass, GraduationCap, ShieldCheck } from 'lucide-react';
import { AVIATOR_LOGO_URL, CHATTERBOX_LOGO_URL } from '@/components/landing/ProductsDropdown';
import type { PublicCourse } from '@/lib/public/catalog-model';

export function EcosystemBentoGrid({ featured }: { featured?: PublicCourse }) {
  const academyHref = featured ? `/courses/${encodeURIComponent(featured.slug)}` : '/courses';

  return (
    <div className="public-bento-grid" aria-label="AirBharath product ecosystem showcase">
      {/* Card 1: Aviator DGCA Exam Prep */}
      <a
        href="http://aviator.airbharath.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="public-bento-card public-bento-aviator"
      >
        <div className="public-bento-card-top">
          <div className="public-bento-brand-mark public-bento-brand-aviator">
            <img src={AVIATOR_LOGO_URL} alt="Aviator" width={28} height={28} />
          </div>
          <div className="public-bento-top-right">
            <span className="public-bento-pill">
              <Compass size={12} aria-hidden="true" />
              DGCA Prep
            </span>
            <ArrowUpRight size={16} className="public-bento-arrow" aria-hidden="true" />
          </div>
        </div>
        <div className="public-bento-card-body">
          <strong>Aviator</strong>
          <p>Curated question banks, flight telemetry &amp; exam readiness.</p>
        </div>
      </a>

      {/* Card 2: Chatterbox AI (Vibrant Blue Accent with subtle voice equalizer) */}
      <a
        href="https://chatterboxai.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="public-bento-card public-bento-chatterbox"
      >
        <div className="public-bento-card-top">
          <div className="public-bento-brand-mark public-bento-brand-chatterbox">
            <img src={CHATTERBOX_LOGO_URL} alt="Chatterbox AI" width={28} height={28} />
          </div>
          <div className="public-bento-top-right">
            <span className="public-bento-wave" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className="public-bento-pill public-bento-pill-blue">Voice AI</span>
            <ArrowUpRight size={16} className="public-bento-arrow" aria-hidden="true" />
          </div>
        </div>
        <div className="public-bento-card-body">
          <strong>Chatterbox AI</strong>
          <p>Real-time ATC phraseology &amp; ICAO Level 4+ speech practice.</p>
        </div>
      </a>

      {/* Card 3: AirBharath Academy Wide Anchor Card */}
      <Link href={academyHref} className="public-bento-card public-bento-academy public-bento-wide">
        <div className="public-bento-card-top">
          <span className="public-bento-pill">
            <GraduationCap size={13} aria-hidden="true" />
            Certified Ground School
          </span>
          <ArrowRight size={16} className="public-bento-arrow" aria-hidden="true" />
        </div>
        <div className="public-bento-card-body">
          <strong>{featured?.title || 'AirBharath Academy Masterclasses'}</strong>
          <p>Structured self-paced modules across Meteorology, Navigation, Technical &amp; Regulations.</p>
          <div className="public-bento-tags" aria-hidden="true">
            <span>Air Navigation</span>
            <span>Meteorology</span>
            <span>Air Regulations</span>
            <span>Technical General</span>
          </div>
        </div>
      </Link>

      {/* Card 4: 1:1 Aviation Mentorship */}
      <Link href="/mentorship" className="public-bento-card public-bento-mentorship public-bento-wide">
        <div className="public-bento-card-top">
          <span className="public-bento-pill public-bento-pill-amber">
            <ShieldCheck size={13} aria-hidden="true" />
            1-on-1 Guidance
          </span>
          <ArrowRight size={16} className="public-bento-arrow" aria-hidden="true" />
        </div>
        <div className="public-bento-card-body">
          <strong>1:1 Aviation Mentorship</strong>
          <p>Direct career roadmaps, exam strategy &amp; interview prep with pilots, engineers &amp; DGCA instructors.</p>
        </div>
      </Link>
    </div>
  );
}
