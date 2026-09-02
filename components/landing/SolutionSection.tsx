import { CheckCircle2, Layers, Compass, Award, Rocket } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "UPSKILL",
    description:
      "Build practical skills in AI, digital marketing, entrepreneurship and workplace technology. Learn from IIM alumni and industry practitioners.",
    icon: Layers,
  },
  {
    num: "02",
    title: "PRACTISE",
    description:
      "Go beyond watching videos. Apply what you learn through practical exercises, assignments and real-world applications.",
    icon: Compass,
  },
  {
    num: "03",
    title: "BUILD EXPERIENCE",
    description:
      "Use your new skills in practical settings and explore opportunities to gain exposure through internships where applicable.",
    icon: Award,
  },
  {
    num: "04",
    title: "TRANSITION",
    description:
      "When you\u2019re ready, explore your next career direction with skills, confidence and experience behind you.",
    icon: Rocket,
  },
];

export function SolutionSection() {
  return (
    <section className="py-20 bg-slate-50/70 border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            The Air Bharath Approach
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62] leading-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Don&rsquo;t Put Your Career on Hold to Prepare for Your Next One.
          </h2>
          <p className="text-base text-slate-700 font-sans max-w-2xl mx-auto">
            Air Bharath Certificate Courses are designed for people who want to build new
            capabilities without starting their professional lives from scratch.
          </p>
        </div>

        {/* 4 Step Pillars */}
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 list-none p-0 m-0">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.num}
                className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-[#014a62]/30 transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold font-instrument-serif text-[#014a62]">
                      {step.num}
                    </span>
                    <div
                      aria-hidden="true"
                      className="w-10 h-10 rounded-xl bg-[#014a62]/10 text-[#014a62] flex items-center justify-center"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold tracking-wide uppercase text-[#014a62]">
                    {step.title}
                  </h3>

                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                    {step.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Practical Module</span>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Process Flow Banner */}
        <div className="bg-[#014a62] text-white p-6 md:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Structured Progression
            </span>
            <p className="text-lg md:text-xl font-bold font-instrument-serif text-white">
              Learn &rarr; Practise &rarr; Intern &rarr; Transition
            </p>
          </div>

          <div className="bg-white/10 border border-white/20 px-5 py-3 rounded-2xl text-xs md:text-sm font-semibold text-cyan-100">
            <span className="font-bold text-white">
              Your current career can help fund your next career.
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
