import { db } from "@/lib/db";
import { courses, enrollments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { BookOpen, Filter, GraduationCap, Plus, Search } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Course Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and monitor your technical curriculum on Airbharath LMS.</p>
        </div>
        <Link href="/admin/courses/new">
          <button className="flex items-center gap-2 px-5 py-3 bg-[#014a62] text-white rounded-xl text-xs font-bold hover:bg-[#01374a] transition-all shadow-sm">
            <Plus className="h-4 w-4" />
            Add New Course
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm">
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Active Courses</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-bold text-[#014a62] font-instrument-sans">{coursesList.length}</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Course Title</th>
                <th className="px-6 py-4">Access Days</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {coursesWithDetails.length > 0 ? (
                coursesWithDetails.map((course: any, idx: number) => (
                  <tr 
                    key={course.id} 
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-muted rounded-lg overflow-hidden relative shrink-0 border border-border/40">
                          {course.thumbnailUrl ? (
                            <img src={course.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-[#014a62]/5 flex items-center justify-center text-[#014a62]">
                              <BookOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground font-instrument-sans">{course.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">₹{Number(course.price || 0).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                      {course.accessDays ? `${course.accessDays} Days` : "Lifetime"}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-foreground">
                      {course.studentCount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-[9px] font-bold rounded-full tracking-wider ${
                        course.isPublished 
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-amber-100 text-amber-700"
                      }`}>
                        {course.isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/courses/${course.id}`} 
                        className="inline-block px-3 py-1.5 bg-[#014a62]/10 hover:bg-[#014a62] text-[#014a62] hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-xs font-semibold">
                    No courses found. Click &quot;Add New Course&quot; to publish a course.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
