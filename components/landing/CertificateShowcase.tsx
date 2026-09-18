import Link from "next/link";
import { ShieldCheck, CheckCircle2, QrCode, FileText, ArrowRight, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CertificateShowcase() {
  return (
    <section id="certificate" className="py-16 sm:py-24 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-gradient-to-br from-primary/5 via-background to-secondary/30 rounded-3xl border border-border p-6 sm:p-10 lg:p-14 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verifiable Digital Credentials</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight">
                  Earn a QR-Verifiable Certificate of Completion
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
                  Upon finishing all course lessons and tracking 100% completion in the LMS, you will automatically generate an official AirBharath LMS Certificate of Completion.
                </p>
              </div>

              {/* Genuine Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/80">
                  <QrCode className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Instant QR Verification</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Direct online verification via QR code scan or URL.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/80">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Unique Credential ID</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Each certificate is registered with a unique verification code.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/80">
                  <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">High-Resolution PDF</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Downloadable PDF ready for your portfolio or resume.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border/80">
                  <Award className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Official Issuer</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Issued by Eresha Technology Innovators / AirBharath.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl shadow-xs"
                >
                  <Link href="/courses" className="flex items-center gap-2">
                    <span>Explore Certificate Courses</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-border text-muted-foreground hover:text-foreground h-11 px-5 rounded-xl"
                >
                  <Link href="/verify-certificate">Test Certificate Verification</Link>
                </Button>
              </div>
            </div>

            {/* Right Certificate Graphic / Mockup */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl bg-card border-2 border-primary/20 p-6 sm:p-8 shadow-xl space-y-5 overflow-hidden">
                {/* Decorative border pattern */}
                <div className="absolute top-2 left-2 right-2 bottom-2 border border-primary/10 rounded-xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-border pb-4 relative z-10">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://assets.airbharath.in/logo.webp"
                      alt="AirBharath"
                      className="h-6 w-auto"
                    />
                    <span className="font-outfit font-extrabold text-xs text-primary">AirBharath LMS</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    VERIFIED
                  </span>
                </div>

                <div className="text-center space-y-2 py-2 relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Certificate of Completion
                  </span>
                  <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground">
                    Student Full Name
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    has successfully completed the prescribed curriculum and assignments for
                  </p>
                  <p className="text-xs font-bold text-primary">
                    AI Tools &amp; Practical AI Skills Masterclass
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground relative z-10">
                  <div>
                    <p className="font-mono text-[10px] font-semibold text-foreground">ID: AB-2026-CERT-SAMPLE</p>
                    <p className="text-[9px] text-muted-foreground">Issued by Eresha Technology Innovators</p>
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <QrCode className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
