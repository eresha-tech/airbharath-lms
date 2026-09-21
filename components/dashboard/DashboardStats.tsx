import { BookOpen, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardStatsProps {
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  completedLessonsCount: number;
  totalLessonsCount?: number;
  averageProgress: number;
  certificatesCount: number;
}

export function DashboardStats({
  enrolledCount,
  activeCount,
  completedCount,
  completedLessonsCount,
  totalLessonsCount = 0,
  averageProgress,
  certificatesCount,
}: DashboardStatsProps) {
  const stats = [
    {
      title: "Enrolled Courses",
      value: enrolledCount,
      subtitle:
        enrolledCount > 0
          ? `${activeCount} active ${activeCount === 1 ? "track" : "tracks"}`
          : "No active enrollments",
      icon: BookOpen,
      iconColor: "bg-primary/10 text-primary",
    },
    {
      title: "Lessons Completed",
      value: completedLessonsCount,
      subtitle:
        totalLessonsCount > 0
          ? `of ${totalLessonsCount} syllabus lessons`
          : completedCount > 0
          ? `${completedCount} completed tracks`
          : "Start your first module",
      icon: CheckCircle2,
      iconColor: "bg-emerald-500/10 text-emerald-600",
    },
    {
      title: "Average Progress",
      value: `${averageProgress}%`,
      subtitle:
        enrolledCount > 0
          ? "Across all enrolled tracks"
          : "Begin lessons to track",
      icon: TrendingUp,
      iconColor: "bg-blue-500/10 text-blue-600",
    },
    {
      title: "Certificates",
      value: certificatesCount,
      subtitle:
        certificatesCount > 0
          ? `${certificatesCount} verified ${certificatesCount === 1 ? "credential" : "credentials"}`
          : "Finish 100% to earn",
      icon: Award,
      iconColor: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card
            key={idx}
            className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow bg-card"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
                {stat.title}
              </span>
              <div
                className={cn(
                  "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                  stat.iconColor
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
              {stat.value}
            </div>

            <p className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
              {stat.subtitle}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
