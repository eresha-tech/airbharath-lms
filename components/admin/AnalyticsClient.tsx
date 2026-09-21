"use client";

import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Users as UsersIcon,
  BookOpen,
  Award,
  IndianRupee,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface AnalyticsOrder {
  id: string;
  user_id: string;
  course_id: string | null;
  amount: number | string;
  status: string;
  razorpay_order_id?: string | null;
  created_at: string;
  users?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  courses?: {
    title?: string | null;
    slug?: string | null;
  } | null;
}

export interface AnalyticsEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface AnalyticsProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id?: string | null;
  is_completed: boolean;
  updated_at: string;
}

export interface AnalyticsCourse {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  lesson_count: number;
}

export interface AnalyticsUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

export interface AnalyticsCertificate {
  id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string;
}

interface AnalyticsClientProps {
  initialOrders: AnalyticsOrder[];
  initialEnrollments: AnalyticsEnrollment[];
  initialProgress: AnalyticsProgress[];
  initialCourses: AnalyticsCourse[];
  initialUsers: AnalyticsUser[];
  initialCertificates: AnalyticsCertificate[];
  courseLessonCounts: Record<string, number>;
  enrollmentCompletions: Record<string, number>;
  lessonToCourse: Record<string, string>;
}

type DateRangeKey = "7d" | "30d" | "90d" | "1y" | "all";

