/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Save, Plus, Trash2, Edit2, FileText, Video, BookOpen, Upload, ImageIcon, Paperclip, X, FileImage, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
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
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonIsFree, setLessonIsFree] = useState(false);
  const [lessonOrder, setLessonOrder] = useState("1");

  // Module state
  const [showModuleInput, setShowModuleInput] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  // Materials state (per lesson)
  const [lessonMaterials, setLessonMaterials] = useState<any[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const materialInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const router = useRouter();

  // Upload thumbnail image to Supabase Storage
  const handleThumbnailUpload = async (file: File) => {
    if (!file) return;
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", course.id);

      const res = await fetch("/api/admin/upload-thumbnail", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`Upload failed: ${data.error}`);
        return;
      }

      setThumbnailUrl(data.url);
    } catch (err: any) {
      alert(err.message || "Thumbnail upload failed.");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Save Course Info
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setLoading(true);
    const { error } = await supabase
      .from("courses")
      .update({
        title: title.trim(),
        description: description.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        price: parseFloat(price),
        is_published: isPublished,
      })
      .eq("id", course.id);

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      alert("Course details updated successfully!");
      router.refresh();
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirm("Are you sure you want to delete this course? This will permanently delete the course, all its modules, lessons, student progress, enrollments, and generated certificates. This action cannot be undone.")) {
      return;
    }

    setDeleting(true);

    try {
      // 1. Delete associated certificates
      await supabase
        .from("certificates")
        .delete()
        .eq("course_id", course.id);

      // 2. Nullify course_id in orders to satisfy foreign key constraint without losing financial records
      await supabase
        .from("orders")
        .update({ course_id: null })
        .eq("course_id", course.id);

      // 3. Delete the course (will cascade delete modules, lessons, enrollments, progress)
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", course.id);

      if (error) {
        throw error;
      }

      alert("Course deleted successfully.");
      window.location.href = "/admin/courses";
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
    const { data, error } = await supabase
      .from("modules")
      .insert({
        course_id: course.id,
        title: newModuleTitle.trim(),
        order_index: orderIndex,
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else if (data) {
      setModules([...modules, data]);
      setNewModuleTitle("");
      setShowModuleInput(false);
    }
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module? All lessons inside will be deleted as well.")) return;

    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", moduleId);

    if (error) {
      alert(error.message);
    } else {
      setModules(modules.filter((m) => m.id !== moduleId));
      setLessons(lessons.filter((l) => l.module_id !== moduleId));
    }
  };

  // Open Lesson Modal (Create)
  const openAddLesson = (moduleId: string) => {
    setActiveModuleId(moduleId);
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonIsFree(false);
    setLessonMaterials([]);
    setMaterialTitle("");
    // Find next order index
    const moduleLessons = lessons.filter(l => l.module_id === moduleId);
    setLessonOrder(String(moduleLessons.length + 1));
    setShowLessonModal(true);
  };

  // Upload a material file
  const handleUploadMaterial = async (file: File) => {
    if (!editingLesson) {
      alert("Please save the lesson first before adding materials.");
      return;
    }
    setUploadingMaterial(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("lessonId", editingLesson.id);
      form.append("title", materialTitle.trim() || file.name);

      const res = await fetch("/api/admin/lesson-materials", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Upload failed: ${data.error}`);
        return;
      }
      setLessonMaterials((prev) => [...prev, data.material]);
      setMaterialTitle("");
      if (materialInputRef.current) materialInputRef.current.value = "";
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Delete a material
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Remove this material?")) return;
    const res = await fetch("/api/admin/lesson-materials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materialId }),
    });
    if (res.ok) {
      setLessonMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } else {
      const data = await res.json();
      alert(data.error);
    }
  };

  // Fetch materials for a lesson
  const fetchMaterials = async (lessonId: string) => {
    const { data } = await supabase
      .from("lesson_materials")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true });
    setLessonMaterials(data || []);
  };

  // Open Lesson Modal (Edit)
  const openEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setActiveModuleId(lesson.module_id);
    setLessonTitle(lesson.title);
    setLessonContent(lesson.content || "");
    setLessonVideoUrl(lesson.video_url || "");
    setLessonIsFree(lesson.is_free_preview || false);
    setLessonOrder(String(lesson.order_index));
    setLessonMaterials([]);
    setMaterialTitle("");
    setShowLessonModal(true);
    // Fetch existing materials
    fetchMaterials(lesson.id);
  };

  // Save Lesson (Insert or Update)
  const handleSaveLesson = async () => {
    if (!lessonTitle.trim()) return;

    const payload = {
      module_id: activeModuleId,
      title: lessonTitle.trim(),
      content: lessonContent.trim() || null,
      video_url: lessonVideoUrl.trim() || null,
      is_free_preview: lessonIsFree,
      order_index: parseInt(lessonOrder) || 1,
    };

    if (editingLesson) {
      // Update
      const { data, error } = await supabase
        .from("lessons")
        .update(payload)
        .eq("id", editingLesson.id)
        .select()
        .single();

      if (error) {
        alert(error.message);
      } else if (data) {
        setLessons(lessons.map(l => l.id === data.id ? data : l));
        setShowLessonModal(false);
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from("lessons")
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert(error.message);
      } else if (data) {
        setLessons([...lessons, data]);
        setShowLessonModal(false);
      }
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;

    const { error } = await supabase
      .from("lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      alert(error.message);
    } else {
      setLessons(lessons.filter(l => l.id !== lessonId));
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Edit Course: {course.title}</h1>
          <p className="text-muted-foreground text-sm">Update landing configurations and structure the course curriculum modules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card p-6 border rounded-2xl shadow-sm space-y-6 h-fit">
            <h3 className="font-bold text-lg border-b pb-4">Course Properties</h3>
            
            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Course Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Price (INR)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Thumbnail Image</label>
                {/* Preview */}
                {thumbnailUrl && (
                  <div className="mb-2 relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                  </div>
                )}
                {/* Upload area */}
                <div
                  className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5"
                  onClick={() => thumbnailInputRef.current?.click()}
                >
                  {uploadingThumbnail ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] text-muted-foreground">Uploading…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground">Click to upload image</span>
                      <span className="text-[10px] text-muted-foreground/70">PNG, JPG, WebP up to 5MB</span>
                    </div>
                  )}
                </div>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleThumbnailUpload(file);
                  }}
                />
                {/* Manual URL fallback */}
                <div className="mt-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="Or paste image URL directly"
                    className="flex-1 border rounded-md px-2 py-1 text-[11px] bg-background focus:ring-1 focus:ring-primary focus:outline-none text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="published"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="published" className="text-sm font-semibold text-foreground">
                  Publish course publicly
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? "Saving..." : "Save Details"}
              </button>
            </form>

            <div className="border-t border-destructive/20 pt-6 mt-6">
              <h4 className="text-xs font-bold text-destructive uppercase mb-2">Danger Zone</h4>
              <p className="text-[10px] text-muted-foreground mb-3 leading-normal">
                Deleting this course will permanently remove all associated modules, lessons, student progress, and enrollments.
              </p>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-2 py-2 bg-destructive/10 text-destructive border border-destructive/20 font-semibold rounded-lg text-sm hover:bg-destructive hover:text-white transition-all shadow-sm disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Deleting..." : "Delete Course"}
              </button>
            </div>
          </div>
        </div>

        {/* Curriculum Module Manager */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-6 border rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-lg">Curriculum Builder</h3>
                <p className="text-muted-foreground text-xs">Organize your course into structural learning modules and lessons.</p>
              </div>
              
              {!showModuleInput && (
                <button
                  onClick={() => setShowModuleInput(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add Module
                </button>
              )}
            </div>

            {/* Add Module Input */}
            {showModuleInput && (
              <div className="bg-muted/50 p-4 border rounded-xl mb-6 space-y-3">
                <h4 className="font-bold text-xs">NEW LEARNING MODULE</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Module 1: Introduction to Staad Pro"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-1.5 text-xs bg-background focus:outline-none"
                  />
                  <button
                    onClick={handleAddModule}
                    className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg text-xs hover:bg-primary/90"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowModuleInput(false); setNewModuleTitle(""); }}
                    className="px-3 py-1.5 border rounded-lg text-xs hover:bg-background"
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
                      <div key={mod.id} className="border rounded-xl overflow-hidden bg-background">
                        {/* Module header */}
                        <div className="bg-muted/30 px-4 py-3 border-b flex justify-between items-center">
                          <h4 className="font-bold text-sm text-foreground">{mod.title}</h4>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openAddLesson(mod.id)}
                              className="text-xs text-primary font-bold hover:underline"
                            >
                              + Add Lesson
                            </button>
                            <span className="text-muted-foreground text-xs">|</span>
                            <button
                              onClick={() => handleDeleteModule(mod.id)}
                              className="text-destructive hover:bg-destructive/10 p-1 rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Lessons list */}
                        <div className="p-3 divide-y">
                          {moduleLessons.length > 0 ? (
                            moduleLessons.map((les) => (
                              <div key={les.id} className="py-2.5 flex items-center justify-between gap-4 hover:bg-muted/10 px-2 rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                  {les.video_url ? (
                                    <Video className="h-4 w-4 text-primary shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{les.title}</p>
                                    <div className="flex gap-2 text-[10px] text-muted-foreground mt-0.5">
                                      <span>Order: {les.order_index}</span>
                                      {les.is_free_preview && (
                                        <span className="px-1 py-0.5 bg-green-500/10 text-green-600 rounded font-semibold uppercase">Preview</span>
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
                                    className="p-1 text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 text-center text-xs text-muted-foreground">
                              No lessons inside this module yet. Click &quot;+ Add Lesson&quot; to build your curriculum!
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-12 border border-dashed rounded-xl text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm">Your course curriculum is empty.</p>
                <p className="text-xs mt-1">Create modules and lessons to let enrolled students start learning.</p>
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
              <h3 className="font-bold text-lg">{editingLesson ? "Edit Lesson properties" : "Add Lesson to Module"}</h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Lesson Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Finite Element Analysis"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">VdoCipher Video ID or URL (Secure DRM)</label>
                <input
                  type="text"
                  placeholder="e.g. 32-character video ID or embed URL"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground">Used for encrypted DRM secure streaming with dynamic watermarks.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Order Index</label>
                  <input
                    type="number"
                    value={lessonOrder}
                    onChange={(e) => setLessonOrder(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="free"
                    checked={lessonIsFree}
                    onChange={(e) => setLessonIsFree(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="free" className="text-xs font-semibold text-foreground">
                    Free Preview Lesson
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground mb-1 uppercase">Text / Markdown Content</label>
                <textarea
                  placeholder="Lesson notes, code snippets, calculations, instructions..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  rows={5}
                  className="w-full border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none"
                />
              </div>

              {/* ── Reference Materials ── */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Reference Materials (PDF / Images)</span>
                </div>

                {!editingLesson && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    💡 Save the lesson first, then reopen it to attach materials.
                  </p>
                )}

                {/* Existing materials list */}
                {lessonMaterials.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {lessonMaterials.map((mat) => (
                      <div key={mat.id} className="flex items-center justify-between gap-2 p-2.5 bg-muted/30 border rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          {mat.file_type === "pdf" ? (
                            <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          ) : (
                            <FileImage className="h-4 w-4 text-blue-500 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-foreground truncate">{mat.title}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {mat.file_size ? `${(mat.file_size / 1024).toFixed(0)} KB` : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={mat.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteMaterial(mat.id)}
                            className="p-1 text-destructive hover:text-destructive/80"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {editingLesson && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Material title (optional — defaults to filename)"
                      value={materialTitle}
                      onChange={(e) => setMaterialTitle(e.target.value)}
                      className="w-full border rounded-lg px-3 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div
                      className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-4 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-primary/5"
                      onClick={() => materialInputRef.current?.click()}
                    >
                      {uploadingMaterial ? (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px] text-muted-foreground">Uploading…</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-[11px] font-semibold text-muted-foreground">Click to upload PDF or image</span>
                          <span className="text-[10px] text-muted-foreground/60">PDF, JPG, PNG, WebP — up to 20 MB</span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={materialInputRef}
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMaterial(file);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
              <button
                onClick={() => setShowLessonModal(false)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLesson}
                className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 shadow-sm"
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
