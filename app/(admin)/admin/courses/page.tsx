/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase-server";
import { BookOpen, Filter, GraduationCap, Plus, Search } from "lucide-react";
import Link from "next/link";

export default async function AdminCourses() {
  const supabase = await createClient();

  // Fetch actual courses and join with enrollments in a single query
  const { data: courses } = await supabase
    .from("courses")
    .select(`
      *,
      instructor:users!instructor_id (
        full_name,
        avatar_url
      ),
      enrollments (
        id
      )
    `)
    .order("created_at", { ascending: false });

  const coursesWithDetails = (courses || []).map((course: any) => {
    return {
      ...course,
      studentCount: course.enrollments?.length || 0,
    };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">Course Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage and monitor your digital curriculum across all cohorts.</p>
        </div>
        <Link href="/admin/courses/new">
          <button className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/95 transition-all shadow-sm hover:shadow-md hover:scale-[1.01]">
            <Plus className="h-4 w-4" />
            Add New Course
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Active Courses</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-bold text-foreground">{courses?.length || 3}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">+12%</span>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Average Enrollment</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-bold text-foreground">8,402</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">Steady</span>
          </div>
        </div>
        <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm hover:shadow-md transition-all duration-300">
          <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Completion Rate</span>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-3xl font-bold text-foreground">76.4%</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">+5%</span>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Filters */}
        <div className="p-6 border-b border-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              className="pl-10 pr-4 py-2.5 w-full border border-border/85 rounded-xl bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border border-border/85 rounded-xl bg-background text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
              <Filter className="h-4 w-4" /> Filter
            </button>
            <span className="text-xs text-muted-foreground font-bold tracking-wider">SORT BY:</span>
            <select className="bg-background border border-border/85 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/40">
              <option>Recently Modified</option>
              <option>Highest Enrollment</option>
              <option>Price: Low to High</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Course Title</th>
                <th className="px-6 py-4">Instructor</th>
                <th className="px-6 py-4">Students</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {coursesWithDetails.length > 0 ? (
                coursesWithDetails.map((course, idx) => (
                  <tr 
                    key={course.id} 
                    className="hover:bg-muted/10 transition-colors animate-slide-up"
                    style={{ animationDelay: `${(idx + 1) * 0.05}s` }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-muted rounded-lg overflow-hidden relative shrink-0 border border-border/40">
                          {course.thumbnail_url ? (
                            <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full bg-primary/5 flex items-center justify-center text-primary">
                              <BookOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{course.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">₹{course.price.toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                      {course.instructor?.full_name || "Admin"}
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-foreground">
                      {course.studentCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-[9px] font-bold rounded-full tracking-wider ${
                        course.is_published 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}>
                        {course.is_published ? "PUBLISHED" : "DRAFT"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/courses/${course.id}`} 
                        className="inline-block px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-all"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-primary/5 rounded-lg flex items-center justify-center text-primary shrink-0 border border-border/40">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">Architectural Design Fundamentals</div>
                          <div className="text-xs text-muted-foreground mt-0.5">LMS-CORE-01</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">Prof. Julian Vane</td>
                    <td className="px-6 py-4 text-xs font-bold text-foreground">1,240</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-[9px] font-bold rounded-full tracking-wider bg-green-500/10 text-green-600">
                        PUBLISHED
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-block px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-all">Edit</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 bg-primary/5 rounded-lg flex items-center justify-center text-primary shrink-0 border border-border/40">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">Advanced Pedagogy Systems</div>
                          <div className="text-xs text-muted-foreground mt-0.5">LMS-CORE-02</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">Dr. Sarah Chen</td>
                    <td className="px-6 py-4 text-xs font-bold text-foreground">892</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 text-[9px] font-bold rounded-full tracking-wider bg-yellow-500/10 text-yellow-600">
                        DRAFT
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-block px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-all">Edit</button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
