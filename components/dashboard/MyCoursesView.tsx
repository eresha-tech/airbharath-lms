"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Play,
  CheckCircle2,
  Download,
  ArrowRight,
  Search,
  Sparkles,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EnrolledCourseData {
  id: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  percent: number;
  completedLessons: number;
  totalLessons: number;
  resumeLessonId: string;
  resumeLessonTitle?: string;
  isExpired: boolean;
  expiresAt?: string | Date | null;
  orderId?: string | null;
  certificateCode?: string | null;
  certificateId?: string | null;
  bundleTitle?: string | null;
}

interface MyCoursesViewProps {
  courses: EnrolledCourseData[];
}

export function MyCoursesView({ courses }: MyCoursesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "in-progress" | "completed">("all");

  // Real Summary metrics
  const totalEnrolled = courses.length;
  const activeCount = courses.filter((c) => !c.isExpired).length;
  const completedCourses = courses.filter((c) => c.percent === 100);
  const inProgressCourses = courses.filter((c) => c.percent < 100 && !c.isExpired);
  const completedCount = completedCourses.length;
  const inProgressCount = inProgressCourses.length;
  const certificatesCount = courses.filter((c) => !!c.certificateCode).length;

  // Filtered & searched courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Status filter
      if (activeFilter === "in-progress" && (c.percent === 100 || c.isExpired)) return false;
      if (activeFilter === "completed" && c.percent !== 100) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(query);
        const matchDesc = c.description?.toLowerCase().includes(query);
        const matchSlug = c.slug?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchSlug) return false;
      }

      return true;
    });
  }, [courses, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      {/* 1. Page Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            <span>Learning Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            My Learning
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage your enrolled courses, resume structured HD video modules, verify completion credentials, and download tax invoices.
          </p>
        </div>

        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-5 rounded-xl text-xs shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Link href="/courses" className="flex items-center gap-2">
            <span>Explore Course Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {/* 2. Real Learning Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
              Enrolled Courses
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {totalEnrolled}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
            {totalEnrolled > 0 ? `${activeCount} active ${activeCount === 1 ? "track" : "tracks"}` : "No active tracks"}
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
              In Progress
            </span>
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {inProgressCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
            Active curriculum modules
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
              Completed
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {completedCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
            100% syllabus completed
          </p>
        </Card>

        <Card className="rounded-2xl border-border/80 p-4 sm:p-5 shadow-2xs bg-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-sans">
              Certificates
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-outfit mt-2 sm:mt-3">
            {certificatesCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 truncate font-medium">
            {certificatesCount > 0 ? "Verified credentials issued" : "Finish 100% to earn"}
          </p>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/60 self-start">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Courses ({totalEnrolled})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("in-progress")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "in-progress"
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("completed")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "completed"
                  ? "bg-card text-primary shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search enrolled courses..."
              className="pl-9 pr-8 h-10 text-xs font-semibold rounded-xl border-border/80 focus-visible:ring-primary bg-card"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Filter Counter */}
        {(searchQuery.trim() || activeFilter !== "all") && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong>{filteredCourses.length}</strong> of {totalEnrolled} enrolled courses
              {activeFilter !== "all" && ` (${activeFilter.replace("-", " ")})`}
              {searchQuery.trim() && ` matching "${searchQuery}"`}
            </span>

            <button
              type="button"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="text-primary hover:underline font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* 4. Course Library Grid */}
        {courses.length === 0 ? (
          /* Empty State: Zero Total Enrolled */
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 sm:p-16 text-center space-y-5 shadow-xs">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold font-outfit text-foreground">
                Your learning library is waiting.
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You haven&apos;t enrolled in any courses yet. Browse our aviation, engineering, and digital skill masterclasses to get started.
              </p>
            </div>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs px-6 h-10 shadow-xs cursor-pointer"
            >
              <Link href="/courses">Browse Course Catalog</Link>
            </Button>
          </div>
        ) : filteredCourses.length === 0 ? (
          /* Empty State: Zero Filter/Search Matches */
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <p className="text-sm font-semibold text-foreground">
              No enrolled courses match your current filter or search keyword.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold border-border/80 hover:bg-muted"
            >
              Reset Search &amp; Filters
            </Button>
          </div>
        ) : (
          /* Grid of Course Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredCourses.map((course) => {
              const isCompleted = course.percent === 100;

              return (
                <div
                  key={course.id}
                  className={cn(
                    "bg-card border rounded-3xl overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between",
                    course.isExpired
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/80 hover:border-primary/40"
                  )}
                >
                  <div>
                    {/* Thumbnail Header */}
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

                      {/* Status Badges */}
                      <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 justify-end max-w-[85%]">
                        {course.bundleTitle && (
                          <Badge variant="outline" className="bg-background/90 text-primary border-primary/30 text-[9px] font-bold uppercase shadow-2xs">
                            {course.bundleTitle}
                          </Badge>
                        )}
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
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="p-5 sm:p-6 space-y-3.5">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base font-outfit text-foreground line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {course.expiresAt
                            ? `Valid until ${new Date(course.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                            : "Lifetime Access"}
                        </p>
                      </div>

                      {/* Progress Indicator */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">
                            {course.completedLessons} of {course.totalLessons} Lessons
                          </span>
                          <span className="text-foreground font-bold">{course.percent}%</span>
                        </div>
                        <Progress value={course.percent} className="h-2 rounded-full" />
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-5 sm:p-6 pt-0 space-y-2 border-t border-border/50 mt-1">
                    {course.isExpired ? (
                      <Button
                        asChild
                        variant="destructive"
                        className="w-full text-xs font-bold h-10 rounded-xl shadow-xs mt-3 cursor-pointer"
                      >
                        <Link href={`/courses/${course.slug || course.id}`}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          <span>Renew Course Access</span>
                        </Link>
                      </Button>
                    ) : isCompleted ? (
                      <div className="space-y-2 mt-3">
                        <Button
                          asChild
                          variant="outline"
                          className="w-full text-xs font-bold h-10 rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                        >
                          <Link href={`/dashboard/courses/${course.id}`}>
                            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                            <span>Review Full Course</span>
                          </Link>
                        </Button>

                        {course.certificateCode && (
                          <Button
                            asChild
                            className="w-full text-xs font-bold h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                          >
                            <Link
                              href={`/verify-certificate/${course.certificateCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>View Verified Certificate</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        asChild
                        className="w-full text-xs font-bold h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs mt-3 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Link
                          href={
                            course.resumeLessonId
                              ? `/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`
                              : `/dashboard/courses/${course.id}`
                          }
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>{course.completedLessons > 0 ? "Resume Lesson" : "Start Course"}</span>
                        </Link>
                      </Button>
                    )}

                    {/* Tax Invoice PDF Download Action if Order Exists */}
                    {course.orderId && (
                      <Button
                        asChild
                        variant="ghost"
                        className="w-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted h-8 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <a
                          href={`/api/invoices/download/${course.orderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span>Download Tax Invoice (PDF)</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
