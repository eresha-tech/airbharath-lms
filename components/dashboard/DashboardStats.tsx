import { StatsCard } from "@/components/dashboard/stats-card";
import { BookOpen, CheckCircle2, TrendingUp, Award } from "lucide-react";

interface DashboardStatsProps {
  enrolledCount: number;
  activeCount: number;
  completedCount: number;
  completedLessonsCount: number;
  averageProgress: number;
  certificatesCount: number;
}

export function DashboardStats({
  enrolledCount,
  activeCount,
  completedCount,
  completedLessonsCount,
  averageProgress,
  certificatesCount,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <StatsCard
        title="Enrolled Courses"
        value={enrolledCount}
        description={
          enrolledCount > 0
            ? `${activeCount} active ${activeCount === 1 ? "track" : "tracks"}`
            : "No active enrollments"
        }
        icon={BookOpen}
      />

      <StatsCard
        title="Completed Tracks"
        value={completedCount}
        description={
          completedLessonsCount > 0
            ? `${completedLessonsCount} lessons completed`
            : "Begin your first lesson"
        }
        icon={CheckCircle2}
      />

      <StatsCard
        title="Average Progress"
        value={`${averageProgress}%`}
        description={
          enrolledCount > 0
            ? "Across all enrolled courses"
            : "Start learning to track"
        }
        icon={TrendingUp}
      />

      <StatsCard
        title="Certificates"
        value={certificatesCount}
        description={
          certificatesCount > 0
            ? "Verified credentials issued"
            : "Finish 100% to earn"
        }
        icon={Award}
      />
    </div>
  );
}
