import { PlayCircle, LineChart, ShieldCheck, MessageSquare, Briefcase, Sparkles, CheckCircle2 } from "lucide-react";

const PLATFORM_FEATURES = [
  {
    icon: PlayCircle,
    title: "HD Video Lessons & Curriculum",
    description:
      "Carefully structured module-by-module video lectures with clear pacing, actionable examples, and downloadable lesson resources.",
    tag: "Video Learning",
  },
  {
    icon: LineChart,
    title: "Real-Time Progress Tracking",
    description:
      "Automated lesson completion tracking that remembers where you left off and lets you resume seamlessly on desktop or mobile.",
    tag: "Smart Progress",
  },
  {
    icon: ShieldCheck,
    title: "QR Verifiable Digital Certificate",
    description:
      "Upon course completion, earn a secure PDF certificate equipped with a unique credential ID and instant online verification.",
    tag: "Credentialing",
  },
  {
    icon: MessageSquare,
    title: "Lesson Doubts & Instructor Q&A",
    description:
      "Ask questions directly on lesson pages to clear concepts and receive guidance from faculty and teaching assistants.",
    tag: "Direct Support",
  },
  {
    icon: Briefcase,
    title: "Aviation & Career Opportunities",
    description:
      "Access exclusive job boards, aviation openings, and career development resources available exclusively to AirBharath students.",
    tag: "Opportunities",
  },
  {
    icon: Sparkles,
    title: "100% Self-Paced Learning",
    description:
      "Learn at your own pace without rigid batch timings — perfect for working professionals, flying crew, and full-time students.",
    tag: "Total Flexibility",
  },
];

export function SolutionSection() {
  return (
    <section id="benefits" className="py-16 sm:py-24 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-7xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Built for Serious, Self-Paced Skill Building
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            AirBharath LMS combines enterprise-grade streaming, automated progress tracking, and verifiable credentialing into one seamless student experience.
          </p>
        </div>

        {/* 6 Feature Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {PLATFORM_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-muted/30 p-6 sm:p-7 rounded-2xl border border-border hover:border-primary/40 hover:bg-card hover:shadow-sm transition-all duration-300 flex flex-col justify-between space-y-5 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      aria-hidden="true"
                      className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Available in all programs</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Structured Progression Strip */}
        <div className="bg-primary text-primary-foreground p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-foreground/80">
              Structured Learning Flow
            </span>
            <p className="text-lg sm:text-xl font-bold font-outfit text-white">
              Select Track &rarr; Learn via HD Video &rarr; Clear Doubts &rarr; Earn Verifiable Certificate
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white shrink-0">
            100% Self-Paced · Learn on Your Schedule
          </div>
        </div>
      </div>
    </section>
  );
}

