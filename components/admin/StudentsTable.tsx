"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
  Sparkles,
  Phone,
  Mail,
  Award,
  CreditCard,
  ChevronRight,
  ExternalLink,
  BookOpen,
  ArrowUpDown,
  Filter,
  Eye,
  Check,
  Copy,
  X,
  ShieldCheck,
  Download,
  Receipt,
  Layers,
  CalendarPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface StudentRecord {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface CourseRecord {
  id: string;
  title: string;
  slug: string | null;
  thumbnailUrl: string | null;
  access_days: number | null;
  price: number;
  totalLessons: number;
  lessonIds: string[];
}

export interface EnrollmentRecord {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: string;
  expiresAt: string | null;
  status: string;
}

export interface CertificateRecord {
  id: string;
  userId: string;
  courseId: string;
  certificateCode: string;
  pdfUrl: string;
  issuedAt: string;
}

export interface OrderRecord {
  id: string;
  userId: string | null;
  courseId: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: string;
  status: string;
  createdAt: string;
}

export interface ProgressRecord {
  userId: string;
  lessonId: string;
  isCompleted: boolean;
}

interface StudentsTableProps {
  initialStudents: StudentRecord[];
  courses: CourseRecord[];
  enrollments: EnrollmentRecord[];
  certificates?: CertificateRecord[];
  orders?: OrderRecord[];
  progressRecords?: ProgressRecord[];
}

export default function StudentsTable({
  initialStudents = [],
  courses = [],
  enrollments: initialEnrollments = [],
  certificates = [],
  orders = [],
  progressRecords = [],
}: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "enrolled" | "certified" | "no-enrollment">("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc" | "enrollments-desc">("newest");
  const [enrollmentsList, setEnrollmentsList] = useState<EnrollmentRecord[]>(initialEnrollments);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Student Dossier Drawer / Modal State
  const [activeDossierStudent, setActiveDossierStudent] = useState<StudentRecord | null>(null);
  const [dossierTab, setDossierTab] = useState<"courses" | "certificates" | "orders">("courses");

  // Modal State for Direct Course Enrollment
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [customDays, setCustomDays] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Modal State for Extend Access
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [targetEnrollment, setTargetEnrollment] = useState<EnrollmentRecord | null>(null);
  const [targetStudentName, setTargetStudentName] = useState("");
  const [targetCourseTitle, setTargetCourseTitle] = useState("");
  const [additionalDays, setAdditionalDays] = useState("30");
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);

  // Calculate real metrics
  const totalStudents = initialStudents.length;

  const activeEnrollmentsCount = useMemo(() => {
    const now = new Date();
    return enrollmentsList.filter((e) => !e.expiresAt || new Date(e.expiresAt) >= now).length;
  }, [enrollmentsList]);

  const expiredEnrollmentsCount = useMemo(() => {
    const now = new Date();
    return enrollmentsList.filter((e) => e.expiresAt && new Date(e.expiresAt) < now).length;
  }, [enrollmentsList]);

  const certifiedStudentsCount = useMemo(() => {
    const certifiedUserIds = new Set(certificates.map((c) => c.userId));
    return initialStudents.filter((s) => certifiedUserIds.has(s.id)).length;
  }, [initialStudents, certificates]);

  const studentsWithEnrollmentsCount = useMemo(() => {
    const enrolledUserIds = new Set(enrollmentsList.map((e) => e.userId));
    return initialStudents.filter((s) => enrolledUserIds.has(s.id)).length;
  }, [initialStudents, enrollmentsList]);

  const studentsWithoutEnrollmentsCount = totalStudents - studentsWithEnrollmentsCount;

  // Helper to copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to compute progress for a student in a course
  const getStudentCourseProgress = (studentId: string, courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course || !course.lessonIds || course.lessonIds.length === 0) {
      return { completedCount: 0, totalLessons: 0, percentage: 0 };
    }
    const courseLessonIds = new Set(course.lessonIds);
    const completedCount = progressRecords.filter(
      (p) => p.userId === studentId && p.isCompleted && courseLessonIds.has(p.lessonId)
    ).length;
    const totalLessons = course.totalLessons || course.lessonIds.length;
    const percentage = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
    return { completedCount, totalLessons, percentage };
  };

  // Helper to compute overall lessons completed by student
  const getStudentTotalCompletedLessons = (studentId: string) => {
    return progressRecords.filter((p) => p.userId === studentId && p.isCompleted).length;
  };

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return initialStudents
      .filter((student) => {
        // Search term filter
        const name = (student.full_name || "").toLowerCase();
        const email = (student.email || "").toLowerCase();
        const phone = (student.phone || "").toLowerCase();
        const studentId = student.id.toLowerCase();
        const matchesSearch =
          !term ||
          name.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          studentId.includes(term);

        if (!matchesSearch) return false;

        const studentEnrollments = enrollmentsList.filter((e) => e.userId === student.id);
        const hasEnrollments = studentEnrollments.length > 0;
        const isCertified = certificates.some((c) => c.userId === student.id);

        // Tab filter
        if (filterTab === "enrolled" && !hasEnrollments) return false;
        if (filterTab === "certified" && !isCertified) return false;
        if (filterTab === "no-enrollment" && hasEnrollments) return false;

        // Specific course filter
        if (selectedCourseFilter !== "all") {
          const isEnrolledInSelectedCourse = studentEnrollments.some(
            (e) => e.courseId === selectedCourseFilter
          );
          if (!isEnrolledInSelectedCourse) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === "name-asc") {
          return (a.full_name || "").localeCompare(b.full_name || "");
        }
        if (sortBy === "name-desc") {
          return (b.full_name || "").localeCompare(a.full_name || "");
        }
        if (sortBy === "enrollments-desc") {
          const aCount = enrollmentsList.filter((e) => e.userId === a.id).length;
          const bCount = enrollmentsList.filter((e) => e.userId === b.id).length;
          return bCount - aCount;
        }
        return 0;
      });
  }, [
    initialStudents,
    searchTerm,
    filterTab,
    selectedCourseFilter,
    sortBy,
    enrollmentsList,
    certificates,
  ]);

  // Handle direct enrollment
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId) return;

    setEnrollLoading(true);
    setEnrollError(null);

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
            (e) =>
              !(
                e.userId === data.enrollment.userId &&
                e.courseId === data.enrollment.courseId
              )
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
      setEnrollError(err.message || "Failed to enroll student");
    } finally {
      setEnrollLoading(false);
    }
  };

  // Handle extend access
  const handleExtendAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEnrollment || !additionalDays) return;

    setExtendLoading(true);
    setExtendError(null);

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
      setExtendError(err.message || "Failed to extend duration");
    } finally {
      setExtendLoading(false);
    }
  };

  // Helper for opening extend modal
  const openExtendModal = (enrollment: EnrollmentRecord, studentName: string, courseTitle: string) => {
    setTargetEnrollment(enrollment);
    setTargetStudentName(studentName);
    setTargetCourseTitle(courseTitle);
    setAdditionalDays("30");
    setExtendError(null);
    setIsExtendModalOpen(true);
  };

  // Helper for opening manual enrollment with pre-selected student
  const openEnrollModalForStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedCourseId("");
    setCustomDays("");
    setEnrollError(null);
    setIsEnrollModalOpen(true);
  };

  // Calculation helper for estimated expiry date preview in enrollment modal
  const getEstimatedExpiryPreview = () => {
    if (!selectedCourseId) return null;
    const course = courses.find((c) => c.id === selectedCourseId);
    const days = customDays ? Number(customDays) : course?.access_days;
    if (!days || isNaN(days) || days <= 0) return "Lifetime Access (No Expiration)";
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return `${days} Days (Valid until ${date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })})`;
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-primary/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Students
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalStudents}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              Registered learner accounts
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-emerald-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active Enrollments
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <GraduationCap className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-outfit">
              {activeEnrollmentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Valid classroom seats
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-sky-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Certified Learners
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-outfit">
              {certifiedStudentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 inline-block" />
              {certificates.length} total credentials issued
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-amber-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Expired Seats
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-outfit">
              {expiredEnrollmentsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Access validity completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action & Filter Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name, email, mobile, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl bg-background text-xs sm:text-sm font-medium focus-visible:ring-primary h-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Course filter & Sort selector */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Course Filter Dropdown */}
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10 max-w-[200px] truncate"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10"
            >
              <option value="newest">Joined: Newest First</option>
              <option value="oldest">Joined: Oldest First</option>
              <option value="name-asc">Name: A → Z</option>
              <option value="name-desc">Name: Z → A</option>
              <option value="enrollments-desc">Most Enrollments</option>
            </select>

            {/* Manual Enrollment Button */}
            <Button
              type="button"
              onClick={() => {
                setSelectedStudentId("");
                setSelectedCourseId("");
                setCustomDays("");
                setEnrollError(null);
                setIsEnrollModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Manual Course Enrollment</span>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                filterTab === "all"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>All Students</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                  filterTab === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                )}
              >
                {totalStudents}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("enrolled")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                filterTab === "enrolled"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>With Enrollments</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                  filterTab === "enrolled" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                )}
              >
                {studentsWithEnrollmentsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("certified")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                filterTab === "certified"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Certified Graduates</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                  filterTab === "certified" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                )}
              >
                {certifiedStudentsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("no-enrollment")}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                filterTab === "no-enrollment"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>No Enrollments Yet</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                  filterTab === "no-enrollment" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-background text-muted-foreground"
                )}
              >
                {studentsWithoutEnrollmentsCount}
              </span>
            </button>
          </div>

          {(searchTerm || filterTab !== "all" || selectedCourseFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterTab("all");
                setSelectedCourseFilter("all");
              }}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </Card>

      {/* Desktop Students Data Table (Hidden on Mobile) */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Student Profile</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Enrolled Courses & Progress</th>
                <th className="px-6 py-4">Credentials & Orders</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const studentEnrollments = enrollmentsList.filter((e) => e.userId === student.id);
                  const studentCertificates = certificates.filter((c) => c.userId === student.id);
                  const studentOrders = orders.filter((o) => o.userId === student.id);

                  const initials = student.full_name
                    ? student.full_name
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "ST";

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-muted/20 transition-colors group"
                    >
                      {/* Student Profile Column */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10 border border-border/80 shadow-2xs shrink-0 mt-0.5">
                            {student.avatar_url && (
                              <AvatarImage src={student.avatar_url} alt={student.full_name || "Student"} />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground block font-outfit truncate">
                                {student.full_name || "Registered Student"}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-muted/50 border-border/80 text-muted-foreground">
                                Student
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[130px]" title={student.id}>
                                ID: {student.id.substring(0, 8)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(student.id, `student-${student.id}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy Student UUID"
                              >
                                {copiedId === `student-${student.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-60 hover:opacity-100" />
                                )}
                              </button>
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground/70" />
                              Joined {new Date(student.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info Column */}
                      <td className="px-6 py-4 align-top text-xs font-medium text-muted-foreground">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-foreground font-semibold">
                            <div className="h-5 w-5 rounded-md bg-muted/80 flex items-center justify-center text-muted-foreground shrink-0">
                              <Phone className="h-3 w-3" />
                            </div>
                            <span>
                              {student.phone ? `+91 ${student.phone}` : "No phone number"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className="h-5 w-5 rounded-md bg-muted/80 flex items-center justify-center text-muted-foreground shrink-0">
                              <Mail className="h-3 w-3" />
                            </div>
                            <span className="truncate max-w-[180px]">
                              {student.email || "No email registered"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Enrolled Courses & Progress Column */}
                      <td className="px-6 py-4 align-top">
                        {studentEnrollments.length > 0 ? (
                          <div className="space-y-2 max-w-md">
                            {studentEnrollments.map((enr) => {
                              const course = courses.find((c) => c.id === enr.courseId);
                              const isExpired =
                                enr.expiresAt && new Date(enr.expiresAt) < new Date();
                              const progress = getStudentCourseProgress(student.id, enr.courseId);

                              return (
                                <div
                                  key={enr.id}
                                  className="bg-card p-3 rounded-xl border border-border/80 shadow-2xs space-y-2 text-xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-foreground block truncate text-xs font-outfit">
                                        {course?.title || "Enrolled Course"}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                                        {enr.expiresAt ? (
                                          <>
                                            Expires:{" "}
                                            {new Date(enr.expiresAt).toLocaleDateString("en-IN", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            })}
                                          </>
                                        ) : (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                            Lifetime Access
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                          isExpired
                                            ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                        )}
                                      >
                                        {isExpired ? "Expired" : "Active"}
                                      </Badge>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openExtendModal(
                                            enr,
                                            student.full_name || "Student",
                                            course?.title || "Course"
                                          )
                                        }
                                        className="text-[10px] font-bold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                                      >
                                        Extend
                                      </button>
                                    </div>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                                      <span>
                                        Progress: {progress.completedCount} / {progress.totalLessons} lessons
                                      </span>
                                      <span className="font-bold text-foreground">
                                        {progress.percentage}%
                                      </span>
                                    </div>
                                    <Progress
                                      value={progress.percentage}
                                      className="h-1.5 bg-muted rounded-full"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                            <span className="italic">No active course enrollments</span>
                            <button
                              type="button"
                              onClick={() => openEnrollModalForStudent(student.id)}
                              className="text-primary hover:underline font-semibold text-xs"
                            >
                              + Enroll
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Credentials & Orders Column */}
                      <td className="px-6 py-4 align-top text-xs">
                        <div className="space-y-2 max-w-[200px]">
                          {/* Certificates badge */}
                          {studentCertificates.length > 0 ? (
                            <div className="space-y-1">
                              {studentCertificates.map((cert) => (
                                <div
                                  key={cert.id}
                                  className="flex items-center gap-1.5 bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-xl text-[11px] font-bold"
                                >
                                  <Award className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate" title={`Code: ${cert.certificateCode}`}>
                                    {cert.certificateCode}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground block">
                              No certificates earned
                            </span>
                          )}

                          {/* Orders Summary */}
                          {studentOrders.length > 0 ? (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] pt-1">
                              <Receipt className="h-3 w-3 text-muted-foreground/70" />
                              <span className="font-semibold text-foreground">
                                {studentOrders.length} {studentOrders.length === 1 ? "Order" : "Orders"}
                              </span>
                              <span>(₹{studentOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0).toLocaleString("en-IN")})</span>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Action Buttons Column */}
                      <td className="px-6 py-4 align-top text-right space-y-2">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveDossierStudent(student);
                              setDossierTab("courses");
                            }}
                            className="rounded-xl text-xs font-semibold gap-1.5 hover:bg-muted transition-colors h-8"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Dossier</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openEnrollModalForStudent(student.id)}
                            className="rounded-xl text-xs font-bold gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 transition-all h-8"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Enroll</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground font-outfit">
                          No students match your query
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchTerm || filterTab !== "all" || selectedCourseFilter !== "all"
                            ? "Try adjusting your search keywords, clearing course filters, or selecting 'All Students'."
                            : "No student records currently exist in the database."}
                        </p>
                      </div>
                      {(searchTerm || filterTab !== "all" || selectedCourseFilter !== "all") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setFilterTab("all");
                            setSelectedCourseFilter("all");
                          }}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card-Based Students List (Visible only on mobile screens < md) */}
      <div className="block md:hidden space-y-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const studentEnrollments = enrollmentsList.filter((e) => e.userId === student.id);
            const studentCertificates = certificates.filter((c) => c.userId === student.id);
            const studentOrders = orders.filter((o) => o.userId === student.id);

            const initials = student.full_name
              ? student.full_name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
              : "ST";

            return (
              <Card key={student.id} className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
                {/* Header Profile Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <Avatar className="h-11 w-11 border border-border/80 shadow-2xs shrink-0">
                      {student.avatar_url && (
                        <AvatarImage src={student.avatar_url} alt={student.full_name || "Student"} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground block font-outfit truncate">
                          {student.full_name || "Registered Student"}
                        </span>
                        <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0 bg-muted/50 border-border/80 text-muted-foreground">
                          Student
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Joined {new Date(student.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(student.id, `mobile-id-${student.id}`)}
                      className="p-1.5 rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground text-[10px] font-mono flex items-center gap-1"
                      title="Copy Student UUID"
                    >
                      {copiedId === `mobile-id-${student.id}` ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>ID</span>
                    </button>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-[11px]">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <span>{student.phone ? `+91 ${student.phone}` : "No mobile number"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] truncate">
                    <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{student.email || "No email registered"}</span>
                  </div>
                </div>

                {/* Courses & Progress */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Enrolled Courses ({studentEnrollments.length})
                  </span>
                  {studentEnrollments.length > 0 ? (
                    studentEnrollments.map((enr) => {
                      const course = courses.find((c) => c.id === enr.courseId);
                      const isExpired = enr.expiresAt && new Date(enr.expiresAt) < new Date();
                      const progress = getStudentCourseProgress(student.id, enr.courseId);

                      return (
                        <div
                          key={enr.id}
                          className="bg-card p-3 rounded-xl border border-border/70 space-y-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="font-bold text-foreground block truncate text-xs font-outfit">
                                {course?.title || "Enrolled Course"}
                              </span>
                              <span className="text-[10px] text-muted-foreground block">
                                {enr.expiresAt ? (
                                  <>
                                    Expires:{" "}
                                    {new Date(enr.expiresAt).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </>
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Lifetime Access
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase",
                                  isExpired
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                )}
                              >
                                {isExpired ? "Expired" : "Active"}
                              </Badge>
                              <button
                                type="button"
                                onClick={() =>
                                  openExtendModal(
                                    enr,
                                    student.full_name || "Student",
                                    course?.title || "Course"
                                  )
                                }
                                className="text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md"
                              >
                                Extend
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                              <span>
                                {progress.completedCount} / {progress.totalLessons} lessons
                              </span>
                              <span className="font-bold text-foreground">
                                {progress.percentage}%
                              </span>
                            </div>
                            <Progress value={progress.percentage} className="h-1.5 bg-muted rounded-full" />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">No active enrollments</p>
                  )}
                </div>

                {/* Certificates / Orders Badges */}
                {(studentCertificates.length > 0 || studentOrders.length > 0) && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50 text-[11px]">
                    {studentCertificates.map((cert) => (
                      <span
                        key={cert.id}
                        className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded-lg font-bold text-[10px]"
                      >
                        <Award className="h-3 w-3" />
                        {cert.certificateCode}
                      </span>
                    ))}
                    {studentOrders.length > 0 && (
                      <span className="text-muted-foreground text-[10px] flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        {studentOrders.length} {studentOrders.length === 1 ? "order" : "orders"}
                      </span>
                    )}
                  </div>
                )}

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveDossierStudent(student);
                      setDossierTab("courses");
                    }}
                    className="flex-1 rounded-xl text-xs font-semibold gap-1.5 h-9"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Dossier</span>
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openEnrollModalForStudent(student.id)}
                    className="flex-1 rounded-xl text-xs font-bold gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 h-9"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>Enroll Course</span>
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-border/80 shadow-2xs p-8 text-center text-muted-foreground space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <h4 className="text-base font-bold text-foreground font-outfit">No students match search</h4>
            <p className="text-xs text-muted-foreground">Try clearing your search query or reset filters.</p>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* STUDENT PROFILE & LEARNING DOSSIER MODAL / SLIDE-OVER */}
      {/* ========================================================================= */}
      {activeDossierStudent && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-border/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Dossier Header Banner */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/80 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-md">
                  {activeDossierStudent.avatar_url && (
                    <AvatarImage src={activeDossierStudent.avatar_url} alt={activeDossierStudent.full_name || "Student"} />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-base">
                    {activeDossierStudent.full_name
                      ? activeDossierStudent.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "ST"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                      {activeDossierStudent.full_name || "Registered Student"}
                    </h3>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                      Student Profile
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {activeDossierStudent.phone ? `+91 ${activeDossierStudent.phone}` : "No phone"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {activeDossierStudent.email || "No email"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(activeDossierStudent.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDossierStudent(null)}
                className="h-8 w-8 rounded-xl bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dossier Quick Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-muted/30 border-b border-border/60">
              {(() => {
                const sEnrs = enrollmentsList.filter((e) => e.userId === activeDossierStudent.id);
                const sCerts = certificates.filter((c) => c.userId === activeDossierStudent.id);
                const sOrders = orders.filter((o) => o.userId === activeDossierStudent.id);
                const sLessons = getStudentTotalCompletedLessons(activeDossierStudent.id);
                const totalSpent = sOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

                return (
                  <>
                    <div className="bg-card p-3 rounded-xl border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Courses Enrolled
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-outfit text-foreground mt-0.5 block">
                        {sEnrs.length}
                      </span>
                    </div>

                    <div className="bg-card p-3 rounded-xl border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Lessons Completed
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-outfit text-primary mt-0.5 block">
                        {sLessons}
                      </span>
                    </div>

                    <div className="bg-card p-3 rounded-xl border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Certificates
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-outfit text-sky-600 dark:text-sky-400 mt-0.5 block">
                        {sCerts.length}
                      </span>
                    </div>

                    <div className="bg-card p-3 rounded-xl border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Orders & Spend
                      </span>
                      <span className="text-lg sm:text-xl font-bold font-outfit text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                        ₹{totalSpent.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="flex border-b border-border/80 px-4 sm:px-6 bg-card">
              <button
                type="button"
                onClick={() => setDossierTab("courses")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
                  dossierTab === "courses"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Enrolled Courses & Progress</span>
              </button>

              <button
                type="button"
                onClick={() => setDossierTab("certificates")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
                  dossierTab === "certificates"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Award className="h-3.5 w-3.5" />
                <span>Issued Certificates</span>
              </button>

              <button
                type="button"
                onClick={() => setDossierTab("orders")}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all",
                  dossierTab === "orders"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Billing & Orders</span>
              </button>
            </div>

            {/* Dossier Body Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 max-h-[50vh]">
              {/* TAB 1: Enrolled Courses */}
              {dossierTab === "courses" && (
                <div className="space-y-3">
                  {(() => {
                    const studentEnrollments = enrollmentsList.filter(
                      (e) => e.userId === activeDossierStudent.id
                    );

                    if (studentEnrollments.length === 0) {
                      return (
                        <div className="text-center py-10 text-muted-foreground space-y-2">
                          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
                          <h5 className="font-bold text-sm text-foreground">No Course Enrollments</h5>
                          <p className="text-xs">This student has not enrolled in any courses yet.</p>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              openEnrollModalForStudent(activeDossierStudent.id);
                            }}
                            className="mt-2 text-xs font-bold"
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                            Grant Course Access
                          </Button>
                        </div>
                      );
                    }

                    return studentEnrollments.map((enr) => {
                      const course = courses.find((c) => c.id === enr.courseId);
                      const isExpired = enr.expiresAt && new Date(enr.expiresAt) < new Date();
                      const progress = getStudentCourseProgress(activeDossierStudent.id, enr.courseId);

                      return (
                        <div
                          key={enr.id}
                          className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <h5 className="font-bold text-sm text-foreground font-outfit">
                                {course?.title || "Enrolled Course"}
                              </h5>
                              <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
                                <span>
                                  Enrolled: {new Date(enr.enrolledAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                <span>•</span>
                                <span>
                                  {enr.expiresAt ? (
                                    <>
                                      Expires:{" "}
                                      {new Date(enr.expiresAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      Lifetime Access
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                  isExpired
                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                )}
                              >
                                {isExpired ? "Expired" : "Active"}
                              </Badge>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  openExtendModal(
                                    enr,
                                    activeDossierStudent.full_name || "Student",
                                    course?.title || "Course"
                                  )
                                }
                                className="h-7 text-xs font-semibold rounded-lg"
                              >
                                <CalendarPlus className="h-3 w-3 mr-1" />
                                Extend Validity
                              </Button>
                            </div>
                          </div>

                          {/* Progress bar and details */}
                          <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border/60">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">
                                Curriculum Completion Progress
                              </span>
                              <span className="font-bold text-foreground font-outfit">
                                {progress.completedCount} / {progress.totalLessons} lessons ({progress.percentage}%)
                              </span>
                            </div>
                            <Progress value={progress.percentage} className="h-2 bg-muted rounded-full" />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* TAB 2: Issued Certificates */}
              {dossierTab === "certificates" && (
                <div className="space-y-3">
                  {(() => {
                    const studentCerts = certificates.filter(
                      (c) => c.userId === activeDossierStudent.id
                    );

                    if (studentCerts.length === 0) {
                      return (
                        <div className="text-center py-10 text-muted-foreground space-y-2">
                          <Award className="h-10 w-10 mx-auto text-muted-foreground/40" />
                          <h5 className="font-bold text-sm text-foreground">No Issued Certificates</h5>
                          <p className="text-xs">
                            This student has not yet completed a certified course curriculum.
                          </p>
                        </div>
                      );
                    }

                    return studentCerts.map((cert) => {
                      const course = courses.find((c) => c.id === cert.courseId);

                      return (
                        <div
                          key={cert.id}
                          className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="font-bold text-sm text-foreground font-outfit">
                                {course?.title || "Certificate of Completion"}
                              </h5>
                              <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                                <span className="font-mono font-bold text-foreground">
                                  {cert.certificateCode}
                                </span>
                                <span>•</span>
                                <span>
                                  Issued: {new Date(cert.issuedAt).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/verify/${cert.certificateCode}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Verify</span>
                            </Link>
                            {cert.pdfUrl && (
                              <a
                                href={cert.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-2xs"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>PDF</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* TAB 3: Orders & Billing */}
              {dossierTab === "orders" && (
                <div className="space-y-3">
                  {(() => {
                    const studentOrders = orders.filter(
                      (o) => o.userId === activeDossierStudent.id
                    );

                    if (studentOrders.length === 0) {
                      return (
                        <div className="text-center py-10 text-muted-foreground space-y-2">
                          <Receipt className="h-10 w-10 mx-auto text-muted-foreground/40" />
                          <h5 className="font-bold text-sm text-foreground">No Purchase Orders</h5>
                          <p className="text-xs">
                            No billing transactions found for this student account.
                          </p>
                        </div>
                      );
                    }

                    return studentOrders.map((order) => {
                      const course = courses.find((c) => c.id === order.courseId);

                      return (
                        <div
                          key={order.id}
                          className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground font-outfit">
                                {course?.title || "Course Enrollment"}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.2 rounded-full uppercase",
                                  order.status === "paid"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                )}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground font-mono">
                              <span>Razorpay ID: {order.razorpayOrderId}</span>
                              {order.razorpayPaymentId && (
                                <span>• Payment ID: {order.razorpayPaymentId}</span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block">
                              Date: {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="text-right sm:shrink-0">
                            <span className="text-base font-bold text-foreground font-outfit block">
                              ₹{Number(order.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Total Invoiced</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Dossier Footer */}
            <div className="p-4 sm:p-5 border-t border-border/80 bg-muted/20 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  openEnrollModalForStudent(activeDossierStudent.id);
                }}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Grant New Course</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveDossierStudent(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIRECT COURSE ENROLLMENT MODAL */}
      {/* ========================================================================= */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Manual Course Enrollment
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Assign course access directly to a registered learner.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {enrollError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{enrollError}</span>
              </div>
            )}

            <form onSubmit={handleEnrollStudent} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Student
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full border border-input rounded-xl p-2.5 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Student Account --</option>
                  {initialStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name || "Student"} ({s.phone ? `+91 ${s.phone}` : s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Select Course
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full border border-input rounded-xl p-2.5 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.access_days ? `${c.access_days} days default` : "Lifetime Access"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Custom Access Duration (Days)
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Leave blank for course default duration"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="rounded-xl text-xs font-medium tabular-nums h-10"
                />
                <p className="text-[10px] text-muted-foreground">
                  Optional. Overrides the course access duration in days.
                </p>
              </div>

              {selectedCourseId && (
                <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Calculated Validity
                  </span>
                  <span className="font-semibold text-foreground">
                    {getEstimatedExpiryPreview()}
                  </span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
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
                  disabled={enrollLoading || !selectedStudentId || !selectedCourseId}
                  className="flex-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {enrollLoading ? "Granting Access..." : "Confirm Enrollment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXTEND ACCESS DURATION MODAL */}
      {/* ========================================================================= */}
      {isExtendModalOpen && targetEnrollment && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Extend Course Access
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add extra days to student enrollment validity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {extendError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{extendError}</span>
              </div>
            )}

            <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60 space-y-1 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Learner:
                </span>
                <span className="font-bold text-foreground block">{targetStudentName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Course:
                </span>
                <span className="font-semibold text-foreground block">{targetCourseTitle}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Current Expiration:
                </span>
                <span className="font-medium text-muted-foreground block">
                  {targetEnrollment.expiresAt
                    ? new Date(targetEnrollment.expiresAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "Lifetime Access"}
                </span>
              </div>
            </div>

            <form onSubmit={handleExtendAccess} className="space-y-4 pt-1">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Additional Days to Add
                </label>
                
                {/* Quick Presets */}
                <div className="grid grid-cols-4 gap-2">
                  {["30", "60", "90", "365"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAdditionalDays(preset)}
                      className={cn(
                        "py-1.5 text-xs font-bold rounded-lg border transition-all",
                        additionalDays === preset
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border/80 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      +{preset}d
                    </button>
                  ))}
                </div>

                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 30"
                  value={additionalDays}
                  onChange={(e) => setAdditionalDays(e.target.value)}
                  className="rounded-xl text-xs font-bold tabular-nums h-10 mt-2"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-2">
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
                  disabled={extendLoading || !additionalDays}
                  className="flex-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {extendLoading ? "Extending..." : `Add ${additionalDays || 0} Days`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
