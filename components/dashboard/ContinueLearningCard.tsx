import Link from "next/link";
import { Play, BookOpen, Clock, ChevronRight, Sparkles, Layers } from "lucide-react";
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
  const isCompleted = course.percent === 100;

  return (
    <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      {/* Top Tag & Progress Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">
            Primary Learning Focus
          </h2>
        </div>

        <Badge
          variant="secondary"
          className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
        >
          {course.percent}% Completed
        </Badge>
      </div>

      {/* Main Body */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-6">
        {/* Course Thumbnail */}
        <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-muted relative shrink-0 border border-border/80 shadow-2xs group">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="h-10 w-10 opacity-70" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-2.5 left-3 right-3 flex justify-between items-center text-[11px] text-white font-semibold">
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-cyan-300" />
              <span>{course.completedLessons} of {course.totalLessons} Lessons</span>
            </span>
          </div>
        </div>

        {/* Course Details & Direct Action */}
        <div className="flex-1 space-y-3.5 w-full min-w-0">
          <div>
            <h3 className="font-bold text-lg sm:text-xl text-foreground font-outfit line-clamp-1">
              {course.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
              {course.resumeLessonTitle ? (
                <>
                  <span className="font-semibold text-primary shrink-0">Up Next:</span>
                  <span className="truncate text-foreground font-medium">{course.resumeLessonTitle}</span>
                </>
              ) : (
                <span>
                  {course.totalLessons - course.completedLessons} lesson
                  {course.totalLessons - course.completedLessons !== 1 ? "s" : ""} remaining
                </span>
              )}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground font-semibold">
              <span>Syllabus Completion</span>
              <span className="text-foreground font-bold">{course.percent}%</span>
            </div>
            <Progress value={course.percent} className="h-2 rounded-full" />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-5 rounded-xl shadow-xs cursor-pointer"
            >
              <Link
                href={`/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`}
                className="flex items-center gap-2"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{course.completedLessons > 0 ? "Resume Next Lesson" : "Start Lesson 1"}</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="text-muted-foreground hover:text-foreground text-xs font-semibold h-10 px-4 rounded-xl border-border/80 hover:bg-muted"
            >
              <Link
                href={`/dashboard/courses/${course.id}`}
                className="flex items-center gap-1"
              >
                <span>View Full Curriculum</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
