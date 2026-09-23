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
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_SLIDES = [
  {
    id: "combo-pack",
    courseCode: "★ ALL-IN-ONE MASTERCLASS BUNDLE",
    title: "All-in-One Masterclass Combo Pass (All 4 Courses)",
    tagline: "AI Skills + Content Creation + Entrepreneurship + MS Office",
    description:
      "Get complete access to all 4 Air Bharath certificate courses in one single combo pass. Master AI tools, video content, startup launch, and advanced Excel & PowerPoint.",
    badge: "🔥 Best Value Pass",
    price: "1900",
    originalPrice: "3300",
    image: "https://assets.airbharath.in/lms/combo.webp",
    icon: Award,
    slug: "combo-pack",
    stats: "All 4 Masterclass Courses · QR Verified Certificates",
  },
  {
    id: "ai-skills",
    courseCode: "AIR BHARATH LMS CERTIFICATE COURSE",
    title: "AI Tools & Practical AI Skills Masterclass",
    tagline: "Practical AI Tools for Modern Workplace Productivity",
    description:
      "Learn how to practically leverage AI tools like ChatGPT, Claude & Midjourney, master prompt engineering, work faster, and adapt to the evolving workplace.",
    badge: "AI & Productivity",
    price: "825",
    originalPrice: 999,
    image: "https://assets.airbharath.in/lms/ai-skills.webp",
    icon: GraduationCap,
    slug: "ai-skills",
    stats: "Prompt Engineering · Practical Workflows",
  },
  {
    id: "content-creation",
    courseCode: "AIR BHARATH LMS CERTIFICATE COURSE",
    title: "Digital Marketing & Content Creation Blueprint",
    tagline: "Master Digital Marketing, Social Ads, SEO & Brand Growth",
    description:
      "Master end-to-end digital marketing: learn social media marketing, SEO basics, running targeted ads, video content creation, and online brand growth.",
    badge: "Digital Marketing",
    price: "825",
    originalPrice: 999,
    image: "https://assets.airbharath.in/lms/content-creation.webp",
    icon: Sparkles,
    slug: "content-creation",
    stats: "SEO · Paid Ads · Social Media Strategy",
  },
  {
    id: "entrepreneurship",
    courseCode: "AIR BHARATH LMS CERTIFICATE COURSE",
    title: "Entrepreneurship & Startup Launch Masterclass",
    tagline: "Turn Business Ideas into Scalable Opportunities",
    description:
      "Have a business idea? Learn the foundational principles of entrepreneurial thinking, customer discovery, business planning, unit economics, and venture creation.",
    badge: "Venture & Business",
    price: "825",
    originalPrice: 999,
    image: "https://assets.airbharath.in/lms/entrepreneurship.webp",
    icon: Briefcase,
    slug: "entrepreneurship",
    stats: "Business Planning · Opportunity Analysis",
  },
  {
    id: "ms-office",
    courseCode: "AIR BHARATH LMS CERTIFICATE COURSE",
    title: "MS Office, Excel & Business Productivity Suite",
    tagline: "Master Word, Excel & PowerPoint Like a Pro",
    description:
      "Build total confidence in essential workplace digital tools — create professional documents, analyse data in spreadsheets, and design stunning presentations.",
    badge: "Workplace Tools",
    price: "825",
    originalPrice: 999,
    image: "https://assets.airbharath.in/lms/ms-office.webp",
    icon: LayoutGrid,
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

  return (
    <section
      className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden bg-background"
      aria-label="Featured courses hero"
    >
      {/* Decorative Dot Matrix Grid Background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(#9089FF_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none -z-10"
      />

      {/* Atmospheric Glow Highlights */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none -z-10"
      />

      <div className="container mx-auto px-4 max-w-7xl space-y-12">
        {/* Top Trust Badge & Main Headline */}
        <div className="flex flex-col items-center gap-4 text-center max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border text-foreground text-xs font-bold tracking-wide shadow-xs animate-float-slow">
            <span className="flex items-center gap-1 text-amber-500 font-extrabold">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 animate-pulse" aria-hidden="true" />
              30+ Years
            </span>
            <span aria-hidden="true" className="text-border">|</span>
            <span className="text-muted-foreground">Aviation, Learning &amp; Technology Heritage</span>
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-outfit text-foreground leading-[1.1] tracking-tight"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Practical, Future-Ready Skills with{" "}
            <span className="text-primary underline decoration-primary/20 decoration-wavy decoration-2 underline-offset-8">
              AirBharath LMS
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground font-normal leading-relaxed max-w-2xl">
            Self-paced certificate programs in AI tools, digital marketing, entrepreneurship, and workplace productivity. Taught by IIM alumni and industry practitioners.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-7 h-12 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <span>Explore All Courses</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-border bg-card text-foreground hover:text-primary hover:bg-muted font-bold px-6 h-12 rounded-xl active:scale-[0.98] transition-all"
            >
              <Link href="/login" className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-primary" />
                <span>Student Login</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* HERO SLIDE CONTAINER WITH CARD STACK DEPTH */}
        <div className="relative max-w-6xl mx-auto pt-4">
          {/* Subtle 3D Card Stack Layer Behind */}
          <div
            aria-hidden="true"
            className="absolute -bottom-2 inset-x-6 h-10 bg-muted/50 rounded-3xl border border-border shadow-xs -z-10 transform scale-[0.98]"
          />

          {/* MAIN FEATURED SLIDE DISPLAY CARD */}
          <div
            className="relative rounded-3xl border border-border/90 bg-card shadow-xl hover:shadow-2xl overflow-hidden transition-all duration-300"
            role="region"
            aria-label={`Course ${currentSlide + 1} of ${HERO_SLIDES.length}: ${activeSlide.title}`}
            onMouseEnter={() => setIsAutoplay(false)}
            onMouseLeave={() => setIsAutoplay(true)}
          >
            {/* Sliding Carousel Track */}
            <div
              className={`flex ${prefersReduced ? "transition-none" : "transition-transform duration-500 ease-in-out"}`}
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {HERO_SLIDES.map((slide, slideIdx) => {
                const isCurrent = slideIdx === currentSlide;
                return (
                  <div
                    key={slide.id}
                    className="w-full shrink-0 p-6 sm:p-8 md:p-10 lg:p-12 bg-gradient-to-br from-primary/5 via-background to-secondary/30 flex flex-col lg:flex-row items-stretch justify-between gap-8 lg:gap-10"
                    aria-hidden={!isCurrent}
                  >
                    {/* Left Column: Course Highlights */}
                    <div className="flex-1 space-y-6 flex flex-col justify-between z-10">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-primary text-white shadow-xs">
                            {slide.courseCode}
                          </span>
                          <span className="text-xs font-bold px-3 py-1 rounded-full border border-primary/20 bg-primary/10 text-primary">
                            {slide.badge}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h2
                            className="text-2xl sm:text-3xl md:text-4xl font-bold font-outfit text-foreground leading-snug"
                            style={{ textWrap: "balance" } as React.CSSProperties}
                          >
                            {slide.title}
                          </h2>
                          <p className="text-sm md:text-base font-semibold text-primary">
                            {slide.tagline}
                          </p>
                        </div>

                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl">
                          {slide.description}
                        </p>
                      </div>

                      <div className="space-y-5 pt-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            asChild
                            className="bg-primary hover:bg-primary/90 text-white font-bold px-6 h-11 rounded-xl shadow-xs"
                          >
                            <Link href={`/courses/${slide.slug}`} className="flex items-center gap-2">
                              <span>Explore Program</span>
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </Button>

                          <Button
                            asChild
                            variant="outline"
                            className="border-border text-foreground hover:bg-muted font-semibold px-5 h-11 rounded-xl"
                          >
                            <Link href="/courses">View All Programs</Link>
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-700 pt-2 border-t border-border/60">
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {slide.stats}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            Taught by IIM Alumni
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Visual Preview Box */}
                    <div className="w-full lg:w-96 bg-card rounded-2xl border border-border shadow-md flex flex-col justify-between overflow-hidden relative z-10 shrink-0 group/preview hover:shadow-lg hover:border-primary/40 transition-all duration-300">
                      {/* Image Header */}
                      <div className="h-44 relative bg-slate-900 overflow-hidden">
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover/preview:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-white bg-primary/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                            Featured Program
                          </span>
                          <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-amber-400/40 flex items-center gap-1">
                            {slide.originalPrice && (
                              <span className="line-through text-amber-200/60 text-[10px]">
                                ₹{Number(slide.originalPrice).toLocaleString("en-IN")}
                              </span>
                            )}
                            <span>₹{Number(slide.price).toLocaleString("en-IN")}</span>
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3">
                          <h3 className="text-sm sm:text-base font-bold font-outfit text-white leading-tight">
                            {slide.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                          AirBharath LMS Professional Certificate
                        </p>

                        <dl className="space-y-2 pt-2 border-t border-border text-xs font-semibold text-slate-700">
                          <div className="flex items-center justify-between">
                            <dt className="flex items-center gap-1.5 text-muted-foreground">
                              <ShieldCheck className="w-4 h-4 text-primary" />
                              Verification
                            </dt>
                            <dd className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              QR Verified ID
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="flex items-center gap-1.5 text-muted-foreground">
                              <Award className="w-4 h-4 text-primary" />
                              Instructors
                            </dt>
                            <dd className="text-primary font-bold">IIM Alumni</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="flex items-center gap-1.5 text-muted-foreground">
                              <Laptop className="w-4 h-4 text-primary" />
                              Pacing
                            </dt>
                            <dd className="text-foreground font-bold">100% Self-Paced</dd>
                          </div>
                        </dl>

                        <div className="p-2.5 bg-muted/50 rounded-xl border border-border text-[11px] text-muted-foreground font-medium text-center">
                          Beginner-friendly · Full lifetime dashboard access
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Slide Controls & Quick Selector Navigation Bar */}
            <div className="bg-muted/40 border-t border-border px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Quick Course Selector Pills */}
              <div
                role="tablist"
                aria-label="Course slides"
                className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2"
              >
                {HERO_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    role="tab"
                    aria-selected={idx === currentSlide}
                    onClick={() => setCurrentSlide(idx)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${idx === currentSlide
                      ? "bg-primary text-white shadow-xs scale-[1.02]"
                      : "bg-card border border-border text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/30"
                      }`}
                  >
                    0{idx + 1}&nbsp;{slide.badge}
                  </button>
                ))}
              </div>

              {/* Slide Counter & Arrow Controls */}
              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground shrink-0 tabular-nums">
                <span className="bg-card border border-border px-2.5 py-1 rounded-md text-foreground">
                  0{currentSlide + 1} / 0{HERO_SLIDES.length}
                </span>
                <div className="flex items-center gap-1 border-l border-border pl-3">
                  <button
                    onClick={prev}
                    aria-label="Previous course slide"
                    className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all duration-150 active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next course slide"
                    className="p-1.5 rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all duration-150 active:scale-90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <ChevronRight className="w-4 h-4" />
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
