import React from "react";
import { BookOpen, Compass, Award, Rocket, ArrowDown } from "lucide-react";

const JOURNEY_STEPS = [
  {
    step: "STEP 01",
    title: "LEARN",
    description: "Choose the skills relevant to the direction you want to explore.",
    icon: BookOpen,
  },
  {
    step: "STEP 02",
    title: "PRACTISE",
    description: "Work on practical assignments and build confidence using the skills.",
    icon: Compass,
  },
  {
    step: "STEP 03",
    title: "GAIN EXPOSURE",
    description: "Where applicable, explore internship and practical-exposure opportunities.",
    icon: Award,
  },
  {
    step: "STEP 04",
    title: "MAKE YOUR MOVE",
    description: "Use your new skills and experience to explore your next opportunity.",
    icon: Rocket,
  },
];

export function CareerTransitionJourney() {
  return (
    <section className="py-20 bg-white border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Strategic Path
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Your Next Career Doesn’t Have to Start With a Resignation.
          </h2>
        </div>

        {/* Stepper Flow Container */}
        <div className="space-y-4">
          {JOURNEY_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="space-y-4">
                <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-[#014a62]/40 transition-all hover:shadow-lg">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-lg shadow-[#014a62]/20">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#014a62]">
                        {item.step}
                      </span>
                      <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-slate-700 font-medium max-w-md">
                    {item.description}
                  </p>
                </div>

                {idx < JOURNEY_STEPS.length - 1 && (
                  <div className="flex justify-center text-[#014a62]/60 py-1">
                    <ArrowDown className="w-5 h-5 animate-bounce" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Banner */}
        <div className="bg-[#014a62] text-white p-6 rounded-2xl text-center space-y-1 shadow-lg">
          <p className="text-base md:text-lg font-bold font-instrument-serif text-white">
            Don’t make a blind career switch.
          </p>
          <p className="text-xs md:text-sm font-semibold text-cyan-200">
            Prepare for it.
          </p>
        </div>

      </div>
    </section>
  );
}
