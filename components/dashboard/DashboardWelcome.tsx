import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Play, Compass, ArrowRight, Sparkles, CheckCircle2, Award, BookOpen } from "lucide-react";

interface DashboardWelcomeProps {
  userName: string;
  hasCourses: boolean;
  allCompleted?: boolean;
  continueUrl?: string;
  continueCourseTitle?: string;
  continueLessonTitle?: string;
}

export function DashboardWelcome({
  userName,
  hasCourses,
  allCompleted = false,
  continueUrl,
  continueCourseTitle,
  continueLessonTitle,
}: DashboardWelcomeProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#014a62] via-[#013c50] to-[#002836] text-white p-6 sm:p-8 lg:p-9 shadow-md border border-[#014a62]/60">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-teal-500/10 rounded-full blur-2xl pointer-events-none -mb-24" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          {/* Context Badge */}
          {hasCourses && continueUrl && !allCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-200 text-[10px] font-bold tracking-wider uppercase border border-white/15 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Continue Learning</span>
            </div>
          ) : allCompleted ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold tracking-wider uppercase border border-emerald-400/30 backdrop-blur-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-300" />
              <span>All Tracks Completed</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-200 text-[10px] font-bold tracking-wider uppercase border border-white/15 backdrop-blur-xs">
              <Sparkles className="h-3 w-3 text-cyan-300" />
              <span>Aviation &amp; Technical Skills</span>
            </div>
          )}

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-outfit text-white">
            Welcome back, {userName}!
          </h1>

          {/* Contextual Description */}
          <p className="text-cyan-100/90 text-xs sm:text-sm leading-relaxed max-w-xl">
            {hasCourses && continueCourseTitle && !allCompleted ? (
              <>
                Pick up where you left off in <strong className="text-white font-semibold">{continueCourseTitle}</strong>.
                {continueLessonTitle && (
                  <span className="block text-cyan-200/80 text-xs mt-1">
                    Next up: {continueLessonTitle}
                  </span>
                )}
              </>
            ) : allCompleted ? (
              "Congratulations on completing all your enrolled courses! Review your curriculum, verify certificates, or explore new tracks."
            ) : (
              "Access self-paced certificate courses in AI skills, marketing, entrepreneurship, and office productivity taught by aviation and IIM practitioners."
            )}
          </p>
        </div>

        {/* Dynamic CTAs */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {hasCourses && continueUrl && !allCompleted ? (
            <>
              <Button
                asChild
                className="bg-white text-[#014a62] hover:bg-cyan-50 font-bold text-xs h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Link href={continueUrl} className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Resume Lesson</span>
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
          ) : allCompleted ? (
            <>
              <Button
                asChild
                className="bg-white text-[#014a62] hover:bg-cyan-50 font-bold text-xs h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.02]"
              >
                <Link href="/dashboard/certificates" className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5" />
                  <span>View Certificates</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/30 text-white bg-white/10 hover:bg-white/20 font-semibold text-xs h-10 px-4 rounded-xl backdrop-blur-xs"
              >
                <Link href="/courses" className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Explore More Courses</span>
                </Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              className="bg-white text-[#014a62] hover:bg-cyan-50 font-bold text-xs h-10 px-5 rounded-xl shadow-md transition-all hover:scale-[1.02]"
            >
              <Link href="/courses" className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5" />
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
