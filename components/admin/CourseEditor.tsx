"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { VideoUploader } from "@/components/admin/VideoUploader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface FormattedMaterial {
  id: string;
  title: string;
  file_url: string;
  file_type?: string | null;
  file_size?: number | null;
}

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
  materials?: FormattedMaterial[];
}

export interface FormattedModule {
  id: string;
  course_id: string;
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
    access_days?: number | null;
  };
  initialModules: FormattedModule[];
  initialLessons: FormattedLesson[];
}

export default function CourseEditor({
  course,
  initialModules = [],
  initialLessons = [],
}: CourseEditorProps) {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"curriculum" | "settings">("curriculum");

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

  // Curriculum State
  const [modules, setModules] = useState<FormattedModule[]>(initialModules || []);
  const [lessons, setLessons] = useState<FormattedLesson[]>(initialLessons || []);

  // Module state
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
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
  const [lessonMaterialsList, setLessonMaterialsList] = useState<FormattedMaterial[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  // Delete Modals
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<FormattedModule | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<FormattedLesson | null>(null);

  // Thumbnail Upload state
  const [uploadingThumb, setUploadingThumb] = useState(false);

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

  // Add Module
  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;

    const orderIndex = modules.length + 1;
    try {
      const res = await fetch("/api/admin/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "module",
          courseId: course.id,
          title: newModuleTitle.trim(),
          orderIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.module) {
        setModules([
          ...modules,
          {
            id: data.module.id,
            course_id: data.module.courseId,
            title: data.module.title,
            order_index: data.module.orderIndex,
          },
        ]);
        setNewModuleTitle("");
        setShowModuleInput(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to add module");
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
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
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
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
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
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border/80 inline-flex h-auto">
          <TabsTrigger
            value="curriculum"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
          >
            <Layers className="h-4 w-4" />
            <span>Curriculum &amp; Syllabus ({modules.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="rounded-xl px-5 py-2.5 text-xs font-bold gap-2 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
          >
            <Settings className="h-4 w-4" />
            <span>Course Settings &amp; Pricing</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CURRICULUM BUILDER */}
        <TabsContent value="curriculum" className="space-y-6 m-0">
          <Card className="rounded-3xl border border-border/80 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/60 gap-3">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Curriculum &amp; Syllabus Structure</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize syllabus modules, upload HLS video lectures, and attach downloadable notes.
                </p>
              </div>

              {!showModuleInput && (
                <Button
                  size="sm"
                  onClick={() => setShowModuleInput(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 h-9 px-3.5 shadow-2xs cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Module</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* New Module Input Form */}
              {showModuleInput && (
                <div className="bg-primary/5 p-5 border border-primary/20 rounded-3xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">
                      New Learning Module
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Input
                      type="text"
                      placeholder="e.g. Module 1: Aerodynamics, Wing Lift & Structural Dynamics"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      className="flex-1 h-10 rounded-xl text-xs sm:text-sm font-semibold bg-background border-border/80 focus:border-primary"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddModule}
                        className="rounded-xl text-xs font-bold h-10 px-4 cursor-pointer"
                      >
                        Create Module
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowModuleInput(false);
                          setNewModuleTitle("");
                        }}
                        className="rounded-xl text-xs font-semibold h-10 px-3.5 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modules List */}
              {modules.length > 0 ? (
                <div className="space-y-5">
                  {modules
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((mod, modIdx) => {
                      const moduleLessons = lessons
                        .filter((l) => l.module_id === mod.id)
                        .sort((a, b) => a.order_index - b.order_index);
                      const isCollapsed = !!collapsedModules[mod.id];

                      return (
                        <div
                          key={mod.id}
                          className="border border-border/80 rounded-3xl overflow-hidden bg-card shadow-xs transition-shadow"
                        >
                          {/* Module Header */}
                          <div className="bg-muted/40 px-5 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div
                              className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                              onClick={() => toggleModuleCollapse(mod.id)}
                            >
                              <span className="h-7 w-7 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {mod.order_index || modIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-foreground font-outfit">
                                  {mod.title}
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
                                moduleLessons.map((les) => (
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
                                          {les.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                                          <span className="font-semibold text-muted-foreground">
                                            Lesson {les.order_index}
                                          </span>

                                          {les.is_free_preview && (
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase text-[9px]">
                                              Free Preview
                                            </span>
                                          )}

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
                <div className="py-16 border-2 border-dashed border-border/80 rounded-3xl text-center text-muted-foreground bg-muted/10 space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground font-outfit">Curriculum is currently empty</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Click &quot;Add New Module&quot; above to create the first syllabus unit and begin uploading lecture videos.
                    </p>
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
