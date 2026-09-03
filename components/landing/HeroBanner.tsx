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
  Star,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_SLIDES = [
  {
    id: "combo-pack",
    courseCode: "★ ALL-IN-ONE MASTERCLASS BUNDLE",
    title: "All-in-One Masterclass Combo Pass (All 4 Courses)",
    tagline: "AI Skills + Content Creation + Entrepreneurship + MS Office",
    description:
      "Get complete access to all 4 Airbharath certificate courses in one single combo pass. Master AI tools, video content, startup launch, and advanced Excel & PowerPoint.",
    badge: "🔥 Best Value Pass",
    price: "1900",
    originalPrice: "3300",
    image: "https://assets.airbharath.in/lms/combo.webp",
    icon: Award,
    gradient: "from-amber-500/15 via-[#014a62]/20 to-cyan-500/15",
    accentBg: "bg-amber-50 text-amber-900 border-amber-300 font-extrabold",
    slug: "combo-pack",
    stats: "All 4 Masterclass Courses · QR Verified Certificates",
  },
  {
    id: "ai-skills",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "AI Tools & Practical AI Skills Masterclass",
    tagline: "Practical AI Tools for Modern Workplace Productivity",
    description:
      "Learn how to practically leverage AI tools like ChatGPT, Claude & Midjourney, master prompt engineering, work 10x faster, and adapt to the evolving workplace.",
    badge: "AI & Productivity",
    price: "825",
    originalPrice: "1999",
    image: "https://assets.airbharath.in/lms/ai-skills.webp",
    icon: GraduationCap,
    gradient: "from-cyan-500/10 via-[#014a62]/15 to-blue-500/10",
    accentBg: "bg-cyan-50 text-cyan-800 border-cyan-200/80",
    slug: "ai-skills",
    stats: "Prompt Engineering · Practical Workflows",
  },
  {
    id: "content-creation",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "Content Creation & Digital Branding Blueprint",
    tagline: "Master Digital Communication & Brand Growth",
    description:
      "Learn to create purposeful content, video editing, social media growth, and build a powerful digital presence for yourself or your business.",
    badge: "Digital Marketing",
    price: "825",
    originalPrice: "1999",
    image: "https://assets.airbharath.in/lms/content-creation.webp",
    icon: Sparkles,
    gradient: "from-teal-500/10 via-[#014a62]/15 to-sky-500/10",
    accentBg: "bg-teal-50 text-teal-800 border-teal-200/80",
    slug: "content-creation",
    stats: "5 Core Modules · Real Assignments",
  },
  {
    id: "entrepreneurship",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "Entrepreneurship & Startup Launch Masterclass",
    tagline: "Turn Business Ideas into Scalable Opportunities",
    description:
      "Have a business idea? Learn the foundational principles of entrepreneurial thinking, customer discovery, business planning, unit economics, and venture creation.",
    badge: "Venture & Business",
    price: "825",
    originalPrice: "1999",
    image: "https://assets.airbharath.in/lms/entrepreneurship.webp",
    icon: Briefcase,
    gradient: "from-emerald-500/10 via-[#014a62]/15 to-teal-500/10",
    accentBg: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    slug: "entrepreneurship",
    stats: "Business Planning · Opportunity Analysis",
  },
  {
    id: "ms-office",
    courseCode: "AIRBHARATH LMS CERTIFICATE COURSE",
    title: "MS Office, Excel & Business Productivity Suite",
    tagline: "Master Word, Excel & PowerPoint Like a Pro",
    description:
      "Build total confidence in essential workplace digital tools — create professional documents, analyse data in spreadsheets, and design stunning presentations.",
    badge: "Workplace Tools",
    price: "825",
    originalPrice: "1999",
    image: "https://assets.airbharath.in/lms/ms-office.webp",
    icon: LayoutGrid,
    gradient: "from-sky-500/10 via-[#014a62]/15 to-indigo-500/10",
    accentBg: "bg-sky-50 text-sky-800 border-sky-200/80",
    slug: "ms-office",
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
      className="relative pt-20 pb-16 lg:pt-24 lg:pb-24 overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-white"
      aria-label="Featured courses"
      onMouseEnter={() => setIsAutoplay(false)}
      onMouseLeave={() => setIsAutoplay(true)}
    >
      {/* Decorative Dot Matrix Grid Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(#014a62_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none -z-10"
      />

      {/* Glowing Ambient Atmospheric Blobs */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#014a62]/20 via-[#026282]/8 to-transparent blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none -z-10"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/4 -right-40 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none -z-10"
      />

      <div className="container mx-auto px-4 max-w-6xl space-y-12">

        {/* TOP TRUST BADGE & TITLE HEADER */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#014a62]/25 text-[#014a62] text-xs font-extrabold tracking-wide shadow-sm hover:shadow-md transition-all">
            <span className="flex items-center gap-1 text-amber-500 font-extrabold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
              30+ Years
            </span>
            <span aria-hidden="true" className="text-slate-300">|</span>
            <span className="font-bold text-slate-800">Aviation, Learning &amp; Technology Experience</span>
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-bold font-instrument-serif text-[#014a62] leading-[1.1] tracking-tight max-w-4xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Build Future-Ready Skills with{" "}
            <span className="text-[#0088b5]">
              <span className="text-[#014a62]">Air Bharath</span>
            </span>
          </h1>
        </div>

        {/* HERO SLIDE CONTAINER WITH CARD STACK DEPTH */}
        <div className="relative">
          {/* Subtle 3D Card Stack Layer Behind (Depth Effect) */}
          <div
            aria-hidden="true"
            className="absolute -bottom-2.5 inset-x-6 h-10 bg-slate-200/60 rounded-3xl border border-slate-300/50 shadow-sm -z-10 transform scale-[0.98]"
          />

          {/* MAIN FEATURED SLIDE DISPLAY CARD */}
          <div
            className="relative rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_20px_50px_-10px_rgba(1,74,98,0.15)] backdrop-blur-xl overflow-hidden transition-all"
            role="region"
            aria-label={`Course ${currentSlide + 1} of ${HERO_SLIDES.length}: ${activeSlide.title}`}
            aria-live="polite"
          >
            <div
              className={`p-5 sm:p-8 md:p-12 lg:p-14 bg-gradient-to-br ${activeSlide.gradient} flex flex-col lg:flex-row items-stretch justify-between gap-8 lg:gap-10 min-h-[440px]`}
            >
              {/* Left Column: Copy & Details */}
              <div className="flex-1 space-y-6 flex flex-col justify-between z-10">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full bg-[#014a62] text-white shadow-xs">
                      {activeSlide.courseCode}
                    </span>
                    <span
                      className={`text-xs font-bold px-3.5 py-1 rounded-full border ${activeSlide.accentBg} backdrop-blur-md shadow-2xs`}
                    >
                      {activeSlide.badge}
                    </span>
                  </div>

                  <div className="space-y-1.5">
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

                <div className="space-y-5 pt-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-to-r from-[#014a62] to-[#025c7a] hover:from-[#01374a] hover:to-[#014a62] text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-[#014a62]/25 hover:shadow-xl hover:shadow-[#014a62]/30 hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <Link href={`/courses/${activeSlide.slug}`} className="flex items-center gap-2">
                        <span>Explore Course</span>
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </Link>
                    </Button>

                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="border-[#014a62] text-[#014a62] hover:bg-[#014a62]/10 font-bold px-6 h-12 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-[#014a62]"
                    >
                      <Link href="/login" className="flex items-center gap-2">
                        <PlayCircle className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                        <span>Start Learning</span>
                      </Link>
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200/80 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      {activeSlide.stats}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <GraduationCap className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                      Taught by IIM Alumni
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Floating Showcase Box with Background Image */}
              <div className="w-full lg:w-96 bg-white/95 rounded-2xl border border-slate-200/90 shadow-xl flex flex-col justify-between overflow-hidden relative z-10 shrink-0 backdrop-blur-md hover:border-[#014a62]/30 transition-all">
                {/* Image Header Background */}
                <div className="h-44 relative bg-slate-800 overflow-hidden">
                  <img
                    src={activeSlide.image}
                    alt={activeSlide.title}
                    className="w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-white bg-[#014a62]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md">
                      Featured Course
                    </span>
                    <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-400/40 shadow-sm flex items-center gap-1">
                      <span className="line-through text-amber-200/60 text-[10px]">₹1,999</span>
                      <span>₹{activeSlide.price || '825'}</span>
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-base font-bold font-instrument-serif text-white leading-tight drop-shadow-md">
                      {activeSlide.title}
                    </h3>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-[#014a62]" aria-hidden="true" />
                    Airbharath LMS Professional Certificate
                  </p>

                  <dl className="space-y-2.5 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700">
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                        Verification
                      </dt>
                      <dd className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        QR Verified PDF
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-slate-600">
                        <Award className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                        Pedigree
                      </dt>
                      <dd className="text-[#014a62] font-bold">IIM Practitioners</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="flex items-center gap-1.5 text-slate-600">
                        <GraduationCap className="w-4 h-4 text-[#014a62]" aria-hidden="true" />
                        Pacing
                      </dt>
                      <dd className="text-slate-900 font-bold">100% Self-Paced</dd>
                    </div>
                  </dl>

                  <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 font-medium text-center">
                    Beginner-friendly · No prior experience required
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Controls & Quick Selector Navigation Bar */}
            <div className="bg-slate-50/90 border-t border-slate-200/80 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Quick Course Selector Pills */}
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none ${idx === currentSlide
                      ? "bg-[#014a62] text-white shadow-sm scale-[1.02]"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-[#014a62]/10 hover:border-[#014a62]/30"
                      }`}
                  >
                    0{idx + 1}&nbsp;{slide.badge}
                  </button>
                ))}
              </div>

              {/* Slide Counter & Arrow Controls */}
              <div className="flex items-center gap-3 text-xs font-bold text-slate-700 shrink-0 tabular-nums">
                <span aria-live="polite" aria-atomic="true" className="bg-white border border-slate-200 px-2.5 py-1 rounded-md">
                  0{currentSlide + 1}&nbsp;/&nbsp;0{HERO_SLIDES.length}
                </span>
                <div className="flex items-center gap-1.5 border-l border-slate-300 pl-3">
                  <button
                    onClick={prev}
                    aria-label="Previous course"
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-[#014a62]/30 text-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none shadow-2xs"
                    onKeyDown={(e) => e.key === "Enter" && prev()}
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next course"
                    className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 hover:border-[#014a62]/30 text-slate-700 transition-all focus-visible:ring-2 focus-visible:ring-[#014a62] focus-visible:outline-none shadow-2xs"
                    onKeyDown={(e) => e.key === "Enter" && next()}
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
