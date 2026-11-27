import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Compass, GraduationCap, Mic, ShieldCheck } from 'lucide-react';
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
          <span className="public-bento-pill">
            <Compass size={13} aria-hidden="true" />
            DGCA Prep
          </span>
          <ArrowUpRight size={16} className="public-bento-arrow" aria-hidden="true" />
        </div>
        <div className="public-bento-card-body">
          <strong>Aviator</strong>
          <p>Curated question banks, flight telemetry &amp; exam readiness.</p>
        </div>
      </a>

      {/* Card 2: Chatterbox AI (Vibrant Blue Accent matching reference) */}
      <a
        href="https://chatterboxai.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="public-bento-card public-bento-chatterbox"
      >
        <div className="public-bento-card-top">
          <span className="public-bento-pill public-bento-pill-light">
            <Mic size={13} aria-hidden="true" />
            Voice AI
          </span>
          <ArrowUpRight size={16} className="public-bento-arrow" aria-hidden="true" />
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

      {/* Card 4: 1:1 Airline Captain Mentorship */}
      <Link href="/mentorship" className="public-bento-card public-bento-mentorship public-bento-wide">
        <div className="public-bento-card-top">
          <span className="public-bento-pill public-bento-pill-amber">
            <ShieldCheck size={13} aria-hidden="true" />
            1-on-1 Guidance
          </span>
          <ArrowRight size={16} className="public-bento-arrow" aria-hidden="true" />
        </div>
        <div className="public-bento-card-body">
          <strong>Captain Mentorship</strong>
          <p>Direct career roadmaps &amp; checkride prep with active airline pilots and CFIs.</p>
        </div>
      </Link>
    </div>
  );
}
