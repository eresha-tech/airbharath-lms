"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles, UserCheck, Clock, Layers } from "lucide-react";

const CHALLENGES = [
  {
    id: "skills-gap",
    quote: "\u201cThe skills employers are asking for aren\u2019t the skills I get to practise.\u201d",
    description:
      "AI. Digital marketing. Content creation. Business skills. Data and productivity tools. You know they\u2019re becoming important \u2014 but your current role may not give you the opportunity to use them.",
    icon: Sparkles,
    tag: "Skill Gap",
  },
  {
    id: "starting-zero",
    quote: "\u201cI want to switch careers, but where do I even start?\u201d",
    description:
      "Changing careers after years in one profession can feel like starting from zero. You don\u2019t want to throw away your experience. You just need to build something new alongside it.",
    icon: UserCheck,
    tag: "Career Switch",
  },
  {
    id: "no-time",
    quote: "\u201cI can\u2019t quit my job just to learn.\u201d",
    description:
      "You shouldn\u2019t have to. Learn around your flying schedule, work commitments, studies or family responsibilities.",
    icon: Clock,
    tag: "Flexibility",
  },
  {
    id: "experience-plus-skills",
    quote: "\u201cI have the experience. I just don\u2019t have the new skills.\u201d",
    description:
      "That\u2019s a very different problem from having no experience at all. Your existing experience has value. Add new skills to it.",
    icon: Layers,
    tag: "Building Value",
  },
];

export function ChallengesSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-20 bg-background border-b border-border/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-primary bg-primary/10 px-3.5 py-1.5 rounded-full border border-primary/20">
            Real Workplace Challenges
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold font-instrument-serif text-foreground"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Experienced. Capable. But Feeling Stuck?
          </h2>
          <div className="text-sm md:text-base text-muted-foreground leading-relaxed font-sans space-y-2 text-left md:text-center">
            <p className="font-semibold text-foreground">
              Are you an experienced Cabin Crew member or aviation professional?
            </p>
            <p>
              You&rsquo;ve spent years building valuable professional experience. You&rsquo;ve
              learned how to communicate, manage people, handle pressure, follow processes, solve
              problems and perform when it matters.
            </p>
            <p className="font-medium text-primary pt-1">
              But perhaps you&rsquo;re now asking:{" "}
              <em>&ldquo;What comes next?&rdquo;</em>
            </p>
          </div>
        </div>

        {/* Challenge cards — keyboard accessible */}
        <ul
          aria-label="Common career challenges"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 list-none p-0 m-0"
        >
          {CHALLENGES.map((challenge, idx) => {
            const Icon = challenge.icon;
            const isSelected = activeTab === idx;
            return (
              <li key={challenge.id}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Challenge: ${challenge.tag}`}
                  onClick={() => setActiveTab(idx)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab(idx)}
                  className={`p-7 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    isSelected
                      ? "bg-primary/5 border-primary shadow-lg ring-1 ring-primary/30 scale-[1.01]"
                      : "bg-card border-border/80 hover:bg-card/80 hover:border-primary/40 hover:shadow-md"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary bg-background border border-primary/20 px-3 py-1 rounded-full">
                        {challenge.tag}
                      </span>
                      <div
                        aria-hidden="true"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>

                    <h3
                      className="text-base md:text-lg font-bold font-instrument-serif text-foreground leading-snug"
                      style={{ textWrap: "balance" } as React.CSSProperties}
                    >
                      {challenge.quote}
                    </h3>

                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                      {challenge.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-[#014a62]">
                    <span>Air Bharath Solution Available</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}
