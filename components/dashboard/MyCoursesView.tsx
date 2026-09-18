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
  Calendar,
  AlertTriangle,
  Award,
  Layers,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
}

interface MyCoursesViewProps {
  courses: EnrolledCourseData[];
}

export function MyCoursesView({ courses }: MyCoursesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "in-progress" | "completed">("all");

  // Summary counts
  const totalEnrolled = courses.length;
  const completedCourses = courses.filter((c) => c.percent === 100);
  const inProgressCourses = courses.filter((c) => c.percent < 100 && !c.isExpired);
  const completedCount = completedCourses.length;
  const inProgressCount = inProgressCourses.length;

  // Active continue learning course (first in-progress course)
  const continueCourse = inProgressCourses[0] || (courses.length > 0 ? courses[0] : null);

  // Filtered & searched courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      // Status filter
      if (activeFilter === "in-progress" && (c.percent === 100 || c.isExpired)) return false;
      if (activeFilter === "completed" && c.percent !== 100) return false;

      // Search filter
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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12">
      {/* Page Header */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Student Learning Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            My Enrolled Courses
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Track your lesson progress, resume structured HD video modules, access verifiable completion certificates, and download official tax invoices.
          </p>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              <span>{totalEnrolled} Enrolled</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-600" />
              <span>{inProgressCount} In Progress</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-semibold">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>{completedCount} Completed</span>
            </span>
          </div>
        </div>

        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-5 rounded-xl text-xs shadow-xs shrink-0 self-start md:self-auto cursor-pointer"
        >
          <Link href="/courses" className="flex items-center gap-2">
            <span>Explore More Courses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>

      {/* Course Schedule Announcement Notice */}
      {courses.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 border border-amber-300/80 p-5 sm:p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs text-foreground">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xs shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base font-outfit text-amber-950">
                  Course Schedule &amp; Live Curriculum Notice
                </h3>
                <span className="text-[10px] font-extrabold uppercase bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Starts Sept 18, 2026
                </span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                All full course video lessons, curriculum modules, and interactive materials are accessible from your dashboard from <strong>September 18, 2026</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE: Continue Learning Section (Prominent Banner) */}
      {continueCourse && continueCourse.percent < 100 && !continueCourse.isExpired && (
        <div className="bg-card border border-primary/20 bg-gradient-to-br from-primary/[0.03] via-card to-card rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
                Continue Learning
              </h2>
            </div>
            <Badge variant="secondary" className="text-xs font-bold text-primary bg-primary/10">
              {continueCourse.percent}% Complete
            </Badge>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Thumbnail */}
            <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-muted relative shrink-0 border border-border/60 group">
              {continueCourse.thumbnailUrl ? (
                <img
                  src={continueCourse.thumbnailUrl}
                  alt={continueCourse.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-primary/5 flex items-center justify-center text-primary">
                  <BookOpen className="h-8 w-8" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-2.5 left-3 right-3 flex justify-between items-center text-[11px] text-white font-semibold">
                <span>{continueCourse.completedLessons} of {continueCourse.totalLessons} Lessons</span>
                <span>{continueCourse.percent}%</span>
              </div>
            </div>

            {/* Info & Actions */}
            <div className="flex-1 space-y-3.5 w-full">
              <div className="space-y-1">
                <h3 className="font-bold text-lg sm:text-xl font-outfit text-foreground line-clamp-1">
                  {continueCourse.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {continueCourse.resumeLessonTitle ? (
                    <span>
                      <strong className="text-foreground">Next Up:</strong> {continueCourse.resumeLessonTitle}
                    </span>
                  ) : (
                    <span>{continueCourse.totalLessons - continueCourse.completedLessons} lessons remaining in track</span>
                  )}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                  <span>Overall Curriculum Progress</span>
                  <span className="text-foreground font-bold">{continueCourse.percent}%</span>
                </div>
                <Progress value={continueCourse.percent} className="h-2" />
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  asChild
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs cursor-pointer"
                >
                  <Link
                    href={
                      continueCourse.resumeLessonId
                        ? `/dashboard/courses/${continueCourse.id}/lessons/${continueCourse.resumeLessonId}`
                        : `/dashboard/courses/${continueCourse.id}`
                    }
                    className="flex items-center gap-2"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Resume Lesson</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-slate-200 text-slate-700 hover:text-primary hover:bg-slate-100 text-xs font-semibold h-10 px-4 rounded-xl"
                >
                  <Link
                    href={`/dashboard/courses/${continueCourse.id}`}
                    className="flex items-center gap-1.5"
                  >
                    <span>View Course Syllabus</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Courses Area: Search, Tabs & Grid */}
      <div className="space-y-6">
        {/* Search Bar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-2xl border border-border/60 self-start">
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "all"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Courses ({totalEnrolled})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("in-progress")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "in-progress"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("completed")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeFilter === "completed"
                  ? "bg-white text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search enrolled courses..."
              className="pl-10 pr-8 h-10 text-xs font-semibold rounded-xl border-slate-200 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Empty State: Zero Enrolled Courses */}
        {courses.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 sm:p-16 text-center space-y-5 shadow-xs">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold font-outfit text-foreground">
                Your learning journey starts here.
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You haven&apos;t enrolled in any AirBharath LMS courses yet. Explore our career tracks to start mastering in-demand industry skills.
              </p>
            </div>
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs px-6 h-11 shadow-xs cursor-pointer"
            >
              <Link href="/courses">Browse Course Catalog</Link>
            </Button>
          </div>
        ) : filteredCourses.length === 0 ? (
          /* Empty State: Zero Filter / Search Results */
          <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-4 shadow-xs">
            <p className="text-sm font-semibold text-foreground">
              No enrolled courses match your current search or filter.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          /* Enrolled Courses Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isCompleted = course.percent === 100;

              return (
                <div
                  key={course.id}
                  className={`bg-card border rounded-3xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between ${
                    course.isExpired
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/80 hover:border-primary/30"
                  }`}
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
                          <BookOpen className="h-10 w-10 opacity-60" />
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
                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {course.isExpired ? (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                            Expired
                          </Badge>
                        ) : isCompleted ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-bold flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge className="bg-primary text-white text-[10px] uppercase font-bold shadow-xs">
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-base font-outfit text-foreground line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          {course.expiresAt
                            ? `Valid until ${new Date(course.expiresAt).toLocaleDateString("en-IN")}`
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
                        <Progress value={course.percent} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-5 sm:p-6 pt-0 space-y-2.5 border-t border-border/50 mt-2">
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
                              <Award className="h-3.5 w-3.5" />
                              <span>View Verified Certificate</span>
                            </Link>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        asChild
                        className="w-full text-xs font-bold h-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xs mt-3 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Link
                          href={
                            course.resumeLessonId
                              ? `/dashboard/courses/${course.id}/lessons/${course.resumeLessonId}`
                              : `/dashboard/courses/${course.id}`
                          }
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Resume Lesson</span>
                        </Link>
                      </Button>
                    )}

                    {/* Tax Invoice PDF Download */}
                    {course.orderId && (
                      <Button
                        asChild
                        variant="ghost"
                        className="w-full text-xs font-medium text-slate-600 hover:text-primary hover:bg-slate-100 h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
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
