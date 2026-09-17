import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LessonNavTarget {
  id: string;
  title: string;
  moduleTitle?: string;
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
  isCompleted,
}: LessonNavigationProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-border/60">
      {/* Previous Lesson Card / Button */}
      {previousLesson ? (
        <Button
          asChild
          variant="outline"
          className="h-auto p-4 flex flex-col items-start text-left border-border/80 hover:border-primary/40 hover:bg-muted/40 rounded-2xl group transition-all"
        >
          <Link href={`/dashboard/courses/${courseId}/lessons/${previousLesson.id}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              <span>Previous Lesson</span>
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground mt-1 line-clamp-1">
              {previousLesson.title}
            </span>
          </Link>
        </Button>
      ) : (
        <div className="hidden sm:block" />
      )}

      {/* Next Lesson Card / Button */}
      {nextLesson ? (
        <Button
          asChild
          className="h-auto p-4 flex flex-col items-end text-right bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl group shadow-sm transition-all sm:col-start-2"
        >
          <Link href={`/dashboard/courses/${courseId}/lessons/${nextLesson.id}`}>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-foreground/80">
              <span>Next Lesson</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-primary-foreground mt-1 line-clamp-1">
              {nextLesson.title}
            </span>
          </Link>
        </Button>
      ) : (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 sm:col-start-2">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>You have reached the end of this course!</span>
          </div>
          <Button asChild size="sm" variant="outline" className="h-7 text-xs font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10">
            <Link href="/dashboard/certificates">
              <span>View Certificate</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
