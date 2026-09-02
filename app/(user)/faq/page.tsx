import { HelpCircle } from "lucide-react";

export default function FAQPage() {
  const faqItems = [
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
      a: "No. The courses are open to anyone looking to build practical skills. However, Airbharath LMS approach is informed by more than three decades of experience in aviation, learning and technology.",
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
      a: "Yes. You receive an Airbharath LMS certificate upon successful completion of the course.",
    },
    {
      q: "Are these courses a replacement for a degree or professional qualification?",
      a: "No. They are designed to complement your existing education, professional qualification or work experience by adding practical skills.",
    },
    {
      q: "Will Airbharath LMS introduce more courses?",
      a: "Yes. These four courses are the beginning of a broader learning ecosystem, with additional practical learning opportunities planned over time.",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-28 max-w-4xl min-h-screen text-foreground bg-background">
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
        <div className="h-12 w-12 bg-[#014a62]/10 rounded-2xl flex items-center justify-center mx-auto text-[#014a62]">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-[#014a62]">
          Frequently Asked Questions
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Got questions about Airbharath LMS courses, learning model, or certification? Find your answers below.
        </p>
      </div>

      <div className="space-y-6">
        {faqItems.map((item, index) => (
          <div 
            key={index}
            className="p-6 bg-card border border-border/80 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-base md:text-lg font-bold text-[#014a62] mb-3 flex items-start gap-3">
              <span className="font-extrabold">Q.</span>
              <span>{item.q}</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
