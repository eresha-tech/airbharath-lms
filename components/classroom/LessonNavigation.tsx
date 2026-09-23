import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Radio, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLessonAvailability, formatCompactIST } from "@/lib/lesson-availability";

export interface LessonNavTarget {
  id: string;
  title: string;
  moduleTitle?: string;
  deliveryType?: string | null;
  scheduledAt?: string | Date | null;
  releaseAt?: string | Date | null;
}

interface LessonNavigationProps {
  courseId: string;
  previousLesson: LessonNavTarget | null;
  nextLesson: LessonNavTarget | null;
  isCompleted?: boolean;
}

export function LessonNavigation({
  courseId,
  previousLesson,
  nextLesson,
}: LessonNavigationProps) {
  const nextAvailability = nextLesson ? getLessonAvailability(nextLesson) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-border/60 font-sans">
      {/* Previous Lesson Card / Button */}
      {previousLesson ? (
        <Button
          asChild
          variant="outline"
          className="h-auto min-h-[76px] p-4 flex flex-col items-start justify-center text-left border-border/80 hover:border-primary/40 hover:bg-muted/40 rounded-2xl group transition-all cursor-pointer"
        >
          <Link href={`/dashboard/courses/${courseId}/lessons/${previousLesson.id}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Previous Lesson</span>
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground mt-1 line-clamp-2">
              {previousLesson.title}
            </span>
          </Link>
        </Button>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Next Lesson Card / Button */}
      {nextLesson && nextAvailability ? (
        nextAvailability.isLocked ? (
          /* Next Lesson is Scheduled Recorded (Locked) */
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-[76px] p-4 flex flex-col items-end justify-center text-right border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50 rounded-2xl group transition-all sm:col-start-2 cursor-pointer"
          >
            <Link href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <Lock className="h-3.5 w-3.5" />
                <span>Next (Upcoming Lecture)</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-foreground mt-1 line-clamp-2">
                {nextLesson.title}
              </span>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-0.5 font-semibold">
                Releases {formatCompactIST(nextAvailability.releaseAt!)}
              </span>
            </Link>
          </Button>
        ) : nextAvailability.state === "live" ? (
          /* Next Lesson is Live Broadcast */
          <Button
            asChild
            variant="outline"
            className="h-auto min-h-[76px] p-4 flex flex-col items-end justify-center text-right border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/50 rounded-2xl group transition-all sm:col-start-2 cursor-pointer"
          >
            <Link href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                <span>Next Live Session</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-foreground mt-1 line-clamp-2">
                {nextLesson.title}
              </span>
              {nextLesson.scheduledAt && (
                <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-semibold">
                  {formatCompactIST(nextLesson.scheduledAt)}
                </span>
              )}
            </Link>
          </Button>
        ) : (
          /* Next Lesson is Available Now */
          <Button
            asChild
            className="h-auto min-h-[76px] p-4 flex flex-col items-end justify-center text-right bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl group shadow-xs transition-all sm:col-start-2 cursor-pointer"
          >
            <Link href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground/80">
                <span>Next Lesson</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-primary-foreground mt-1 line-clamp-2">
                {nextLesson.title}
              </span>
            </Link>
          </Button>
        )
      ) : (
        <div className="min-h-[76px] p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300 sm:col-start-2">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>You have completed all curriculum lessons!</span>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 px-3 text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 rounded-xl shrink-0 cursor-pointer"
          >
            <Link href="/dashboard/certificates">
              <span>Certificate Center</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

