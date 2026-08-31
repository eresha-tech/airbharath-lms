import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" /> Privacy Shield
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          Privacy Policy
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Last Updated: June 9, 2026
        </p>
      </div>

      {/* Privacy Content */}
      <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-8 text-xs md:text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground font-medium">
          At IRII, we value your privacy and are committed to protecting your personal information.
        </p>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">1. Information We Collect</h2>
          <div className="space-y-2">
            <p className="text-foreground font-semibold">Personal Information</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Billing information</li>
              <li>Course enrolment details</li>
            </ul>
            <p className="text-foreground font-semibold mt-4">Technical Information</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Usage and activity logs</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Create and manage your account.</li>
            <li>Process payments and enrolments.</li>
            <li>Deliver course content and live sessions.</li>
            <li>Provide customer support.</li>
            <li>Send important updates regarding your courses.</li>
            <li>Improve platform performance and user experience.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">3. Payment Information</h2>
          <p>Payments are processed through secure third-party payment gateways. We do not store your complete card or banking details on our servers.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">4. Information Sharing</h2>
          <p>We do not sell or rent your personal information. We may share information with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Payment service providers.</li>
            <li>Technology and hosting providers.</li>
            <li>Legal authorities when required by law.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">5. Cookies</h2>
          <p>We may use cookies and similar technologies to improve functionality, analyze usage, and enhance user experience.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">6. Data Security</h2>
          <p>We implement reasonable security measures to protect your information from unauthorized access, disclosure, or misuse.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">7. Data Retention</h2>
          <p>We retain your information only as long as necessary for educational, legal, and operational business purposes.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">8. Your Rights</h2>
          <p>You may:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Request access to your personal information.</li>
            <li>Request correction of inaccurate information.</li>
            <li>Request deletion of your account, subject to legal and operational requirements.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">9. Third-Party Links</h2>
          <p>Our platform may contain links to third-party websites. We are not responsible for their privacy practices.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">10. Policy Updates</h2>
          <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date.</p>
        </div>

        <div className="space-y-4 border-t border-border/80 pt-6">
          <h2 className="text-base font-bold text-foreground">11. Contact Us</h2>
          <p>For privacy-related questions, contact:</p>
          <p className="mt-2 text-foreground font-semibold">IRII</p>
          <p className="text-foreground font-semibold">Email: contact@irii.in</p>
          <p className="text-foreground font-semibold">Phone: +91-9691507331</p>
          <p className="text-foreground font-semibold">Address: Rajnandgaon, Chhattisgarh</p>
        </div>
      </div>
    </div>
  );
}
