"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  LayoutGrid,
  CheckCircle2,
  Award,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_SLIDES = [
  {
    id: "content-creation",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "Content Creation & Digital Marketing",
    tagline: "Master Digital Communication & Brand Growth",
    description:
      "Learn to create purposeful content, understand digital marketing strategies, and build a powerful digital presence for yourself or your business.",
    badge: "Digital Marketing",
    icon: Sparkles,
    gradient: "from-teal-600/15 via-[#014a62]/20 to-sky-600/15",
    accentBg: "bg-teal-50 text-teal-700 border-teal-200",
    slug: "ppl-theory-navigation",
    stats: "5 Core Modules · Real Assignments",
  },
  {
    id: "ai-skills",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "AI Skills for the Future of Work",
    tagline: "Practical AI Tools for Modern Workplace Productivity",
    description:
      "Learn how to practically leverage AI tools, master prompt engineering, work smarter, create faster, and adapt to the evolving workplace.",
    badge: "AI & Productivity",
    icon: GraduationCap,
    gradient: "from-cyan-600/15 via-[#014a62]/20 to-blue-600/15",
    accentBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
    slug: "cpl-meteorology-instruments",
    stats: "Prompt Engineering · Practical Workflows",
  },
  {
    id: "entrepreneurship",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "Entrepreneurship Basics",
    tagline: "Turn Business Ideas into Scalable Opportunities",
    description:
      "Have a business idea? Learn the foundational principles of entrepreneurial thinking, customer discovery, business planning, and venture creation.",
    badge: "Venture & Business",
    icon: Briefcase,
    gradient: "from-emerald-600/15 via-[#014a62]/20 to-teal-600/15",
    accentBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slug: "ppl-theory-navigation",
    stats: "Business Planning · Opportunity Analysis",
  },
  {
    id: "ms-office",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "MS Office Essentials",
    tagline: "Master Word, Excel & PowerPoint Like a Pro",
    description:
      "Build total confidence in essential workplace digital tools — create professional documents, analyse data in spreadsheets, and design stunning presentations.",
    badge: "Workplace Tools",
    icon: LayoutGrid,
    gradient: "from-sky-600/15 via-[#014a62]/20 to-indigo-600/15",
    accentBg: "bg-sky-50 text-sky-700 border-sky-200",
    slug: "cpl-meteorology-instruments",
    stats: "Word · Excel · PowerPoint Mastery",
  },
];

