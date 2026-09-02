import React from "react";
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
    description: "Build the ability to create digital content, professional documents and presentations with greater confidence.",
    icon: MessageSquare,
  },
  {
    code: "03",
    title: "THINK LIKE AN ENTREPRENEUR",
    description: "Understand how opportunities, customers, ideas and execution come together.",
    icon: Lightbulb,
  },
  {
    code: "04",
    title: "BECOME DIGITALLY CONFIDENT",
    description: "Develop familiarity with tools and concepts that are increasingly part of modern professional life.",
    icon: ShieldCheck,
  },
  {
    code: "05",
    title: "PREPARE FOR WHAT’S NEXT",
    description: "Build skills that can complement your current career or help you explore a new direction.",
    icon: Compass,
  },
  {
    code: "06",
    title: "KEEP LEARNING WHILE YOU WORK",
    description: "You don’t need to pause your career to prepare for your next chapter. Upskill while you fly. Upskill while you work. Build your next capability alongside your current career.",
    icon: Clock,
  },
];

export function OutcomesSection() {
  return (
    <section className="py-20 bg-slate-50/70 border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Real Value Deliverables
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Not Just Topics. Build Capabilities.
          </h2>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {OUTCOMES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.code}
                className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#014a62]/30 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-bold text-[#014a62] bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20">
                      {item.code}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#014a62] text-white flex items-center justify-center shadow-md">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold tracking-wide uppercase text-[#014a62]">
                    {item.title}
                  </h3>

                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
