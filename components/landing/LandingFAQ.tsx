"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Who are these courses for?",
    a: "Students, freshers, job seekers, working professionals, aviation aspirants, experienced Cabin Crew and aviation professionals, and aspiring entrepreneurs.",
  },
  {
    q: "I am an experienced Cabin Crew / aviation professional. Are these courses relevant to me?",
    a: "Yes. If you’re looking to diversify your skill set, explore a career outside your current role or prepare for a future transition, these courses can help you build skills that may not be part of your current day-to-day work.",
  },
  {
    q: "I want to switch careers. Do I need to quit my current job first?",
    a: "No. The courses are designed to be self-paced, allowing you to learn alongside your existing work or other commitments.",
  },
  {
    q: "Do I need prior experience?",
    a: "No. The courses are designed to start from the fundamentals and are suitable for beginners.",
  },
  {
    q: "Who teaches the courses?",
    a: "The courses are taught by IIM alumni and industry practitioners, bringing together academic perspectives and practical industry experience.",
  },
  {
    q: "Are these courses only for aviation professionals?",
    a: "No. The courses are open to anyone looking to build practical skills. However, Air Bharath’s approach is informed by more than three decades of experience in aviation, learning and technology.",
  },
  {
    q: "Can these courses help me switch careers?",
    a: "They can help you build foundational skills and prepare for a new direction. Where applicable, practical exposure and internship opportunities can further help you understand the work before making a transition.\n\nA certificate alone does not guarantee employment. Your application of the skills, experience and continued learning remain important.",
  },
  {
    q: "Can I learn while flying or working?",
    a: "Yes. The courses are self-paced, allowing you to learn around your professional schedule.",
  },
  {
    q: "Will I receive a certificate?",
    a: "Yes. You receive an Air Bharath certificate upon successful completion of the course.",
  },
  {
    q: "Are these courses a replacement for a degree or professional qualification?",
    a: "No. They are designed to complement your existing education, professional qualification or work experience by adding practical skills.",
  },
  {
    q: "Will Air Bharath introduce more courses?",
    a: "Yes. These four courses are the beginning of a broader learning ecosystem, with additional practical learning opportunities planned over time.",
  },
];

export function LandingFAQ() {
  return (
    <section id="faq" className="py-20 bg-slate-50/70 border-b border-gray-200/80">
      <div className="container mx-auto px-4 max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#014a62] bg-[#014a62]/10 px-3.5 py-1.5 rounded-full border border-[#014a62]/20">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62]">
            Got Questions? We Have Answers.
          </h2>
        </div>

        {/* Accordion List */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 md:p-8 space-y-2">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-b border-slate-100 last:border-b-0 py-2">
                <AccordionTrigger className="text-left text-sm md:text-base font-bold text-[#014a62] hover:no-underline hover:text-[#01374a]">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-[#014a62] shrink-0" />
                    <span>{item.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs md:text-sm text-slate-700 leading-relaxed pl-7 pt-1 font-normal whitespace-pre-line">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

      </div>
    </section>
  );
}
