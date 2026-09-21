"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  ExternalLink,
  Edit3,
  Search,
  Filter,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  FileText,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface FormattedCourseListItem {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  price: number;
  accessDays: number | null;
  isPublished: boolean;
  createdAt: string;
  studentCount: number;
  moduleCount: number;
  lessonCount: number;
  instructorName?: string | null;
}

interface CoursesListClientProps {
  initialCourses: FormattedCourseListItem[];
}

export default function CoursesListClient({ initialCourses = [] }: CoursesListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [sortBy, setSortBy] = useState<"newest" | "price-desc" | "price-asc" | "students" | "lessons">("newest");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Overall metrics
  const totalCourses = initialCourses.length;
  const publishedCount = initialCourses.filter((c) => c.isPublished).length;
  const draftCount = totalCourses - publishedCount;
  const totalStudentsEnrolled = initialCourses.reduce((sum, c) => sum + c.studentCount, 0);
  const totalLessonsCount = initialCourses.reduce((sum, c) => sum + c.lessonCount, 0);

  // Filtered & Sorted courses
  const filteredCourses = useMemo(() => {
    return initialCourses
      .filter((course) => {
        // Status filter
        if (statusFilter === "published" && !course.isPublished) return false;
        if (statusFilter === "draft" && course.isPublished) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = course.title.toLowerCase().includes(q);
          const matchSlug = course.slug ? course.slug.toLowerCase().includes(q) : false;
          const matchDesc = course.description ? course.description.toLowerCase().includes(q) : false;
          const matchInst = course.instructorName ? course.instructorName.toLowerCase().includes(q) : false;
          return matchTitle || matchSlug || matchDesc || matchInst;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-desc") return b.price - a.price;
        if (sortBy === "price-asc") return a.price - b.price;
        if (sortBy === "students") return b.studentCount - a.studentCount;
        if (sortBy === "lessons") return b.lessonCount - a.lessonCount;
        // Default newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [initialCourses, statusFilter, searchQuery, sortBy]);

  const copySlug = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(`https://airbharath.in/courses/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curriculum Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Courses &amp; Syllabus
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Configure technical courses, syllabus modules, video lectures, pricing, and live catalog visibility.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
          <Link href="/admin/courses/new">
            <Button className="rounded-xl text-xs font-bold h-10 px-5 gap-2 shadow-sm cursor-pointer">
              <Plus className="h-4 w-4" />
              <span>Create New Course</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Courses */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Courses
            </span>
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalCourses}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {totalLessonsCount} total lessons across catalog
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Published */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Published Live
            </span>
            <div className="h-9 w-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {publishedCount}
            </div>
            <p className="text-[11px] text-muted-foreground">Visible in public student catalog</p>
          </CardContent>
        </Card>

        {/* KPI 3: Drafts */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              In Draft
            </span>
            <div className="h-9 w-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 font-outfit">
              {draftCount}
            </div>
            <p className="text-[11px] text-muted-foreground">In curriculum preparation</p>
          </CardContent>
        </Card>

        {/* KPI 4: Total Enrollments */}
        <Card className="rounded-3xl border border-border/80 shadow-xs hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Enrolled Seats
            </span>
            <div className="h-9 w-9 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-outfit">
              {totalStudentsEnrolled}
            </div>
            <p className="text-[11px] text-muted-foreground">Cumulative enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search, Status Filter & Sorting */}
      <Card className="rounded-3xl border border-border/80 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search courses by title, slug, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 h-10 rounded-xl text-xs bg-background border-border/80 focus:border-primary focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="inline-flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({totalCourses})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === "published"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Published ({publishedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("draft")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  statusFilter === "draft"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Drafts ({draftCount})
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 px-3.5 py-2 border border-border/80 rounded-xl bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-2xs"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="price-desc">Sort: Price (High to Low)</option>
                <option value="price-asc">Sort: Price (Low to High)</option>
                <option value="students">Sort: Most Enrolled</option>
                <option value="lessons">Sort: Most Lessons</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Courses Data Table / Cards */}
      <Card className="rounded-3xl border border-border/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {filteredCourses.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/40 border-b border-border/60 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                  <th className="px-6 py-4">Course &amp; Curriculum</th>
                  <th className="px-6 py-4">Tuition Price</th>
                  <th className="px-6 py-4">Access Validity</th>
                  <th className="px-6 py-4">Enrollments</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-muted/30 transition-colors group">
                    {/* Course & Curriculum Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        {/* Thumbnail */}
                        <div className="h-14 w-24 bg-muted rounded-2xl overflow-hidden relative shrink-0 border border-border/70 shadow-2xs">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary">
                              <BookOpen className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 max-w-md">
                          <Link
                            href={`/admin/courses/${course.id}`}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors font-outfit line-clamp-1"
                          >
                            {course.title}
                          </Link>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            {course.slug && (
                              <button
                                type="button"
                                onClick={(e) => copySlug(course.slug!, e)}
                                className="inline-flex items-center gap-1 font-mono text-[10px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border/50 transition-colors cursor-pointer"
                                title="Click to copy public URL"
                              >
                                {copiedSlug === course.slug ? (
                                  <>
                                    <Check className="h-2.5 w-2.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-bold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-2.5 w-2.5" />
                                    <span>/{course.slug}</span>
                                  </>
                                )}
                              </button>
                            )}

                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-foreground/80 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                              <Layers className="h-2.5 w-2.5 text-primary" />
                              <span>{course.moduleCount} modules</span>
                              <span>•</span>
                              <span>{course.lessonCount} lessons</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground text-sm tabular-nums">
                        ₹{course.price.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-muted-foreground">Incl. 18% GST</span>
                    </td>

                    {/* Access Validity */}
                    <td className="px-6 py-4">
                      <span className="font-semibold text-foreground">
                        {course.accessDays ? `${course.accessDays} Days` : "Lifetime Access"}
                      </span>
                    </td>

                    {/* Enrolled Students */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                        <Users className="h-3 w-3" />
                        <span>{course.studentCount} enrolled</span>
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-wider uppercase border",
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            course.isPublished ? "bg-emerald-500" : "bg-amber-500"
                          )}
                        />
                        {course.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {course.slug && (
                          <Link
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-transparent hover:border-border/60"
                            title="View Public Student Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                        <Link href={`/admin/courses/${course.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs font-bold gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit Curriculum</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 px-4 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                <BookOpen className="h-6 w-6" />
              </div>
              <p className="text-base font-bold text-foreground font-outfit">
                {searchQuery || statusFilter !== "all"
                  ? "No matching courses found"
                  : "No courses in platform roster yet"}
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "Try clearing your search filters or searching with different keywords."
                  : "Create your first professional technical course to start publishing curriculum and enrolling students."}
              </p>
              {searchQuery || statusFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="rounded-xl text-xs font-semibold mt-2"
                >
                  Clear Filters
                </Button>
              ) : (
                <Link href="/admin/courses/new">
                  <Button size="sm" className="rounded-xl text-xs font-bold gap-2 mt-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Course</span>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
