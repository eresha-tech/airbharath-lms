import { Zap, MessageSquare, Lightbulb, ShieldCheck, Compass, Clock } from "lucide-react";

const OUTCOMES = [
  {
    code: "01",
    title: "WORK SMARTER",
    description: "Use AI and digital tools to approach everyday tasks more efficiently.",
    icon: Zap,
  },
  {
    code: "02",
    title: "CREATE & COMMUNICATE",
    description:
      "Build the ability to create digital content, professional documents and presentations with greater confidence.",
    icon: MessageSquare,
  },
  {
    code: "03",
    title: "THINK LIKE AN ENTREPRENEUR",
    description:
      "Understand how opportunities, customers, ideas and execution come together.",
    icon: Lightbulb,
  },
  {
    code: "04",
    title: "BECOME DIGITALLY CONFIDENT",
    description:
      "Develop familiarity with tools and concepts that are increasingly part of modern professional life.",
    icon: ShieldCheck,
  },
  {
    code: "05",
    title: "PREPARE FOR WHAT\u2019S NEXT",
    description:
      "Build skills that can complement your current career or help you explore a new direction.",
    icon: Compass,
  },
  {
    code: "06",
    title: "KEEP LEARNING WHILE YOU WORK",
    description:
      "You don\u2019t need to pause your career to prepare for your next chapter. Upskill while you fly. Upskill while you work. Build your next capability alongside your current career.",
    icon: Clock,
  },
];

export function OutcomesSection() {
  return (
    <section className="py-20 bg-background border-b border-border">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20">
            Real Value Deliverables
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold font-outfit text-foreground"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Not Just Topics. Build Capabilities.
          </h2>
        </div>

        {/* 6 Capabilities Grid */}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 list-none p-0 m-0">
          {OUTCOMES.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.code}
                className="bg-card p-7 rounded-3xl border border-border/80 shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 tabular-nums"
                      aria-label={`Outcome ${item.code}`}
                    >
                      {item.code}
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold tracking-wide uppercase text-foreground">
                    {item.title}
                  </h3>

                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-sans font-normal">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}
