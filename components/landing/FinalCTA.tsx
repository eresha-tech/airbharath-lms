import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-16 sm:py-24 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="relative rounded-3xl bg-primary text-primary-foreground p-8 sm:p-12 md:p-16 shadow-lg overflow-hidden text-center space-y-8">
          {/* Subtle Glows */}
          <div aria-hidden="true" className="absolute -top-32 -left-32 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Start Your Journey Today</span>
            </span>

            <h2
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-outfit text-white leading-tight tracking-tight"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              Build Practical, In-Demand Skills with AirBharath LMS
            </h2>

            <p className="text-sm sm:text-base text-primary-foreground/90 font-normal leading-relaxed max-w-2xl mx-auto">
              Self-paced video modules, direct instructor doubt resolution, and verifiable digital certificates.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-white hover:bg-slate-100 text-primary font-bold px-8 h-12 rounded-xl text-sm shadow-md transition-all"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <span>Explore All Courses</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 font-bold px-8 h-12 rounded-xl text-sm"
            >
              <Link href="/login">Student Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

