"use client";

import { useState, useMemo } from "react";
import {
  Search,
  User,
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
  ShieldAlert,
  Sparkles,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Student {
  id: string;
  phone?: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  access_days: number | null;
}

interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt: string | null;
  status: string;
}

export default function StudentsTable({
  initialStudents,
  courses,
  enrollments: initialEnrollments,
}: {
  initialStudents: Student[];
  courses: Course[];
  enrollments: Enrollment[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [enrollmentsList, setEnrollmentsList] = useState<Enrollment[]>(initialEnrollments);

  // Modal State for Direct Enrollment
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal State for Extend Access
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [targetEnrollment, setTargetEnrollment] = useState<Enrollment | null>(null);
  const [additionalDays, setAdditionalDays] = useState("30");

  const filteredStudents = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return initialStudents.filter((student) => {
      const name = (student.full_name || "").toLowerCase();
      const email = (student.email || "").toLowerCase();
      const phone = (student.phone || "").toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [initialStudents, searchTerm]);

  const activeEnrollmentsCount = useMemo(() => {
    const now = new Date();
    return enrollmentsList.filter((e) => !e.expiresAt || new Date(e.expiresAt) >= now).length;
  }, [enrollmentsList]);

  const expiredEnrollmentsCount = useMemo(() => {
    const now = new Date();
    return enrollmentsList.filter((e) => e.expiresAt && new Date(e.expiresAt) < now).length;
  }, [enrollmentsList]);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/enroll-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudentId,
          courseId: selectedCourseId,
          customAccessDays: customDays ? Number(customDays) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enroll student");

      if (data.enrollment) {
        setEnrollmentsList((prev) => [
          ...prev.filter(
            (e) => !(e.userId === data.enrollment.userId && e.courseId === data.enrollment.courseId)
          ),
          {
            id: data.enrollment.id,
            userId: data.enrollment.userId,
            courseId: data.enrollment.courseId,
            enrolledAt: new Date(data.enrollment.enrolledAt).toISOString(),
            expiresAt: data.enrollment.expiresAt
              ? new Date(data.enrollment.expiresAt).toISOString()
              : null,
            status: data.enrollment.status,
          },
        ]);
      }
      setIsEnrollModalOpen(false);
      setSelectedStudentId("");
      setSelectedCourseId("");
      setCustomDays("");
    } catch (err: any) {
      alert(err.message || "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEnrollment || !additionalDays) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/extend-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: targetEnrollment.id,
          additionalDays: Number(additionalDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extend duration");

      if (data.enrollment) {
        setEnrollmentsList((prev) =>
          prev.map((item) =>
            item.id === data.enrollment.id
              ? {
                  ...item,
                  expiresAt: data.enrollment.expiresAt
                    ? new Date(data.enrollment.expiresAt).toISOString()
                    : null,
                  status: data.enrollment.status,
                }
              : item
          )
        );
      }
      setIsExtendModalOpen(false);
      setTargetEnrollment(null);
    } catch (err: any) {
      alert(err.message || "Failed to extend duration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Students
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {initialStudents.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Registered learner accounts</p>
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
              {enrollmentsList.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Course seat assignments</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Access
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 font-outfit">
              {activeEnrollmentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Valid classroom access</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Expired Seats
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 font-outfit">
              {expiredEnrollmentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Access expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, email, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-input rounded-xl bg-background text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <Button
          type="button"
          onClick={() => {
            setSelectedStudentId("");
            setSelectedCourseId("");
            setCustomDays("");
            setIsEnrollModalOpen(true);
          }}
          className="rounded-xl text-xs font-bold gap-2 shadow-sm shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Manual Course Enrollment</span>
        </Button>
      </Card>

      {/* Students Data Table */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Student Profile</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Enrolled Courses & Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const studentEnrollments = enrollmentsList.filter((e) => e.userId === student.id);
                  const initials = student.full_name
                    ? student.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "ST";

                  return (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                      {/* Profile */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border/60">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-foreground block font-outfit truncate">
                              {student.full_name || "Student"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Joined {new Date(student.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-foreground font-semibold">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{student.phone ? `+91 ${student.phone}` : "No mobile"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 truncate">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{student.email || "No email"}</span>
                        </div>
                      </td>

                      {/* Enrolled Courses */}
                      <td className="px-6 py-4">
                        {studentEnrollments.length > 0 ? (
                          <div className="space-y-1.5 max-w-sm">
                            {studentEnrollments.map((enr) => {
                              const course = courses.find((c) => c.id === enr.courseId);
                              const isExpired =
                                enr.expiresAt && new Date(enr.expiresAt) < new Date();

                              return (
                                <div
                                  key={enr.id}
                                  className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/60 text-xs"
                                >
                                  <div className="min-w-0">
                                    <span className="font-semibold text-foreground block truncate text-[11px]">
                                      {course?.title || "Course"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      Expires:{" "}
                                      {enr.expiresAt
                                        ? new Date(enr.expiresAt).toLocaleDateString()
                                        : "Lifetime"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                        isExpired
                                          ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                      }`}
                                    >
                                      {isExpired ? "Expired" : "Active"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetEnrollment(enr);
                                        setIsExtendModalOpen(true);
                                      }}
                                      className="text-[10px] font-bold text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                                    >
                                      Extend
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            No enrolled courses
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setSelectedCourseId("");
                            setCustomDays("");
                            setIsEnrollModalOpen(true);
                          }}
                          className="rounded-xl text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          <span>Enroll Course</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No students match search query</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try searching with a different name, email, or mobile number.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Direct Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-outfit text-foreground">
                  Manual Course Enrollment
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Assign a course directly to any registered student.
                </p>
              </div>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-input rounded-xl p-2.5 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Student --</option>
                  {initialStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || "Student"} ({s.phone ? `+91 ${s.phone}` : s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full border border-input rounded-xl p-2.5 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.access_days ? `${c.access_days} days default` : "Lifetime"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Custom Access Duration (Days)
                </label>
                <input
                  type="number"
                  placeholder="Leave blank for course default"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="flex-1 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="flex-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {loading ? "Enrolling..." : "Enroll Student"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Duration Modal */}
      {isExtendModalOpen && targetEnrollment && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold font-outfit text-foreground">
                  Extend Course Duration
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Add additional days to current student enrollment validity.
                </p>
              </div>
            </div>

            <form onSubmit={handleExtendAccess} className="space-y-4 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Additional Days to Add
                </label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={additionalDays}
                  onChange={(e) => setAdditionalDays(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="flex-1 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="flex-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {loading ? "Extending..." : "Extend Validity"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
