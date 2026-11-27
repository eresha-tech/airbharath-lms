import Link from 'next/link';
import { ArrowUpRight, Compass, GraduationCap, Layers, Mic } from 'lucide-react';
import { PublicAction } from '@/components/public/PublicUI';
import { EcosystemBentoGrid } from '@/components/landing/EcosystemBentoGrid';
import type { PublicCourse } from '@/lib/public/catalog-model';

export function HeroBanner({ featured }: { featured?: PublicCourse }) {
  return (
    <section className="public-hero public-hero-motion">
      <div className="public-container">
        <div className="public-hero-grid">
          <div>
            <p className="public-eyebrow">Professional Aviation Learning</p>
            <p className="public-hero-motto" lang="sa" translate="no">
              ज्ञानं कर्मसु कौशलम्
            </p>
            <h1>
              Knowledge into Skill.
              <br />
              <span>Skill into Possibility.</span>
            </h1>
            <p className="public-copy">
              AirBharath combines industry-aligned <strong>aviation learning</strong> with{' '}
              <strong>AI-powered practice</strong> and immersive <strong>VR training</strong> innovation. Build
              career-ready skills, or use Creator Workspace to turn your aviation expertise into structured course
              drafts.
            </p>
            <div className="public-actions">
              <PublicAction href="/courses">Explore Courses</PublicAction>
              <PublicAction secondary href="/mentorship">
                Book 1:1 Mentorship
              </PublicAction>
            </div>
            <p className="public-hero-creator-nudge">
              Are you an aviation instructor?{' '}
              <Link href="/workspace/apply" className="public-text-link">
                Become a Creator →
              </Link>
            </p>
          </div>
          <EcosystemBentoGrid featured={featured} />
        </div>

        <div className="public-ecosystem-bar" aria-label="AirBharath integrated platforms">
          <span className="public-ecosystem-bar-label">Part of the AirBharath Ecosystem</span>
          <div className="public-ecosystem-bar-items">
            <a href="http://aviator.airbharath.in/" target="_blank" rel="noopener noreferrer">
              <Compass size={15} aria-hidden="true" />
              <span>Aviator</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <a href="https://chatterboxai.in/" target="_blank" rel="noopener noreferrer">
              <Mic size={15} aria-hidden="true" />
              <span>Chatterbox AI</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <Link href="/courses">
              <GraduationCap size={15} aria-hidden="true" />
              <span>AirBharath Academy</span>
            </Link>
            <Link href="/workspace">
              <Layers size={15} aria-hidden="true" />
              <span>Creator Workspace</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
