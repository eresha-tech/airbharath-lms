"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Download,
  Wallet,
  ChevronDown,
  Users,
  BookOpen,
  MessageSquare,
  Tag,
  PlusCircle,
  GraduationCap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Layers,
  Sparkles,
  PieChart,
  Activity,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface FormattedOrder {
  id: string;
  user_id: string;
  course_id: string;
  amount: string | number;
  status: string;
  created_at: string;
  users: {
    full_name?: string | null;
    email?: string | null;
  };
  courses: {
    title?: string | null;
    slug?: string | null;
  };
}

export interface FormattedUser {
  id: string;
  full_name?: string | null;
  email: string;
  role: string;
  created_at: string;
}

export interface FormattedEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

export interface FormattedProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id?: string | null;
  is_completed: boolean;
  updated_at: string;
}

export interface FormattedCourse {
  id: string;
  title: string;
  slug: string;
  price: number;
  is_published: boolean;
  lesson_count: number;
}

export interface AdminDashboardClientProps {
  initialUsers: FormattedUser[];
  initialEnrollments: FormattedEnrollment[];
  initialOrders: FormattedOrder[];
  initialProgress?: FormattedProgress[];
  initialCourses?: FormattedCourse[];
  courseLessonCounts?: Record<string, number>;
  enrollmentCompletions?: Record<string, number>;
  lessonToCourse?: Record<string, string>;
}

