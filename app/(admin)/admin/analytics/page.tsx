import { db } from "@/lib/db";
import { modules, lessons, enrollments, progress, orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TrendingUp, Users as UsersIcon, LineChart, PieChart, ShoppingBag, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminAnalytics() {
  const [
    modulesList,
    lessonsList,
    enrollmentsList,
    progressList,
    ordersList,
    studentsList,
  ] = await Promise.all([
    db.query.modules.findMany(),
    db.query.lessons.findMany(),
    db.query.enrollments.findMany(),
    db.query.progress.findMany({ where: eq(progress.isCompleted, true) }),
    db.query.orders.findMany(),
    db.query.users.findMany({ where: eq(users.role, "student") }),
  ]);

  const totalStudents = studentsList.length;

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const paidOrders = ordersList.filter((o: any) => o.status === "paid");
  const revLast30 = paidOrders
    .filter((o: any) => o.createdAt && new Date(o.createdAt) >= thirtyDaysAgo)
    .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  const revPrev30 = paidOrders
    .filter((o: any) => {
      const date = o.createdAt ? new Date(o.createdAt) : null;
      return date && date >= sixtyDaysAgo && date < thirtyDaysAgo;
    })
    .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

  let growthRateText = "—";
  let growthRateSubtext = "vs preceding 30-day window";
  if (revPrev30 > 0) {
    const growthRate = ((revLast30 - revPrev30) / revPrev30) * 100;
    growthRateText = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;
  } else if (revLast30 > 0) {
    growthRateText = `+100%`;
    growthRateSubtext = "New revenue in current period";
  } else {
    growthRateText = "—";
    growthRateSubtext = "No revenue in comparison period";
  }

  const uniqueStudentsWithProgress = new Set(progressList.map((p: any) => p.userId));
  const activeLearnersCount = uniqueStudentsWithProgress.size;
  const retentionRate = totalStudents > 0 ? Number(((activeLearnersCount / totalStudents) * 100).toFixed(1)) : null;

  const totalOrdersCount = ordersList.length;
  const refundedOrdersCount = ordersList.filter((o: any) => o.status === "refunded").length;
  const refundRate = totalOrdersCount > 0 ? Number(((refundedOrdersCount / totalOrdersCount) * 100).toFixed(2)) : 0;

  // 14-day Daily Active Learners (DAL): deduplicated unique learners per calendar day
  const dalData: { label: string; count: number }[] = [];

  for (let i = 13; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayLabel = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const uniqueUsersThisDay = new Set(
      progressList
        .filter((p: any) => {
          const uDate = p.updatedAt ? new Date(p.updatedAt) : null;
          return uDate && uDate >= startOfDay && uDate <= endOfDay;
        })
        .map((p: any) => p.userId)
    );

    dalData.push({
      label: dayLabel,
      count: uniqueUsersThisDay.size,
    });
  }

  const maxDalCount = Math.max(...dalData.map((d) => d.count), 1);

  // Map modules and lessons to courses for accurate syllabus accounting
  const moduleToCourse: { [key: string]: string } = {};
  modulesList.forEach((m: any) => {
    moduleToCourse[m.id] = m.courseId;
  });

  const lessonToCourse: { [key: string]: string } = {};
  const courseLessonsCount: { [key: string]: number } = {};
  lessonsList.forEach((l: any) => {
    const cId = moduleToCourse[l.moduleId];
    if (cId) {
      lessonToCourse[l.id] = cId;
      courseLessonsCount[cId] = (courseLessonsCount[cId] || 0) + 1;
    }
  });

  // Calculate cohort completion per enrolled course seat
  let completedCount = 0;
  let activeCount = 0;
  let startedCount = 0;
  let notStartedCount = 0;

  enrollmentsList.forEach((e: any) => {
    const total = courseLessonsCount[e.courseId] || 0;
    if (total === 0) {
      notStartedCount++;
      return;
    }

    const completed = progressList.filter(
      (p: any) => p.userId === e.userId && lessonToCourse[p.lessonId] === e.courseId
    ).length;
    const percent = Math.min(100, Math.round((completed / total) * 100));

    if (percent === 100) {
      completedCount++;
    } else if (percent >= 25) {
      activeCount++;
    } else if (percent > 0) {
      startedCount++;
    } else {
      notStartedCount++;
    }
  });

  const totalEnrollmentsCount = enrollmentsList.length;
  const progressBreakdown = [
    {
      label: "Fully Completed (100%)",
      count: `${completedCount} ${completedCount === 1 ? "seat" : "seats"}`,
      percent: totalEnrollmentsCount > 0 ? Math.round((completedCount / totalEnrollmentsCount) * 100) : 0,
      color: "bg-primary",
    },
    {
      label: "Active Progression (25% - 99%)",
      count: `${activeCount} ${activeCount === 1 ? "seat" : "seats"}`,
      percent: totalEnrollmentsCount > 0 ? Math.round((activeCount / totalEnrollmentsCount) * 100) : 0,
      color: "bg-emerald-600",
    },
    {
      label: "Early Stage (1% - 24%)",
      count: `${startedCount} ${startedCount === 1 ? "seat" : "seats"}`,
      percent: totalEnrollmentsCount > 0 ? Math.round((startedCount / totalEnrollmentsCount) * 100) : 0,
      color: "bg-amber-500",
    },
    {
      label: "Not Yet Started (0%)",
      count: `${notStartedCount} ${notStartedCount === 1 ? "seat" : "seats"}`,
      percent: totalEnrollmentsCount > 0 ? Math.round((notStartedCount / totalEnrollmentsCount) * 100) : 0,
      color: "bg-muted-foreground/40",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Deep Cohort Analytics
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Review student cohort completion rates, daily active learners, and revenue growth.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Monthly Revenue Growth
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {growthRateText}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{growthRateSubtext}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Student Retention Rate
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <UsersIcon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {retentionRate !== null ? `${retentionRate.toFixed(1)}%` : "—"}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {totalStudents > 0
                ? `${activeLearnersCount} of ${totalStudents} students actively learning`
                : "No registered students yet"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Refund Request Rate
            </span>
            <div className="h-8 w-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {refundRate.toFixed(2)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {refundedOrdersCount} refund claims recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Daily Active Learners (DAL) */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" />
              <span>Daily Active Learners (Last 14 Days)</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unique students completing syllabus lessons daily
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="h-60 sm:h-64 flex items-end justify-between gap-1.5 sm:gap-2.5 border-b border-l border-border/60 pb-2 pl-2">
              {dalData.map((data, idx) => {
                const heightPercent = maxDalCount > 0 ? (data.count / maxDalCount) * 85 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer"
                  >
                    <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-bold">
                      {data.count} Active {data.count === 1 ? "Learner" : "Learners"}
                    </div>
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className="w-full bg-primary/80 group-hover:bg-primary rounded-t-sm transition-all duration-300"
                    />
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate w-full text-center">
                      {data.label.split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Course Progress Breakdown */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span>Cohort Progress Distribution</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completion distribution across all enrolled students
            </p>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            {progressBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{item.label}</span>
                  <span className="tabular-nums">
                    {item.percent}% <span className="text-muted-foreground">({item.count})</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
