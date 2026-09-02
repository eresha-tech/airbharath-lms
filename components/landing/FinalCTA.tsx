import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#01374a] via-[#014a62] to-[#026282] text-white p-8 md:p-16 shadow-2xl overflow-hidden text-center space-y-8">

          {/* Decorative glows */}
          <div aria-hidden="true" className="absolute -top-32 -left-32 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div aria-hidden="true" className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-cyan-200 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              Start Your Next Chapter Today
            </span>

            <h2
              className="text-3xl md:text-5xl lg:text-6xl font-bold font-instrument-serif text-white leading-tight"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              You&rsquo;ve Already Built Something.{" "}
              <br className="hidden md:block" />
              Now Build What&rsquo;s Next.
            </h2>

            <div className="space-y-2 text-sm md:text-base text-cyan-100 font-sans leading-relaxed">
              <p>Your experience matters. Your next skill matters too.</p>
              <p className="font-semibold text-white">
                Start building it today — without putting your current career on hold.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="inline-block bg-white/10 border border-white/20 px-6 py-2.5 rounded-full text-xs md:text-sm font-bold text-white tracking-wide">
              Learn. Practise. Build. Transition.
            </div>

            <div>
              <Button
                asChild
                size="lg"
                className="bg-white hover:bg-cyan-50 text-[#014a62] font-bold px-10 h-12 rounded-xl text-base shadow-xl transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#014a62]"
              >
                <Link href="#courses" className="flex items-center gap-2">
                  <span>Explore Courses</span>
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
