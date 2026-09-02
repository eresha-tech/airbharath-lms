import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRUST_PILLS = [
  "Beginner-friendly",
  "Self-paced",
  "Practical learning",
  "Certificate on completion",
];

export function HeadlineSection() {
  return (
    <section className="py-20 bg-slate-50/50 border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">

        {/* MAIN HEADLINE + SUBHEADLINE */}
        <div className="space-y-6 text-center max-w-4xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#014a62]" aria-hidden="true" />
            Career Advancement &amp; Skill Upgrade
          </span>

          <h2
            className="text-3xl md:text-5xl lg:text-6xl font-bold font-instrument-serif text-[#014a62] leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            You&rsquo;ve Built Your Career.{" "}
            <br className="hidden md:block" />
            Now Build What&rsquo;s Next.
          </h2>

          <div className="space-y-4 text-base md:text-lg text-slate-700 leading-relaxed font-sans font-normal max-w-3xl mx-auto text-left md:text-center">
            <p>
              You may already have a degree. You may have years of professional experience. You may
              even have built a successful career in aviation.
            </p>
            <p className="font-semibold text-[#014a62]">But the world of work is changing.</p>
            <p>
              AI, digital tools, content, business skills and workplace technology are becoming part
              of what employers expect — and many of these are skills you may never have had the
              opportunity to practise in your current role.
            </p>
            <p>
              Air Bharath Certificate Courses help you build those skills without putting your
              current career on hold.
            </p>
            <p className="font-medium text-slate-900 pt-1">
              Learn from IIM alumni and industry practitioners, apply what you learn, build
              practical confidence and prepare yourself for what&rsquo;s next.
            </p>
          </div>
        </div>

        {/* CALLOUT BOX */}
        <div className="relative rounded-3xl bg-white border border-[#014a62]/20 p-8 md:p-12 shadow-xl overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 w-80 h-80 bg-[#014a62]/5 rounded-full blur-3xl pointer-events-none"
          />

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[#014a62]/20">
              <ShieldCheck className="w-8 h-8" aria-hidden="true" />
            </div>

            <div className="space-y-3">
              <h3
                className="text-xl md:text-2xl font-bold font-instrument-serif text-[#014a62]"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                Built on 30+ Years of Aviation, Learning &amp; Technology Experience
              </h3>
              <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                Air Bharath brings more than three decades of experience across aviation, learning
                and technology into its approach to professional development. Our courses combine
                structured learning with practical industry perspectives — taught by IIM alumni and
                practitioners who understand how skills translate into the real world.
              </p>
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs md:text-sm font-semibold text-[#014a62]">
                <span>Because learning should not end with a certificate.</span>
                <span className="bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20 font-bold">
                  It should begin with what you can do with it.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRIMARY CTAs */}
        <div className="text-center space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-[#014a62] hover:bg-[#01374a] text-white font-bold px-8 h-12 rounded-xl text-sm shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:ring-offset-2"
            >
              <Link href="#courses" className="flex items-center gap-2">
                <span>Explore Courses</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10 font-bold px-8 h-12 rounded-xl text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:ring-offset-2"
            >
              <Link href="/login">
                <span>Start Learning</span>
              </Link>
            </Button>
          </div>

          <div className="space-y-2">
            <ul
              aria-label="Course features"
              className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-xs font-semibold text-slate-600 list-none p-0 m-0"
            >
              {TRUST_PILLS.map((pill) => (
                <li
                  key={pill}
                  className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  {pill}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 font-medium pt-1">
              No prior experience required.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
