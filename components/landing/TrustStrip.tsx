import React from "react";
import { GraduationCap, Award, CheckCircle2 } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: GraduationCap,
    title: "Taught by IIM Alumni",
    sub: "& Industry Practitioners",
  },
  {
    icon: Award,
    title: "30+ Years Experience",
    sub: "Aviation, Learning & Tech",
  },
  {
    icon: CheckCircle2,
    title: "Practical & Flexible",
    sub: "Beginner-Friendly Modules",
  },
];

export function TrustStrip() {
  return (
    <section aria-label="Why Airbharath LMS" className="bg-white border-b border-gray-200/80 py-10">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <p className="text-sm font-semibold text-slate-600 tracking-wide text-center">
          Learn from people who understand both learning and the workplace.
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none p-0 m-0">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-[#014a62]/30 hover:shadow-md transition-all duration-200"
              >
                <div
                  aria-hidden="true"
                  className="w-12 h-12 rounded-xl bg-[#014a62]/10 flex items-center justify-center text-[#014a62] shrink-0"
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#014a62]">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{item.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
