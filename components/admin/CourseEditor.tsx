"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Video,
  BookOpen,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  HelpCircle,
  Eye,
  IndianRupee,
  Image as ImageIcon,
  Check,
  Paperclip,
  Download,
  Loader2,
  Upload,
  Settings,
  ChevronDown,
  ChevronUp,
  Award,
  ShieldCheck,
  Search,
  Users,
  RefreshCw,
  Radio,
  CalendarClock,
  LinkIcon,
  Lock,
} from "lucide-react";
import { VideoUploader } from "@/components/admin/VideoUploader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface FormattedMaterial {
  id: string;
  title: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
}

import { getLessonAvailability, formatISTDateTime } from "@/lib/lesson-availability";

export interface FormattedLesson {
  id: string;
  module_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_id?: string | null;
  video_status?: string | null;
  order_index: number;
  is_free_preview: boolean;
  delivery_type: 'recorded' | 'live';
  scheduled_at?: string | null;
  release_at?: string | null;
  duration_minutes?: number | null;
  meeting_url?: string | null;
  materials?: FormattedMaterial[];
}

export interface FormattedSection {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
}

export interface FormattedModule {
  id: string;
  course_id: string;
  section_id?: string | null;
  title: string;
  order_index: number;
}

export interface CourseEditorProps {
  course: {
    id: string;
    title: string;
    slug?: string | null;
    description: string;
    price: number;
    thumbnail_url: string;
    is_published: boolean;
    is_bundle?: boolean | null;
    access_days?: number | null;
    certificate_status?: 'disabled' | 'active' | 'paused';
    certificate_activated_at?: string | null;
    certificate_activated_by?: string | null;
  };
  initialSections?: FormattedSection[];
  initialModules: FormattedModule[];
  initialLessons: FormattedLesson[];
}

