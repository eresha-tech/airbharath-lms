import { HelpCircle } from "lucide-react";

export default function FAQPage() {
  const faqItems = [
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
      a: "Structural design consultants handle heavy calculation loads, tight project deadlines, and high-pressure coordination tasks. We integrate Sudarshan Kriya sessions into our curriculum to train students in stress management, emotional composing, and memory concentration, ensuring they remain calm and efficient under load."
    },
    {
      q: "Do I get a certificate of completion?",
      a: "Yes! Every graduate receives a digital, verifiable completion certificate registered on our platform. The certificate features a unique QR code which hiring managers can scan to instantly verify your portfolio credentials and academic performance."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight">Frequently Asked Questions</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Got questions about our structural engineering curriculum, placement model, or fee details? Find your answers below.
        </p>
      </div>

      <div className="space-y-6">
        {faqItems.map((item, index) => (
          <div 
            key={index}
            className="p-6 bg-card border border-border/80 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-base md:text-lg font-bold text-foreground mb-3 flex items-start gap-3">
              <span className="text-primary font-extrabold">Q.</span>
              <span>{item.q}</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-6">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
