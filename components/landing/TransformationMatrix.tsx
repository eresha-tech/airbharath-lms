import { CheckCircle2, ArrowRight } from "lucide-react";

const COMPARISONS = [
  {
    today: "Curious about AI tools like ChatGPT & Claude but unsure how to use them effectively",
    future: "Practical mastery of prompt engineering, workplace AI workflows & automation",
  },
  {
    today: "Limited exposure to digital content, social media campaigns, and brand strategy",
    future: "Ability to launch targeted digital marketing, video content & organic growth",
  },
  {
    today: "Have a business idea or startup concept without clear structure or business model",
    future: "Actionable understanding of customer discovery, unit economics & startup pitching",
  },
  {
    today: "Lacking confidence in spreadsheet analysis, formulas, and executive pitch decks",
    future: "Mastery of advanced Excel formulas, Word documentation & PowerPoint presentations",
  },
  {
    today: "Struggling to balance upskilling with demanding work schedules or flight rosters",
    future: "100% self-paced learning on desktop and mobile with lifetime course access",
  },
];

export function TransformationMatrix() {
  return (
    <section className="py-16 sm:py-24 bg-muted/30 border-b border-border">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Practical Capabilities
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Upgrade Your Skills. Build Practical Confidence.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            See how AirBharath LMS courses translate into real workplace capabilities.
          </p>
        </div>

        {/* Comparison table */}
        <div
          role="table"
          aria-label="Skill transformation comparison"
          className="bg-card rounded-3xl border border-border shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          {/* Column headers */}
          <div
            role="row"
            className="grid grid-cols-1 md:grid-cols-2 bg-primary text-primary-foreground p-4 sm:p-5 text-sm sm:text-base font-bold font-outfit tracking-wide"
          >
            <div role="columnheader" className="flex items-center gap-2">
              <span className="text-primary-foreground/80 font-mono text-xs" aria-hidden="true">01</span>
              <span>Where You Start Today</span>
            </div>
            <div
              role="columnheader"
              className="hidden md:flex items-center gap-2 border-l border-white/20 pl-6"
            >
              <span className="text-primary-foreground/80 font-mono text-xs" aria-hidden="true">02</span>
              <span>Capabilities You Build</span>
            </div>
          </div>

          {/* Rows */}
          <div role="rowgroup" className="divide-y divide-border">
            {COMPARISONS.map((item, idx) => (
              <div
                key={idx}
                role="row"
                className="grid grid-cols-1 md:grid-cols-2 p-5 sm:p-6 hover:bg-primary/[0.03] transition-colors duration-150 gap-4 md:gap-6 items-center text-xs sm:text-sm group"
              >
                <div role="cell" className="flex items-start gap-3 text-muted-foreground font-medium">
                  <div aria-hidden="true" className="w-2 h-2 rounded-full bg-muted-foreground/50 shrink-0 mt-1.5" />
                  <span>{item.today}</span>
                </div>

                {/* Arrow on mobile */}
                <div aria-hidden="true" className="md:hidden flex justify-center text-primary/60 py-1">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                <div
                  role="cell"
                  className="flex items-start gap-3 text-foreground font-bold border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-6"
                >
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200"
                    aria-hidden="true"
                  />
                  <span>{item.future}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer callout */}
        <div className="text-center bg-card border border-border hover:border-primary/30 hover:shadow-xs transition-all duration-200 p-5 sm:p-6 rounded-2xl max-w-3xl mx-auto space-y-1">
          <p
            className="text-sm sm:text-base font-bold text-foreground font-outfit"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Practical learning that respects your schedule.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">Build high-demand capabilities with verifiable outcomes.</p>
        </div>
      </div>
    </section>
  );
}