export default function CourseEditor({
  course,
  initialSections = [],
  initialModules = [],
  initialLessons = [],
}: CourseEditorProps) {
  const router = useRouter();

  // Active Tab: Prioritize bundle management if course is configured as a bundle
  const [activeTab, setActiveTab] = useState<"curriculum" | "settings" | "certificates" | "bundle">(
    course.is_bundle ? "bundle" : "curriculum"
  );

  // Course Properties State
  const [title, setTitle] = useState(course.title || "");
  const [description, setDescription] = useState(course.description || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [price, setPrice] = useState(course.price ? String(course.price) : "");
  const [accessDays, setAccessDays] = useState(
    course.access_days !== null && course.access_days !== undefined ? String(course.access_days) : ""
  );
  const [isPublished, setIsPublished] = useState(course.is_published || false);
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Bundle Management State
  const [isBundle, setIsBundle] = useState<boolean>(Boolean(course.is_bundle));
  const [selectedBundleCourseIds, setSelectedBundleCourseIds] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Array<{
    id: string;
    title: string;
    slug: string | null;
    price: string | number;
    thumbnailUrl: string | null;
    isPublished: boolean;
  }>>([]);
  const [loadingBundleData, setLoadingBundleData] = useState(false);
  const [savingBundle, setSavingBundle] = useState(false);
  const [bundleActionSuccessMsg, setBundleActionSuccessMsg] = useState<string | null>(null);
  const [bundleActionErrorMsg, setBundleActionErrorMsg] = useState<string | null>(null);
  const [bundleSearchTerm, setBundleSearchTerm] = useState("");

  // Certificate Management State
  const [certStatus, setCertStatus] = useState<'disabled' | 'active' | 'paused'>(
    course.certificate_status || 'disabled'
  );
  const [certActivatedAt, setCertActivatedAt] = useState<string | null>(
    course.certificate_activated_at || null
  );
  const [certActivatedBy, setCertActivatedBy] = useState<{ id: string; name: string } | null>(null);
  const [certStats, setCertStats] = useState<{
    totalEnrolled: number;
    totalCompleted: number;
    totalEligible: number;
    totalIssued: number;
    pendingEligibleCount: number;
  }>({
    totalEnrolled: 0,
    totalCompleted: 0,
    totalEligible: 0,
    totalIssued: 0,
    pendingEligibleCount: 0,
  });
  const [certStudents, setCertStudents] = useState<Array<{
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    enrolledAt: string;
    progressPercent: number;
    completedLessons: number;
    totalLessons: number;
    isCompleted: boolean;
    status: string;
    certificateCode: string | null;
    certificateIssuedAt: string | null;
    pdfUrl: string | null;
    issuedBy: string | null;
  }>>([]);
  const [loadingCertData, setLoadingCertData] = useState(false);
  const [updatingCertStatus, setUpdatingCertStatus] = useState(false);
  const [generatingCerts, setGeneratingCerts] = useState(false);
  const [generatingSingleId, setGeneratingSingleId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [studentFilterTab, setStudentFilterTab] = useState<"all" | "eligible" | "issued" | "in_progress">("all");
  const [certActionSuccessMsg, setCertActionSuccessMsg] = useState<string | null>(null);
  const [certActionErrorMsg, setCertActionErrorMsg] = useState<string | null>(null);

  const fetchCertificatesData = useCallback(async () => {
    setLoadingCertData(true);
    setCertActionErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/certificates`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCertStatus(data.course.certificateStatus);
        setCertActivatedAt(data.course.certificateActivatedAt);
        setCertActivatedBy(data.course.certificateActivatedBy);
        setCertStats(data.stats);
        setCertStudents(data.students);
      }
    } catch (err: any) {
      console.error("Failed to fetch certificate data:", err);
    } finally {
      setLoadingCertData(false);
    }
  }, [course.id]);

  const fetchBundleData = useCallback(async () => {
    setLoadingBundleData(true);
    setBundleActionErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/bundle`);
      const data = await res.json();
      if (res.ok) {
        setIsBundle(Boolean(data.isBundle));
        setSelectedBundleCourseIds(data.bundleItems?.map((bi: any) => bi.courseId) || []);
        setAvailableCourses(data.availableCourses || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch bundle data:", err);
    } finally {
      setLoadingBundleData(false);
    }
  }, [course.id]);

  useEffect(() => {
    if (activeTab === "bundle") {
      fetchBundleData();
    }
  }, [activeTab, fetchBundleData]);

  const handleSaveBundle = async () => {
    setSavingBundle(true);
    setBundleActionSuccessMsg(null);
    setBundleActionErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/bundle`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isBundle,
          includedCourseIds: selectedBundleCourseIds,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBundleActionSuccessMsg("Bundle configuration saved successfully!");
        setIsBundle(data.isBundle);
      } else {
        setBundleActionErrorMsg(data.error || "Failed to save bundle configuration.");
      }
    } catch (err: any) {
      setBundleActionErrorMsg(err.message || "Network error while saving bundle.");
    } finally {
      setSavingBundle(false);
    }
  };

  const handleUpdateCertStatus = async (newStatus: "disabled" | "active" | "paused") => {
    setUpdatingCertStatus(true);
    setCertActionSuccessMsg(null);
    setCertActionErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/courses/${course.id}/certificates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update certificate status");

      setCertStatus(data.course.certificateStatus);
      setCertActivatedAt(data.course.certificateActivatedAt);
      setCertActionSuccessMsg(
        newStatus === "active"
          ? "Certificate issuance is now ACTIVE. Eligible students can claim certificates."
          : newStatus === "paused"
          ? "Certificate issuance is PAUSED."
          : "Certificate issuance is DISABLED."
      );
      await fetchCertificatesData();
    } catch (err: any) {
      setCertActionErrorMsg(err.message || "Failed to update status");
    } finally {
      setUpdatingCertStatus(false);
    }
  };

  const handleIssueBatch = async (allEligible: boolean = false) => {
    setGeneratingCerts(true);
    setCertActionSuccessMsg(null);
    setCertActionErrorMsg(null);
    try {
      const res = await fetch("/api/admin/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          studentIds: allEligible ? undefined : selectedStudentIds,
          allEligible,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue certificates");

      const r = data.results;
      setCertActionSuccessMsg(
        `Batch generation complete: ${r.issuedCount} issued, ${r.alreadyIssuedCount} already had certificates, ${r.skippedCount} skipped.`
      );
      setSelectedStudentIds([]);
      await fetchCertificatesData();
    } catch (err: any) {
      setCertActionErrorMsg(err.message || "Failed to issue certificates");
    } finally {
      setGeneratingCerts(false);
    }
  };

  const handleIssueIndividual = async (studentId: string) => {
    setGeneratingSingleId(studentId);
    setCertActionSuccessMsg(null);
    setCertActionErrorMsg(null);
    try {
      const res = await fetch("/api/admin/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          studentIds: [studentId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate certificate");

      setCertActionSuccessMsg("Certificate generated successfully and emailed to student.");
      await fetchCertificatesData();
    } catch (err: any) {
      setCertActionErrorMsg(err.message || "Failed to generate certificate");
    } finally {
      setGeneratingSingleId(null);
    }
  };

  // Curriculum State
  const [sections, setSections] = useState<FormattedSection[]>(initialSections || []);
  const [modules, setModules] = useState<FormattedModule[]>(initialModules || []);
  const [lessons, setLessons] = useState<FormattedLesson[]>(initialLessons || []);

  // Section state
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [editingSection, setEditingSection] = useState<FormattedSection | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionDescription, setNewSectionDescription] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Module state
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [editingModule, setEditingModule] = useState<FormattedModule | null>(null);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleSectionId, setNewModuleSectionId] = useState<string | null>(null);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Lesson Modal state
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<FormattedLesson | null>(null);
  const [lessonModalTab, setLessonModalTab] = useState<"details" | "video" | "materials">("details");

  // Lesson Form state
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSavedVideoId, setLessonSavedVideoId] = useState<string | null>(null);
  const [lessonSavedVideoStatus, setLessonSavedVideoStatus] = useState<string | null>(null);
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [lessonOrder, setLessonOrder] = useState("1");
  const [lessonDeliveryType, setLessonDeliveryType] = useState<'recorded' | 'live'>('recorded');
  const [lessonScheduledAt, setLessonScheduledAt] = useState("");
  const [lessonReleaseAt, setLessonReleaseAt] = useState("");
  const [lessonDuration, setLessonDuration] = useState("");
  const [lessonMeetingUrl, setLessonMeetingUrl] = useState("");
  const [lessonMaterialsList, setLessonMaterialsList] = useState<FormattedMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  // Delete Modals
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<FormattedSection | null>(null);
  const [moduleToDelete, setModuleToDelete] = useState<FormattedModule | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<FormattedLesson | null>(null);

  // Thumbnail Upload state
  const [uploadingThumb, setUploadingThumb] = useState(false);

  // Toggle Section Collapse
  const toggleSectionCollapse = (secId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [secId]: !prev[secId] }));
  };

  // Toggle Module Collapse
  const toggleModuleCollapse = (modId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  // Save Course Info
  const handleSaveCourse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !price) return;

    setLoadingCourse(true);
    setSaveSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: course.id,
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          price: parseFloat(price),
          accessDays: accessDays ? parseInt(accessDays) : null,
          isPublished,
        }),
      });

      if (res.ok) {
        setSaveSuccessMsg("Course details updated successfully!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update course properties");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save course");
    } finally {
      setLoadingCourse(false);
    }
  };

  // Toggle Course Publishing
  const handleTogglePublish = async () => {
    const nextPublished = !isPublished;
    setIsPublished(nextPublished);
    setLoadingCourse(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: course.id,
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          price: parseFloat(price),
          accessDays: accessDays ? parseInt(accessDays) : null,
          isPublished: nextPublished,
        }),
      });

      if (res.ok) {
        setSaveSuccessMsg(nextPublished ? "Course published live!" : "Course moved to draft.");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      }
    } catch (err: any) {
      setIsPublished(!nextPublished); // revert
      alert("Failed to change publishing status");
    } finally {
      setLoadingCourse(false);
    }
  };

  // Handle Thumbnail File Upload
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", course.id);

      const res = await fetch("/api/admin/upload-thumbnail", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setThumbnailUrl(data.url);
        setSaveSuccessMsg("Thumbnail uploaded successfully!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        alert(data.error || "Failed to upload thumbnail");
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload thumbnail");
    } finally {
      setUploadingThumb(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async () => {
    setDeletingCourse(true);
    try {
      const res = await fetch(`/api/admin/courses?id=${course.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.href = "/admin/courses";
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete course");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while deleting the course.");
    } finally {
      setDeletingCourse(false);
      setShowDeleteCourseModal(false);
    }
  };

  // Section Handlers
  const openAddSection = () => {
    setEditingSection(null);
    setNewSectionTitle("");
    setNewSectionDescription("");
    setShowSectionInput(true);
  };

  const openEditSection = (sec: FormattedSection) => {
    setEditingSection(sec);
    setNewSectionTitle(sec.title);
    setNewSectionDescription(sec.description || "");
    setShowSectionInput(true);
  };

  const handleSaveSection = async () => {
    if (!newSectionTitle.trim()) return;

    try {
      const orderIndex = editingSection ? editingSection.order_index : sections.length + 1;
      const res = await fetch("/api/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "section",
          sectionId: editingSection?.id,
          courseId: course.id,
          title: newSectionTitle.trim(),
          description: newSectionDescription.trim() || null,
          orderIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.section) {
        const formatted: FormattedSection = {
          id: data.section.id,
          course_id: data.section.courseId,
          title: data.section.title,
          description: data.section.description || "",
          order_index: data.section.orderIndex,
        };

        if (editingSection) {
          setSections(sections.map((s) => (s.id === formatted.id ? formatted : s)));
        } else {
          setSections([...sections, formatted]);
        }
        setNewSectionTitle("");
        setNewSectionDescription("");
        setEditingSection(null);
        setShowSectionInput(false);
      } else {
        alert(data.error || "Failed to save section");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save section");
    }
  };

  const confirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      const res = await fetch(`/api/admin/curriculum?type=section&id=${sectionToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSections(sections.filter((s) => s.id !== sectionToDelete.id));
        setModules(
          modules.map((m) => (m.section_id === sectionToDelete.id ? { ...m, section_id: null } : m))
        );
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete section");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete section");
    } finally {
      setSectionToDelete(null);
    }
  };

  // Module Handlers
  const openAddModule = (sectionId?: string | null) => {
    setEditingModule(null);
    setNewModuleTitle("");
    setNewModuleSectionId(sectionId || null);
    setShowModuleInput(true);
  };

  const openEditModule = (mod: FormattedModule) => {
    setEditingModule(mod);
    setNewModuleTitle(mod.title);
    setNewModuleSectionId(mod.section_id || null);
    setShowModuleInput(true);
  };

  const handleSaveModule = async () => {
    if (!newModuleTitle.trim()) return;

    try {
      const orderIndex = editingModule ? editingModule.order_index : modules.length + 1;
      const res = await fetch("/api/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "module",
          moduleId: editingModule?.id,
          courseId: course.id,
          sectionId: newModuleSectionId || null,
          title: newModuleTitle.trim(),
          orderIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.module) {
        const formatted: FormattedModule = {
          id: data.module.id,
          course_id: data.module.courseId,
          section_id: data.module.sectionId || null,
          title: data.module.title,
          order_index: data.module.orderIndex,
        };

        if (editingModule) {
          setModules(modules.map((m) => (m.id === formatted.id ? formatted : m)));
        } else {
          setModules([...modules, formatted]);
        }
        setNewModuleTitle("");
        setNewModuleSectionId(null);
        setEditingModule(null);
        setShowModuleInput(false);
      } else {
        alert(data.error || "Failed to save module");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save module");
    }
  };

  // Delete Module
  const confirmDeleteModule = async () => {
    if (!moduleToDelete) return;
    try {
      const res = await fetch(`/api/admin/curriculum?type=module&id=${moduleToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setModules(modules.filter((m) => m.id !== moduleToDelete.id));
        setLessons(lessons.filter((l) => l.module_id !== moduleToDelete.id));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete module");
    } finally {
      setModuleToDelete(null);
    }
  };

  // Open Lesson Modal (Create)
  const openAddLesson = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonSavedVideoId(null);
    setLessonSavedVideoStatus(null);
    setLessonIsFree(false);
    setLessonDeliveryType('recorded');
    setLessonScheduledAt("");
    setLessonReleaseAt("");
    setLessonDuration("");
    setLessonMeetingUrl("");
    setLessonMaterialsList([]);
    const moduleLessons = lessons.filter((l) => l.module_id === moduleId);
    setLessonOrder(String(moduleLessons.length + 1));
    setLessonModalTab("details");
    setShowLessonModal(true);
  };

  // Open Lesson Modal (Edit)
  const openEditLesson = (lesson: FormattedLesson) => {
    setEditingLesson(lesson);
    setActiveModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonSavedVideoId(lesson.video_id || lesson.video_url || null);
    setLessonSavedVideoStatus(lesson.video_status || null);
    setLessonIsFree(lesson.is_free_preview || false);
    setLessonOrder(String(lesson.order_index));
    setLessonDeliveryType(lesson.delivery_type || 'recorded');
    setLessonScheduledAt(lesson.scheduled_at ? new Date(lesson.scheduled_at).toISOString().slice(0, 16) : "");
    setLessonReleaseAt(lesson.release_at ? new Date(lesson.release_at).toISOString().slice(0, 16) : "");
    setLessonDuration(lesson.duration_minutes ? String(lesson.duration_minutes) : "");
    setLessonMeetingUrl(lesson.meeting_url || "");
    setLessonMaterialsList(lesson.materials || []);
    setLessonModalTab("details");
    setShowLessonModal(true);
  };

  // Save Lesson
  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) return;

    setSavingLesson(true);
    try {
      const res = await fetch("/api/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lesson",
          lessonId: editingLesson?.id,
          moduleId: activeModuleId,
          title: lessonTitle.trim(),
          content: lessonContent.trim() || null,
          videoUrl: lessonSavedVideoId || undefined,
          isFreePreview: lessonIsFree,
          orderIndex: parseInt(lessonOrder) || 1,
          deliveryType: lessonDeliveryType,
          scheduledAt: lessonDeliveryType === 'live' ? (lessonScheduledAt || null) : null,
          releaseAt: lessonDeliveryType === 'recorded' ? (lessonReleaseAt || null) : null,
          durationMinutes: lessonDeliveryType === 'live' ? (lessonDuration || null) : null,
          meetingUrl: lessonDeliveryType === 'live' ? (lessonMeetingUrl.trim() || null) : null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.lesson) {
        const formattedLesson: FormattedLesson = {
          id: data.lesson.id,
          module_id: data.lesson.moduleId,
          title: data.lesson.title,
          content: data.lesson.content,
          video_url: data.lesson.videoUrl,
          video_id: lessonSavedVideoId || (data.lesson.videoUrl || null),
          video_status: lessonSavedVideoStatus || null,
          order_index: data.lesson.orderIndex,
          is_free_preview: data.lesson.isFreePreview,
          delivery_type: data.lesson.deliveryType || 'recorded',
          scheduled_at: data.lesson.scheduledAt || null,
          release_at: data.lesson.releaseAt || null,
          duration_minutes: data.lesson.durationMinutes || null,
          meeting_url: data.lesson.meetingUrl || null,
          materials: lessonMaterialsList,
        };

        if (editingLesson) {
          setLessons(lessons.map((l) => (l.id === formattedLesson.id ? formattedLesson : l)));
        } else {
          setLessons([...lessons, formattedLesson]);
        }
        setShowLessonModal(false);
      } else {
        alert(data.error || "Failed to save lesson");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save lesson");
    } finally {
      setSavingLesson(false);
    }
  };

  // Delete Lesson
  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;

    try {
      const res = await fetch(`/api/admin/curriculum?type=lesson&id=${lessonToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLessons(lessons.filter((l) => l.id !== lessonToDelete.id));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete lesson");
    } finally {
      setLessonToDelete(null);
    }
  };

  // Upload Material to Lesson
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingLesson?.id) return;

    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("lessonId", editingLesson.id);
      formData.append("title", file.name);

      const res = await fetch("/api/admin/lesson-materials", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.material) {
        const newMat: FormattedMaterial = {
          id: data.material.id,
          title: data.material.title,
          file_url: data.material.fileUrl,
          file_type: data.material.fileType,
          file_size: data.material.fileSize,
        };
        const updatedList = [...lessonMaterialsList, newMat];
        setLessonMaterialsList(updatedList);
        setLessons((prev) =>
          prev.map((l) => (l.id === editingLesson.id ? { ...l, materials: updatedList } : l))
        );
      } else {
        alert(data.error || "Failed to upload lesson material");
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload material");
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Delete Material from Lesson
  const handleDeleteMaterial = async (matId: string) => {
    try {
      const res = await fetch("/api/admin/lesson-materials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: matId }),
      });

      if (res.ok) {
        const updatedList = lessonMaterialsList.filter((m) => m.id !== matId);
        setLessonMaterialsList(updatedList);
        if (editingLesson?.id) {
          setLessons((prev) =>
            prev.map((l) => (l.id === editingLesson.id ? { ...l, materials: updatedList } : l))
          );
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete material");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16 animate-fade-in">
      {/* Delete Course Confirmation Modal */}
      {showDeleteCourseModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Course?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Permanent catalog deletion</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong>{course.title}</strong>? This will permanently delete the course, all its modules, lessons, student progress, enrollments, and associated video assets.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deletingCourse}
                onClick={() => setShowDeleteCourseModal(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingCourse}
                onClick={handleDeleteCourse}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                {deletingCourse ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting Course...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Entire Course</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Section Confirmation Modal */}
      {sectionToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Section?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Section removal</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete section <strong>{sectionToDelete.title}</strong>? Any modules inside will become standalone unassigned modules.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSectionToDelete(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteSection}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Section</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Module Confirmation Modal */}
      {moduleToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Module?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Module &amp; lessons removal</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong>{moduleToDelete.title}</strong>? All lessons inside this module will also be deleted.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModuleToDelete(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteModule}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Module</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lesson Confirmation Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Lesson?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Curriculum removal</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong>{lessonToDelete.title}</strong>? Associated video assets and lesson materials will be removed.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLessonToDelete(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteLesson}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Lesson</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="h-4 w-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Courses</span>
          </Link>
          
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight truncate">
              {title || course.title}
            </h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                isPublished
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isPublished ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {modules.length} modules • {lessons.length} lessons • Tuition: ₹{Number(price || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start xl:self-auto">
          {course.slug && (
            <Link
              href={`/courses/${course.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border/80 rounded-xl bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs"
              title="View Public Course Page"
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span>Public Page</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </Link>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTogglePublish}
            disabled={loadingCourse}
            className={cn(
              "rounded-xl text-xs font-semibold h-10 px-3.5 cursor-pointer",
              isPublished
                ? "text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                : "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
            )}
          >
            {isPublished ? "Unpublish to Draft" : "Publish Course Live"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveCourse()}
            disabled={loadingCourse}
            className="rounded-xl text-xs font-bold gap-2 h-10 px-4 shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{loadingCourse ? "Saving..." : "Save Details"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs
        value={activeTab}
        onValueChange={(val: string) => setActiveTab(val as any)}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/80 flex flex-wrap sm:inline-flex max-w-full h-auto">
          <TabsTrigger
            value="curriculum"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all flex-1 sm:flex-initial"
          >
            <Layers className="h-4 w-4" />
            <span>Curriculum &amp; Syllabus ({modules.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all flex-1 sm:flex-initial"
          >
            <Settings className="h-4 w-4" />
            <span>Course Settings &amp; Pricing</span>
          </TabsTrigger>
          <TabsTrigger
            value="certificates"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all flex-1 sm:flex-initial"
          >
            <Award className="h-4 w-4" />
            <span>Certificates &amp; Issuance</span>
            {certStats.totalEligible > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">
                {certStats.totalEligible}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="bundle"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all flex-1 sm:flex-initial"
          >
            <Layers className="h-4 w-4" />
            <span>Course Bundle ({selectedBundleCourseIds.length})</span>
            {isBundle && (
              <span className="ml-1 px-1.5 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] font-bold">
                Active
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CURRICULUM BUILDER */}
        <TabsContent value="curriculum" className="space-y-6 m-0">
          {isBundle && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-primary flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  <span>Course Bundle Mode Active</span>
                </span>
                <p className="text-muted-foreground">
                  Bundle courses are managed through <strong>Included Courses</strong>. This bundle does not need its own lessons.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveTab("bundle")}
                className="bg-primary text-primary-foreground font-bold rounded-xl text-xs h-9 px-4 shrink-0 shadow-xs cursor-pointer"
              >
                Configure Included Courses →
              </Button>
            </div>
          )}

          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Curriculum Structure &amp; Learning Hierarchy</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize courses with Sections, Modules, and reusable Video Lessons with derived numbering.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openAddSection}
                  className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Section</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openAddModule(null)}
                  className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Module</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Add / Edit Section Inline Form */}
              {showSectionInput && (
                <div className="p-5 bg-primary/5 border border-primary/30 rounded-3xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary font-outfit">
                      {editingSection ? "Edit Course Section" : "Create New Course Section"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSectionInput(false);
                        setEditingSection(null);
                      }}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Section Title <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="e.g. AI Skills, Digital Marketing, Excel Mastery"
                        value={newSectionTitle}
                        onChange={(e) => setNewSectionTitle(e.target.value)}
                        className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-background"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Short Description (Optional)
                      </label>
                      <Input
                        placeholder="e.g. Master generative AI tools, prompt engineering, and LLMs"
                        value={newSectionDescription}
                        onChange={(e) => setNewSectionDescription(e.target.value)}
                        className="h-10 text-xs sm:text-sm rounded-xl bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSectionInput(false);
                        setEditingSection(null);
                      }}
                      className="rounded-xl text-xs font-semibold h-9 px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveSection}
                      className="rounded-xl text-xs font-bold h-9 px-5 shadow-xs"
                    >
                      {editingSection ? "Update Section" : "Create Section"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Add / Edit Module Inline Form */}
              {showModuleInput && (
                <div className="p-5 bg-muted/40 border border-border/80 rounded-3xl space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground font-outfit">
                      {editingModule ? "Edit Syllabus Module" : "Create New Syllabus Module"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModuleInput(false);
                        setEditingModule(null);
                        setNewModuleSectionId(null);
                      }}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Module Title <span className="text-destructive">*</span>
                      </label>
                      <Input
                        placeholder="e.g. Introduction to AI, Marketing Fundamentals"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        className="h-10 text-xs sm:text-sm font-semibold rounded-xl bg-background"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Assign to Section
                      </label>
                      <select
                        value={newModuleSectionId || ""}
                        onChange={(e) => setNewModuleSectionId(e.target.value || null)}
                        className="w-full h-10 px-3 text-xs sm:text-sm font-medium rounded-xl bg-background border border-border/80 focus:border-primary focus:outline-none"
                      >
                        <option value="">No Section (Standalone Module)</option>
                        {sections.map((s, idx) => (
                          <option key={s.id} value={s.id}>
                            Section {idx + 1}: {s.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowModuleInput(false);
                        setEditingModule(null);
                        setNewModuleSectionId(null);
                      }}
                      className="rounded-xl text-xs font-semibold h-9 px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveModule}
                      className="rounded-xl text-xs font-bold h-9 px-5 shadow-xs"
                    >
                      {editingModule ? "Update Module" : "Create Module"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Sections & Modules Hierarchical Rendering */}
              {sections.length > 0 ? (
                <div className="space-y-6">
                  {sections
                    .slice()
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((sec, secIdx) => {
                      const sectionModules = modules
                        .filter((m) => m.section_id === sec.id)
                        .sort((a, b) => a.order_index - b.order_index);
                      const sectionLessons = lessons.filter((l) =>
                        sectionModules.some((m) => m.id === l.module_id)
                      );
                      const isSecCollapsed = !!collapsedSections[sec.id];

                      return (
                        <div
                          key={sec.id}
                          className="border-2 border-primary/20 rounded-3xl overflow-hidden bg-card/60 shadow-xs transition-all duration-200"
                        >
                          {/* Section Header */}
                          <div className="p-4 sm:p-5 bg-primary/5 border-b border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                {secIdx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-bold text-base text-foreground truncate font-outfit">
                                    Section {secIdx + 1} — {sec.title}
                                  </h3>
                                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5">
                                    {sectionModules.length} {sectionModules.length === 1 ? "module" : "modules"}
                                  </Badge>
                                </div>
                                {sec.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xl">
                                    {sec.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAddModule(sec.id)}
                                className="rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border-primary/30 h-8 px-3 gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add Module</span>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditSection(sec)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                                title="Edit Section"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSectionToDelete(sec)}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                                title="Delete Section"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>

                              <button
                                type="button"
                                onClick={() => toggleSectionCollapse(sec.id)}
                                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                aria-label="Toggle Section"
                              >
                                {isSecCollapsed ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronUp className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Modules inside Section */}
                          {!isSecCollapsed && (
                            <div className="p-4 sm:p-5 space-y-4 bg-muted/10">
                              {sectionModules.length > 0 ? (
                                sectionModules.map((mod, modIdx) => {
                                  const moduleLessons = lessons
                                    .filter((l) => l.module_id === mod.id)
                                    .sort((a, b) => a.order_index - b.order_index);
                                  const isModCollapsed = !!collapsedModules[mod.id];

                                  return (
                                    <div
                                      key={mod.id}
                                      className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs transition-all duration-200"
                                    >
                                      {/* Module Header */}
                                      <div className="p-3.5 sm:p-4 bg-muted/40 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            {modIdx + 1}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className="font-bold text-sm text-foreground truncate font-outfit">
                                              Module {modIdx + 1} — {mod.title}
                                            </h4>
                                            <span className="text-[11px] text-muted-foreground font-medium">
                                              {moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openAddLesson(mod.id)}
                                            className="rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border-primary/20 h-8 px-3 gap-1.5 cursor-pointer"
                                          >
                                            <Plus className="h-3.5 w-3.5" />
                                            <span>Add Lesson</span>
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditModule(mod)}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                                            title="Edit Module"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </Button>

                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setModuleToDelete(mod)}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                                            title="Delete Module"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>

                                          <button
                                            type="button"
                                            onClick={() => toggleModuleCollapse(mod.id)}
                                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                            aria-label="Toggle Module"
                                          >
                                            {isModCollapsed ? (
                                              <ChevronDown className="h-4 w-4" />
                                            ) : (
                                              <ChevronUp className="h-4 w-4" />
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Lessons inside Module */}
                                      {!isModCollapsed && (
                                        <div className="p-3 divide-y divide-border/40">
                                          {moduleLessons.length > 0 ? (
                                            moduleLessons.map((les, lesIdx) => (
                                              <div
                                                key={les.id}
                                                className="py-3 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 rounded-2xl transition-colors group"
                                              >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                  <div
                                                    className={cn(
                                                      "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                                      les.video_id || les.video_url
                                                        ? "bg-primary/10 text-primary"
                                                        : "bg-muted text-muted-foreground"
                                                    )}
                                                  >
                                                    {les.video_id || les.video_url ? (
                                                      <Video className="h-4 w-4 text-primary" />
                                                    ) : (
                                                      <FileText className="h-4 w-4" />
                                                    )}
                                                  </div>

                                                  <div className="min-w-0 space-y-0.5">
                                                    <p className="text-xs sm:text-sm font-bold text-foreground font-outfit group-hover:text-primary transition-colors">
                                                      Lesson {modIdx + 1}.{lesIdx + 1} — {les.title}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                                      {les.is_free_preview && (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase text-[9px]">
                                                          Free Preview
                                                        </span>
                                                      )}

                                                      {les.delivery_type === 'live' ? (
                                                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full font-bold uppercase text-[9px] inline-flex items-center gap-1">
                                                          <Radio className="h-2.5 w-2.5" />
                                                          <span>LIVE {les.scheduled_at ? `(${formatISTDateTime(les.scheduled_at, { shortDate: true })})` : ''}</span>
                                                        </span>
                                                      ) : les.release_at && new Date(les.release_at) > new Date() ? (
                                                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full font-bold uppercase text-[9px] inline-flex items-center gap-1">
                                                          <Lock className="h-2.5 w-2.5" />
                                                          <span>SCHEDULED ({formatISTDateTime(les.release_at, { shortDate: true })})</span>
                                                        </span>
                                                      ) : null}

                                                      {les.video_status === "ready" ? (
                                                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                                          <CheckCircle2 className="h-3 w-3" />
                                                          <span>HLS Ready</span>
                                                        </span>
                                                      ) : les.video_status === "processing" ? (
                                                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                                                          <Loader2 className="h-3 w-3 animate-spin" />
                                                          <span>Transcoding</span>
                                                        </span>
                                                      ) : les.video_id || les.video_url ? (
                                                        <span className="text-primary font-medium">
                                                          ✓ Video Attached
                                                        </span>
                                                      ) : (
                                                        <span className="text-muted-foreground/60">
                                                          No video
                                                        </span>
                                                      )}

                                                      {les.materials && les.materials.length > 0 && (
                                                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-md font-semibold">
                                                          <Paperclip className="h-3 w-3" />
                                                          <span>{les.materials.length} resources</span>
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openEditLesson(les)}
                                                    className="h-8 rounded-xl text-xs font-semibold gap-1.5 px-3 border-border/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                                                  >
                                                    <Edit2 className="h-3 w-3" />
                                                    <span>Edit</span>
                                                  </Button>

                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setLessonToDelete(les)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                                                    title="Delete Lesson"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))
                                          ) : (
                                            <div className="py-6 text-center text-xs text-muted-foreground">
                                              No lessons inside this module yet. Click &quot;+ Add Lesson&quot; above.
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="py-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-2xl">
                                  No modules created in this section yet. Click &quot;+ Add Module&quot; to begin.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Standalone / Unassigned Modules if any */}
                  {modules.some((m) => !m.section_id) && (
                    <div className="border border-border/80 rounded-3xl p-5 bg-card space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <h4 className="font-bold text-sm text-foreground font-outfit">
                          Standalone / Unassigned Modules
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {modules.filter((m) => !m.section_id).length} unassigned modules
                        </span>
                      </div>
                      <div className="space-y-3">
                        {modules
                          .filter((m) => !m.section_id)
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((mod, modIdx) => {
                            const moduleLessons = lessons
                              .filter((l) => l.module_id === mod.id)
                              .sort((a, b) => a.order_index - b.order_index);
                            return (
                              <div
                                key={mod.id}
                                className="border border-border/80 rounded-2xl p-4 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div>
                                  <h5 className="font-bold text-sm text-foreground font-outfit">
                                    {mod.title}
                                  </h5>
                                  <span className="text-xs text-muted-foreground">
                                    {moduleLessons.length} lessons
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAddLesson(mod.id)}
                                    className="rounded-xl text-xs font-semibold h-8"
                                  >
                                    Add Lesson
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditModule(mod)}
                                    className="h-8 w-8 text-muted-foreground rounded-xl"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setModuleToDelete(mod)}
                                    className="h-8 w-8 text-destructive rounded-xl"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ) : modules.length > 0 ? (
                /* Flat Module Rendering for Standalone Courses without Sections */
                <div className="space-y-4">
                  {modules.map((mod, modIdx) => {
                    const moduleLessons = (lessons || [])
                      .filter((l) => l.module_id === mod.id)
                      .sort((a, b) => a.order_index - b.order_index);
                    const isCollapsed = !!collapsedModules[mod.id];

                    return (
                      <div
                        key={mod.id}
                        className="border border-border/80 rounded-2xl overflow-hidden bg-card/50 shadow-2xs transition-all duration-200"
                      >
                        {/* Module Header Bar */}
                        <div className="p-4 bg-muted/40 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {modIdx + 1}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-foreground truncate font-outfit">
                                Module {modIdx + 1} — {mod.title}
                              </h4>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"} in module
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAddLesson(mod.id)}
                              className="rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border-primary/20 h-8 px-3 gap-1.5 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Lesson</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModule(mod)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
                              title="Edit Module"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setModuleToDelete(mod)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                              title="Delete Module"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>

                            <button
                              type="button"
                              onClick={() => toggleModuleCollapse(mod.id)}
                              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                              aria-label="Toggle Module"
                            >
                              {isCollapsed ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Lessons inside Module */}
                        {!isCollapsed && (
                          <div className="p-3 divide-y divide-border/40">
                            {moduleLessons.length > 0 ? (
                              moduleLessons.map((les, lesIdx) => (
                                <div
                                  key={les.id}
                                  className="py-3 px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 rounded-2xl transition-colors group"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div
                                      className={cn(
                                        "h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                                        les.video_id || les.video_url
                                          ? "bg-primary/10 text-primary"
                                          : "bg-muted text-muted-foreground"
                                      )}
                                    >
                                      {les.video_id || les.video_url ? (
                                        <Video className="h-4 w-4 text-primary" />
                                      ) : (
                                        <FileText className="h-4 w-4" />
                                      )}
                                    </div>

                                    <div className="min-w-0 space-y-0.5">
                                      <p className="text-xs sm:text-sm font-bold text-foreground font-outfit group-hover:text-primary transition-colors">
                                        Lesson {modIdx + 1}.{lesIdx + 1} — {les.title}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                        {les.is_free_preview && (
                                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase text-[9px]">
                                            Free Preview
                                          </span>
                                        )}

                                        {les.delivery_type === 'live' ? (
                                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full font-bold uppercase text-[9px] inline-flex items-center gap-1">
                                            <Radio className="h-2.5 w-2.5" />
                                            <span>LIVE {les.scheduled_at ? `(${formatISTDateTime(les.scheduled_at, { shortDate: true })})` : ''}</span>
                                          </span>
                                        ) : les.release_at && new Date(les.release_at) > new Date() ? (
                                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full font-bold uppercase text-[9px] inline-flex items-center gap-1">
                                            <Lock className="h-2.5 w-2.5" />
                                            <span>SCHEDULED ({formatISTDateTime(les.release_at, { shortDate: true })})</span>
                                          </span>
                                        ) : null}

                                        {les.video_status === "ready" ? (
                                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                                            <CheckCircle2 className="h-3 w-3" />
                                            <span>HLS Ready</span>
                                          </span>
                                        ) : les.video_status === "processing" ? (
                                          <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            <span>Transcoding</span>
                                          </span>
                                        ) : les.video_id || les.video_url ? (
                                          <span className="text-primary font-medium">
                                            ✓ Video Attached
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground/60">
                                            No video
                                          </span>
                                        )}

                                        {les.materials && les.materials.length > 0 && (
                                          <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded-md font-semibold">
                                            <Paperclip className="h-3 w-3" />
                                            <span>{les.materials.length} resources</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openEditLesson(les)}
                                      className="h-8 rounded-xl text-xs font-semibold gap-1.5 px-3 border-border/80 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                      <span>Edit</span>
                                    </Button>

                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setLessonToDelete(les)}
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-8 text-center text-xs text-muted-foreground">
                                No lessons inside this module yet. Click &quot;+ Add Lesson&quot; to build syllabus lectures.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 border-2 border-dashed border-border/80 rounded-3xl text-center text-muted-foreground bg-muted/10 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground font-outfit">Curriculum is currently empty</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Create your first Section or Module to start structuring course lectures and uploading video assets.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openAddSection}
                      className="rounded-xl text-xs font-bold gap-1.5 border-primary/30 text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Section</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openAddModule(null)}
                      className="rounded-xl text-xs font-bold gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Module</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: COURSE SETTINGS & METADATA */}
        <TabsContent value="settings" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold font-outfit text-foreground">
                    Course Properties &amp; Pricing Structure
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Update catalog title, synopsis, tuition fee, access limits, and media assets.
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSaveCourse} className="space-y-6">
                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Course Title <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-11 rounded-xl text-xs sm:text-sm font-semibold bg-background border-border/80 focus:border-primary"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Course Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="rounded-xl text-xs sm:text-sm font-medium bg-background border-border/80 focus:border-primary leading-relaxed"
                  />
                </div>

                {/* Price & Access Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Price (INR ₹) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-8 h-11 rounded-xl text-xs sm:text-sm font-bold bg-background border-border/80 focus:border-primary tabular-nums"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Tuition in INR (inclusive of 18% GST)</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Access Duration (Days)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="Leave blank for Lifetime Access"
                        value={accessDays}
                        onChange={(e) => setAccessDays(e.target.value)}
                        className="pl-10 h-11 rounded-xl text-xs sm:text-sm font-medium bg-background border-border/80 focus:border-primary tabular-nums"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Validity period post-enrollment</p>
                  </div>
                </div>

                {/* Thumbnail Image URL & Upload */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Thumbnail Image
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="url"
                      value={thumbnailUrl}
                      onChange={(e) => setThumbnailUrl(e.target.value)}
                      placeholder="https://assets.airbharath.in/thumbnail.webp"
                      className="flex-1 h-11 rounded-xl text-xs font-mono bg-background border-border/80 focus:border-primary"
                    />
                    <label className="inline-flex items-center justify-center gap-1.5 px-4 h-11 border border-border/80 rounded-xl bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer shrink-0">
                      {uploadingThumb ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span>Uploading…</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-3.5 w-3.5 text-primary" />
                          <span>Upload Image File</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                        disabled={uploadingThumb}
                      />
                    </label>
                  </div>

                  {thumbnailUrl && (
                    <div className="mt-3 p-2 bg-muted/30 border border-border/80 rounded-2xl max-w-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Current Thumbnail Preview
                      </span>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted border border-border/60">
                        <img
                          src={thumbnailUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Published Checkbox */}
                <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/80 bg-muted/20">
                  <input
                    type="checkbox"
                    id="publishedTabCheck"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <div className="cursor-pointer" onClick={() => setIsPublished(!isPublished)}>
                    <label
                      htmlFor="publishedTabCheck"
                      className="text-xs font-bold text-foreground cursor-pointer block font-outfit"
                    >
                      Publish Course Publicly to Student Catalog
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Uncheck to set course in private draft mode.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={loadingCourse}
                    className="rounded-xl text-xs font-bold h-11 px-6 gap-2 shadow-sm cursor-pointer"
                  >
                    <Save className="h-4 w-4" />
                    <span>{loadingCourse ? "Saving Changes..." : "Save Course Properties"}</span>
                  </Button>
                </div>
              </form>

              {/* Danger Zone */}
              <div className="border-t border-destructive/20 pt-6 mt-8 space-y-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-destructive uppercase tracking-wider block font-outfit">
                    Danger Zone
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Deleting a course will permanently remove all modules, video lectures, student progress, and enrollment records.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteCourseModal(true)}
                  className="rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 gap-2 h-10 px-4 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Entire Course</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CERTIFICATES & ISSUANCE */}
        <TabsContent value="certificates" className="space-y-6 m-0">
          {/* Certificate Activation Status Card */}
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span>Certificate Issuance Control</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Control whether qualifying students receive tamper-proof QR-verifiable certificates of completion.
                </p>
              </div>

              {/* Status Badge & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                    certStatus === "active"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : certStatus === "paused"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      : "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      certStatus === "active"
                        ? "bg-emerald-500"
                        : certStatus === "paused"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    )}
                  />
                  <span>
                    {certStatus === "active"
                      ? "ACTIVE"
                      : certStatus === "paused"
                      ? "PAUSED"
                      : "DISABLED"}
                  </span>
                </span>

                {certStatus === "disabled" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={updatingCertStatus}
                    onClick={() => handleUpdateCertStatus("active")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                  >
                    {updatingCertStatus ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    <span>Activate Issuance</span>
                  </Button>
                ) : certStatus === "active" ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingCertStatus}
                      onClick={() => handleUpdateCertStatus("paused")}
                      className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-semibold h-10 px-3.5 rounded-xl cursor-pointer"
                    >
                      <span>Pause Issuance</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingCertStatus}
                      onClick={() => handleUpdateCertStatus("disabled")}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold h-10 px-3.5 rounded-xl cursor-pointer"
                    >
                      <span>Deactivate</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={updatingCertStatus}
                      onClick={() => handleUpdateCertStatus("active")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs cursor-pointer"
                    >
                      <span>Resume Issuance</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingCertStatus}
                      onClick={() => handleUpdateCertStatus("disabled")}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold h-10 px-3.5 rounded-xl cursor-pointer"
                    >
                      <span>Deactivate</span>
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Status Message Alerts */}
              {certActionSuccessMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{certActionSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCertActionSuccessMsg(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}

              {certActionErrorMsg && (
                <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{certActionErrorMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCertActionErrorMsg(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Status Overview Banner */}
              <div className="bg-muted/30 border border-border/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-foreground">
                    {certStatus === "active"
                      ? "Certificate Issuance is Active"
                      : certStatus === "paused"
                      ? "Certificate Issuance is Currently Paused"
                      : "Certificate Issuance is Disabled"}
                  </span>
                  <p className="text-muted-foreground">
                    {certStatus === "active"
                      ? "Students who reach 100% curriculum completion can instantly claim their verified certificates."
                      : certStatus === "paused"
                      ? "Existing certificates remain valid. Eligible students cannot claim new certificates while paused."
                      : "Students reaching 100% will see a 'Course Completed' notice without certificate generation until activated."}
                  </p>
                </div>

                {certActivatedAt && (
                  <div className="text-[11px] text-muted-foreground font-mono shrink-0 sm:text-right">
                    <div>
                      Activated: {new Date(certActivatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    {certActivatedBy?.name && <div>by {certActivatedBy.name}</div>}
                  </div>
                )}
              </div>

              {/* 4 Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Enrolled
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                    {certStats.totalEnrolled}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Students in course</span>
                </div>

                <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    100% Completed
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-outfit text-foreground">
                    {certStats.totalCompleted}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Finished curriculum</span>
                </div>

                <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Issued Credentials
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-outfit text-emerald-600">
                    {certStats.totalIssued}
                  </div>
                  <span className="text-[10px] text-emerald-700/80">Tamper-proof registered</span>
                </div>

                <div className="p-4 bg-card border border-border/80 rounded-2xl shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                    Pending Issuance
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-outfit text-amber-600">
                    {certStats.pendingEligibleCount}
                  </div>
                  <span className="text-[10px] text-amber-700/80">Eligible to mint</span>
                </div>
              </div>

              {/* Student Eligibility & Issuance Table */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="font-bold text-sm sm:text-base font-outfit text-foreground">
                      Enrolled Learners &amp; Credential Status ({certStudents.length})
                    </h3>
                  </div>

                  {/* Bulk Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fetchCertificatesData()}
                      disabled={loadingCertData}
                      className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5"
                      title="Refresh Student Statuses"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", loadingCertData && "animate-spin")} />
                      <span>Refresh</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={selectedStudentIds.length === 0 || generatingCerts}
                      onClick={() => handleIssueBatch(false)}
                      className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                    >
                      {generatingCerts ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Award className="h-3.5 w-3.5" />
                      )}
                      <span>Generate for Selected ({selectedStudentIds.length})</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={certStats.pendingEligibleCount === 0 || generatingCerts}
                      onClick={() => handleIssueBatch(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                    >
                      {generatingCerts ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Generate for All Eligible ({certStats.pendingEligibleCount})</span>
                    </Button>
                  </div>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-muted/20 p-3 rounded-2xl border border-border/60">
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { key: "all", label: "All Learners", count: certStudents.length },
                        { key: "eligible", label: "Eligible (100%)", count: certStats.totalEligible },
                        { key: "issued", label: "Issued", count: certStats.totalIssued },
                        {
                          key: "in_progress",
                          label: "In Progress",
                          count: certStudents.filter((s) => !s.isCompleted && s.status !== "issued").length,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStudentFilterTab(tab.key)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                          studentFilterTab === tab.key
                            ? "bg-card text-primary shadow-2xs border border-border/80"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{tab.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-muted rounded-full font-mono">
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Search student name or email..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl bg-background"
                    />
                  </div>
                </div>

                {/* Students Table */}
                {loadingCertData ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-semibold">Evaluating curriculum progress &amp; credentials...</span>
                  </div>
                ) : (
                  (() => {
                    const filteredStudents = certStudents.filter((student) => {
                      // Filter by search
                      const matchesSearch =
                        !studentSearchTerm ||
                        student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase());

                      if (!matchesSearch) return false;

                      // Filter by tab
                      if (studentFilterTab === "eligible") {
                        return student.status === "eligible";
                      }
                      if (studentFilterTab === "issued") {
                        return student.status === "issued";
                      }
                      if (studentFilterTab === "in_progress") {
                        return !student.isCompleted && student.status !== "issued";
                      }
                      return true;
                    });

                    const eligibleFiltered = filteredStudents.filter((s) => s.status === "eligible");
                    const allEligibleSelected =
                      eligibleFiltered.length > 0 &&
                      eligibleFiltered.every((s) => selectedStudentIds.includes(s.userId));

                    const toggleSelectAll = () => {
                      if (allEligibleSelected) {
                        const eligibleIdsSet = new Set(eligibleFiltered.map((s) => s.userId));
                        setSelectedStudentIds(selectedStudentIds.filter((id) => !eligibleIdsSet.has(id)));
                      } else {
                        const newSelected = Array.from(
                          new Set([...selectedStudentIds, ...eligibleFiltered.map((s) => s.userId)])
                        );
                        setSelectedStudentIds(newSelected);
                      }
                    };

                    const toggleStudentSelect = (userId: string) => {
                      if (selectedStudentIds.includes(userId)) {
                        setSelectedStudentIds(selectedStudentIds.filter((id) => id !== userId));
                      } else {
                        setSelectedStudentIds([...selectedStudentIds, userId]);
                      }
                    };

                    if (filteredStudents.length === 0) {
                      return (
                        <div className="text-center py-12 px-4 border border-dashed border-border rounded-2xl space-y-2">
                          <p className="text-xs font-semibold text-foreground">No students match this filter</p>
                          <p className="text-[11px] text-muted-foreground">
                            Try adjusting your search query or tab filter.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                                <th className="p-3.5 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={allEligibleSelected}
                                    onChange={toggleSelectAll}
                                    disabled={eligibleFiltered.length === 0}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-40"
                                    title="Select all eligible students on this view"
                                  />
                                </th>
                                <th className="p-3.5">Learner Profile</th>
                                <th className="p-3.5">Curriculum Progress</th>
                                <th className="p-3.5">Enrolled Date</th>
                                <th className="p-3.5">Certificate State</th>
                                <th className="p-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {filteredStudents.map((s) => {
                                const isEligible = s.status === "eligible";
                                const isIssued = s.status === "issued";
                                const isSelected = selectedStudentIds.includes(s.userId);
                                const isSingleGenerating = generatingSingleId === s.userId;

                                return (
                                  <tr
                                    key={s.userId}
                                    className={cn(
                                      "hover:bg-muted/30 transition-colors",
                                      isSelected && "bg-primary/5"
                                    )}
                                  >
                                    <td className="p-3.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={!isEligible}
                                        onChange={() => toggleStudentSelect(s.userId)}
                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:opacity-30"
                                      />
                                    </td>

                                    <td className="p-3.5 min-w-[180px]">
                                      <div className="font-bold text-foreground font-outfit">
                                        {s.fullName}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                                        {s.email || s.phone || "No contact"}
                                      </div>
                                    </td>

                                    <td className="p-3.5 min-w-[160px]">
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-[11px] font-semibold text-foreground">
                                          <span>{s.progressPercent}%</span>
                                          <span className="text-muted-foreground">
                                            {s.completedLessons}/{s.totalLessons}
                                          </span>
                                        </div>
                                        <Progress
                                          value={s.progressPercent}
                                          className={`h-1.5 ${s.isCompleted ? "[&>div]:bg-emerald-600" : ""}`}
                                        />
                                      </div>
                                    </td>

                                    <td className="p-3.5 text-[11px] text-muted-foreground whitespace-nowrap">
                                      {new Date(s.enrolledAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </td>

                                    <td className="p-3.5 whitespace-nowrap">
                                      {isIssued ? (
                                        <div className="space-y-0.5">
                                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 w-fit">
                                            <ShieldCheck className="h-3 w-3" />
                                            <span>Issued</span>
                                          </Badge>
                                          <div className="font-mono text-[10px] text-muted-foreground font-bold">
                                            {s.certificateCode}
                                          </div>
                                        </div>
                                      ) : isEligible ? (
                                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold w-fit flex items-center gap-1">
                                          <Sparkles className="h-3 w-3 text-emerald-600" />
                                          <span>Eligible (100%)</span>
                                        </Badge>
                                      ) : s.status === "completed_pending" ? (
                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold w-fit">
                                          <span>Pending Activation</span>
                                        </Badge>
                                      ) : s.status === "completed_paused" ? (
                                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold w-fit">
                                          <span>Issuance Paused</span>
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground w-fit">
                                          <span>In Progress</span>
                                        </Badge>
                                      )}
                                    </td>

                                    <td className="p-3.5 text-right whitespace-nowrap">
                                      {isIssued ? (
                                        <div className="flex items-center justify-end gap-1.5">
                                          <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[11px] font-semibold rounded-lg px-2.5"
                                          >
                                            <Link
                                              href={`/verify-certificate/${s.certificateCode}`}
                                              target="_blank"
                                              className="flex items-center gap-1"
                                            >
                                              <span>Verify</span>
                                              <ExternalLink className="h-3 w-3" />
                                            </Link>
                                          </Button>
                                          {s.pdfUrl && (
                                            <Button
                                              asChild
                                              variant="outline"
                                              size="sm"
                                              className="h-7 text-[11px] font-semibold rounded-lg px-2"
                                              title="Download Certificate PDF"
                                            >
                                              <a
                                                href={s.pdfUrl}
                                                download={`AirBharath-Cert-${s.certificateCode}.pdf`}
                                              >
                                                <Download className="h-3 w-3" />
                                              </a>
                                            </Button>
                                          )}
                                        </div>
                                      ) : isEligible ? (
                                        <Button
                                          type="button"
                                          size="sm"
                                          disabled={isSingleGenerating || generatingCerts}
                                          onClick={() => handleIssueIndividual(s.userId)}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-[11px] font-bold rounded-lg px-3 shadow-2xs gap-1 cursor-pointer"
                                        >
                                          {isSingleGenerating ? (
                                            <>
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                              <span>Minting...</span>
                                            </>
                                          ) : (
                                            <>
                                              <Award className="h-3 w-3" />
                                              <span>Issue Now</span>
                                            </>
                                          )}
                                        </Button>
                                      ) : (
                                        <span className="text-[11px] text-muted-foreground/60">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BUNDLE MANAGEMENT */}
        <TabsContent value="bundle" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Course Bundle &amp; Multi-Course Entitlements</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Package multiple standalone courses into this commercial Combo Pass. Enrolled students gain instant access to all selected courses.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={savingBundle || loadingBundleData}
                onClick={handleSaveBundle}
                className="rounded-xl text-xs font-bold gap-2 h-9 px-4 shadow-xs cursor-pointer shrink-0"
              >
                {savingBundle ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Bundle...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Bundle Settings</span>
                  </>
                )}
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {bundleActionSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{bundleActionSuccessMsg}</span>
                </div>
              )}

              {bundleActionErrorMsg && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{bundleActionErrorMsg}</span>
                </div>
              )}

              {/* Toggle Bundle Mode */}
              <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-bold font-outfit text-foreground">
                    Enable Course Bundle Mode
                  </h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    When enabled, buying or enrolling in this course grants access to all selected standalone programs below.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={isBundle}
                    onChange={(e) => setIsBundle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {loadingBundleData ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs">Loading bundle configuration...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Included Courses ({selectedBundleCourseIds.length} Selected)
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Select which courses are bundled with this pass.
                      </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Search courses..."
                        value={bundleSearchTerm}
                        onChange={(e) => setBundleSearchTerm(e.target.value)}
                        className="pl-8 h-8 text-xs font-medium rounded-xl border-border/80"
                      />
                    </div>
                  </div>

                  {availableCourses.length === 0 ? (
                    <div className="p-8 text-center bg-muted/20 border border-dashed border-border rounded-2xl text-muted-foreground text-xs">
                      No other courses found to include. Create standalone courses first.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {availableCourses
                        .filter((c) =>
                          c.title.toLowerCase().includes(bundleSearchTerm.toLowerCase()) ||
                          (c.slug && c.slug.toLowerCase().includes(bundleSearchTerm.toLowerCase()))
                        )
                        .map((c) => {
                          const isSelected = selectedBundleCourseIds.includes(c.id);
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedBundleCourseIds((prev) =>
                                    prev.filter((id) => id !== c.id)
                                  );
                                } else {
                                  setSelectedBundleCourseIds((prev) => [...prev, c.id]);
                                }
                              }}
                              className={cn(
                                "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left",
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-2xs"
                                  : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                                    isSelected
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-border bg-background"
                                  )}
                                >
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                                </div>

                                <div className="min-w-0">
                                  <h5 className="font-bold text-xs font-outfit text-foreground truncate">
                                    {c.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                    <span>₹{Number(c.price).toLocaleString("en-IN")}</span>
                                    <span>·</span>
                                    <span className={c.isPublished ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                                      {c.isPublished ? "Published" : "Draft"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <Badge variant="secondary" className="text-[10px] font-bold shrink-0 bg-primary/15 text-primary border-primary/20">
                                  Included
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lesson Edit / Create Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-2xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-outfit text-foreground">
                    {editingLesson ? "Edit Lesson & Video Lecture" : "Add New Syllabus Lesson"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure lesson details, upload encrypted HLS video, and attach downloadable files.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLessonModal(false)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Inner Tabs */}
            <div className="px-6 pt-3 border-b border-border/60 bg-muted/20 flex gap-2">
              <button
                type="button"
                onClick={() => setLessonModalTab("details")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer",
                  lessonModalTab === "details"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                1. Lesson Details
              </button>
              <button
                type="button"
                onClick={() => setLessonModalTab("video")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  lessonModalTab === "video"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>2. Video Lecture</span>
                {lessonSavedVideoId && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
              </button>
              <button
                type="button"
                onClick={() => setLessonModalTab("materials")}
                className={cn(
                  "px-3.5 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5",
                  lessonModalTab === "materials"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <span>3. Lesson Materials</span>
                {lessonMaterialsList.length > 0 && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold">
                    {lessonMaterialsList.length}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* TAB: Details */}
              {lessonModalTab === "details" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  {/* Lesson Title */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Lesson Title <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Lesson 1.2: Hydraulic Control Systems & Pressure Logic"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="h-11 rounded-xl text-xs sm:text-sm font-semibold bg-background border-border/80 focus:border-primary"
                      required
                    />
                  </div>

                  {/* Order and Free Preview Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                        Order Sequence
                      </label>
                      <Input
                        type="number"
                        value={lessonOrder}
                        onChange={(e) => setLessonOrder(e.target.value)}
                        className="h-11 rounded-xl text-xs sm:text-sm font-semibold bg-background border-border/80 focus:border-primary tabular-nums"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 self-end h-11">
                      <input
                        type="checkbox"
                        id="lessonFreeCheck"
                        checked={lessonIsFree}
                        onChange={(e) => setLessonIsFree(e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                      <label
                        htmlFor="lessonFreeCheck"
                        className="text-xs font-bold text-foreground cursor-pointer font-outfit"
                      >
                        Free Preview Lesson (Public)
                      </label>
                    </div>
                  </div>

                  {/* Delivery Type */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Delivery Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setLessonDeliveryType('recorded')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          lessonDeliveryType === 'recorded'
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Video className="h-3.5 w-3.5" />
                        <span>Recorded</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLessonDeliveryType('live')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          lessonDeliveryType === 'live'
                            ? "bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400"
                            : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Radio className="h-3.5 w-3.5" />
                        <span>Live Session</span>
                      </button>
                    </div>
                  </div>

                  {/* Availability Fields for Recorded Lessons */}
                  {lessonDeliveryType === 'recorded' && (
                    <div className="space-y-3 p-4 rounded-2xl border border-border/80 bg-muted/20 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                          Content Availability
                        </label>
                        {lessonReleaseAt && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setLessonReleaseAt("")}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            !lessonReleaseAt
                              ? "bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                              : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Available Immediately</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!lessonReleaseAt) {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              tomorrow.setHours(19, 0, 0, 0); // 7:00 PM
                              setLessonReleaseAt(tomorrow.toISOString().slice(0, 16));
                            }
                          }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                            Boolean(lessonReleaseAt)
                              ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400"
                              : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                          <span>Schedule Release</span>
                        </button>
                      </div>

                      {Boolean(lessonReleaseAt) && (
                        <div className="space-y-2 pt-1 border-t border-border/60">
                          <label className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>Release Date &amp; Time (IST)</span>
                          </label>
                          <Input
                            type="datetime-local"
                            value={lessonReleaseAt}
                            onChange={(e) => setLessonReleaseAt(e.target.value)}
                            className="h-10 rounded-xl text-xs font-semibold bg-background border-border/80 focus:border-primary"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            🔒 Releases on{" "}
                            <strong className="text-foreground">
                              {formatISTDateTime(lessonReleaseAt)}
                            </strong>
                            . Lesson will remain locked in student view until release.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scheduling Fields for Live Lessons */}
                  {lessonDeliveryType === 'live' && (
                    <div className="space-y-3 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>Live Session Schedule</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider">
                            Date & Time
                          </label>
                          <Input
                            type="datetime-local"
                            value={lessonScheduledAt}
                            onChange={(e) => setLessonScheduledAt(e.target.value)}
                            className="h-10 rounded-xl text-xs font-semibold bg-background border-border/80 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-foreground uppercase tracking-wider">
                            Duration (minutes)
                          </label>
                          <Input
                            type="number"
                            placeholder="e.g. 60"
                            value={lessonDuration}
                            onChange={(e) => setLessonDuration(e.target.value)}
                            min="1"
                            className="h-10 rounded-xl text-xs font-semibold bg-background border-border/80 focus:border-primary tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <LinkIcon className="h-3 w-3" />
                          <span>Meeting URL (Zoom, Google Meet, etc.)</span>
                        </label>
                        <Input
                          type="url"
                          placeholder="https://zoom.us/j/..."
                          value={lessonMeetingUrl}
                          onChange={(e) => setLessonMeetingUrl(e.target.value)}
                          className="h-10 rounded-xl text-xs font-semibold bg-background border-border/80 focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Lesson Notes / Summary */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                      Lesson Notes, Formulas &amp; Summary
                    </label>
                    <Textarea
                      placeholder="Lesson summary, theoretical guidelines, aircraft systems references, or study checklist..."
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      rows={5}
                      className="rounded-xl text-xs sm:text-sm font-medium bg-background border-border/80 focus:border-primary leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* TAB: Video */}
              {lessonModalTab === "video" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                      Video Lecture Stream
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Direct multipart S3 upload with AWS MediaConvert adaptive bitrate encoding.
                    </p>
                  </div>

                  {editingLesson?.id ? (
                    <VideoUploader
                      courseId={course.id}
                      lessonId={editingLesson.id}
                      lessonTitle={lessonTitle}
                      existingVideoId={lessonSavedVideoId || undefined}
                      existingStatus={lessonSavedVideoStatus || undefined}
                      onDone={(videoId) => {
                        setLessonSavedVideoId(videoId);
                        setLessonSavedVideoStatus("processing");
                      }}
                      onDelete={() => {
                        setLessonSavedVideoId(null);
                        setLessonSavedVideoStatus(null);
                        setLessons((prev) =>
                          prev.map((l) =>
                            l.id === editingLesson.id
                              ? { ...l, video_url: null, video_id: null, video_status: null }
                              : l
                          )
                        );
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/40 border border-border/80 rounded-2xl p-5 flex items-start gap-3.5">
                      <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-foreground font-outfit">
                          Save lesson first to upload video
                        </p>
                        <p className="leading-relaxed">
                          Save this lesson title first to generate its unique database record, then reopen it to upload video files directly to AWS S3.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: Materials */}
              {lessonModalTab === "materials" && (
                <div className="space-y-4 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                        Downloadable Resources &amp; PDFs
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Attach lecture slides, checklists, diagrams, or reading notes.
                      </p>
                    </div>

                    {editingLesson?.id && (
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-2xs hover:bg-primary/90 transition-colors cursor-pointer">
                        {uploadingMaterial ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" />
                            <span>Add Material</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={handleMaterialUpload}
                          disabled={uploadingMaterial}
                        />
                      </label>
                    )}
                  </div>

                  {editingLesson?.id ? (
                    <div className="space-y-2.5">
                      {lessonMaterialsList.length > 0 ? (
                        lessonMaterialsList.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/70 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Paperclip className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate font-outfit">
                                  {mat.title}
                                </p>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {mat.file_type || "document"} •{" "}
                                  {mat.file_size
                                    ? `${(mat.file_size / 1024).toFixed(0)} KB`
                                    : "Resource"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {mat.file_url && (
                                <a
                                  href={mat.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={mat.title}
                                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                  title="Download / View"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteMaterial(mat.id)}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border/80 rounded-2xl space-y-1">
                          <Paperclip className="h-6 w-6 mx-auto text-muted-foreground/40 mb-1" />
                          <p className="font-semibold text-foreground">No materials attached yet</p>
                          <p className="text-[11px]">Click &quot;Add Material&quot; to upload PDFs or study sheets.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground bg-muted/40 border border-border/80 rounded-2xl p-5 flex items-start gap-3.5">
                      <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-foreground font-outfit">
                          Save lesson first to attach materials
                        </p>
                        <p className="leading-relaxed">
                          Save this lesson to generate its ID, then reopen it to attach downloadable PDF course sheets and notes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {lessonModalTab !== "details" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLessonModalTab("details")}
                    className="rounded-xl text-xs font-semibold"
                  >
                    ← Back to Details
                  </Button>
                )}
                {lessonModalTab === "details" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLessonModalTab("video")}
                    className="rounded-xl text-xs font-semibold"
                  >
                    Next: Video Lecture →
                  </Button>
                )}
              </div>

              <div className="flex gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLessonModal(false)}
                  className="rounded-xl text-xs font-semibold h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={savingLesson}
                  onClick={handleSaveLesson}
                  className="rounded-xl text-xs font-bold h-10 px-5 gap-2 shadow-sm cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingLesson ? "Saving..." : "Save Lesson"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
