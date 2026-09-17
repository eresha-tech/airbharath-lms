"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminDashboardClientProps {
  initialUsers: any[];
  initialEnrollments: any[];
  initialOrders: any[];
  courseLessonCounts?: Record<string, number>;
  enrollmentCompletions?: Record<string, number>;
}

export default function AdminDashboardClient({
  initialUsers = [],
  initialEnrollments = [],
  initialOrders = [],
  courseLessonCounts = {},
  enrollmentCompletions = {},
}: AdminDashboardClientProps) {
  const [selectedRange, setSelectedRange] = useState<"30days" | "6months" | "12months" | "alltime">("6months");
  const [showDropdown, setShowDropdown] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Parse dates correctly
  const parsedOrders = useMemo(() => {
    return initialOrders.map((order) => {
      const userObj = Array.isArray(order.users) ? order.users[0] : order.users;
      const courseObj = Array.isArray(order.courses) ? order.courses[0] : order.courses;
      return {
        ...order,
        usersNormalized: userObj,
        coursesNormalized: courseObj,
        createdAtDate: new Date(order.created_at),
        amountNum: Number(order.amount) || 0,
      };
    });
  }, [initialOrders]);

  const parsedEnrollments = useMemo(() => {
    return initialEnrollments.map((enroll) => ({
      ...enroll,
      enrolledAtDate: new Date(enroll.enrolled_at),
    }));
  }, [initialEnrollments]);

  // Date thresholds
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

  // Filtered lists
  const filteredOrders = useMemo(() => {
    if (selectedRange === "alltime") return parsedOrders;
    return parsedOrders.filter((o) => o.createdAtDate >= dateThreshold);
  }, [parsedOrders, dateThreshold, selectedRange]);

  const filteredEnrollments = useMemo(() => {
    if (selectedRange === "alltime") return parsedEnrollments;
    return parsedEnrollments.filter((e) => e.enrolledAtDate >= dateThreshold);
  }, [parsedEnrollments, dateThreshold, selectedRange]);

  // KPI calculations
  const totalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.amountNum, 0);
  }, [filteredOrders]);

  const activeStudentsCount = useMemo(() => {
    const studentUsers = initialUsers.filter((u) => u.role === "student");
    if (selectedRange === "alltime") return studentUsers.length;
    return studentUsers.filter((u) => new Date(u.created_at) >= dateThreshold).length;
  }, [initialUsers, dateThreshold, selectedRange]);

  const monthlySalesCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === "paid").length;
  }, [filteredOrders]);

  // Dynamic completion rate: mathematically accounts for actual lesson counts in each enrolled course
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

  // Generate chart data based on range
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

  // Export CSV Action
  const handleExport = () => {
    const csvRows = [
      ["Order ID", "Student Name", "Student Email", "Course Title", "Amount (INR)", "Status", "Date Created"],
    ];

    filteredOrders.forEach((order) => {
      csvRows.push([
        order.id,
        order.usersNormalized?.full_name || "N/A",
        order.usersNormalized?.email || "N/A",
        order.coursesNormalized?.title || "N/A",
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
    <div className="space-y-8 animate-fade-in">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
            Executive Overview
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Monitor real revenue growth, student enrollments, and operational health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 border border-border/80 rounded-xl bg-card text-xs font-semibold hover:bg-muted/50 transition-colors shadow-2xs"
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
                      onClick={() => {
                        setSelectedRange(option.val as any);
                        setShowDropdown(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-2 text-xs font-medium hover:bg-muted/50 transition-colors",
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

          {/* Export CSV */}
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="text-xs font-semibold gap-1.5 rounded-xl border-border/80 hover:bg-muted/50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Revenue */}
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                Verified
              </span>
              <span className="text-[11px] text-muted-foreground">Paid transactions</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Students */}
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Students
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {activeStudentsCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                <ArrowUpRight className="h-3 w-3" />
                Active
              </span>
              <span className="text-[11px] text-muted-foreground">Registered learners</span>
            </div>
          </CardContent>
        </Card>

        {/* Syllabus Completion */}
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {completionRate !== null ? `${completionRate}%` : "—"}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-muted-foreground">
                {completionRate !== null ? "Course progress index" : "No completions recorded yet"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Sales Count */}
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Paid Orders
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {monthlySalesCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[11px] text-muted-foreground">In selected period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Trend Chart + Recent Orders & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left 2 Cols: Trend Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-border/80 shadow-2xs flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground">
                  Performance & Enrollment Trend
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualizing student enrollments and revenue intake
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  <span>Revenue (₹)</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm bg-accent" />
                  <span>Enrollments</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {/* Interactive Chart Container */}
            <div className="relative h-64 sm:h-72 flex items-end justify-between gap-1 sm:gap-2 border-b border-l border-border/60 pb-2 pl-2">
              {/* Y Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2 pl-2">
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
                <div className="w-full border-t border-border/20" />
              </div>

              {chartData.map((data, idx) => {
                const revPercent =
                  maxVal.maxRevenue > 0 ? (data.revenue / maxVal.maxRevenue) * 100 : 0;
                const countPercent =
                  maxVal.maxEnrollments > 0 ? (data.count / maxVal.maxEnrollments) * 100 : 0;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on hover */}
                    {hoveredBar === idx && (
                      <div className="absolute bottom-full mb-2 bg-foreground text-background text-[10px] font-semibold p-2.5 rounded-xl shadow-xl z-30 flex flex-col gap-1 min-w-[130px] border border-border/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                        <p className="text-muted-foreground border-b border-muted/20 pb-0.5">{data.label}</p>
                        <p className="text-white">
                          Revenue:{" "}
                          <span className="text-primary font-bold">
                            ₹{data.revenue.toLocaleString("en-IN")}
                          </span>
                        </p>
                        <p className="text-white">
                          Students:{" "}
                          <span className="text-accent font-bold">{data.count}</span>
                        </p>
                      </div>
                    )}

                    {/* Dual Bars */}
                    <div className="flex w-full items-end gap-1 h-[85%] justify-center">
                      <div
                        style={{ height: `${Math.max(revPercent, 3)}%` }}
                        className="w-2 sm:w-3.5 bg-primary/80 group-hover:bg-primary rounded-t-sm transition-all duration-300"
                      />
                      <div
                        style={{ height: `${Math.max(countPercent, 3)}%` }}
                        className="w-2 sm:w-3.5 bg-accent/80 group-hover:bg-accent rounded-t-sm transition-all duration-300"
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

        {/* Right 1 Col: Quick Links & Recent Orders */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold font-outfit text-foreground">
                Administrative Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Link
                href="/admin/courses/new"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
              >
                <PlusCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Add Course</span>
              </Link>
              <Link
                href="/admin/students"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
              >
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Add Student</span>
              </Link>
              <Link
                href="/admin/doubts"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">Moderate QA</span>
              </Link>
              <Link
                href="/admin/coupons"
                className="flex items-center gap-2 p-2.5 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/60 text-xs font-semibold text-foreground transition-colors"
              >
                <Tag className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">New Coupon</span>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Orders Card */}
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold font-outfit text-foreground">
                Recent Transactions
              </CardTitle>
              <Link
                href="/admin/orders"
                className="text-xs font-semibold text-primary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                {filteredOrders && filteredOrders.length > 0 ? (
                  filteredOrders.slice(0, 4).map((order: any) => (
                    <div key={order.id} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Wallet className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {order.usersNormalized?.full_name ||
                            order.usersNormalized?.email ||
                            "Student"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {order.coursesNormalized?.title || "Course Enrollment"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground">
                          ₹{order.amountNum.toLocaleString("en-IN")}
                        </span>
                        <div className="mt-0.5">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                              order.status === "paid"
                                ? "bg-emerald-500/10 text-emerald-600"
                                : order.status === "pending"
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-rose-500/10 text-rose-600"
                            )}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-xs font-medium">
                    No transactions recorded.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
