import Link from 'next/link';
import { PublicAction, PublicFAQ, PublicHeading } from '@/components/public/PublicUI';
export function WorkspaceIntroduction() {
    return <section className="public-section public-tinted">
    <div className="public-container public-workspace-intro">
    <div>
    <PublicHeading eyebrow="AirBharath Workspace" title="Have aviation expertise to share?">Prepare your own courses—from building a Creator Profile and submitting proposals to developing approved private text lessons.</PublicHeading>
    <PublicAction secondary href="/workspace">Explore Creator Workspace</PublicAction>
    <p className="public-hero-note">Full Workspace targeted for 9 November 2026, subject to readiness. Publication and selling are not available during Early Access.</p>
    </div>
    <div className="public-course-outline">
    <p className="public-eyebrow">Shaped by your experience</p>
    <h3>Your expertise. A clear course structure.</h3>
    <ol>
    <li>
    <span>01</span>Your aviation background and course idea</li>
    <li>
    <span>02</span>A proposal reviewed by AirBharath</li>
    <li>
    <span>03</span>Approved private modules and text lessons</li>
    </ol>
    <p>Illustration of the preparation workflow. Eligibility and course approval are separate.</p>
    </div>
    </div>
    </section>;
}
export function LearningJourney() {
    return <section id="how-it-works" className="public-section">
    <div className="public-container">
    <PublicHeading eyebrow="A clear learning path" title="From curiosity to practical skills."/>
    <ol className="public-step-grid">{[['Explore your options', 'Review the curriculum, course access and current price. Choose the program that fits your next step.'], ['Learn at your own pace', 'Use your AirBharath account to access enrolled courses and follow the structured lessons.'], ['Put your learning to work', 'Complete the course requirements and use what you learn. Certificates are available where supported by the course.']].map(([title, copy], i) => <li key={title}>
        <span className="public-step-number">0{i + 1}</span>
        <h3>{title}</h3>
        <p>{copy}</p>
        </li>)}</ol>
    </div>
    </section>;
}
export function LearningBenefits() {
    return <section id="benefits" className="public-section public-tinted">
    <div className="public-container">
    <PublicHeading eyebrow="Designed around learning" title="Less noise. More useful knowledge."/>
    <div className="public-benefits">{[['Structured lessons', 'Follow course modules and lessons in a clear sequence. See the full curriculum on each course page.'], ['Your learning space', 'Return to your enrolled courses, track progress and use the resources included with your program.'], ['Verifiable completion', 'Where enabled, completion certificates can be checked through AirBharath’s public certificate-verification page.']].map(([title, copy]) => <article key={title}>
        <h3>{title}</h3>
        <p>{copy}</p>
        </article>)}</div>
    <div id="certificate" className="mt-7 scroll-mt-24">
    <Link href="/verify-certificate" className="public-text-link">Verify an AirBharath certificate →</Link>
    <p className="public-hero-note">A completion certificate is not a regulatory qualification or a guarantee of employment.</p>
    </div>
    </div>
    </section>;
}
export function LearningTrust() {
    return <section className="public-section">
    <div className="public-container public-trust">
    <PublicHeading eyebrow="Know what you’re choosing" title="A transparent place to learn.">Explore actual course outlines and requirements before deciding. Clear information should come before big promises.</PublicHeading>
    <div>
    <p className="public-copy">AirBharath LMS brings self-paced learning and course information into one place. AirBharath Workspace offers a separate preparation path for aviation professionals who want to create courses.</p>
    <div className="public-actions">
    <PublicAction secondary href="/about">About AirBharath</PublicAction>
    <Link href="/contact" className="public-text-link">Ask us a question</Link>
    </div>
    </div>
    </div>
    </section>;
}
export function LearnerFAQ() {
    return <section id="faq" className="public-section public-tinted">
    <div className="public-container">
    <PublicHeading eyebrow="Before you begin" title="A few useful answers."/>
    <PublicFAQ items={[
            ['How do I choose a course?', 'Open the course catalog and review each program’s curriculum, current price, requirements and access terms before enrolling.'],
            ['Can I learn at my own pace?', 'AirBharath’s listed LMS courses support self-paced learning. Your account’s actual enrollment terms determine access; check the course page for any specified duration.'],
            ['How does the Combo Pass offer work?', 'The Combo Pass has a standard price and a separate eligible-coupon offer. When an active offer is shown, coupon restrictions, validity and usage limits apply. Review the current course-page offer before purchasing.'],
            ['How can I verify a completion certificate?', 'Use Certificate Verification to check an issued AirBharath certificate. Certificate availability depends on the course and completion requirements; a certificate is not a regulatory qualification.'],
            ['Can I create an aviation course?', 'Explore AirBharath Workspace using the Become a Creator link. Check eligibility, then follow the applicable access and proposal-review steps. Passing eligibility does not approve a course.'],
        ]}/>
    <div className="public-actions">
    <Link href="/faq" className="public-text-link">More learner questions →</Link>
    <Link href="/workspace" className="public-text-link">Explore Creator Workspace →</Link>
    </div>
    </div>
    </section>;
}
