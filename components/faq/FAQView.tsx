"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  BookOpen,
  ShieldCheck,
  Briefcase,
  CreditCard,
  GraduationCap,
  Mail,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "faq-1",
    category: "Courses & Curriculum",
    question: "Who are these certificate courses designed for?",
    answer:
      "Our certificate courses are designed for students, freshers, working professionals, aviation crew, and aspiring entrepreneurs who want to build practical in-demand skills (such as AI Tools, Digital Marketing, Workplace MS Office, and Venture Basics) without putting their current careers or commitments on hold.",
  },
  {
    id: "faq-2",
    category: "Courses & Curriculum",
    question: "I am an experienced Cabin Crew / aviation professional. Are these courses relevant to me?",
    answer:
      "Yes. If you are looking to diversify your capabilities, explore roles outside flight duties, or prepare for future transitions into corporate operations, technology, or entrepreneurship, these courses help build skills that may not be part of your current day-to-day aviation work.",
  },
  {
    id: "faq-3",
    category: "Learning & Schedule",
    question: "I want to learn while working or flying. Do I need to quit my current job?",
    answer:
      "No. All AirBharath LMS courses are 100% self-paced. You have full flexibility to access lectures, complete hands-on assignments, and earn your certificate around your flying or work schedule.",
  },
  {
    id: "faq-4",
    category: "Courses & Curriculum",
    question: "Do I need prior technical background or coding experience?",
    answer:
      "No prior experience is required. Every curriculum is structured from the ground up, starting with foundational concepts before progressing to practical workflows and real-world tools.",
  },
  {
    id: "faq-5",
    category: "Courses & Curriculum",
    question: "Who teaches and creates the courses?",
    answer:
      "Our courses are created and taught by IIM alumni and seasoned industry practitioners, bringing together rigorous academic frameworks with practical execution from modern organizations.",
  },
  {
    id: "faq-6",
    category: "Courses & Curriculum",
    question: "Are these courses only meant for aviation professionals?",
    answer:
      "No. The courses are open to anyone looking to build practical workplace, digital, and entrepreneurial skills. However, our operational discipline and quality standards are shaped by more than three decades of aviation and technology heritage.",
  },
  {
    id: "faq-7",
    category: "Certificates & Verification",
    question: "Will I receive an official certificate upon course completion?",
    answer:
      "Yes. Once you complete all video modules and lesson requirements in your enrolled course, you receive an official AirBharath LMS certificate equipped with a tamper-proof QR code and unique credential ID.",
  },
  {
    id: "faq-8",
    category: "Certificates & Verification",
    question: "How can employers verify my AirBharath LMS certificate?",
    answer:
      "Anyone can verify the authenticity of an issued certificate by scanning its QR code or by entering the Credential ID directly into our public verification portal at lms.airbharath.in/verify-certificate.",
  },
  {
    id: "faq-9",
    category: "Certificates & Verification",
    question: "Are these courses a replacement for a formal university degree?",
    answer:
      "No. They are professional skill-building certificate programs designed to complement your existing university education, aviation license, or professional experience with practical execution skills.",
  },
  {
    id: "faq-10",
    category: "Placement & Career",
    question: "Can these courses help me switch careers or land a job?",
    answer:
      "Our courses help you build verified capabilities and practical portfolios. Enrolled students also gain access to our integrated Job Board featuring partner openings. Please note that while we provide skills and placement support, a certificate alone does not guarantee employment; your individual application, discipline, and performance remain key.",
  },
  {
    id: "faq-11",
    category: "Pricing & Payments",
    question: "Are course prices inclusive of taxes (GST)?",
    answer:
      "Yes. All prices listed on AirBharath LMS are inclusive of 18% GST. Upon successful payment via Razorpay, an official GST tax invoice is automatically generated and downloadable from your student account.",
  },
  {
    id: "faq-12",
    category: "Pricing & Payments",
    question: "What is the All-in-One Combo Pass?",
    answer:
      "The All-in-One Combo Pass bundles all four flagship certificate programs (AI Skills, Digital Marketing, MS Office, and Entrepreneurship) into a single enrollment package, offering comprehensive access at a discounted bundled price.",
  },
];

const CATEGORIES = [
  "All Questions",
  "Courses & Curriculum",
  "Learning & Schedule",
  "Certificates & Verification",
  "Placement & Career",
  "Pricing & Payments",
];

export function FAQView() {
  const [activeCategory, setActiveCategory] = useState("All Questions");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      // Category filter
      if (activeCategory !== "All Questions" && item.category !== activeCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchQ = item.question.toLowerCase().includes(q);
        const matchA = item.answer.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        if (!matchQ && !matchA && !matchCat) return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground pb-20">
      {/* Header Banner */}
      <section className="pt-28 pb-14 border-b border-border">
        <div className="container mx-auto px-4 max-w-4xl space-y-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="h-4 w-4" />
            <span>Help Center &amp; Answers</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-outfit tracking-tight text-foreground">
            Frequently Asked <span className="text-primary">Questions.</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Find clear, straightforward answers about our curriculum, self-paced learning model, QR-verified certificates, and admissions.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto pt-4 relative">
            <Search className="absolute left-4 top-6.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search questions by keyword (e.g. certificate, cabin crew, GST, schedule)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 pr-9 h-12 rounded-2xl text-xs font-medium border-border shadow-xs bg-card focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-6.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main FAQ Content */}
      <div className="container mx-auto px-4 max-w-4xl mt-10 space-y-8">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            const count =
              cat === "All Questions"
                ? FAQ_DATA.length
                : FAQ_DATA.filter((i) => i.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <span>{cat}</span>
                <span className="opacity-75 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Accordion Questions List */}
        {filteredFAQs.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-foreground">
              No questions found matching &ldquo;{searchQuery}&rdquo;
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All Questions");
              }}
              className="text-xs font-bold rounded-xl"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="bg-card border border-border/80 rounded-3xl p-4 sm:p-8 shadow-xs">
            <Accordion type="single" collapsible defaultValue="faq-1" className="w-full space-y-2">
              {filteredFAQs.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-b border-border/60 last:border-b-0 px-2 py-1"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <div className="space-y-1 pr-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                        {item.category}
                      </span>
                      <span className="text-sm sm:text-base font-bold font-outfit text-foreground leading-snug block">
                        {item.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4 pr-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* Bottom Support Banner */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold font-outfit text-foreground">
              Have a question not covered here?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Our academic support desk is happy to provide course guidance and enrollment assistance.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-5 rounded-xl shadow-xs"
            >
              <Link href="/contact">
                <span>Contact Academic Helpdesk</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-bold text-xs h-10 px-5 rounded-xl"
            >
              <Link href="/courses">Browse Course Catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
