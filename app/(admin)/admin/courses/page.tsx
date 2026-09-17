import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { BookOpen, Plus, ExternalLink, Edit3, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminCourses() {
  const coursesList = await db.query.courses.findMany({
    with: {
      instructor: true,
      enrollments: true,
    },
    orderBy: [desc(courses.createdAt)],
  });

  const coursesWithDetails = coursesList.map((course: any) => ({
    ...course,
    studentCount: course.enrollments?.length || 0,
  }));

  const publishedCount = coursesWithDetails.filter((c: any) => c.isPublished).length;
  const draftCount = coursesWithDetails.length - publishedCount;
  const totalStudentsEnrolled = coursesWithDetails.reduce(
    (sum: number, c: any) => sum + c.studentCount,
    0
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
            Course Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage course catalog, syllabus modules, video lectures, and publishing status.
          </p>
        </div>

        <Link href="/admin/courses/new">
          <Button className="rounded-xl text-xs font-bold gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Add New Course</span>
          </Button>
        </Link>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Courses
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {coursesWithDetails.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Active curriculum roster</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Published
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {publishedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Live in student catalog</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Drafts
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 font-outfit">
              {draftCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">In curriculum preparation</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Enrollments
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-primary font-outfit">
              {totalStudentsEnrolled}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Cumulative student seats</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses Data Table */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Course Details</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Access Duration</th>
                <th className="px-6 py-4">Enrolled Students</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {coursesWithDetails.length > 0 ? (
                coursesWithDetails.map((course: any) => (
                  <tr key={course.id} className="hover:bg-muted/20 transition-colors">
                    {/* Course Details */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-12 w-20 bg-muted rounded-xl overflow-hidden relative shrink-0 border border-border/60">
                          {course.thumbnailUrl ? (
                            <img
                              src={course.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary">
                              <BookOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs sm:text-sm text-foreground line-clamp-1 font-outfit">
                            {course.title}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono block mt-0.5 truncate">
                            /{course.slug || course.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-xs font-bold text-foreground tabular-nums">
                      ₹{Number(course.price || 0).toLocaleString("en-IN")}
                    </td>

                    {/* Access Duration */}
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                      {course.accessDays ? `${course.accessDays} Days` : "Lifetime Access"}
                    </td>

                    {/* Students Count */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-muted/60 text-foreground">
                        {course.studentCount} students
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full tracking-wider uppercase ${
                          course.isPublished
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                        }`}
                      >
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
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                            title="View Public Page"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                        <Link href={`/admin/courses/${course.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit Curriculum</span>
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No courses found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;Add New Course&quot; above to create your first technical course.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
