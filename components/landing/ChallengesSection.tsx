"use client";

import { useState } from "react";
import { HelpCircle, ArrowUpRight, CheckCircle2, ShieldAlert, Sparkles, UserCheck, Clock, Layers } from "lucide-react";

const CHALLENGES = [
  {
    id: "skills-gap",
    quote: "“The skills employers are asking for aren’t the skills I get to practise.”",
    description:
      "AI. Digital marketing. Content creation. Business skills. Data and productivity tools. You know they’re becoming important — but your current role may not give you the opportunity to use them.",
    icon: Sparkles,
    tag: "Skill Gap",
  },
  {
    id: "starting-zero",
    quote: "“I want to switch careers, but where do I even start?”",
    description:
      "Changing careers after years in one profession can feel like starting from zero. You don’t want to throw away your experience. You just need to build something new alongside it.",
    icon: UserCheck,
    tag: "Career Switch",
  },
  {
    id: "no-time",
    quote: "“I can’t quit my job just to learn.”",
    description:
      "You shouldn’t have to. Learn around your flying schedule, work commitments, studies or family responsibilities.",
    icon: Clock,
    tag: "Flexibility",
  },
  {
    id: "experience-plus-skills",
    quote: "“I have the experience. I just don’t have the new skills.”",
    description:
      "That’s a very different problem from having no experience at all. Your existing experience has value. Add new skills to it.",
    icon: Layers,
    tag: "Building Value",
  },
];

export function ChallengesSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-20 bg-white border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Real Workplace Challenges
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Experienced. Capable. But Feeling Stuck?
          </h2>
          <div className="text-sm md:text-base text-slate-700 leading-relaxed font-sans space-y-2 text-left md:text-center">
            <p className="font-semibold text-slate-900">
              Are you an experienced Cabin Crew member or aviation professional?
            </p>
            <p>
              You’ve spent years building valuable professional experience. You’ve learned how to communicate, manage people, handle pressure, follow processes, solve problems and perform when it matters.
            </p>
            <p className="font-medium text-[#014a62] pt-1">
              But perhaps you’re now asking: <span className="italic">“What comes next?”</span>
            </p>
          </div>
        </div>

        {/* 4 Interactive Challenge Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CHALLENGES.map((challenge, idx) => {
            const Icon = challenge.icon;
            const isSelected = activeTab === idx;
            return (
              <div
                key={challenge.id}
                onClick={() => setActiveTab(idx)}
                className={`p-7 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? "bg-[#014a62]/5 border-[#014a62] shadow-lg ring-1 ring-[#014a62]/30 scale-[1.01]"
                    : "bg-slate-50/70 border-slate-200/90 hover:bg-white hover:border-[#014a62]/40 hover:shadow-md"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#014a62] bg-white border border-[#014a62]/20 px-3 py-1 rounded-full shadow-xs">
                      {challenge.tag}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isSelected ? "bg-[#014a62] text-white" : "bg-slate-200/80 text-slate-700"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base md:text-lg font-bold font-instrument-serif text-[#014a62] leading-snug">
                    {challenge.quote}
                  </h3>

                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                    {challenge.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-[#014a62]">
                  <span>Air Bharath Solution Available</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
