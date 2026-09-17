"use client";

import { useState } from "react";
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
} from "lucide-react";
import { VideoUploader } from "@/components/admin/VideoUploader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseEditorProps {
  course: any;
  initialModules: any[];
  initialLessons: any[];
}

export default function CourseEditor({
  course,
  initialModules,
  initialLessons,
}: CourseEditorProps) {
  const [title, setTitle] = useState(course.title || "");
  const [description, setDescription] = useState(course.description || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [price, setPrice] = useState(course.price ? String(course.price) : "");
  const [isPublished, setIsPublished] = useState(course.is_published || false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Curriculum State
  const [modules, setModules] = useState<any[]>(initialModules || []);
  const [lessons, setLessons] = useState<any[]>(initialLessons || []);

  // Modal / Form States for Module/Lesson editing
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any | null>(null);

  // Lesson Form state
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSavedVideoId, setLessonSavedVideoId] = useState<string | null>(null);
  const [lessonSavedVideoStatus, setLessonSavedVideoStatus] = useState<string | null>(null);
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [lessonOrder, setLessonOrder] = useState("1");

  // Module state
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  const router = useRouter();

  // Save Course Info
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setLoading(true);
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
          isPublished,
        }),
      });

      if (res.ok) {
        alert("Course details updated successfully!");
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update course");
      }
    } catch (err: any) {
      alert(err.message || "Failed to save course");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this course? This will permanently delete the course, all its modules, lessons, student progress, enrollments, and generated certificates."
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/courses?id=${course.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("Course deleted successfully.");
        window.location.href = "/admin/courses";
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete course");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred while deleting the course.");
    } finally {
      setDeleting(false);
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
  const handleDeleteModule = async (moduleId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this module? All lessons inside will be deleted as well."
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/curriculum?type=module&id=${moduleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setModules(modules.filter((m) => m.id !== moduleId));
        setLessons(lessons.filter((l) => l.module_id !== moduleId));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete module");
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
    const moduleLessons = lessons.filter((l) => l.module_id === moduleId);
    setLessonOrder(String(moduleLessons.length + 1));
    setShowLessonModal(true);
  };

  // Open Lesson Modal (Edit)
  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setActiveModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonSavedVideoId(lesson.video_url || null);
    setLessonSavedVideoStatus(lesson.video_status || null);
    setLessonIsFree(lesson.is_free_preview || false);
    setLessonOrder(String(lesson.order_index));
    setShowLessonModal(true);
  };

  // Save Lesson
  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) return;

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
        const formattedLesson = {
          id: data.lesson.id,
          module_id: data.lesson.moduleId,
          title: data.lesson.title,
          content: data.lesson.content,
          video_url: data.lesson.videoUrl,
          order_index: data.lesson.orderIndex,
          is_free_preview: data.lesson.isFreePreview,
        };

        if (editingLesson) {
          setLessons(
            lessons.map((l) => (l.id === formattedLesson.id ? formattedLesson : l))
          );
        } else {
          setLessons([...lessons, formattedLesson]);
        }
        setShowLessonModal(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to save lesson");
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    try {
      const res = await fetch(`/api/admin/curriculum?type=lesson&id=${lessonId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setLessons(lessons.filter((l) => l.id !== lessonId));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete lesson");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Bar with Navigation & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Courses</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit truncate">
              {course.title}
            </h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                isPublished
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}
            >
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>
          </div>
        </div>

        {/* Live preview link if published */}
        {course.slug && (
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-border/80 rounded-xl bg-card text-xs font-semibold hover:bg-muted/50 transition-colors shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
            <span>View Public Page</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        )}
      </div>

      {/* Main Grid: Course Settings (1/3) vs Curriculum Builder (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Course Properties Form */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="pb-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span>Course Properties</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-5">
              <form onSubmit={handleSaveCourse} className="space-y-4">
                {/* Title */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Course Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                  />
                </div>

                {/* Price */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Price (INR ₹)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                    required
                  />
                </div>

                {/* Thumbnail URL */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Thumbnail Image URL
                  </label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://assets.airbharath.in/thumbnail.webp"
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-mono bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {thumbnailUrl && (
                    <div className="mt-2 rounded-xl overflow-hidden border border-border/60 h-24 bg-muted">
                      <img src={thumbnailUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Published Checkbox */}
                <div className="flex items-center gap-2.5 pt-2 pb-1">
                  <input
                    type="checkbox"
                    id="published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="published"
                    className="text-xs font-semibold text-foreground cursor-pointer"
                  >
                    Publish Course Publicly
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl text-xs font-bold gap-2 shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? "Saving Details..." : "Save Course Details"}</span>
                </Button>
              </form>

              {/* Danger Zone */}
              <div className="border-t border-destructive/20 pt-5 mt-6 space-y-2">
                <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block">
                  Danger Zone
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDeleteCourse}
                  className="w-full rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 border-destructive/30 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deleting ? "Deleting Course..." : "Delete Entire Course"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Curriculum Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
              <div>
                <CardTitle className="text-base font-bold font-outfit text-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  <span>Curriculum Builder</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Organize syllabus modules, video lectures, and notes.
                </p>
              </div>

              {!showModuleInput && (
                <Button
                  size="sm"
                  onClick={() => setShowModuleInput(true)}
                  className="rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Module</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* New Module Input Form */}
              {showModuleInput && (
                <div className="bg-muted/30 p-4 border border-primary/20 rounded-2xl space-y-3 animate-in fade-in duration-150">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    New Learning Module
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Module 1: Aircraft Performance & Weight Balance"
                      value={newModuleTitle}
                      onChange={(e) => setNewModuleTitle(e.target.value)}
                      className="flex-1 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleAddModule}
                      className="rounded-xl text-xs font-bold"
                    >
                      Create
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowModuleInput(false);
                        setNewModuleTitle("");
                      }}
                      className="rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Modules List */}
              {modules.length > 0 ? (
                <div className="space-y-4">
                  {modules
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((mod, modIdx) => {
                      const moduleLessons = lessons
                        .filter((l) => l.module_id === mod.id)
                        .sort((a, b) => a.order_index - b.order_index);

                      return (
                        <div
                          key={mod.id}
                          className="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-2xs"
                        >
                          {/* Module Header */}
                          <div className="bg-muted/40 px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {mod.order_index || modIdx + 1}
                              </span>
                              <h4 className="font-bold text-xs sm:text-sm text-foreground truncate font-outfit">
                                {mod.title}
                              </h4>
                              <span className="text-[10px] text-muted-foreground font-semibold shrink-0">
                                ({moduleLessons.length} {moduleLessons.length === 1 ? "lesson" : "lessons"})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openAddLesson(mod.id)}
                                className="rounded-xl text-xs font-bold text-primary hover:bg-primary/10 border-primary/20 h-7 px-2.5 gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Lesson</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteModule(mod.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                title="Delete Module"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {/* Lessons inside Module */}
                          <div className="p-2 divide-y divide-border/40">
                            {moduleLessons.length > 0 ? (
                              moduleLessons.map((les) => (
                                <div
                                  key={les.id}
                                  className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-muted/30 rounded-xl transition-colors group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                                      {les.video_url ? (
                                        <Video className="h-3.5 w-3.5 text-primary" />
                                      ) : (
                                        <FileText className="h-3.5 w-3.5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate font-sans">
                                        {les.title}
                                      </p>
                                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                        <span>Lesson {les.order_index}</span>
                                        {les.is_free_preview && (
                                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-full font-bold uppercase text-[9px]">
                                            Free Preview
                                          </span>
                                        )}
                                        {les.video_url && (
                                          <span className="text-primary font-medium">
                                            ✓ Video Attached
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditLesson(les)}
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                      title="Edit Lesson"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteLesson(les.id)}
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                      title="Delete Lesson"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="py-6 text-center text-xs text-muted-foreground">
                                No lessons inside this module yet. Click &quot;+ Add Lesson&quot; to build curriculum.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="py-14 border border-dashed border-border/80 rounded-2xl text-center text-muted-foreground bg-muted/10">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">Curriculum is currently empty</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click &quot;Add Module&quot; above to create the first syllabus block.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lesson Edit / Create Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Video className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-outfit text-foreground">
                    {editingLesson ? "Edit Lesson & Video Lecture" : "Add New Lesson"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload MP4 lectures, write notes, and configure free preview status.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Lesson Title */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Lesson Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Hydraulic Systems & Controls"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Video Uploader Container */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Video Lecture Stream
                </label>
                {editingLesson?.id ? (
                  <VideoUploader
                    courseId={course.id}
                    lessonId={editingLesson.id}
                    lessonTitle={lessonTitle}
                    existingVideoId={lessonSavedVideoId || undefined}
                    existingStatus={lessonSavedVideoStatus || undefined}
                    onDone={(videoId) => {
                      setLessonSavedVideoId(videoId);
                      setLessonSavedVideoStatus(null);
                    }}
                    onDelete={() => {
                      setLessonSavedVideoId(null);
                      setLessonSavedVideoStatus(null);
                      setLessons((prev) =>
                        prev.map((l) =>
                          l.id === editingLesson.id
                            ? { ...l, video_url: null, video_status: null }
                            : l
                        )
                      );
                    }}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground bg-muted/40 border border-border/80 rounded-2xl p-4 flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                    <p className="leading-relaxed">
                      Save this lesson title first to generate its lesson record, then reopen it to upload video files directly to AWS S3.
                    </p>
                  </div>
                )}
              </div>

              {/* Order and Free Preview Grid */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Order Sequence
                  </label>
                  <input
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(e.target.value)}
                    className="w-full border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                    required
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-6">
                  <input
                    type="checkbox"
                    id="lessonFree"
                    checked={lessonIsFree}
                    onChange={(e) => setLessonIsFree(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="lessonFree"
                    className="text-xs font-bold text-foreground cursor-pointer"
                  >
                    Free Preview Lesson
                  </label>
                </div>
              </div>

              {/* Lesson Notes / Content */}
              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Lesson Notes & Summary
                </label>
                <textarea
                  placeholder="Lesson instructions, theoretical formulas, links, or notes..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  rows={4}
                  className="w-full border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 bg-muted/20 flex justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLessonModal(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLesson}
                className="rounded-xl text-xs font-bold shadow-sm"
              >
                Save Lesson
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
