import Link from 'next/link';
import { PublicBrand } from './public/PublicUI';
import './public/public.css';
const groups = [
    ['Learn', [['/courses', 'All Courses'], ['/courses/combo-pack', 'All-in-One Combo Pass'], ['/courses/ai-skills', 'AI Skills'], ['/courses/content-creation', 'Digital Marketing & Content'], ['/courses/entrepreneurship', 'Entrepreneurship'], ['/courses/ms-office', 'MS Office & Productivity'], ['/practice', 'Practice Lab'], ['/verify-certificate', 'Certificate Verification'], ['/dashboard/courses', 'My Learning'], ['/pricing', 'Course Pricing']]],
    ['Create', [['/workspace', 'AirBharath Workspace'], ['/workspace/apply', 'Check Eligibility'], ['/workspace/manual-application', 'Manual Application'], ['/workspace/creator-terms', 'Creator Terms'], ['/workspace/refund-policy', 'Workspace Refund Policy']]],
    ['Company & Support', [['/', 'Home'], ['/about', 'About AirBharath'], ['/contact', 'Contact & Support'], ['/faq', 'Learner FAQ'], ['/privacy', 'Privacy Policy'], ['/terms', 'Terms & Conditions'], ['/login', 'Sign In / Register']]],
] as const;
export function Footer() {
    return <footer className="public-ui public-footer">
    <div className="public-container">
    <div className="public-footer-grid">
      <div className="public-footer-brand">
    <PublicBrand />
    <p className="public-footer-description">Professional Aviation Learning<br />Practical skills for learners. Private course preparation for aviation creators.</p>
    <address>Eresha Technology Innovators Pvt. Ltd.<br />West Patel Nagar, New Delhi 110008, India<br />
    <a href="mailto:academy@airbharath.in">academy@airbharath.in</a>
    </address>
    </div>
      <div className="public-footer-links">{groups.map(([heading, links]) => <nav key={heading} aria-label={heading}>
        <h2>{heading}</h2>
        <ul>{links.map(([href, label]) => <li key={href}>
            <Link href={href}>{label}</Link>
            </li>)}</ul>
        </nav>)}</div>
    </div>
    <div className="public-footer-bottom">
    <p>© {new Date().getFullYear()} Eresha Technology Innovators Pvt. Ltd.</p>
    <p>AirBharath · AirBharath Workspace</p>
    </div>
  </div>
    </footer>;
}
