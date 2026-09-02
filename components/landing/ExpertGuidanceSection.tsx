import React from "react";
import { GraduationCap, Briefcase, Award, CheckCircle2 } from "lucide-react";

export function ExpertGuidanceSection() {
  return (
    <section className="py-20 bg-white border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-6xl space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Instructor Pedigree
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Learn From IIM Alumni & Industry Practitioners.
          </h2>
          <p className="text-base text-slate-700 font-sans leading-relaxed">
            Learning becomes more meaningful when the people teaching you understand both the concepts and the context in which they are applied.
          </p>
        </div>

        {/* 3 Pillar Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* IIM Alumni */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-[#014a62]/30 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center shadow-lg shadow-[#014a62]/20">
                <GraduationCap className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">
                IIM Alumni
              </h3>

              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                Learn from professionals with strong academic, management and entrepreneurial perspectives.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200/60 text-xs font-bold text-[#014a62] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Academic & Strategic Rigor</span>
            </div>
          </div>

          {/* Industry Practitioners */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-[#014a62]/30 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center shadow-lg shadow-[#014a62]/20">
                <Briefcase className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">
                Industry Practitioners
              </h3>

              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                Understand how skills are applied in real professional environments — beyond textbooks and theory.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200/60 text-xs font-bold text-[#014a62] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Real-World Context</span>
            </div>
          </div>

          {/* 30+ Years Experience */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-3xl p-8 space-y-4 hover:shadow-xl hover:border-[#014a62]/30 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center shadow-lg shadow-[#014a62]/20">
                <Award className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">
                Air Bharath’s 30+ Years
              </h3>

              <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-sans font-normal">
                Our learning philosophy is shaped by more than three decades across aviation, learning and technology, where training, discipline, quality and performance matter.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-200/60 text-xs font-bold text-[#014a62] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Proven Discipline & Heritage</span>
            </div>
          </div>

        </div>

        {/* Learning Philosophy Callout Banner */}
        <div className="bg-[#014a62] text-white p-8 rounded-3xl shadow-xl text-center space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-cyan-300">
            Our Core Approach Is Simple
          </span>
          <h4 className="text-xl md:text-3xl font-bold font-instrument-serif text-white tracking-wide">
            Learn it. Understand it. Practise it. Apply it.
          </h4>
        </div>

      </div>
    </section>
  );
}
