"use client";

import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function NewCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [price, setPrice] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("courses").insert({
      title: title.trim(),
      description: description.trim(),
      thumbnail_url: thumbnailUrl.trim() || null,
      price: parseFloat(price),
      is_published: isPublished,
      instructor_id: user?.id,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
    } else {
      router.push("/admin/courses");
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Create New Course</h1>
        <p className="text-muted-foreground text-sm">Add structural curriculum content and publishing properties.</p>
      </div>

      {/* Form Card */}
      <div className="bg-card p-6 border rounded-2xl shadow-sm">
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Course Title</label>
            <input
              type="text"
              placeholder="e.g. Tekla Structural Designer Advanced"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Description</label>
            <textarea
              placeholder="Detailed description of course syllabus, modules, and software covered..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Price (INR)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Thumbnail URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/image.jpg"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Paste any image URL. File upload is available after the course is created.</p>
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
              Publish Course Immediately (Draft by default)
            </label>
          </div>

          <div className="border-t pt-6 flex justify-end gap-3">
            <Link href="/admin/courses">
              <button type="button" className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
