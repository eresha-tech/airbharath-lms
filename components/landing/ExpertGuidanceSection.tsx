import { GraduationCap, Briefcase, Award, CheckCircle2 } from "lucide-react";

const PILLARS = [
  {
    icon: GraduationCap,
    title: "IIM Alumni Faculty",
    desc: "Learn from educators and leaders with strong academic, managerial, and entrepreneurial backgrounds.",
    tag: "Academic & Strategic Rigor",
  },
  {
    icon: Briefcase,
    title: "Industry Practitioners",
    desc: "Understand how skills are actively applied in modern high-growth workplaces — beyond theory and textbook examples.",
    tag: "Real-World Context",
  },
  {
    icon: Award,
    title: "30+ Years Heritage",
    desc: "Our curriculum philosophy is shaped by more than three decades across aviation, corporate training, and technology.",
    tag: "Proven Quality & Pedigree",
  },
];

export function ExpertGuidanceSection() {
  return (
    <section className="py-16 sm:py-24 bg-card border-b border-border">
      <div className="container mx-auto px-4 max-w-7xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            Faculty &amp; Pedigree
          </span>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground leading-tight tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Learn From IIM Alumni &amp; Industry Practitioners
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            Education is most effective when guided by mentors who understand both fundamental principles and real-world professional application.
          </p>
        </div>

        {/* 3 Pillar Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="bg-muted/30 border border-border rounded-3xl p-6 sm:p-8 space-y-5 hover:shadow-lg hover:border-primary/40 hover:-translate-y-1.5 hover:bg-card transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-200">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground group-hover:text-primary transition-colors">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-normal">
                    {pillar.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60 text-xs font-bold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>{pillar.tag}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Learning Philosophy Callout */}
        <div className="bg-primary text-primary-foreground p-6 sm:p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-200 text-center space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary-foreground/80">
            Our Core Approach
          </span>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold font-outfit text-white tracking-tight">
            Learn Concept &rarr; Watch Demonstration &rarr; Practise Workflow &rarr; Apply at Work
          </p>
        </div>
      </div>
    </section>
  );
}