export default function AnalyticsClient({
  initialOrders,
  initialEnrollments,
  initialProgress,
  initialCourses,
  initialUsers,
  initialCertificates,
  courseLessonCounts,
  enrollmentCompletions,
  lessonToCourse,
}: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");

  // Filter boundary calculation
  const { startDate, prevStartDate, prevEndDate } = useMemo(() => {
    const now = new Date();
    let days = 30;
    if (dateRange === "7d") days = 7;
    else if (dateRange === "30d") days = 30;
    else if (dateRange === "90d") days = 90;
    else if (dateRange === "1y") days = 365;
    else if (dateRange === "all") days = 3650;

    const start = new Date(now);
    start.setDate(now.getDate() - days);

    const prevStart = new Date(start);
    prevStart.setDate(start.getDate() - days);

    const prevEnd = new Date(start);

    return {
      startDate: start,
      prevStartDate: prevStart,
      prevEndDate: prevEnd,
    };
  }, [dateRange]);

  // Real data calculations
  const analytics = useMemo(() => {
    // 1. Orders and Revenue
    const paidOrders = initialOrders.filter((o) => o.status === "paid");
    const periodPaidOrders = paidOrders.filter((o) => {
      if (dateRange === "all") return true;
      const d = new Date(o.created_at);
      return d >= startDate;
    });

    const periodRevenue = periodPaidOrders.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0
    );

    const prevPeriodPaidOrders = paidOrders.filter((o) => {
      if (dateRange === "all") return false;
      const d = new Date(o.created_at);
      return d >= prevStartDate && d < prevEndDate;
    });

    const prevPeriodRevenue = prevPeriodPaidOrders.reduce(
      (sum, o) => sum + Number(o.amount || 0),
      0
    );

    // Revenue Growth Text & Subtext (matching established standard)
    let revGrowthText = "—";
    let revGrowthSubtext = "vs preceding window";
    if (prevPeriodRevenue > 0) {
      const g = ((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100;
      revGrowthText = g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`;
    } else if (periodRevenue > 0) {
      revGrowthText = "+100%";
      revGrowthSubtext = "New revenue in current period";
    } else {
      revGrowthText = "—";
      revGrowthSubtext = "No revenue in comparison period";
    }

    // Average Order Value (AOV)
    const aov =
      periodPaidOrders.length > 0
        ? Math.round(periodRevenue / periodPaidOrders.length)
        : 0;

    // 2. Enrollments
    const periodEnrollments = initialEnrollments.filter((e) => {
      if (dateRange === "all") return true;
      const d = new Date(e.enrolled_at);
      return d >= startDate;
    });

    // 3. Active Learners (unique students with progress activity)
    const periodProgress = initialProgress.filter((p) => {
      if (dateRange === "all") return true;
      const d = new Date(p.updated_at);
      return d >= startDate;
    });
    const uniqueActiveLearners = new Set(periodProgress.map((p) => p.user_id));
    const activeLearnersCount = uniqueActiveLearners.size;

    // 4. Certificates Issued
    const periodCertificates = initialCertificates.filter((c) => {
      if (dateRange === "all") return true;
      const d = new Date(c.issued_at);
      return d >= startDate;
    });

    // 5. Total Registered Students
    const studentUsers = initialUsers.filter((u) => u.role === "student");
    const totalStudents = studentUsers.length;

    // 6. Audited Cohort Completion per enrolled seat
    let completedSeats = 0;
    let activeSeats = 0;
    let startedSeats = 0;
    let notStartedSeats = 0;
    let totalSeatProgressPercent = 0;

    initialEnrollments.forEach((e) => {
      const totalLessons = courseLessonCounts[e.course_id] || 0;
      if (totalLessons === 0) {
        notStartedSeats++;
        return;
      }

      const completedLessons = initialProgress.filter(
        (p) => p.user_id === e.user_id && lessonToCourse[p.lesson_id] === e.course_id && p.is_completed
      ).length;

      const percent = Math.min(100, Math.round((completedLessons / totalLessons) * 100));
      totalSeatProgressPercent += percent;

      if (percent === 100) {
        completedSeats++;
      } else if (percent >= 25) {
        activeSeats++;
      } else if (percent > 0) {
        startedSeats++;
      } else {
        notStartedSeats++;
      }
    });

    const totalSeats = initialEnrollments.length;
    const platformAvgCompletion =
      totalSeats > 0 ? Math.round(totalSeatProgressPercent / totalSeats) : 0;

    const cohortDistribution = [
      {
        label: "Fully Completed (100%)",
        count: completedSeats,
        percent: totalSeats > 0 ? Math.round((completedSeats / totalSeats) * 100) : 0,
        color: "bg-primary",
      },
      {
        label: "Active Progression (25% - 99%)",
        count: activeSeats,
        percent: totalSeats > 0 ? Math.round((activeSeats / totalSeats) * 100) : 0,
        color: "bg-emerald-600",
      },
      {
        label: "Early Stage (1% - 24%)",
        count: startedSeats,
        percent: totalSeats > 0 ? Math.round((startedSeats / totalSeats) * 100) : 0,
        color: "bg-amber-500",
      },
      {
        label: "Not Yet Started (0%)",
        count: notStartedSeats,
        percent: totalSeats > 0 ? Math.round((notStartedSeats / totalSeats) * 100) : 0,
        color: "bg-muted-foreground/30",
      },
    ];

    // 7. Course Performance Breakdown
    const courseStats = initialCourses.map((course) => {
      const courseEnrollments = initialEnrollments.filter((e) => e.course_id === course.id);
      const enrolledCount = courseEnrollments.length;

      let courseCompletedProgress = 0;
      let learnersStarted = 0;

      courseEnrollments.forEach((e) => {
        const totalL = course.lesson_count;
        if (totalL === 0) return;

        const completedL = initialProgress.filter(
          (p) => p.user_id === e.user_id && lessonToCourse[p.lesson_id] === course.id && p.is_completed
        ).length;

        if (completedL > 0) learnersStarted++;
        courseCompletedProgress += Math.min(100, Math.round((completedL / totalL) * 100));
      });

      const avgCourseCompletion =
        enrolledCount > 0 ? Math.round(courseCompletedProgress / enrolledCount) : 0;

      const certsIssued = initialCertificates.filter((c) => c.course_id === course.id).length;

      const courseRevenue = paidOrders
        .filter((o) => o.course_id === course.id)
        .reduce((sum, o) => sum + Number(o.amount || 0), 0);

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        price: course.price,
        lessonCount: course.lesson_count,
        enrolledCount,
        learnersStarted,
        avgCompletion: avgCourseCompletion,
        certificatesIssued: certsIssued,
        revenue: courseRevenue,
      };
    });

    // 8. 14-day Daily Active Learners (DAL) Activity Histogram
    const now = new Date();
    const dalData: { label: string; fullDate: string; count: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayLabel = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDate = targetDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const uniqueUsersThisDay = new Set(
        initialProgress
          .filter((p) => {
            const uDate = new Date(p.updated_at);
            return uDate >= startOfDay && uDate <= endOfDay;
          })
          .map((p) => p.user_id)
      );

      dalData.push({
        label: dayLabel,
        fullDate,
        count: uniqueUsersThisDay.size,
      });
    }
    const maxDalCount = Math.max(...dalData.map((d) => d.count), 1);

    // 9. Monthly Revenue Trend (Last 6 Months)
    const monthlyRevenueData: { month: string; revenue: number; orderCount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("en-US", { month: "short" });
      const monthYear = d.getFullYear();
      const monthIndex = d.getMonth();

      const monthOrders = paidOrders.filter((o) => {
        const orderDate = new Date(o.created_at);
        return orderDate.getFullYear() === monthYear && orderDate.getMonth() === monthIndex;
      });

      const monthRev = monthOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
      monthlyRevenueData.push({
        month: monthLabel,
        revenue: monthRev,
        orderCount: monthOrders.length,
      });
    }
    const maxMonthRev = Math.max(...monthlyRevenueData.map((m) => m.revenue), 1000);

    return {
      periodRevenue,
      prevPeriodRevenue,
      revGrowthText,
      revGrowthSubtext,
      aov,
      periodPaidOrdersCount: periodPaidOrders.length,
      periodEnrollmentsCount: periodEnrollments.length,
      activeLearnersCount,
      totalStudents,
      platformAvgCompletion,
      periodCertificatesCount: periodCertificates.length,
      totalCertificatesCount: initialCertificates.length,
      cohortDistribution,
      totalSeats,
      courseStats,
      dalData,
      maxDalCount,
      monthlyRevenueData,
      maxMonthRev,
      recentPaidOrders: periodPaidOrders.slice(0, 5),
    };
  }, [
    initialOrders,
    initialEnrollments,
    initialProgress,
    initialCourses,
    initialUsers,
    initialCertificates,
    courseLessonCounts,
    lessonToCourse,
    dateRange,
    startDate,
    prevStartDate,
    prevEndDate,
  ]);

  // Export CSV Report Handler
  const handleExportCSV = () => {
    const headers = [
      "Course Title",
      "Enrollments",
      "Learners Started",
      "Avg Completion (%)",
      "Certificates Issued",
      "Total Revenue (INR)",
    ];

    const rows = analytics.courseStats.map((c) => [
      `"${c.title.replace(/"/g, '""')}"`,
      c.enrolledCount,
      c.learnersStarted,
      `${c.avgCompletion}%`,
      c.certificatesIssued,
      c.revenue,
    ]);

    const summaryRow = [
      '"TOTAL / SUMMARY"',
      analytics.periodEnrollmentsCount,
      analytics.activeLearnersCount,
      `${analytics.platformAvgCompletion}%`,
      analytics.periodCertificatesCount,
      analytics.periodRevenue,
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(",")), summaryRow.join(",")].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `airbharath_analytics_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Date Range Selector & Export Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-card rounded-2xl border border-border/80 shadow-2xs">
        {/* Filter Period Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
              { key: "90d", label: "Last 90 Days" },
              { key: "1y", label: "This Year" },
              { key: "all", label: "All Time" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDateRange(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                dateRange === t.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Export CSV Action */}
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="h-9 px-3.5 rounded-xl text-xs font-bold gap-2 border-border/80 hover:bg-muted/40 shadow-2xs self-end sm:self-auto shrink-0"
        >
          <Download className="h-3.5 w-3.5 text-primary" />
          <span>Export CSV Report</span>
        </Button>
      </div>

      {/* 5 Real KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Revenue */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            ₹{analytics.periodRevenue.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            <span>{analytics.revGrowthText}</span>
          </div>
        </Card>

        {/* Enrollments */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Enrollments
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {analytics.periodEnrollmentsCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block shrink-0" />
            Course seats allocated
          </p>
        </Card>

        {/* Active Learners */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Learners
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <UsersIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {analytics.activeLearnersCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
            {analytics.totalStudents} total registered
          </p>
        </Card>

        {/* Completion Rate */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Avg Completion
            </span>
            <div className="h-8 w-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {analytics.platformAvgCompletion}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block shrink-0" />
            Syllabus lesson progress
          </p>
        </Card>

        {/* Certificates */}
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Certificates
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {analytics.periodCertificatesCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
            {analytics.totalCertificatesCount} total credentials
          </p>
        </Card>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Monthly Revenue & Orders Visualization */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="py-4 px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Tuition Revenue Intake (6 Months)</span>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Verified Razorpay transactions settled to Airbharath
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Average Order
              </span>
              <div className="text-xs font-bold text-foreground font-outfit">
                ₹{analytics.aov.toLocaleString("en-IN")}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-5">
            {analytics.monthlyRevenueData.every((m) => m.revenue === 0) ? (
              <div className="h-52 flex flex-col items-center justify-center text-muted-foreground text-xs">
                <ShoppingBag className="h-8 w-8 mb-2 text-muted-foreground/30" />
                <p className="font-semibold text-foreground">No paid orders in this timeframe</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Revenue will reflect automatically upon student checkout.
                </p>
              </div>
            ) : (
              <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 border-b border-l border-border/60 pb-2 pl-2">
                {analytics.monthlyRevenueData.map((item, idx) => {
                  const heightPercent =
                    analytics.maxMonthRev > 0 ? (item.revenue / analytics.maxMonthRev) * 85 : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group relative cursor-pointer"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-semibold">
                        <div className="font-bold">₹{item.revenue.toLocaleString("en-IN")}</div>
                        <div className="text-background/80">
                          {item.orderCount} {item.orderCount === 1 ? "paid order" : "paid orders"}
                        </div>
                      </div>

                      {/* Bar */}
                      <div
                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        className="w-full bg-primary/80 group-hover:bg-primary rounded-t-md transition-all duration-300"
                      />

                      {/* Month Label */}
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Active Learners (DAL) 14-Day Activity Histogram */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="py-4 px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                <span>Daily Active Learners (Last 14 Days)</span>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Deduplicated unique students completing syllabus lessons daily
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold uppercase">
              Real Activity
            </Badge>
          </CardHeader>

          <CardContent className="pt-6 pb-5">
            <div className="h-52 flex items-end justify-between gap-1 sm:gap-2 border-b border-l border-border/60 pb-2 pl-2">
              {analytics.dalData.map((item, idx) => {
                const heightPercent =
                  analytics.maxDalCount > 0 ? (item.count / analytics.maxDalCount) * 85 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1.5 group relative cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-semibold">
                      <div className="font-bold">{item.fullDate}</div>
                      <div>
                        {item.count} Active {item.count === 1 ? "Learner" : "Learners"}
                      </div>
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-300",
                        item.count > 0 ? "bg-emerald-600 group-hover:bg-emerald-500" : "bg-muted/60"
                      )}
                    />

                    {/* Date Label */}
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate w-full text-center">
                      {item.label.split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Performance Breakdown Table */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/60 bg-card flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Course Syllabus & Cohort Performance</span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Audited seat completion and enrollment metrics by individual course
            </p>
          </div>
          <Badge variant="secondary" className="text-[11px] font-bold">
            {analytics.courseStats.length} Courses
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  <th className="px-5 py-3.5">Course Program</th>
                  <th className="px-5 py-3.5 text-center">Lessons</th>
                  <th className="px-5 py-3.5 text-center">Enrolled Seats</th>
                  <th className="px-5 py-3.5 text-center">Started</th>
                  <th className="px-5 py-3.5 text-center">Avg Completion</th>
                  <th className="px-5 py-3.5 text-center">Certificates</th>
                  <th className="px-5 py-3.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {analytics.courseStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      No published courses found in the database.
                    </td>
                  </tr>
                ) : (
                  analytics.courseStats.map((course) => (
                    <tr key={course.id} className="hover:bg-muted/20 transition-colors">
                      {/* Course Title */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="font-bold text-xs sm:text-sm text-foreground">
                          {course.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          ₹{course.price.toLocaleString("en-IN")} • /{course.slug}
                        </div>
                      </td>

                      {/* Lessons Count */}
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-foreground">
                        {course.lessonCount}
                      </td>

                      {/* Enrolled Seats */}
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-foreground">
                        {course.enrolledCount}
                      </td>

                      {/* Learners Started */}
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-muted-foreground">
                        {course.learnersStarted}
                      </td>

                      {/* Completion Rate Progress */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${course.avgCompletion}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-foreground tabular-nums">
                            {course.avgCompletion}%
                          </span>
                        </div>
                      </td>

                      {/* Certificates Issued */}
                      <td className="px-5 py-3.5 text-center text-xs font-semibold text-amber-600">
                        {course.certificatesIssued}
                      </td>

                      {/* Revenue */}
                      <td className="px-5 py-3.5 text-right text-xs font-bold text-foreground whitespace-nowrap">
                        ₹{course.revenue.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cohort Progress Distribution & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Cohort Progress Distribution */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="py-4 px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                <span>Audited Cohort Progress Distribution</span>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Distribution across all {analytics.totalSeats} enrolled learner seats
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-bold uppercase">
              Seat Audit
            </Badge>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {analytics.cohortDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{item.label}</span>
                  <span className="tabular-nums font-bold">
                    {item.percent}%{" "}
                    <span className="text-muted-foreground font-normal">
                      ({item.count} {item.count === 1 ? "seat" : "seats"})
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Verified Transactions Ledger */}
        <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden flex flex-col">
          <CardHeader className="py-4 px-5 border-b border-border/60 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Verified Transaction Receipts</span>
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Recent successful tuition settlements
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              {analytics.periodPaidOrdersCount} Paid Orders
            </Badge>
          </CardHeader>

          <CardContent className="p-0 flex-1">
            {analytics.recentPaidOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No paid orders recorded in this selected period.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {analytics.recentPaidOrders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-xs text-foreground truncate">
                        {order.users?.full_name || "Enrolled Student"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {order.courses?.title || "Combo Pass / Masterclass"}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-foreground font-outfit">
                        ₹{Number(order.amount).toLocaleString("en-IN")}
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold uppercase py-0 h-4 mt-1">
                        Settled
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
