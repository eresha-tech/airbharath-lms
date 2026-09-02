import { CheckCircle2, ArrowRightCircle } from "lucide-react";

const COMPARISONS = [
  {
    today: "Experienced in your current profession but unsure about what\u2019s next",
    future: "A broader professional skill set",
  },
  {
    today: "Curious about AI but unsure how to use it",
    future: "Greater confidence using AI in everyday work",
  },
  {
    today: "Limited exposure to digital content and marketing",
    future: "Ability to understand and create digital content",
  },
  {
    today: "Have a business idea but don\u2019t know how to structure it",
    future: "A foundation for thinking like an entrepreneur",
  },
  {
    today: "Not confident with workplace productivity tools",
    future: "Greater confidence using Word, Excel and PowerPoint",
  },
  {
    today: "Want to switch careers but don\u2019t have relevant experience",
    future: "Skills and practical exposure to help you explore a new direction",
  },
];

export function TransformationMatrix() {
  return (
    <section className="py-20 bg-slate-50/70 border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-5xl space-y-12">

        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Career Transformation
          </span>
          <h2
            className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Don&rsquo;t Start From Zero. Build From What You Already Have.
          </h2>
        </div>

        {/* Comparison table */}
        <div
          role="table"
          aria-label="Career transformation comparison"
          className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden"
        >
          {/* Column headers */}
          <div
            role="row"
            className="grid grid-cols-1 md:grid-cols-2 bg-[#014a62] text-white p-5 md:p-6 text-sm md:text-base font-bold font-instrument-serif tracking-wide"
          >
            <div role="columnheader" className="flex items-center gap-2">
              <span className="text-cyan-300 font-mono tabular-nums" aria-hidden="true">01</span>
              <span>Where You May Be Today</span>
            </div>
            <div
              role="columnheader"
              className="hidden md:flex items-center gap-2 border-l border-white/20 pl-6"
            >
              <span className="text-cyan-300 font-mono tabular-nums" aria-hidden="true">02</span>
              <span>Where These Skills Can Take You</span>
            </div>
          </div>

          {/* Rows */}
          <div role="rowgroup" className="divide-y divide-slate-100">
            {COMPARISONS.map((item, idx) => (
              <div
                key={idx}
                role="row"
                className="grid grid-cols-1 md:grid-cols-2 p-5 md:p-6 hover:bg-slate-50/80 transition-colors gap-4 md:gap-6 items-center text-xs md:text-sm"
              >
                <div role="cell" className="flex items-start gap-3 text-slate-700 font-medium">
                  <div aria-hidden="true" className="w-2 h-2 rounded-full bg-slate-400 shrink-0 mt-2" />
                  <span>{item.today}</span>
                </div>

                {/* Arrow on mobile */}
                <div aria-hidden="true" className="md:hidden flex justify-center text-[#014a62]/60 py-1">
                  <ArrowRightCircle className="w-5 h-5 rotate-90" />
                </div>

                <div
                  role="cell"
                  className="flex items-start gap-3 text-[#014a62] font-bold border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6"
                >
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{item.future}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer callout */}
        <div className="text-center bg-[#014a62]/10 border border-[#014a62]/20 p-6 rounded-2xl max-w-3xl mx-auto space-y-1">
          <p
            className="text-sm md:text-base font-bold text-[#014a62]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Your experience doesn&rsquo;t become irrelevant because your career direction changes.
          </p>
          <p className="text-xs md:text-sm font-semibold text-slate-700">Build on it.</p>
        </div>

      </div>
    </section>
  );
}
