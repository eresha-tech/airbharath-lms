"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, Award, GraduationCap, Briefcase, LayoutGrid, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_SLIDES = [
  {
    id: "content-creation",
    courseCode: "AIR BHARATH CERTIFICATE COURSE",
    title: "Content Creation & Digital Marketing",
    description:
      "Learn to create purposeful content, understand digital marketing and build a strong digital presence for yourself or your business.",
    badge: "Digital & Communication",
    icon: Sparkles,
    gradient: "from-teal-500/10 via-[#014a62]/10 to-sky-500/10",
    slug: "ppl-theory-navigation",
  },
  {
    id: "ai-skills",
    courseCode: "AIR BHARATH CERTIFICATE COURSE",
    title: "AI Skills for the Future of Work",
    description:
      "Learn how to use AI tools practically to work smarter, create faster and adapt to the changing world of work.",
    badge: "AI & Productivity",
    icon: GraduationCap,
    gradient: "from-cyan-500/10 via-[#014a62]/10 to-blue-500/10",
    slug: "cpl-meteorology-instruments",
  },
  {
    id: "entrepreneurship",
    courseCode: "AIR BHARATH CERTIFICATE COURSE",
    title: "Entrepreneurship Basics",
    description:
      "Have an idea? Learn the fundamentals of turning an idea into a structured business opportunity.",
    badge: "Venture & Business",
    icon: Briefcase,
    gradient: "from-emerald-500/10 via-[#014a62]/10 to-teal-500/10",
    slug: "ppl-theory-navigation",
  },
  {
    id: "ms-office",
    courseCode: "AIR BHARATH CERTIFICATE COURSE",
    title: "MS Office Essentials",
    description:
      "Build confidence in the essential digital tools used across modern workplaces — Word, Excel and PowerPoint.",
    badge: "Workplace Tools",
    icon: LayoutGrid,
    gradient: "from-sky-500/10 via-[#014a62]/10 to-indigo-500/10",
    slug: "cpl-meteorology-instruments",
  },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  useEffect(() => {
    if (!isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isAutoplay]);

  const activeSlide = HERO_SLIDES[currentSlide];
  const Icon = activeSlide.icon;

  return (
    <section 
      className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden bg-background border-b border-border/60"
      onMouseEnter={() => setIsAutoplay(false)}
      onMouseLeave={() => setIsAutoplay(true)}
    >
      {/* Background Glow Patterns */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#014a62]/15 via-[#014a62]/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        {/* TOP TRUST BADGE */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-bold tracking-wide shadow-sm hover:scale-105 transition-all">
            <span className="text-amber-500 font-extrabold text-sm">★</span>
            <span>30+ Years of Aviation, Learning & Technology Experience</span>
          </div>
        </div>

        {/* ROTATING HERO BANNER CARD */}
        <div className="relative rounded-3xl border border-gray-200/80 bg-white/90 shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-700">
          <div className={`p-8 md:p-14 bg-gradient-to-br ${activeSlide.gradient} flex flex-col md:flex-row items-center justify-between gap-10 min-h-[380px]`}>
            
            {/* Left Content */}
            <div className="flex-1 space-y-5 text-center md:text-left z-10">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#014a62] text-white">
                  {activeSlide.courseCode}
                </span>
                <span className="text-xs font-bold text-[#014a62] bg-white/80 border border-[#014a62]/20 px-3 py-1 rounded-full backdrop-blur-md">
                  {activeSlide.badge}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold font-instrument-serif text-[#014a62] leading-tight transition-all duration-500">
                {activeSlide.title}
              </h1>

              <p className="text-base md:text-lg text-slate-700 max-w-2xl leading-relaxed font-sans font-medium">
                {activeSlide.description}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <Button asChild size="lg" className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold px-8 h-12 rounded-xl shadow-md shadow-[#014a62]/20 flex items-center gap-2">
                  <Link href="#courses">
                    <span>Explore Course</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/60 px-3.5 py-2 rounded-lg border border-slate-200/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Beginner-Friendly • Certificate Included</span>
                </div>
              </div>
            </div>

            {/* Right Visual Card */}
            <div className="w-full md:w-80 shrink-0 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-lg flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-[#014a62]/10 border border-[#014a62]/20 flex items-center justify-center text-[#014a62]">
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#014a62] font-instrument-serif">{activeSlide.title}</h4>
                <p className="text-xs text-slate-500 mt-1">Air Bharath Certificate Program</p>
              </div>

              <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Self-Paced Learning</span>
                <span className="text-[#014a62]">IIM Alumni Taught</span>
              </div>
            </div>

          </div>

          {/* Slide Controls Footer */}
          <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "w-8 bg-[#014a62]" : "w-2.5 bg-slate-300 hover:bg-slate-400"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span>0{currentSlide + 1} / 0{HERO_SLIDES.length}</span>
              <div className="flex items-center gap-1 border-l border-slate-300 pl-3">
                <button
                  onClick={() => setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1))}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