export default function AdminDashboardClient({
  initialUsers = [],
  initialEnrollments = [],
  initialOrders = [],
  initialProgress = [],
  initialCourses = [],
  courseLessonCounts = {},
  enrollmentCompletions = {},
  lessonToCourse = {},
}: AdminDashboardClientProps) {
  const [selectedRange, setSelectedRange] = useState<"30days" | "6months" | "12months" | "alltime">("6months");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredDal, setHoveredDal] = useState<number | null>(null);

  // Normalize parsed orders
  const parsedOrders = useMemo(() => {
    return initialOrders.map((order) => ({
      ...order,
      createdAtDate: new Date(order.created_at),
      amountNum: Number(order.amount) || 0,
    }));
  }, [initialOrders]);

  // Normalize parsed enrollments
  const parsedEnrollments = useMemo(() => {
    return initialEnrollments.map((enroll) => ({
      ...enroll,
      enrolledAtDate: new Date(enroll.enrolled_at),
    }));
  }, [initialEnrollments]);

  // Date thresholds for range filter
  const dateThreshold = useMemo(() => {
    const now = new Date();
    if (selectedRange === "30days") {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (selectedRange === "6months") {
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    } else if (selectedRange === "12months") {
      return new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
    }
    return new Date(0); // All time
  }, [selectedRange]);

  // Filtered orders and enrollments based on selected range
  const filteredOrders = useMemo(() => {
    if (selectedRange === "alltime") return parsedOrders;
    return parsedOrders.filter((o) => o.createdAtDate >= dateThreshold);
  }, [parsedOrders, dateThreshold, selectedRange]);

  const filteredEnrollments = useMemo(() => {
    if (selectedRange === "alltime") return parsedEnrollments;
    return parsedEnrollments.filter((e) => e.enrolledAtDate >= dateThreshold);
  }, [parsedEnrollments, dateThreshold, selectedRange]);

  // --- KPI CALCULATIONS ---
  // 1. Total Revenue in selected window
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.amountNum, 0);
  }, [filteredOrders]);

  // 2. Active Students count
  const activeStudentsCount = useMemo(() => {
    const studentUsers = initialUsers.filter((u) => u.role === "student");
    if (selectedRange === "alltime") return studentUsers.length;
    return studentUsers.filter((u) => new Date(u.created_at) >= dateThreshold).length;
  }, [initialUsers, dateThreshold, selectedRange]);

  // 3. Paid Orders count
  const paidOrdersCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "paid").length;
  }, [filteredOrders]);

  // 4. Mathematically Audited 30-Day Revenue Growth (Phase 6.2 semantics)
  const growthMetrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);

    const paidAll = parsedOrders.filter((o) => o.status === "paid");
    const revLast30 = paidAll
      .filter((o) => o.createdAtDate >= thirtyDaysAgo)
      .reduce((sum, o) => sum + o.amountNum, 0);

    const revPrev30 = paidAll
      .filter((o) => o.createdAtDate >= sixtyDaysAgo && o.createdAtDate < thirtyDaysAgo)
      .reduce((sum, o) => sum + o.amountNum, 0);

    let growthText = "—";
    let growthSubtext = "vs preceding 30 days";
    let isPositive = true;

    if (revPrev30 > 0) {
      const growthRate = ((revLast30 - revPrev30) / revPrev30) * 100;
      growthText = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;
      isPositive = growthRate >= 0;
    } else if (revLast30 > 0) {
      growthText = "+100%";
      growthSubtext = "New revenue in current period";
      isPositive = true;
    } else {
      growthText = "—";
      growthSubtext = "No revenue in comparison period";
      isPositive = true;
    }

    return { growthText, growthSubtext, isPositive, revLast30, revPrev30 };
  }, [parsedOrders]);

  // 5. Completion Rate (Syllabus Completion Index based on actual completed lessons / enrolled course seats)
  const completionRate = useMemo(() => {
    if (!filteredEnrollments.length || !courseLessonCounts) return null;

    let totalExpectedLessons = 0;
    let totalCompletedLessons = 0;

    filteredEnrollments.forEach((e) => {
      const expected = courseLessonCounts[e.course_id] || 0;
      const completed = enrollmentCompletions[`${e.user_id}_${e.course_id}`] || 0;
      totalExpectedLessons += expected;
      totalCompletedLessons += Math.min(completed, expected);
    });

    if (totalExpectedLessons === 0) return null;
    const rate = (totalCompletedLessons / totalExpectedLessons) * 100;
    return Number(rate.toFixed(1));
  }, [filteredEnrollments, courseLessonCounts, enrollmentCompletions]);

  // 6. Active Learner Engagement (Deduplicated active students who have completed lessons / total students)
  const engagementMetrics = useMemo(() => {
    const studentUsers = initialUsers.filter((u) => u.role === "student");
    const totalStudents = studentUsers.length;

    const uniqueActiveStudentIds = new Set(initialProgress.map((p) => p.user_id));
    const activeLearnersCount = uniqueActiveStudentIds.size;

    const engagementRate =
      totalStudents > 0 ? Number(((activeLearnersCount / totalStudents) * 100).toFixed(1)) : null;

    return { totalStudents, activeLearnersCount, engagementRate };
  }, [initialUsers, initialProgress]);

  // 7. 14-Day Daily Active Learners (DAL): Deduplicated unique learners per calendar day
  const dalData = useMemo(() => {
    const now = new Date();
    const list: { label: string; fullDate: string; count: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayLabel = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const fullDate = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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

      list.push({
        label: dayLabel,
        fullDate,
        count: uniqueUsersThisDay.size,
      });
    }

    return list;
  }, [initialProgress]);

  const maxDalCount = useMemo(() => {
    return Math.max(...dalData.map((d) => d.count), 1);
  }, [dalData]);

  // 8. Cohort Progress Breakdown (Seat-Based across all enrollments)
  const cohortBreakdown = useMemo(() => {
    let completedCount = 0;
    let activeCount = 0;
    let startedCount = 0;
    let notStartedCount = 0;

    filteredEnrollments.forEach((e) => {
      const totalLessons = courseLessonCounts[e.course_id] || 0;
      if (totalLessons === 0) {
        notStartedCount++;
        return;
      }

      const completedLessons = enrollmentCompletions[`${e.user_id}_${e.course_id}`] || 0;
      const percent = Math.min(100, Math.round((completedLessons / totalLessons) * 100));

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

    const totalSeats = filteredEnrollments.length;

    return [
      {
        label: "Fully Completed (100%)",
        count: `${completedCount} ${completedCount === 1 ? "seat" : "seats"}`,
        percent: totalSeats > 0 ? Math.round((completedCount / totalSeats) * 100) : 0,
        color: "bg-primary",
      },
      {
        label: "Active Progression (25% – 99%)",
        count: `${activeCount} ${activeCount === 1 ? "seat" : "seats"}`,
        percent: totalSeats > 0 ? Math.round((activeCount / totalSeats) * 100) : 0,
        color: "bg-emerald-600",
      },
      {
        label: "Early Stage (1% – 24%)",
        count: `${startedCount} ${startedCount === 1 ? "seat" : "seats"}`,
        percent: totalSeats > 0 ? Math.round((startedCount / totalSeats) * 100) : 0,
        color: "bg-amber-500",
      },
      {
        label: "Not Yet Started (0%)",
        count: `${notStartedCount} ${notStartedCount === 1 ? "seat" : "seats"}`,
        percent: totalSeats > 0 ? Math.round((notStartedCount / totalSeats) * 100) : 0,
        color: "bg-muted-foreground/30",
      },
    ];
  }, [filteredEnrollments, courseLessonCounts, enrollmentCompletions]);

  // 9. Revenue & Enrollment Trend Chart (Month-anchored bucketing)
  const chartData = useMemo(() => {
    const now = new Date();
    const dataMap: { [key: string]: { label: string; count: number; revenue: number } } = {};

    if (selectedRange === "30days") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dataMap[key] = { label: key, count: 0, revenue: 0 };
      }

      filteredEnrollments.forEach((e) => {
        const key = e.enrolledAtDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dataMap[key]) dataMap[key].count += 1;
      });

      filteredOrders.forEach((o) => {
        if (o.status === "paid") {
          const key = o.createdAtDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          if (dataMap[key]) dataMap[key].revenue += o.amountNum;
        }
      });
    } else {
      const monthLimit = selectedRange === "6months" ? 6 : selectedRange === "12months" ? 12 : 12;
      for (let i = monthLimit - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        dataMap[key] = { label: d.toLocaleDateString("en-US", { month: "short" }), count: 0, revenue: 0 };
      }

      filteredEnrollments.forEach((e) => {
        const key = e.enrolledAtDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (dataMap[key]) dataMap[key].count += 1;
      });

      filteredOrders.forEach((o) => {
        if (o.status === "paid") {
          const key = o.createdAtDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
          if (dataMap[key]) dataMap[key].revenue += o.amountNum;
        }
      });
    }

    return Object.values(dataMap);
  }, [selectedRange, filteredEnrollments, filteredOrders]);

  const maxVal = useMemo(() => {
    const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 100);
    const maxEnrollments = Math.max(...chartData.map((d) => d.count), 1);
    return { maxRevenue, maxEnrollments };
  }, [chartData]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const csvRows = [
      ["Order ID", "Student Name", "Student Email", "Course Title", "Amount (INR)", "Status", "Date Created"],
    ];

    filteredOrders.forEach((order) => {
      csvRows.push([
        order.id,
        order.users?.full_name || "N/A",
        order.users?.email || "N/A",
        order.courses?.title || "N/A",
        order.amountNum.toString(),
        order.status,
        order.createdAtDate.toLocaleDateString(),
      ]);
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      csvRows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `airbharath_analytics_${selectedRange}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRangeLabel = () => {
    switch (selectedRange) {
      case "30days":
        return "Last 30 Days";
      case "6months":
        return "Last 6 Months";
      case "12months":
        return "Last 12 Months";
      case "alltime":
        return "All Time";
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AirBharath Command Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Executive Overview
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Live platform revenue intake, student enrollment velocity, syllabus completion metrics, and operational health.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          {/* Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3.5 py-2.5 border border-border/80 rounded-xl bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
            >
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>{getRangeLabel()}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 mt-2 w-44 bg-card border border-border/80 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-border/50">
                  {[
                    { val: "30days", label: "Last 30 Days" },
                    { val: "6months", label: "Last 6 Months" },
                    { val: "12months", label: "Last 12 Months" },
                    { val: "alltime", label: "All Time" },
                  ].map((option) => (
                    <button
                      key={option.val}
                      type="button"
                      onClick={() => {
                        setSelectedRange(option.val as any);
                        setShowDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2.5 text-xs font-medium hover:bg-muted/60 transition-colors cursor-pointer",
                        selectedRange === option.val
                          ? "text-primary font-bold bg-primary/5"
                          : "text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export CSV Button */}
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 font-bold h-10 px-4 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Row (4 primary metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Revenue */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {growthMetrics.growthText !== "—" ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full",
                    growthMetrics.isPositive
                      ? "text-emerald-700 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-rose-700 bg-rose-500/10 border border-rose-500/20"
                  )}
                >
                  {growthMetrics.isPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {growthMetrics.growthText}
                </span>
              ) : (
                <span className="text-muted-foreground font-semibold">—</span>
              )}
              <span className="text-muted-foreground truncate">{growthMetrics.growthSubtext}</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Active Students */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Students
            </span>
            <div className="h-9 w-9 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {activeStudentsCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-cyan-700 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                Registered
              </span>
              <span>Enrolled learner accounts</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Completion Rate */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {completionRate !== null ? `${completionRate}%` : "—"}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="text-muted-foreground">
                {completionRate !== null
                  ? "Syllabus lesson progress index"
                  : "No completions recorded yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Paid Orders */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Paid Orders
            </span>
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {paidOrdersCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Verified
              </span>
              <span>Transactions in period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row: Trend Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left 8 Cols: Performance & Enrollment Trend Chart */}
        <Card className="lg:col-span-8 rounded-3xl border border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <span>Revenue &amp; Enrollment Trend</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualizing verified tuition receipts and student enrollments
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span>Revenue (₹)</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm bg-cyan-500" />
                  <span>Enrollments</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Interactive Chart Container */}
            <div className="relative h-64 sm:h-72 flex items-end justify-between gap-1 sm:gap-2.5 border-b border-l border-border/60 pb-3 pl-3">
              {/* Y Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-3 pl-3">
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
              </div>

              {chartData.map((data, idx) => {
                const revPercent =
                  maxVal.maxRevenue > 0 ? (data.revenue / maxVal.maxRevenue) * 85 : 0;
                const countPercent =
                  maxVal.maxEnrollments > 0 ? (data.count / maxVal.maxEnrollments) * 85 : 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on hover */}
                    {hoveredBar === idx && (
                      <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[10px] font-semibold p-2.5 rounded-xl shadow-xl z-30 flex flex-col gap-1 min-w-[140px] border border-slate-800 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-slate-400 border-b border-slate-800 pb-0.5">{data.label}</p>
                        <p className="text-slate-200">
                          Revenue:{" "}
                          <span className="text-cyan-300 font-bold">
                            ₹{data.revenue.toLocaleString("en-IN")}
                          </span>
                        </p>
                        <p className="text-slate-200">
                          Enrollments:{" "}
                          <span className="text-emerald-400 font-bold">{data.count}</span>
                        </p>
                      </div>
                    )}

                    {/* Dual Bars */}
                    <div className="flex w-full items-end gap-1 h-[85%] justify-center">
                      <div
                        style={{ height: `${Math.max(revPercent, 3)}%` }}
                        className="w-2.5 sm:w-4 bg-primary/80 group-hover:bg-primary rounded-t-sm transition-all duration-300"
                        title={`Revenue: ₹${data.revenue}`}
                      />
                      <div
                        style={{ height: `${Math.max(countPercent, 3)}%` }}
                        className="w-2.5 sm:w-4 bg-cyan-500/80 group-hover:bg-cyan-500 rounded-t-sm transition-all duration-300"
                        title={`Enrollments: ${data.count}`}
                      />
                    </div>

                    <span className="text-[9px] font-semibold text-muted-foreground mt-2 truncate w-full text-center">
                      {data.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right 4 Cols: Administrative Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span>Admin Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-2 gap-2.5">
              <Link
                href="/admin/courses/new"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <PlusCircle className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">New Course</span>
                <span className="text-[10px] text-muted-foreground font-normal">Publish curriculum</span>
              </Link>

              <Link
                href="/admin/students"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <Users className="h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">Students</span>
                <span className="text-[10px] text-muted-foreground font-normal">Manage rosters</span>
              </Link>

              <Link
                href="/admin/doubts"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <MessageSquare className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">QA Doubts</span>
                <span className="text-[10px] text-muted-foreground font-normal">Moderate inquiries</span>
              </Link>

              <Link
                href="/admin/coupons"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <Tag className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">Coupons</span>
                <span className="text-[10px] text-muted-foreground font-normal">Discounts &amp; codes</span>
              </Link>

              <Link
                href="/admin/jobs"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <Briefcase className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">Job Board</span>
                <span className="text-[10px] text-muted-foreground font-normal">Post openings</span>
              </Link>

              <Link
                href="/admin/orders"
                className="flex flex-col gap-1 p-3 rounded-2xl border border-border/70 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 text-xs font-semibold text-foreground transition-all group"
              >
                <ShoppingBag className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span className="truncate font-bold">All Orders</span>
                <span className="text-[10px] text-muted-foreground font-normal">Payment ledger</span>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Learning Performance & Cohort Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        {/* Left 6 Cols: Active Learner Engagement & Daily Active Learners (DAL) */}
        <Card className="lg:col-span-6 rounded-3xl border border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Active Learner Engagement</span>
              </CardTitle>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold">
                {engagementMetrics.engagementRate !== null
                  ? `${engagementMetrics.engagementRate}% Active`
                  : "—"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {engagementMetrics.totalStudents > 0
                ? `${engagementMetrics.activeLearnersCount} of ${engagementMetrics.totalStudents} students actively completing curriculum modules`
                : "No registered students yet"}
            </p>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Daily Active Learners (Last 14 Days)
              </span>
              <p className="text-[11px] text-muted-foreground">
                Unique students completing lesson activities per calendar day
              </p>
            </div>

            {/* 14-day DAL mini bar chart */}
            <div className="h-44 sm:h-48 flex items-end justify-between gap-1.5 border-b border-l border-border/60 pb-2 pl-2">
              {dalData.map((data, idx) => {
                const heightPercent = maxDalCount > 0 ? (data.count / maxDalCount) * 80 : 0;
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                    onMouseEnter={() => setHoveredDal(idx)}
                    onMouseLeave={() => setHoveredDal(null)}
                  >
                    {hoveredDal === idx && (
                      <div className="absolute bottom-full mb-1.5 bg-slate-950 text-white text-[10px] p-2 rounded-xl shadow-xl z-20 whitespace-nowrap font-bold pointer-events-none">
                        <span>{data.fullDate}: </span>
                        <span className="text-cyan-300">
                          {data.count} {data.count === 1 ? "Learner" : "Learners"}
                        </span>
                      </div>
                    )}
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className="w-full bg-primary/80 group-hover:bg-primary rounded-t-sm transition-all duration-300"
                    />
                    <span className="text-[8px] sm:text-[9px] text-muted-foreground font-semibold truncate w-full text-center mt-1">
                      {data.label.split(" ")[1]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Right 6 Cols: Cohort Progress Distribution (Seat-Based) */}
        <Card className="lg:col-span-6 rounded-3xl border border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span>Cohort Progress Distribution</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Completion distribution calculated across all enrolled course seats
            </p>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {cohortBreakdown.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-foreground">
                  <span>{item.label}</span>
                  <span className="tabular-nums font-bold">
                    {item.percent}% <span className="text-muted-foreground font-normal">({item.count})</span>
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
      </div>

      {/* Recent Transactions Table / Stream */}
      <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
          <div>
            <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Recent Transactions &amp; Orders</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time payment logs and student enrollment transactions
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs font-bold border-border">
            <Link href="/admin/orders">View All Orders</Link>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {filteredOrders && filteredOrders.length > 0 ? (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border/60">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Student</th>
                    <th className="py-3 px-4">Enrolled Course</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 sm:px-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.slice(0, 5).map((order) => {
                    const studentName = order.users?.full_name || order.users?.email || "Student";
                    const studentEmail = order.users?.email || "—";
                    const courseTitle = order.courses?.title || "Course Enrollment";
                    const formattedDate = new Date(order.created_at).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6">
                          <div className="font-bold text-foreground truncate max-w-[180px]">
                            {studentName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                            {studentEmail}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-foreground truncate block max-w-[220px]">
                            {courseTitle}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          ₹{order.amountNum.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                              order.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                : order.status === "pending"
                                ? "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                            )}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right text-muted-foreground">
                          {formattedDate}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-10 text-muted-foreground text-xs font-medium space-y-1">
                <p className="font-semibold text-foreground">No transactions recorded yet.</p>
                <p className="text-[11px]">Real payment orders will appear here once students enroll.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
