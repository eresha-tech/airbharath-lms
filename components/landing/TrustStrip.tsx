import React from "react";
import { GraduationCap, Award, CheckCircle2, ShieldCheck } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: GraduationCap,
    title: "IIM Alumni Faculty",
    sub: "Taught by experienced practitioners",
  },
  {
    icon: Award,
    title: "30+ Years Heritage",
    sub: "Aviation, Learning & Technology",
  },
  {
    icon: ShieldCheck,
    title: "QR Verifiable Credentials",
    sub: "Instant digital certificate validation",
  },
  {
    icon: CheckCircle2,
    title: "100% Self-Paced",
    sub: "Learn anytime on mobile & desktop",
  },
];

export function TrustStrip() {
  return (
    <section aria-label="Why AirBharath LMS" className="bg-card border-y border-border py-8 sm:py-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 list-none p-0 m-0">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="flex items-center gap-3.5 p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border/80 hover:border-primary/30 hover:bg-card hover:shadow-xs transition-all duration-200"
              >
                <div
                  aria-hidden="true"
                  className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0"
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground font-outfit">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