export function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isAutoplay || prefersReduced) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoplay, prefersReduced]);

  const prev = useCallback(
    () => setCurrentSlide((p) => (p === 0 ? HERO_SLIDES.length - 1 : p - 1)),
    []
  );
  const next = useCallback(
    () => setCurrentSlide((p) => (p + 1) % HERO_SLIDES.length),
    []
  );

  const activeSlide = HERO_SLIDES[currentSlide];
  const Icon = activeSlide.icon;

  return (
    <section
      className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 overflow-hidden bg-white"
      aria-label="Featured courses"
      onMouseEnter={() => setIsAutoplay(false)}
      onMouseLeave={() => setIsAutoplay(true)}
    >
      {/* Ambient backgrounds — aria-hidden, decorative */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#014a62]/20 via-[#014a62]/5 to-transparent blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/3 -right-32 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none -z-10"
      />

      <div className="container mx-auto px-4 max-w-6xl space-y-10">

        {/* TOP TRUST BADGE */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#014a62]/10 border border-[#014a62]/20 text-[#014a62] text-xs font-extrabold tracking-wide shadow-sm">
            <span
              aria-hidden="true"
              className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"
            />
            <span className="text-amber-600 font-extrabold">★&nbsp;30+ Years</span>
            <span aria-hidden="true" className="text-slate-400">|</span>
            <span>Aviation, Learning &amp; Technology Experience</span>
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-instrument-serif text-[#014a62] leading-[1.1] tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Build Future-Ready Skills with{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#014a62] via-[#026282] to-[#01374a] bg-clip-text text-transparent">
              Airbharath LMS
            </span>
          </h1>
        </div>

        {/* HERO SLIDE CARD */}
        <div
          className="relative rounded-3xl border border-slate-200/90 bg-white/90 shadow-2xl backdrop-blur-xl overflow-hidden"
          role="region"
          aria-label={`Course ${currentSlide + 1} of ${HERO_SLIDES.length}: ${activeSlide.title}`}
          aria-live="polite"
        >
          {/* Progress bar */}
          <div className="w-full bg-slate-100 h-1.5 overflow-hidden" aria-hidden="true">
            {!prefersReduced && (
              <div
                key={currentSlide}
                className="h-full bg-[#014a62] transition-[width] ease-linear"
                style={{
                  width: isAutoplay ? "100%" : "0%",
                  transitionDuration: "6000ms",
                }}
              />
            )}
          </div>

          <div
            className={`p-8 md:p-14 bg-gradient-to-br ${activeSlide.gradient} flex flex-col lg:flex-row items-stretch justify-between gap-10 min-h-[420px]`}
          >
            {/* Left: copy */}
            <div className="flex-1 space-y-6 flex flex-col justify-between z-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-[#014a62] text-white">
                    {activeSlide.courseCode}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${activeSlide.accentBg} backdrop-blur-md`}
                  >
                    {activeSlide.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2
                    className="text-3xl md:text-5xl font-bold font-instrument-serif text-[#014a62] leading-tight"
                    style={{ textWrap: "balance" } as React.CSSProperties}
                  >
                    {activeSlide.title}
                  </h2>
                  <p className="text-sm md:text-base font-semibold text-slate-700 italic">
                    {activeSlide.tagline}
                  </p>
                </div>

                <p className="text-sm md:text-base text-slate-700 leading-relaxed font-sans font-normal max-w-2xl">
                  {activeSlide.description}
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-[#014a62]/20 transition-colors"
                  >
                    <Link href="#courses" className="flex items-center gap-2">
                      <span>Explore Course</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10 font-bold px-6 h-12 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62]"
                  >
                    <Link href="/login" className="flex items-center gap-1.5">
                      <PlayCircle className="w-4 h-4" aria-hidden="true" />
                      <span>Start Learning</span>
                    </Link>
                  </Button>
                </div>

                <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {activeSlide.stats}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">·</span>
                  <span>Taught by IIM Alumni</span>
                </div>
              </div>
            </div>

            {/* Right: showcase card */}
            <div className="w-full lg:w-96 bg-white/95 rounded-2xl p-7 border border-slate-200/90 shadow-xl flex flex-col justify-between space-y-6 relative z-10 shrink-0 backdrop-blur-md">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-[#014a62] text-white flex items-center justify-center shadow-lg shadow-[#014a62]/20">
                    <Icon className="w-7 h-7" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-extrabold uppercase text-[#014a62] bg-[#014a62]/10 px-3 py-1 rounded-full border border-[#014a62]/20">
                    Featured
                  </span>
                </div>

                <div>
                  <h3
                    className="text-lg font-bold font-instrument-serif text-[#014a62]"
                    style={{ textWrap: "balance" } as React.CSSProperties}
                  >
                    {activeSlide.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Airbharath LMS Professional Certificate
                  </p>
                </div>

                <dl className="space-y-2.5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-700">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                      Verification
                    </dt>
                    <dd className="text-emerald-700 font-bold">QR Verified PDF</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                      Pedigree
                    </dt>
                    <dd className="text-[#014a62] font-bold">IIM Practitioners</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                      Pacing
                    </dt>
                    <dd className="text-slate-900 font-bold">100% Self-Paced</dd>
                  </div>
                </dl>
              </div>

              <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 font-medium text-center">
                Beginner-friendly · No prior experience required
              </p>
            </div>
          </div>

          {/* Controls bar */}
          <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Quick selector pills */}
            <div
              role="tablist"
              aria-label="Course slides"
              className="flex flex-wrap items-center justify-center md:justify-start gap-2"
            >
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  role="tab"
                  aria-selected={idx === currentSlide}
                  onClick={() => setCurrentSlide(idx)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none ${
                    idx === currentSlide
                      ? "bg-[#014a62] text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  0{idx + 1}&nbsp;{slide.badge}
                </button>
              ))}
            </div>

            {/* Arrow controls */}
            <div className="flex items-center gap-3 text-xs font-bold text-slate-600 shrink-0 tabular-nums">
              <span aria-live="polite" aria-atomic="true">
                0{currentSlide + 1}&nbsp;/&nbsp;0{HERO_SLIDES.length}
              </span>
              <div className="flex items-center gap-1 border-l border-slate-300 pl-3">
                <button
                  onClick={prev}
                  aria-label="Previous course"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && prev()}
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next course"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none"
                  onKeyDown={(e) => e.key === "Enter" && next()}
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
