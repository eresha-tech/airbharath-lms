import Link from "next/link";
import { BookOpen, Play, RefreshCw, AlertTriangle, CheckCircle2, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EnrolledCourseItem {
  id: string;
  title: string;
  slug?: string | null;
  thumbnailUrl?: string | null;
  isExpired: boolean;
  expiresAt?: string | Date | null;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  resumeLessonId: string;
}

interface EnrolledCourseCardProps {
  course: EnrolledCourseItem;
}

export function EnrolledCourseCard({ course }: EnrolledCourseCardProps) {
  const isCompleted = course.percent === 100;

  return (
    <div
      className={cn(
        "bg-card border rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between transition-all duration-200 hover:shadow-md",
        course.isExpired
          ? "border-destructive/30 bg-destructive/5"
          : "border-border/80 hover:border-border"
      )}
    >
      <div>
        {/* Course Thumbnail */}
        <div className="aspect-video relative overflow-hidden bg-muted group">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
              <BookOpen className="h-10 w-10 opacity-50" />
            </div>
          )}

          {/* Expired Overlay */}
          {course.isExpired && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4">
              <AlertTriangle className="w-7 h-7 text-amber-500 mb-1" />
              <span className="font-bold text-xs text-foreground">Access Expired</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Renew access to resume lessons
              </span>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-2.5 right-2.5">
            {course.isExpired ? (
              <Badge variant="destructive" className="text-[10px] uppercase font-bold shadow-xs">
                Expired
              </Badge>
            ) : isCompleted ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] uppercase font-bold flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completed</span>
              </Badge>
            ) : (
              <Badge className="bg-primary hover:bg-primary text-primary-foreground text-[10px] uppercase font-bold shadow-xs">
                Active Track
              </Badge>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground font-outfit line-clamp-1">
              {course.title}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {course.expiresAt
                ? `Valid until: ${new Date(course.expiresAt).toLocaleDateString()}`
                : "Lifetime Access"}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">
                {course.completedLessons}/{course.totalLessons} Lessons
              </span>
              <span className="font-bold text-foreground">{course.percent}%</span>
            </div>
            <Progress value={course.percent} className="h-1.5 rounded-full" />
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 pt-0 border-t border-border/50 mt-1">
        {course.isExpired ? (
          <Button
            asChild
            variant="destructive"
            className="w-full text-xs font-bold h-9 rounded-xl shadow-xs mt-3"
          >
            <Link href={`/courses/${course.slug || course.id}`}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              <span>Renew Access</span>
            </Link>
          </Button>
        ) : isCompleted ? (
          <Button
            asChild
            variant="outline"
            className="w-full text-xs font-bold h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10 mt-3"
          >
            <Link href={`/dashboard/courses/${course.id}`}>
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              <span>Review Course</span>
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            className="w-full text-xs font-bold h-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-3"
          >
            <Link
              href={`/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`}
            >
              <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
              <span>{course.completedLessons > 0 ? "Resume Lesson" : "Start Course"}</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
