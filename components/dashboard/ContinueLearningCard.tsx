import Link from "next/link";
import { Play, BookOpen, Clock, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ContinueLearningCardProps {
  course: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    percent: number;
    completedLessons: number;
    totalLessons: number;
    resumeLessonId: string;
    resumeLessonTitle?: string;
  };
}

export function ContinueLearningCard({ course }: ContinueLearningCardProps) {
  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Continue Learning
          </h2>
        </div>
        <Badge variant="secondary" className="text-[11px] font-semibold">
          {course.percent}% Complete
        </Badge>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
        {/* Course Thumbnail */}
        <div className="w-full md:w-56 aspect-video rounded-xl overflow-hidden bg-muted relative shrink-0 border border-border/60">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
              <BookOpen className="h-8 w-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center text-[10px] text-white font-semibold">
            <span>{course.completedLessons}/{course.totalLessons} Lessons</span>
          </div>
        </div>

        {/* Content Info & Actions */}
        <div className="flex-1 space-y-3 w-full">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-foreground font-outfit line-clamp-1">
              {course.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
              {course.resumeLessonTitle ? (
                <>
                  <span className="font-medium text-foreground/80">Next:</span>
                  <span className="truncate">{course.resumeLessonTitle}</span>
                </>
              ) : (
                <span>{course.totalLessons - course.completedLessons} lesson{course.totalLessons - course.completedLessons !== 1 ? 's' : ''} remaining</span>
              )}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>Overall Progress</span>
              <span className="text-foreground font-semibold">{course.percent}%</span>
            </div>
            <Progress value={course.percent} className="h-2" />
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
            >
              <Link
                href={`/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`}
                className="flex items-center gap-1.5"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume Lesson</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              className="text-muted-foreground hover:text-foreground text-xs h-9 px-3 rounded-xl"
            >
              <Link
                href={`/dashboard/courses/${course.id}`}
                className="flex items-center gap-1"
              >
                <span>View Course Syllabus</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
