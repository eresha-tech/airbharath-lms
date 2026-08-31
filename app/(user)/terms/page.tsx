import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      {/* Header Info */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
          <FileText className="h-4 w-4" /> Terms of Service
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
          Terms & Conditions
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Last Updated: June 9, 2026
        </p>
      </div>

      {/* Terms Content */}
      <div className="bg-card p-8 md:p-10 rounded-3xl border border-border/80 shadow-sm space-y-8 text-xs md:text-sm leading-relaxed text-muted-foreground">
        <p className="text-foreground font-medium">
          Welcome to IRII (INDUSTRY-READY INTERNSHIP INSTITUTE). By accessing or using our platform, you agree to these Terms & Conditions.
        </p>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">1. Eligibility</h2>
          <p>You must be at least 18 years old or have parental/guardian consent to use our platform.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">2. Course Access</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Upon successful payment, you will receive access to the purchased course.</li>
            <li>Course access is for personal, non-commercial use only.</li>
            <li>Access duration, if any, will be specified on the course page.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">3. Payments</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>All course fees must be paid in full before access is granted.</li>
            <li>Prices are displayed in Indian Rupees (INR) unless otherwise specified.</li>
            <li>We reserve the right to modify course pricing at any time.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">4. Intellectual Property</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>All course content, videos, documents, presentations, and materials are the intellectual property of IRII or its licensors.</li>
            <li>Users may not copy, distribute, record, reproduce, sell, or share course content without written permission.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Share login credentials with others.</li>
            <li>Upload harmful, unlawful, or offensive content.</li>
            <li>Attempt to gain unauthorized access to the platform.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">6. Live Classes</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Live session schedules may be modified due to unforeseen circumstances.</li>
            <li>We will make reasonable efforts to notify users of schedule changes.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">7. Refund Policy</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Recorded courses are eligible for refunds within 7 days of purchase if less than 20% of the course content has been accessed.</li>
            <li>Live courses are eligible for a full refund up to 7 days before the course start date.</li>
            <li>No refunds are provided once a live course has commenced or significant course content has been consumed.</li>
            <li>Approved refunds will be processed within 7–10 business days.</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">8. Account Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">9. Disclaimer</h2>
          <p>Course completion does not guarantee employment, promotions, or specific career outcomes.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">10. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, IRII shall not be liable for indirect, incidental, or consequential damages arising from the use of the platform.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">11. Governing Law</h2>
          <p>These Terms shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of the courts of RAJNANDGAON, CHHATTISGARH.</p>
        </div>

        <div className="space-y-4 border-t border-border/80 pt-6">
          <h2 className="text-base font-bold text-foreground">12. Contact Us</h2>
          <p>For questions regarding these Terms, contact:</p>
          <p className="mt-2 text-foreground font-semibold">Email: contact@irii.in</p>
          <p className="text-foreground font-semibold">Phone: +91-9691507331</p>
        </div>
      </div>
    </div>
  );
}
