"use client";

import { useState } from "react";
import { Search, User, PlusCircle, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const filteredStudents = initialStudents.filter((student) => {
    const term = searchTerm.toLowerCase();
    const name = (student.full_name || "").toLowerCase();
    const email = (student.email || "").toLowerCase();
    const phone = (student.phone || "").toLowerCase();
    return name.includes(term) || email.includes(term) || phone.includes(term);
  });

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
      if (!res.ok) throw new Error(data.error);

      if (data.enrollment) {
        setEnrollmentsList((prev) => [
          ...prev.filter((e) => !(e.userId === data.enrollment.userId && e.courseId === data.enrollment.courseId)),
          {
            id: data.enrollment.id,
            userId: data.enrollment.userId,
            courseId: data.enrollment.courseId,
            enrolledAt: new Date(data.enrollment.enrolledAt).toISOString(),
            expiresAt: data.enrollment.expiresAt ? new Date(data.enrollment.expiresAt).toISOString() : null,
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
      if (!res.ok) throw new Error(data.error);

      if (data.enrollment) {
        setEnrollmentsList((prev) =>
          prev.map((item) =>
            item.id === data.enrollment.id
              ? {
                  ...item,
                  expiresAt: data.enrollment.expiresAt ? new Date(data.enrollment.expiresAt).toISOString() : null,
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
    <div className="space-y-4">
      {/* Action Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2.5 w-full border rounded-xl bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#014a62]"
          />
        </div>

        <Button
          type="button"
          onClick={() => setIsEnrollModalOpen(true)}
          className="bg-[#014a62] hover:bg-[#01374a] text-white font-bold text-xs gap-2 rounded-xl"
        >
          <PlusCircle className="w-4 h-4" />
          Add Student to Course
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-border text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Mobile / Email</th>
                <th className="px-6 py-4">Enrolled Courses</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const studentEnrollments = enrollmentsList.filter((e) => e.userId === student.id);
                  return (
                    <tr key={student.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#014a62]/10 flex items-center justify-center shrink-0 text-[#014a62]">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-sm text-foreground block">
                              {student.full_name || "Student"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Joined {new Date(student.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                        <div>{student.phone ? `+91 ${student.phone}` : "No phone"}</div>
                        <div className="text-[11px] text-muted-foreground/80">{student.email || ""}</div>
                      </td>

                      <td className="px-6 py-4">
                        {studentEnrollments.length > 0 ? (
                          <div className="space-y-2">
                            {studentEnrollments.map((enr) => {
                              const course = courses.find((c) => c.id === enr.courseId);
                              const isExpired = enr.expiresAt && new Date(enr.expiresAt) < new Date();
                              return (
                                <div key={enr.id} className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-lg border text-xs">
                                  <div>
                                    <span className="font-bold text-[#014a62] block line-clamp-1">{course?.title || "Course"}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      Expires: {enr.expiresAt ? new Date(enr.expiresAt).toLocaleDateString() : "Lifetime"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExpired ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                                      {isExpired ? "Expired" : "Active"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTargetEnrollment(enr);
                                        setIsExtendModalOpen(true);
                                      }}
                                      className="text-[10px] font-bold text-[#014a62] hover:underline bg-[#014a62]/10 px-2 py-1 rounded-md"
                                    >
                                      Extend
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No active enrollments</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setIsEnrollModalOpen(true);
                          }}
                          className="text-xs font-bold text-[#014a62] border-[#014a62]"
                        >
                          + Enroll Course
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direct Enrollment Modal */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">Add Student directly to Course</h3>
            
            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs font-semibold"
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

              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Select Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs font-semibold"
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

              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Custom Access Duration (Days)</label>
                <input
                  type="number"
                  placeholder="Leave empty for course default"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEnrollModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#014a62] hover:bg-[#01374a] text-white">
                  {loading ? "Enrolling..." : "Enroll Student"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Duration Modal */}
      {isExtendModalOpen && targetEnrollment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-xl font-bold font-instrument-serif text-[#014a62]">Extend Course Access Duration</h3>
            
            <form onSubmit={handleExtendAccess} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-muted-foreground mb-1">Add Additional Days</label>
                <input
                  type="number"
                  placeholder="e.g. 30"
                  value={additionalDays}
                  onChange={(e) => setAdditionalDays(e.target.value)}
                  className="w-full border rounded-xl p-3 text-xs font-semibold"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsExtendModalOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-[#014a62] hover:bg-[#01374a] text-white">
                  {loading ? "Extending..." : "Extend Duration"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
