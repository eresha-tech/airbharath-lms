"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Save, Plus, Trash2, Edit2, FileText, Video, BookOpen, Upload, ImageIcon, Paperclip, X, FileImage, ExternalLink } from "lucide-react";
import { VideoUploader } from "@/components/admin/VideoUploader";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CourseEditorProps {
  course: any;
  initialModules: any[];
  initialLessons: any[];
}

export default function CourseEditor({ course, initialModules, initialLessons }: CourseEditorProps) {
  const [title, setTitle] = useState(course.title || "");
  const [description, setDescription] = useState(course.description || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(course.thumbnail_url || "");
  const [price, setPrice] = useState(course.price ? String(course.price) : "");
  const [isPublished, setIsPublished] = useState(course.is_published || false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
  // lessonSavedVideoId: set by VideoUploader after a successful upload (video.id UUID)
  const [lessonSavedVideoId, setLessonSavedVideoId] = useState<string | null>(null);
  // lessonSavedVideoStatus: mirrors videos.status for the lesson's current video
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
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm("Are you sure you want to delete this course? This will permanently delete the course, all its modules, lessons, student progress, enrollments, and generated certificates.")) {
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
        setModules([...modules, {
          id: data.module.id,
          course_id: data.module.courseId,
          title: data.module.title,
          order_index: data.module.orderIndex,
        }]);
        setNewModuleTitle("");
        setShowModuleInput(false);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module? All lessons inside will be deleted as well.")) return;

    try {
      const res = await fetch(`/api/admin/curriculum?type=module&id=${moduleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setModules(modules.filter((m) => m.id !== moduleId));
        setLessons(lessons.filter((l) => l.module_id !== moduleId));
      }
    } catch (err: any) {
      alert(err.message);
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
    const moduleLessons = lessons.filter(l => l.module_id === moduleId);
    setLessonOrder(String(moduleLessons.length + 1));
    setShowLessonModal(true);
  };

  // Open Lesson Modal (Edit)
  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setActiveModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonSavedVideoId(lesson.video_url || null); // video_url stores the video UUID
    setLessonSavedVideoStatus(lesson.video_status || null); // mirrors videos.status
    setLessonIsFree(lesson.is_free_preview || false);
    setLessonOrder(String(lesson.order_index));
    setShowLessonModal(true);
  };

  // Save Lesson (Insert or Update)
  // Note: videoUrl is managed by the VideoUploader — upload-url API sets it server-side.
  // We still pass it here so that if a lesson was saved before an upload, the value persists.
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
          videoUrl: lessonSavedVideoId || undefined, // pass only if set (preserve existing)
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
          setLessons(lessons.map(l => l.id === formattedLesson.id ? formattedLesson : l));
        } else {
          setLessons([...lessons, formattedLesson]);
        }
        setShowLessonModal(false);
      }
    } catch (err: any) {
      alert(err.message);
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
        setLessons(lessons.filter(l => l.id !== lessonId));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-instrument-serif text-[#014a62]">Edit Course: {course.title}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Update course details and organize curriculum modules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6 h-fit">
            <h3 className="font-bold text-lg font-instrument-serif text-[#014a62] border-b pb-4">Course Properties</h3>
            
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Course Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Price (INR ₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://assets.airbharath.in/thumbnail.webp"
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:ring-1 focus:ring-[#014a62] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#014a62] focus:ring-[#014a62]"
                />
                <label htmlFor="published" className="text-xs font-bold text-foreground">
                  Publish course publicly
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Details"}
              </button>
            </form>

            <div className="border-t border-rose-200 pt-6 mt-6">
              <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-2">Danger Zone</h4>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs hover:bg-rose-600 hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete Course"}
              </button>
            </div>
          </div>
        </div>

        {/* Curriculum Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 border rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg font-instrument-serif text-[#014a62]">Curriculum Builder</h3>
                <p className="text-muted-foreground text-xs">Organize modules and lessons.</p>
              </div>
              
              {!showModuleInput && (
                <button
                  onClick={() => setShowModuleInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#014a62]/10 text-[#014a62] rounded-xl text-xs font-bold hover:bg-[#014a62]/20 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Module
                </button>
              )}
            </div>

            {showModuleInput && (
              <div className="bg-muted/50 p-4 border rounded-xl mb-6 space-y-3">
                <h4 className="font-bold text-xs">NEW LEARNING MODULE</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Module 1: System Basics"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="flex-1 border rounded-xl px-3 py-1.5 text-xs bg-background focus:outline-none"
                  />
                  <button
                    onClick={handleAddModule}
                    className="px-4 py-1.5 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a]"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowModuleInput(false); setNewModuleTitle(""); }}
                    className="px-3 py-1.5 border rounded-xl text-xs font-bold hover:bg-background"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Modules List */}
            {modules.length > 0 ? (
              <div className="space-y-6">
                {modules
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((mod) => {
                    const moduleLessons = lessons
                      .filter((l) => l.module_id === mod.id)
                      .sort((a, b) => a.order_index - b.order_index);

                    return (
                      <div key={mod.id} className="border rounded-2xl overflow-hidden bg-background shadow-sm">
                        <div className="bg-muted/30 px-4 py-3 border-b flex justify-between items-center">
                          <h4 className="font-bold text-xs text-foreground font-instrument-sans">{mod.title}</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openAddLesson(mod.id)}
                              className="text-xs text-[#014a62] font-bold hover:underline"
                            >
                              + Add Lesson
                            </button>
                            <span className="text-muted-foreground text-xs">|</span>
                            <button
                              onClick={() => handleDeleteModule(mod.id)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-3 divide-y divide-border/40">
                          {moduleLessons.length > 0 ? (
                            moduleLessons.map((les) => (
                              <div key={les.id} className="py-2.5 flex items-center justify-between gap-4 hover:bg-muted/10 px-2 rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                  {les.video_url ? (
                                    <Video className="h-4 w-4 text-[#014a62] shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{les.title}</p>
                                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                                      <span>Order: {les.order_index}</span>
                                      {les.is_free_preview && (
                                        <span className="px-1 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold uppercase">Free Preview</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => openEditLesson(les)}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(les.id)}
                                    className="p-1 text-rose-600 hover:text-rose-800"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
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
              <div className="py-12 border border-dashed rounded-3xl text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-xs font-bold">Your course curriculum is empty.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Edit/Create Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-lg border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b">
              <h3 className="font-bold text-lg font-instrument-serif text-[#014a62]">{editingLesson ? "Edit Lesson" : "Add Lesson to Module"}</h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Navigation Systems"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Video</label>
                {/* Video upload is only possible when editing an existing lesson (we need the lessonId) */}
                {editingLesson?.id ? (
                  <VideoUploader
                    courseId={course.id}
                    lessonId={editingLesson.id}
                    lessonTitle={lessonTitle}
                    existingVideoId={lessonSavedVideoId || undefined}
                    existingStatus={lessonSavedVideoStatus || undefined}
                    onDone={(videoId) => {
                      setLessonSavedVideoId(videoId);
                      // New upload in flight — status will be updated by webhook later
                      setLessonSavedVideoStatus(null);
                    }}
                  />
                ) : (
                  <p className="text-[10px] text-muted-foreground bg-muted/40 border rounded-xl px-3 py-2.5">
                    Save the lesson first, then reopen it to upload a video.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Order Index</label>
                  <input
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="free"
                    checked={lessonIsFree}
                    onChange={(e) => setLessonIsFree(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#014a62] focus:ring-[#014a62]"
                  />
                  <label htmlFor="free" className="text-xs font-bold text-foreground">
                    Free Preview Lesson
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">Lesson Notes / Content</label>
                <textarea
                  placeholder="Lesson notes, HTML, or instructions..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  rows={5}
                  className="w-full border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
              <button
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLesson}
                className="px-4 py-2 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] shadow-sm"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
