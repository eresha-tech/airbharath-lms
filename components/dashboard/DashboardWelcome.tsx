import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, Compass, ArrowRight, Sparkles } from "lucide-react";

interface DashboardWelcomeProps {
  userName: string;
  hasCourses: boolean;
  continueUrl?: string;
  continueCourseTitle?: string;
}

export function DashboardWelcome({
  userName,
  hasCourses,
  continueUrl,
  continueCourseTitle,
}: DashboardWelcomeProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#014a62] via-[#013c50] to-[#012c3b] text-white p-6 sm:p-8 shadow-sm border border-[#014a62]/40">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-primary/20 rounded-full blur-2xl pointer-events-none -mb-20" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-cyan-200 text-[10px] font-bold tracking-wider uppercase border border-white/15">
            <Sparkles className="h-3 w-3 text-cyan-300" />
            <span>Airbharath Learning Portal</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-outfit text-white">
            Welcome back, {userName}!
          </h1>

          <p className="text-cyan-100/90 text-xs sm:text-sm leading-relaxed max-w-xl">
            {hasCourses && continueCourseTitle
              ? `Ready to jump back into "${continueCourseTitle}"? Keep your momentum going.`
              : "Track your course progress, download QR-verifiable certificates, and accelerate your career in aviation and engineering."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {hasCourses && continueUrl ? (
            <>
              <Button
                asChild
                className="bg-white text-[#014a62] hover:bg-cyan-50 font-bold text-xs h-10 px-5 rounded-xl shadow-xs transition-all hover:scale-[1.02]"
              >
                <Link href={continueUrl} className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Resume Learning</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-semibold text-xs h-10 px-4 rounded-xl backdrop-blur-xs"
              >
                <Link href="/courses" className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Explore Catalog</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="bg-white text-[#014a62] hover:bg-cyan-50 font-bold text-xs h-10 px-5 rounded-xl shadow-xs transition-all hover:scale-[1.02]"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <span>Explore Course Catalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
