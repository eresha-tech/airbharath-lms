import Link from "next/link";
import { BookOpen, PlayCircle, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    step: "01",
    title: "Explore & Select Your Program",
    description:
      "Browse our focused certificate courses in AI, Marketing, Entrepreneurship, or MS Office — or pick the All-in-One Combo Pass.",
    icon: BookOpen,
  },
  {
    step: "02",
    title: "Learn At Your Own Pace",
    description:
      "Watch structured HD video lessons, access downloadable learning resources, and post doubt questions directly beneath lessons.",
    icon: PlayCircle,
  },
  {
    step: "03",
    title: "Complete & Earn Certificate",
    description:
      "Track your lesson progress in real time. Reach 100% completion to instantly unlock your unique QR-verifiable digital certificate.",
    icon: ShieldCheck,
  },
];

export function CareerTransitionJourney() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-muted/20 border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Simple 3-Step Process
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            How Learning on AirBharath Works
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            A seamless, transparent learning journey designed to fit into your existing schedule.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-card border border-border rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 transition-all duration-200 relative group cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl sm:text-3xl font-extrabold font-outfit text-primary/30 group-hover:text-primary transition-colors">
                      {item.step}
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200 shadow-2xs"
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold font-outfit text-foreground">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60 text-xs font-semibold text-primary flex items-center justify-between">
                  <span>Step {idx + 1} of 3</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-200" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Strip */}
        <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-base font-bold font-outfit text-foreground">
              Ready to start your first module?
            </h4>
            <p className="text-xs text-muted-foreground">
              Browse our course catalog and begin learning immediately after enrollment.
            </p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl shrink-0">
            <Link href="/courses">Explore Course Catalog</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

