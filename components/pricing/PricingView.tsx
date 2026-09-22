"use client";

import Link from "next/link";
import {
  Check,
  Sparkles,
  ShieldCheck,
  Award,
  BookOpen,
  ArrowRight,
  Receipt,
  Building,
  HelpCircle,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PricingCourseItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  description?: string | null;
  modulesCount: number;
  lessonsCount: number;
  badge?: string;
}

interface PricingViewProps {
  courses: PricingCourseItem[];
}

export function PricingView({ courses }: PricingViewProps) {
  const comboCourse = courses.find((c) => c.slug === "combo-pack" || c.title.toLowerCase().includes("combo"));
  const singleCourses = courses.filter((c) => c.slug !== "combo-pack" && !c.title.toLowerCase().includes("combo"));

  const comboPrice = comboCourse ? comboCourse.price : 1999;
  const singlePrice = singleCourses.length > 0 ? singleCourses[0].price : 825;

  // Exact GST Breakdown calculations based on invoice-generator.ts
  const singleBase = Math.round((singlePrice / 1.18) * 100) / 100;
  const singleGst = Math.round((singlePrice - singleBase) * 100) / 100;

  const comboBase = Math.round((comboPrice / 1.18) * 100) / 100;
  const comboGst = Math.round((comboPrice - comboBase) * 100) / 100;

  return (
    <div className="flex flex-col min-h-screen font-sans bg-background text-foreground pb-20">
      {/* Header Banner */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pt-28 pb-16 border-b border-border/80">
        <div className="container mx-auto px-4 max-w-5xl space-y-4 text-center animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-4 w-4" />
            <span>Transparent Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold font-outfit tracking-tight text-foreground">
            Simple, Transparent <span className="text-primary">Tuition.</span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            All prices are completely inclusive of 18% GST with zero hidden fees. Includes self-paced LMS access, downloadable assets, QR-verifiable certificates, and tax invoices.
          </p>
        </div>
      </section>

      {/* Main Pricing Grid */}
      <div className="container mx-auto px-4 max-w-6xl mt-12 space-y-16">
        {/* Tier Cards: Individual vs Combo Pass */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Plan 1: Individual Certificate Course (5 cols) */}
          <div className="lg:col-span-5 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-muted text-foreground border-border text-[10px] font-bold uppercase tracking-wider">
                  Single Program
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                  Individual Course
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Enroll in any single certificate program of your choice with lifetime access to all course modules.
                </p>
              </div>

              {/* Price */}
              <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 space-y-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-black font-outfit text-foreground">
                    ₹{singlePrice}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    / one-time enrollment
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <span>Base: ₹{singleBase} + 18% GST: ₹{singleGst} (Inclusive)</span>
                </div>
              </div>

              {/* Inclusions */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Included in this plan:
                </span>
                <ul className="space-y-2.5 text-xs text-foreground">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Complete access to selected course curriculum</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% Self-paced video lessons &amp; resources</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Official QR-verifiable certificate upon completion</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Access to student placement opportunities &amp; Job Board</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Official GST invoice generated automatically</span>
                  </li>
                </ul>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="w-full border-slate-200 text-slate-800 hover:text-primary hover:bg-slate-100 font-bold h-12 rounded-xl text-xs"
            >
              <Link href="/courses">
                <span>Browse Single Courses</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>

          {/* Plan 2: All-in-One Combo Pass (7 cols, Featured) */}
          <div className="lg:col-span-7 bg-card border-2 border-primary rounded-3xl p-6 sm:p-8 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden flex flex-col justify-between space-y-6">
            <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-xs">
              Most Popular · All 4 Programs
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                  Comprehensive Bundle
                </Badge>
                <h3 className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                  All-in-One Combo Pass
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Unlock all 4 flagship programs: AI Skills, Digital Marketing &amp; Content Creation, MS Office Essentials, and Entrepreneurship Basics.
                </p>
              </div>

              {/* Price & Coupon Pill */}
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black font-outfit text-primary">
                    ₹{comboPrice}
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold">
                    / one-time full package
                  </span>
                  <span className="line-through text-xs text-muted-foreground/70">
                    ₹3,300 value
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>Base: ₹{comboBase} + 18% GST: ₹{comboGst} (Inclusive)</span>
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    <span>Coupon:</span>
                    <span>ABCOMBO</span>
                  </span>
                </div>
              </div>

              {/* Inclusions */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                  Complete Bundle Inclusions:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI Skills for Future of Work</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Content &amp; Digital Marketing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>MS Office Productivity Suite</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Entrepreneurship Basics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>4 Independent QR Certificates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Priority Placement Hub Access</span>
                  </div>
                </div>
              </div>
            </div>

            <Button
              asChild
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-xl text-xs shadow-xs cursor-pointer"
            >
              <Link href={comboCourse ? `/courses/${comboCourse.slug}` : "/courses/combo-pack"}>
                <span>Enroll in All-in-One Combo Pass</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Real Courses Catalog Roster */}
        {singleCourses.length > 0 && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground">
                Explore Flagship Certificate Programs
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Each course can be enrolled individually at ₹825 with complete GST compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {singleCourses.map((c) => (
                <div
                  key={c.id}
                  className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-2.5">
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase">
                      {c.badge || "Certificate Course"}
                    </Badge>
                    <h4 className="font-bold text-sm sm:text-base font-outfit text-foreground line-clamp-2">
                      {c.title}
                    </h4>
                    {c.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {c.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-foreground font-outfit text-base">
                        ₹{c.price}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.modulesCount} Modules
                      </span>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full text-xs font-bold h-9 rounded-xl border-border text-foreground hover:bg-muted"
                    >
                      <Link href={`/courses/${c.slug || c.id}`}>View Details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax & Invoicing Compliance Info */}
        <div className="bg-muted/40 border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-bold font-outfit text-foreground">
                Tax &amp; Regulatory Invoicing Compliance
              </h4>
              <p className="text-xs text-muted-foreground">
                Issued by Eresha Technology Innovators Pvt. Ltd. (GSTIN: 07AAGCE9775P1ZN)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground leading-relaxed pt-2">
            <div className="bg-card p-4 rounded-2xl border border-border/60 space-y-1">
              <span className="font-bold text-foreground block">18% GST Inclusive</span>
              <p>Every listed price covers the statutory 18% Goods and Services Tax with no surprise surcharges during checkout.</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border/60 space-y-1">
              <span className="font-bold text-foreground block">Instant Tax Invoices</span>
              <p>Download computer-generated PDF tax invoices with itemized base and GST breakdown from your student settings.</p>
            </div>
            <div className="bg-card p-4 rounded-2xl border border-border/60 space-y-1">
              <span className="font-bold text-foreground block">Secure Razorpay Gateway</span>
              <p>Industry-standard encryption supporting UPI, Cards, NetBanking, and corporate wallets.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
