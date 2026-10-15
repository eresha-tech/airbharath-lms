import Link from 'next/link';
import { PublicAction, PublicHeading } from '@/components/public/PublicUI';
export function FinalCTA() {
    return <section className="public-section public-closing">
    <div className="public-container">
    <PublicHeading eyebrow="Your next step" title="Ready to build your next skill?">Find a course that fits where you want to go.</PublicHeading>
    <div className="public-actions">
    <PublicAction href="/courses">Explore Courses</PublicAction>
    </div>
    <p className="mt-5">
    <Link href="/workspace" className="public-text-link">Have aviation expertise? Become a Creator.</Link>
    </p>
    </div>
    </section>;
}
