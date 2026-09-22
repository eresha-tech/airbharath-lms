import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST_PILLS = [
  "Beginner-friendly",
  "100% Self-paced",
  "Practical learning",
  "Verifiable certificate",
];

export function HeadlineSection() {
  return (
    <section className="py-16 sm:py-24 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        {/* MAIN HEADLINE + SUBHEADLINE */}
        <div className="space-y-6 text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Career Advancement &amp; Skill Upgrade
          </span>

          <h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-outfit text-foreground leading-tight tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Built for Professionals, Students &amp; Creators.{" "}
            <br className="hidden md:block" />
            Learn What&rsquo;s Next.
          </h2>

          <div className="space-y-4 text-base sm:text-lg text-muted-foreground leading-relaxed font-normal max-w-3xl mx-auto text-left sm:text-center">
            <p>
              AI, digital tools, content strategy, business fundamentals, and data productivity are essential in today&rsquo;s workplace.
            </p>
            <p className="font-semibold text-primary">
              AirBharath Certificate Courses help you master these skills without putting your current career or studies on hold.
            </p>
            <p className="font-medium text-foreground">
              Learn from IIM alumni and industry practitioners, apply what you learn in real-world scenarios, and earn verifiable digital credentials.
            </p>
          </div>
        </div>

        {/* CALLOUT BOX */}
        <div className="relative rounded-3xl bg-muted/30 border border-border p-6 sm:p-10 shadow-xs hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden group">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
            </div>

            <div className="space-y-2.5">
              <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                30+ Years of Aviation, Learning &amp; Technology Heritage
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                AirBharath brings decades of real-world training experience into structured online learning. Our courses combine academic rigor with practical industry perspectives — designed by IIM alumni and subject matter experts.
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                <span>Learning should not end with a certificate.</span>
                <span className="bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  It begins with what you can build.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY CTAs */}
        <div className="text-center space-y-5 pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 rounded-xl text-sm shadow-xs active:scale-[0.98] transition-all"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <span>Explore Courses</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-border text-foreground hover:bg-muted font-bold px-8 h-12 rounded-xl text-sm active:scale-[0.98] transition-all"
            >
              <Link href="/login">
                <span>Student Sign In</span>
              </Link>
            </Button>
          </div>

          <ul
            aria-label="Course highlights"
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs font-semibold text-muted-foreground list-none p-0 m-0"
          >
            {TRUST_PILLS.map((pill) => (
              <li
                key={pill}
                className="inline-flex items-center gap-1.5 bg-card border border-border px-3 py-1 rounded-full shadow-2xs hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150 cursor-default"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{pill}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

