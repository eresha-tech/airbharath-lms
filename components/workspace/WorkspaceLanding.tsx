import Link from 'next/link';
import { PublicRetry } from '@/components/public/PublicRetry';
import { PublicFAQ, PublicHeading } from '@/components/public/PublicUI';
import { WorkspaceEntryLink, WorkspacePageView } from './WorkspacePublicEntry';
import type { PublicWorkspaceInfo } from '@/lib/public/workspace';
import { rupees } from '@/lib/public/catalog-model';
import { FULL_WORKSPACE_LAUNCH } from '@/lib/workspace/launch-copy';
export function WorkspaceLanding({ info = { eligibility: null, plans: null } }: {
    info?: PublicWorkspaceInfo;
}) {
    return <div className="public-ui ph-no-capture">
    <WorkspacePageView />
    <section className="public-hero public-hero-motion">
    <div className="public-container public-hero-grid">
    <div>
    <p className="public-eyebrow">AirBharath Workspace · For aviation professionals</p>
    <h1>Turn your aviation expertise into<br />
    <span>your next course.</span>
    </h1>
    <p className="public-copy">Create your professional profile, propose courses for review and prepare approved private text lessons with AirBharath Workspace.</p>
    <div className="public-actions">
    <WorkspaceEntryLink />
    <Link href="#how-workspace-works" className="public-button-secondary">See how it works ↓</Link>
    </div>
    <p className="public-hero-note">No payment is required to apply. Eligibility, Creator access and course approval are separate steps.</p>
    </div>
    <div className="public-course-outline">
    <p className="public-eyebrow">A course shaped by experience</p>
    <h2 className="font-outfit text-3xl font-semibold leading-tight">Your knowledge.<br />Their next step.</h2>
    <ol>
    <li>
    <span>01</span>Prepare your Creator Profile</li>
    <li>
    <span>02</span>Submit a course proposal for review</li>
    <li>
    <span>03</span>Build private lessons after approval</li>
    </ol>
    <p>Private course preparation—not an active publishing or selling tool.</p>
    </div>
    </div>
    </section>
    <section className="public-section">
    <div className="public-container">
    <PublicHeading eyebrow="Know what’s available" title="Prepare now. Build towards what’s next.">Paid Early Access is targeted for 14 October 2026, subject to launch verification. Public payments remain disabled.</PublicHeading>
    <div className="public-release-grid">
    <article>
    <p className="public-eyebrow">Early Access preparation</p>
    <h3>Your private Creator Workspace</h3>
    <ul>
    <li>Creator Profile</li>
    <li>Course proposals and revisions</li>
    <li>AirBharath Admin review</li>
    <li>Approved private text-based Course Builder</li>
    </ul>
    </article>
    <article className="public-planned">
    <p className="public-eyebrow">Planned full release</p>
    <h3>Targeted for 9 November 2026</h3>
    <ul>
    <li>Media uploads and complete course building</li>
    <li>Final review, publication and course sales</li>
    <li>Future capabilities, subject to release readiness</li>
    </ul>
    </article>
    </div>
    <p className="public-hero-note">{FULL_WORKSPACE_LAUNCH} Uploads, publication and selling are not available during Early Access.</p>
    </div>
    </section>
    <section className="public-section public-tinted">
    <div className="public-container">
    <div className="public-policy-grid">
    <PublicHeading eyebrow="Aviation is your domain" title="Who can become a Creator?">Bring genuine aviation experience, a course idea and a willingness to teach responsibly.</PublicHeading>
    <div>{info.eligibility ? <ul>
        <li>Confirm you are 18 or older and legally able to enter the Creator agreement.</li>
        <li>At least <strong>{info.eligibility.minimumExperienceMonths} months of aviation experience</strong> under the current published policy.</li>
        <li>{info.eligibility.profileRequired ? 'A public professional-profile HTTPS link is required.' : 'A professional-profile HTTPS link may be supplied.'}</li>
        <li>Your professional and teaching categories must be open for onboarding.</li>
        <li>Provide a course idea and accept the accuracy, expertise and audience declarations.</li>
        </ul> : <div className="public-unavailable" role="status">
        <h3>Eligibility requirements are temporarily unavailable.</h3>
        <p>Please retry the eligibility form or contact support for the current requirements.</p>
        <Link href="/workspace/apply" className="public-text-link">Check current eligibility requirements</Link>
        </div>}</div>
    </div>{info.eligibility && <div className="public-domains" aria-label="Currently eligible aviation categories">{info.eligibility.categories.map(category => <span key={category}>{category}</span>)}</div>}<p className="public-hero-note">Passing eligibility does not activate Creator access or guarantee approval of a course proposal.</p>
    </div>
    </section>
    <section id="how-workspace-works" className="public-section">
    <div className="public-container">
    <PublicHeading eyebrow="From idea to private lessons" title="A considered path to creating."/>
    <ol className="public-step-grid">{[
            ['Account & eligibility', 'Use your normal AirBharath account and complete the current eligibility check.'],
            ['Your access path', 'When purchases are enabled, paid membership requires a valid contact email and acceptance of current Creator Terms and Refund Policy. An authorized Admin-issued complimentary grant follows its separate eligibility and Creator Terms requirements.'],
            ['Creator Profile', 'After authorized access, save your professional background and teaching focus.'],
            ['Course proposal', 'Prepare the course title, intended learners, learning objectives and outline.'],
            ['AirBharath review', 'Submit for review. Respond to requested changes; approval is not guaranteed.'],
            ['Approved private builder', 'After proposal approval, develop private modules and text lessons. No publication or selling during Early Access.'],
        ].map(([title, copy], i) => <li key={title}>
        <span className="public-step-number">0{i + 1}</span>
        <h3>{title}</h3>
        <p>{copy}</p>
        </li>)}</ol>
    <p className="public-hero-note">AirBharath review is a platform quality review, not DGCA, airline, government or regulatory approval. Creators bring their own audience; learners, promotion, sales and revenue are not guaranteed.</p>
    </div>
    </section>
    <section id="memberships" className="public-section public-tinted">
    <div className="public-container">
    <PublicHeading eyebrow="Creator membership" title="Clear plans. A considered start.">Prepaid Creator memberships, separate from LMS course purchases and coupons.</PublicHeading>{info.plans ? <div className="public-plan-grid">{info.plans.map(plan => <article className="public-plan" key={plan.code}>
            <div>
            <p className="public-eyebrow">{plan.months} months</p>
            <h3>{plan.name}</h3>
            </div>
            <div>
            <p className="public-price">{rupees(plan.totalPaise / 100)}</p>
            <p>Inclusive of 18% GST</p>
            <p>{plan.available ? 'Current published membership plan' : 'Currently unavailable'}</p>
            </div>
            </article>)}</div> : <div className="public-unavailable" role="status">
        <h3>Membership prices are temporarily unavailable.</h3>
        <p>Please try again shortly or contact support for current pricing.</p>
        <PublicRetry label="Retry loading plans"/>
        </div>}<div className="public-notice">
    <strong>Payments not yet enabled</strong>Workspace payments are awaiting launch verification. No payment is required to check eligibility.</div>
    <p className="public-copy">Pre-launch confirmed purchasers receive authorized Early Access. Their paid membership term begins on <strong>9 November 2026 at 00:00 IST</strong>. The applicable refund-request window begins at verified payment time, not the membership start date.</p>
    </div>
    </section>
    <section className="public-section">
    <div className="public-container public-trust">
    <PublicHeading eyebrow="Before deciding" title="Terms, refunds and support.">Read the policies before choosing to activate. Your rights and the exact eligibility conditions remain in the canonical documents.</PublicHeading>
    <div>
    <p className="public-copy">An eligible refund request must be submitted within <strong>72 elapsed hours of authoritative, verified payment time</strong>, subject to the Refund Policy. Refund approval and processing follow the existing policy—not the November term-start date.</p>
    <div className="public-actions">
    <Link className="public-text-link" href="/workspace/creator-terms">Creator Terms →</Link>
    <Link className="public-text-link" href="/workspace/refund-policy">Workspace Refund Policy →</Link>
    </div>
    <Link className="public-text-link" href="/contact">Contact support →</Link>
    </div>
    </div>
    </section>
    <section className="public-section public-tinted">
    <div className="public-container">
    <PublicHeading eyebrow="Creator questions" title="Know your next step."/>
    <PublicFAQ items={[
            ['Who is eligible?', 'Aviation professionals must meet the current published criteria shown above and in the eligibility form. Your declared expertise, professional profile and teaching category are evaluated through the eligibility check.'],
            ['Does passing eligibility approve my course?', 'No. Eligibility, access activation and course proposal approval are separate. Every submitted proposal follows AirBharath review and may require changes or be declined.'],
            ['Are my courses public during Early Access?', 'No. Profiles, proposals and approved text course content are prepared privately. Upload, publish and sell controls are not active during Early Access.'],
            ['What does Creator membership cost?', 'The current published 3-, 6- and 12-month plans are shown above, inclusive of GST. LMS purchases and LMS coupons are separate. Public Workspace payments are awaiting launch verification.'],
            ['When does the paid term begin?', 'Pre-launch confirmed paid memberships start their paid term on 9 November 2026 at 00:00 IST, while authorized Early Access supports preparation before that date.'],
            ['What is planned for November?', `${FULL_WORKSPACE_LAUNCH} Media uploads, final course review, publication and selling remain future features until separately released.`],
            ['Can I request a refund?', 'The applicable request window is 72 elapsed hours from authoritative verified payment time. Read the Workspace Refund Policy for eligibility, exclusions and the request process.'],
            ['Can I receive complimentary access?', 'Only an authorized Admin can issue a scoped, time-limited complimentary access grant under existing eligibility and Creator Terms requirements. Grants are not unrestricted free membership and cannot be self-issued.'],
            ['How do I get support?', 'Use Contact & Support or the existing support details in the footer. You may also submit the separate manual application for team review; it does not bypass eligibility or access rules.'],
        ]}/>
    <div className="public-actions">
    <Link className="public-text-link" href="/workspace/refund-policy">Read refund eligibility</Link>
    <Link className="public-text-link" href="/contact">Contact & Support</Link>
    </div>
    </div>
    </section>
    <section className="public-section public-closing">
    <div className="public-container">
    <PublicHeading eyebrow="Share what you know" title="Ready to share your aviation expertise?">Start with your normal AirBharath account and the eligibility check.</PublicHeading>
    <div className="public-actions">
    <WorkspaceEntryLink entryPoint="founding_cohort"/>
    </div>
    <p className="mt-5">
    <Link href="/workspace/manual-application" className="public-text-link">Prefer a team review? Submit a manual application.</Link>
    </p>
    </div>
    </section>
  </div>;
}
