"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "What is the Shared Success Plan?",
    a: "The Shared Success Plan is our income-aligned tuition fee structure designed to reduce student risk. You pay 50% of the tuition upfront to cover access to live instruction, software licensing support, and server costs. You only pay the remaining 50% after you secure a job placement through our corporate partner network."
  },
  {
    q: "Who is the IRII Finishing School program designed for?",
    a: "This program is specifically designed for B.Tech, M.Tech, and Diploma civil and structural engineering graduates (including current final-year students, dropouts, and early-career working professionals) who find themselves stuck in low-paying site supervisor jobs or struggling to clear core structural design interviews."
  },
  {
    q: "Which structural engineering design software is taught?",
    a: "You will receive hands-on training with professional license workflows in ETABS (Concrete & Steel Building Design), Staad Pro (Industrial Structure & Foundation Designs), Revit BIM (3D Detailing & Modeling), and AutoCAD (2D Schedules)."
  },
  {
    q: "How does the placement program work?",
    a: "Upon completing 100% of the lessons, capstone projects, and passing our internal structural screening evaluations, your resume and verified digital project portfolio are shared directly with our 80+ hiring EPC and structural design partners, skipping general HR job boards."
  },
  {
    q: "What is the role of the Art of Living (Sudarshan Kriya) in the program?",
    a: "Structural design consultants handle heavy calculation loads, tight deadlines, and high-pressure coordination. We integrate Sudarshan Kriya sessions into our curriculum to train students in stress management, emotional composure, and memory concentration, ensuring they remain calm and efficient under load."
  },
  {
    q: "Do I get a certificate of completion?",
    a: "Yes! Every graduate receives a digital, verifiable completion certificate registered on our platform. The certificate features a unique QR code which hiring managers can scan to instantly verify your portfolio credentials and academic performance."
  }
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-24 bg-muted/10 border-t border-border/50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Got questions about our structural engineering curriculum, placement model, or fee details? Find your answers below.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-card border border-border/80 rounded-2xl overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold text-foreground text-sm md:text-base gap-4 hover:bg-muted/30 transition-colors"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[300px] border-t border-border/50 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                >
                  <p className="p-6 text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {item.a}
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
