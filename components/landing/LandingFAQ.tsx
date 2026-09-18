"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, Sparkles } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Who are these courses designed for?",
    a: "AirBharath courses are designed for students, job seekers, working professionals, aviation crew, and entrepreneurs looking to build practical, in-demand digital capabilities.",
  },
  {
    q: "Are the courses completely self-paced?",
    a: "Yes. All programs are 100% self-paced. Once enrolled, you can access HD video lessons, notes, and modules at any time from your computer or mobile device.",
  },
  {
    q: "Do I need any prior technical experience?",
    a: "No. Courses start from the fundamentals and progress step-by-step with practical demonstrations and real-world examples.",
  },
  {
    q: "How does certificate verification work?",
    a: "Upon completing 100% of course lessons, you receive an official Certificate of Completion with a unique verification code and QR code that can be verified online at /verify-certificate.",
  },
  {
    q: "Who teaches the courses?",
    a: "The curriculum is designed and taught by IIM alumni and industry practitioners with decades of combined experience across learning, aviation, and technology.",
  },
  {
    q: "Can I ask questions or clear doubts while learning?",
    a: "Yes! Every lesson includes a dedicated discussion and doubt Q&A section where you can post questions and receive guidance from faculty.",
  },
  {
    q: "What is included in the All-in-One Masterclass Combo Pass?",
    a: "The Combo Pass grants full access to all 4 certificate programs: AI Tools & Practical Skills, Digital Marketing & Content Creation, Entrepreneurship & Startup Fundamentals, and MS Office Suite.",
  },
];

export function LandingFAQ() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="py-16 sm:py-24 bg-muted/20 border-b border-border">
      <div className="container mx-auto px-4 max-w-4xl space-y-10 sm:space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Got Questions?</span>
          </span>
          <h2
            id="faq-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-bold font-outfit text-foreground tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Frequently Asked Questions
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-normal leading-relaxed">
            Everything you need to know about the platform, courses, and certificates.
          </p>
        </div>

        {/* Accordion */}
        <div className="bg-card rounded-3xl border border-border shadow-xs p-6 sm:p-8">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {FAQ_ITEMS.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`item-${idx}`}
                className="border-b border-border last:border-b-0 py-2"
              >
                <AccordionTrigger className="text-left text-sm sm:text-base font-bold font-outfit text-foreground hover:no-underline hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg py-3">
                  <div className="flex items-center gap-3 pr-2">
                    <HelpCircle className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>{item.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pl-7 pt-1 font-normal">
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

