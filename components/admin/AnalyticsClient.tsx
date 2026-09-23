"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ShoppingBag,
  CheckCircle2,
  Filter,
  Search,
  Eye,
  Compass,
  GraduationCap,
  Clock,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PostHogBehavioralMetrics } from "@/lib/posthog-query";

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
  certificate_status?: string;
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
  status?: string;
  issued_by?: string | null;
  issued_at: string;
}

export interface AnalyticsClientProps {
  initialOrders: AnalyticsOrder[];
  initialEnrollments: AnalyticsEnrollment[];
  initialProgress: AnalyticsProgress[];
  initialCourses: AnalyticsCourse[];
  initialUsers: AnalyticsUser[];
  initialCertificates: AnalyticsCertificate[];
  initialBehavioralMetrics: PostHogBehavioralMetrics;
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
  initialBehavioralMetrics,
  courseLessonCounts,
  enrollmentCompletions,
  lessonToCourse,
}: AnalyticsClientProps) {
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [behavioralMetrics, setBehavioralMetrics] = useState<PostHogBehavioralMetrics>(initialBehavioralMetrics);
  const [isBehavioralLoading, setIsBehavioralLoading] = useState<boolean>(false);
  const isInitialMount = React.useRef(true);

  // Fetch updated behavioral telemetry when date range changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    let isMounted = true;
    setIsBehavioralLoading(true);

    fetch(`/api/admin/analytics/behavioral?range=${dateRange}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.metrics) {
          setBehavioralMetrics(data.metrics);
        }
      })
      .catch((err) => {
        console.warn("[Admin Analytics] Failed to refresh behavioral metrics:", err);
      })
      .finally(() => {
        if (isMounted) setIsBehavioralLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange]);

  // Filter boundary calculation for PostgreSQL transactional records
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

  // Comprehensive Analytics Calculation
  const analytics = useMemo(() => {
    // 1. Orders and Revenue (PostgreSQL Source of Truth)
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

    const aov =
      periodPaidOrders.length > 0
        ? Math.round(periodRevenue / periodPaidOrders.length)
        : 0;

    // 2. Enrollments (PostgreSQL Source of Truth)
    const periodEnrollments = initialEnrollments.filter((e) => {
      if (dateRange === "all") return true;
      const d = new Date(e.enrolled_at);
      return d >= startDate;
    });

    // 3. Active Learners (Unique learners with progress in date window)
    const periodProgress = initialProgress.filter((p) => {
      if (dateRange === "all") return true;
      const d = new Date(p.updated_at);
      return d >= startDate;
    });
    const uniqueActiveLearners = new Set(periodProgress.map((p) => p.user_id));
    const activeLearnersCount = uniqueActiveLearners.size;

    // 4. Certificates Issued & Claimed (PostgreSQL Source of Truth)
    const periodCertificates = initialCertificates.filter((c) => {
      if (dateRange === "all") return true;
      const d = new Date(c.issued_at);
      return d >= startDate;
    });

    const claimedCertificatesCount = initialCertificates.filter((c) => !c.issued_by).length;
    const adminIssuedCertificatesCount = initialCertificates.filter((c) => !!c.issued_by).length;

    // 5. Total Registered Students (PostgreSQL Source of Truth)
    const studentUsers = initialUsers.filter((u) => u.role === "student");
    const totalStudents = studentUsers.length > 0 ? studentUsers.length : initialUsers.length;

    // 6. Audited Cohort Progress & Completion
    let completedSeats = 0;
    let activeSeats = 0;
    let startedSeats = 0;
    let notStartedSeats = 0;
    let totalSeatProgressPercent = 0;
    let pendingEligibleCount = 0;

    // Certificate lookup map for fast checking
    const certLookup = new Set(initialCertificates.map((c) => `${c.user_id}_${c.course_id}`));

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
        // Check if certificate exists for this completed enrollment
        if (!certLookup.has(`${e.user_id}_${e.course_id}`)) {
          pendingEligibleCount++;
        }
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

    // 7. Individual Course Performance Metrics
    const courseStats = initialCourses.map((course) => {
      const courseEnrollments = initialEnrollments.filter((e) => e.course_id === course.id);
      const enrolledCount = courseEnrollments.length;

      let courseCompletedProgress = 0;
      let learnersStarted = 0;
      let learnersCompleted100 = 0;

      courseEnrollments.forEach((e) => {
        const totalL = course.lesson_count;
        if (totalL === 0) return;

        const completedL = initialProgress.filter(
          (p) => p.user_id === e.user_id && lessonToCourse[p.lesson_id] === course.id && p.is_completed
        ).length;

        if (completedL > 0) learnersStarted++;
        const p = Math.min(100, Math.round((completedL / totalL) * 100));
        if (p === 100) learnersCompleted100++;
        courseCompletedProgress += p;
      });

      const avgCourseCompletion =
        enrolledCount > 0 ? Math.round(courseCompletedProgress / enrolledCount) : 0;

      const certsIssued = initialCertificates.filter((c) => c.course_id === course.id).length;

      const courseRevenue = paidOrders
        .filter((o) => o.course_id === course.id)
        .reduce((sum, o) => sum + Number(o.amount || 0), 0);

      // PostHog Views for this course
      const views =
        behavioralMetrics.courseViewsMap[course.id] ??
        behavioralMetrics.courseViewsMap[course.slug] ??
        null;

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        price: course.price,
        lessonCount: course.lesson_count,
        certificateStatus: course.certificate_status || "disabled",
        enrolledCount,
        learnersStarted,
        learnersCompleted100,
        avgCompletion: avgCourseCompletion,
        certificatesIssued: certsIssued,
        revenue: courseRevenue,
        views,
      };
    });

    // Neutral course rankings
    const highestCompletionCourses = [...courseStats]
      .filter((c) => c.enrolledCount > 0)
      .sort((a, b) => b.avgCompletion - a.avgCompletion)
      .slice(0, 3);

    const mostActiveCourses = [...courseStats]
      .filter((c) => c.enrolledCount > 0)
      .sort((a, b) => b.learnersStarted - a.learnersStarted)
      .slice(0, 3);

    const lowestCompletionCourses = [...courseStats]
      .filter((c) => c.enrolledCount > 0)
      .sort((a, b) => a.avgCompletion - b.avgCompletion)
      .slice(0, 3);

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

    // 10. Monthly Certificate Issuance Trend (Last 6 Months)
    const monthlyCertData: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString("en-US", { month: "short" });
      const monthYear = d.getFullYear();
      const monthIndex = d.getMonth();

      const monthCerts = initialCertificates.filter((c) => {
        const cDate = new Date(c.issued_at);
        return cDate.getFullYear() === monthYear && cDate.getMonth() === monthIndex;
      });

      monthlyCertData.push({
        month: monthLabel,
        count: monthCerts.length,
      });
    }
    const maxMonthCerts = Math.max(...monthlyCertData.map((m) => m.count), 1);

    // 11. Conversion Funnel Stages (7 Stages)
    // Stage 1: Course Viewed (PostHog)
    // Stage 2: Checkout Started (PostHog)
    // Stage 3: Payment Succeeded (PostgreSQL)
    // Stage 4: Enrollment Completed (PostgreSQL)
    // Stage 5: Lesson Started (PostHog)
    // Stage 6: Course Completed (PostgreSQL / PostHog)
    // Stage 7: Certificate Claimed (PostgreSQL / PostHog)
    const funnelSteps = [
      {
        id: "view",
        label: "Course Viewed",
        source: "PostHog",
        count: behavioralMetrics.courseViews,
        isBehavioral: true,
        icon: Eye,
      },
      {
        id: "checkout",
        label: "Checkout Started",
        source: "PostHog",
        count: behavioralMetrics.checkoutStarts,
        isBehavioral: true,
        icon: ShoppingBag,
      },
      {
        id: "payment",
        label: "Payment Succeeded",
        source: "PostgreSQL",
        count: periodPaidOrders.length,
        isBehavioral: false,
        icon: IndianRupee,
      },
      {
        id: "enrollment",
        label: "Enrollment Completed",
        source: "PostgreSQL",
        count: periodEnrollments.length,
        isBehavioral: false,
        icon: BookOpen,
      },
      {
        id: "lesson",
        label: "Lesson Started",
        source: "PostHog",
        count: behavioralMetrics.lessonStarts,
        isBehavioral: true,
        icon: Compass,
      },
      {
        id: "completion",
        label: "Course Completed",
        source: "PostgreSQL",
        count: completedSeats,
        isBehavioral: false,
        icon: CheckCircle2,
      },
      {
        id: "certificate",
        label: "Certificate Claimed",
        source: "PostgreSQL",
        count: claimedCertificatesCount,
        isBehavioral: false,
        icon: Award,
      },
    ];

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
      claimedCertificatesCount,
      adminIssuedCertificatesCount,
      pendingEligibleCount,
      completedSeats,
      cohortDistribution,
      totalSeats,
      courseStats,
      highestCompletionCourses,
      mostActiveCourses,
      lowestCompletionCourses,
      dalData,
      maxDalCount,
      monthlyRevenueData,
      maxMonthRev,
      monthlyCertData,
      maxMonthCerts,
      funnelSteps,
      recentPaidOrders: periodPaidOrders.slice(0, 5),
    };
  }, [
    initialOrders,
    initialEnrollments,
    initialProgress,
    initialCourses,
    initialUsers,
    initialCertificates,
    behavioralMetrics,
    courseLessonCounts,
    lessonToCourse,
    dateRange,
    startDate,
    prevStartDate,
    prevEndDate,
  ]);

  // Export Comprehensive CSV Report
  const handleExportCSV = useCallback(() => {
    const headers = [
      "Course Title",
      "Slug",
      "Price (INR)",
      "Lessons",
      "PostHog Views",
      "Enrolled Seats",
      "Learners Started",
      "Avg Completion (%)",
      "Certificates Issued",
      "Total Revenue (INR)",
    ];

    const rows = analytics.courseStats.map((c) => [
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.slug}"`,
      c.price,
      c.lessonCount,
      c.views !== null ? c.views : "N/A",
      c.enrolledCount,
      c.learnersStarted,
      `${c.avgCompletion}%`,
      c.certificatesIssued,
      c.revenue,
    ]);

    const summaryRow = [
      '"TOTAL / SUMMARY"',
      '""',
      '""',
      '""',
      behavioralMetrics.courseViews !== null ? behavioralMetrics.courseViews : "N/A",
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
  }, [analytics, behavioralMetrics, dateRange]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Date Range Selector Pills, PostHog Status & CSV Export */}
      <div className="bg-card border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 md:pb-0">
          {(
            [
              { key: "7d", label: "Last 7 Days" },
              { key: "30d", label: "Last 30 Days" },
              { key: "90d", label: "Last 90 Days" },
              { key: "all", label: "All Time" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDateRange(t.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                dateRange === t.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Indicators & CSV Export */}
        <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
          {/* PostHog Telemetry Status Badge */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border",
              behavioralMetrics.isAvailable
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted/60 text-muted-foreground border-border/70"
            )}
            title={
              behavioralMetrics.isAvailable
                ? "PostHog product telemetry active & connected"
                : behavioralMetrics.reason || "PostHog query API credentials not configured"
            }
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full inline-block shrink-0",
                behavioralMetrics.isAvailable
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground/40"
              )}
            />
            <span>
              {behavioralMetrics.isAvailable
                ? "PostHog Telemetry Active"
                : "Product Analytics Fallback"}
            </span>
          </div>

          {/* Export CSV Action */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="h-9 px-3.5 rounded-xl text-xs font-bold gap-2 border-border/80 hover:bg-muted/40 shadow-2xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW KPI ROW (6 Essential Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Platform Overview
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Authoritative DB & PostHog Telemetry
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
          {/* 1. Total Students (PostgreSQL) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Students
              </span>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <UsersIcon className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              {analytics.totalStudents}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block shrink-0" />
              Registered accounts
            </p>
          </Card>

          {/* 2. Active Students (PostgreSQL) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Active Learners
              </span>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Activity className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              {analytics.activeLearnersCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
              Active in window
            </p>
          </Card>

          {/* 3. Course Views (PostHog Behavioral) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Course Views
              </span>
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Eye className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              {behavioralMetrics.courseViews !== null ? behavioralMetrics.courseViews : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 inline-block shrink-0" />
              {behavioralMetrics.courseViews !== null
                ? "PostHog impressions"
                : "Product analytics unavailable"}
            </p>
          </Card>

          {/* 4. Enrollments (PostgreSQL) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Enrollments
              </span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              {analytics.periodEnrollmentsCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block shrink-0" />
              Course seats allocated
            </p>
          </Card>

          {/* 5. Revenue (PostgreSQL) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Revenue
              </span>
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IndianRupee className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              ₹{analytics.periodRevenue.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
              <ArrowUpRight className="h-3 w-3 shrink-0" />
              <span>{analytics.revGrowthText}</span>
            </div>
          </Card>

          {/* 6. Course Completion Rate (PostgreSQL) */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </span>
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-outfit mt-2">
              {analytics.platformAvgCompletion}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block shrink-0" />
              {analytics.completedSeats} seats fully complete
            </p>
          </Card>
        </div>
      </div>

      {/* SECTION 2: CONVERSION FUNNEL (7-Stage Visual Journey) */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <span>Full-Lifecycle Conversion Funnel</span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Audited transition from course discovery to qualification certification
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              <span>PostHog + PostgreSQL</span>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {analytics.funnelSteps.map((step, idx) => {
              const prevStep = idx > 0 ? analytics.funnelSteps[idx - 1] : null;
              const hasCount = step.count !== null && step.count !== undefined;
              const hasPrevCount = prevStep && prevStep.count !== null && prevStep.count !== undefined && prevStep.count > 0;
              
              const conversionRate = hasCount && hasPrevCount
                ? Math.min(100, Math.round(((step.count as number) / (prevStep.count as number)) * 100))
                : null;

              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "relative flex flex-col justify-between p-3.5 rounded-xl border transition-all",
                    hasCount
                      ? "bg-card border-border/70 hover:border-primary/40 hover:shadow-2xs"
                      : "bg-muted/20 border-dashed border-border/60"
                  )}
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                        Step {idx + 1}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] px-1.5 py-0 h-4 font-semibold",
                          step.source === "PostgreSQL"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                            : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                        )}
                      >
                        {step.source}
                      </Badge>
                    </div>

                    {/* Step Title & Icon */}
                    <div className="flex items-center gap-2 pt-1">
                      <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-xs font-bold text-foreground line-clamp-1">
                        {step.label}
                      </div>
                    </div>

                    {/* Count */}
                    <div className="text-lg sm:text-xl font-bold font-outfit text-foreground pt-1">
                      {hasCount ? step.count : "—"}
                    </div>
                  </div>

                  {/* Conversion from previous step */}
                  <div className="mt-3 pt-2.5 border-t border-border/50 text-[10px]">
                    {conversionRate !== null ? (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Conv. rate:</span>
                        <span className="font-bold text-foreground">{conversionRate}%</span>
                      </div>
                    ) : hasCount ? (
                      <span className="text-muted-foreground/70">Top of funnel</span>
                    ) : (
                      <span className="text-muted-foreground/60 italic">Telemetry pending</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 3: LEARNING ANALYTICS & NEUTRAL PERFORMANCE RANKINGS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span>Learning & Syllabus Progression Analytics</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Factual course milestones and syllabus progression across all learners
            </p>
          </div>
        </div>

        {/* Learning Telemetry KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Lesson Starts */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Lesson Starts
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-1.5">
              {behavioralMetrics.lessonStarts !== null ? behavioralMetrics.lessonStarts : "—"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {behavioralMetrics.lessonStarts !== null
                ? "Video & lesson stream initializations"
                : "Product analytics unavailable"}
            </p>
          </Card>

          {/* Lesson Completions */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Lesson Completions
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-1.5">
              {initialProgress.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Verified syllabus lesson completions
            </p>
          </Card>

          {/* Course Completions */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Course Completions (100%)
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-1.5">
              {analytics.completedSeats}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Enrolled students reaching 100%
            </p>
          </Card>

          {/* Platform Avg Course Progress */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Avg Course Progress
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-1.5">
              {analytics.platformAvgCompletion}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Mean progress across all seats
            </p>
          </Card>
        </div>

        {/* 3 Neutral Ranking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Highest Completion Rate */}
          <Card className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-foreground">
                Highest completion rate
              </span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Syllabus Rate
              </Badge>
            </div>
            {analytics.highestCompletionCourses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No enrolled courses yet</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.highestCompletionCourses.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {idx + 1}. {c.title}
                    </span>
                    <span className="font-bold text-primary tabular-nums shrink-0">
                      {c.avgCompletion}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Most Lesson Activity */}
          <Card className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-foreground">
                Most lesson activity
              </span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Active Learners
              </Badge>
            </div>
            {analytics.mostActiveCourses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No enrolled courses yet</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.mostActiveCourses.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {idx + 1}. {c.title}
                    </span>
                    <span className="font-bold text-emerald-600 tabular-nums shrink-0">
                      {c.learnersStarted} active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Lowest Completion Rate */}
          <Card className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <span className="text-xs font-bold text-foreground">
                Lowest completion rate
              </span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Needs Attention
              </Badge>
            </div>
            {analytics.lowestCompletionCourses.length === 0 ? (
              <p className="text-xs text-muted-foreground">No enrolled courses yet</p>
            ) : (
              <div className="space-y-2.5">
                {analytics.lowestCompletionCourses.map((c, idx) => (
                  <div key={c.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {idx + 1}. {c.title}
                    </span>
                    <span className="font-bold text-muted-foreground tabular-nums shrink-0">
                      {c.avgCompletion}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* SECTION 4: COURSE PERFORMANCE TABLE */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/60 bg-card flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Course Performance Breakdown</span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Database enrollments and syllabus progress correlated with PostHog behavioral views
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
                <tr className="bg-muted/30 border-b border-border/60 text-[10px] sm:text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                  <th className="px-5 py-3.5">Course</th>
                  <th className="px-4 py-3.5 text-center">Views (PostHog)</th>
                  <th className="px-4 py-3.5 text-center">Enrollments</th>
                  <th className="px-4 py-3.5 text-center">Active Learners</th>
                  <th className="px-4 py-3.5 text-center">Completion %</th>
                  <th className="px-4 py-3.5 text-center">Certificates Issued</th>
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

                      {/* Views (PostHog) */}
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {course.views !== null ? course.views : "—"}
                      </td>

                      {/* Enrollments (PostgreSQL) */}
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-foreground">
                        {course.enrolledCount}
                      </td>

                      {/* Active Learners (PostgreSQL) */}
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">
                        {course.learnersStarted}
                      </td>

                      {/* Completion Rate Progress */}
                      <td className="px-4 py-3.5 text-center">
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
                      <td className="px-4 py-3.5 text-center text-xs font-semibold text-amber-600">
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

      {/* SECTION 5: CERTIFICATE ANALYTICS & LIFECYCLE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <span>Certificate Lifecycle & Claim Metrics</span>
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Audited credential issuance and student claim analytics from PostgreSQL
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Total Issued */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Certificates Issued
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-1.5">
              {analytics.totalCertificatesCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Registered credentials in database
            </p>
          </Card>

          {/* Claimed by Students */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Claimed by Students
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-emerald-600 mt-1.5">
              {analytics.claimedCertificatesCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Self-service qualification claims
            </p>
          </Card>

          {/* Issued by Admin */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Issued by Admin
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-blue-600 mt-1.5">
              {analytics.adminIssuedCertificatesCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Direct administrative grants
            </p>
          </Card>

          {/* Pending Eligible Students */}
          <Card className="rounded-2xl border-border/80 p-4 shadow-2xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Eligible Students
            </span>
            <div className="text-lg sm:text-xl font-bold font-outfit text-amber-600 mt-1.5">
              {analytics.pendingEligibleCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              100% completed, awaiting claim/issue
            </p>
          </Card>
        </div>
      </div>

      {/* SECTION 6: ENGAGEMENT INSIGHTS */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-5 border-b border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span>Student Engagement Telemetry</span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Lightweight product interaction events captured via PostHog
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold uppercase">
            Behavioral Telemetry
          </Badge>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Feed Item Opens */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Feed Item Opens
              </span>
              <div className="text-lg font-bold font-outfit text-foreground">
                {behavioralMetrics.feedItemOpens !== null ? behavioralMetrics.feedItemOpens : "—"}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Community post clicks & views
              </p>
            </div>

            {/* Job Opens */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Job Opportunity Opens
              </span>
              <div className="text-lg font-bold font-outfit text-foreground">
                {behavioralMetrics.jobOpens !== null ? behavioralMetrics.jobOpens : "—"}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Aviation job listing expansions
              </p>
            </div>

            {/* Course Searches */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Catalog Searches
              </span>
              <div className="text-lg font-bold font-outfit text-foreground">
                {behavioralMetrics.courseSearches !== null ? behavioralMetrics.courseSearches : "—"}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Course keyword searches
              </p>
            </div>

            {/* Course Filter Uses */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                Filter Toggles
              </span>
              <div className="text-lg font-bold font-outfit text-foreground">
                {behavioralMetrics.courseFilterUses !== null ? behavioralMetrics.courseFilterUses : "—"}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Price and category filter clicks
              </p>
            </div>
          </div>

          {!behavioralMetrics.isAvailable && (
            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2.5 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 text-muted-foreground/70 shrink-0" />
              <span>
                Client-side PostHog event capture is actively tracking live user interactions. Privileged query credentials can be added to environment variables to render aggregated metrics directly.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION 7: VISUAL CHARTS GRID (Revenue & Daily Active Learners) */}
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
                      <div
                        className={cn(
                          "absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-semibold",
                          idx >= analytics.monthlyRevenueData.length - 2
                            ? "right-0"
                            : idx <= 1
                            ? "left-0"
                            : "left-1/2 -translate-x-1/2"
                        )}
                      >
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
                    <div
                      className={cn(
                        "absolute bottom-full mb-2 bg-foreground text-background text-[10px] p-2 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-semibold",
                        idx >= analytics.dalData.length - 2
                          ? "right-0"
                          : idx <= 1
                          ? "left-0"
                          : "left-1/2 -translate-x-1/2"
                      )}
                    >
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

      {/* SECTION 8: COHORT PROGRESS DISTRIBUTION & RECENT TRANSACTIONS */}
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
                Recent successful tuition settlements from Razorpay
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
