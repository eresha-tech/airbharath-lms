import React from "react";
import { GraduationCap, Award, CheckCircle2 } from "lucide-react";

export function TrustStrip() {
  return (
    <section className="bg-white border-b border-gray-200/80 py-10">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-600 tracking-wide">
            Learn from people who understand both learning and the workplace.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-[#014a62]/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#014a62]/10 flex items-center justify-center text-[#014a62] shrink-0 font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#014a62]">Taught by IIM Alumni</h4>
              <p className="text-xs text-slate-600 mt-0.5">& Industry Practitioners</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-[#014a62]/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#014a62]/10 flex items-center justify-center text-[#014a62] shrink-0 font-bold">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#014a62]">30+ Years Experience</h4>
              <p className="text-xs text-slate-600 mt-0.5">Aviation, Learning & Tech</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-[#014a62]/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#014a62]/10 flex items-center justify-center text-[#014a62] shrink-0 font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#014a62]">Practical & Flexible</h4>
              <p className="text-xs text-slate-600 mt-0.5">Beginner-Friendly Modules</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
