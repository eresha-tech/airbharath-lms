"use client";

import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [price, setPrice] = useState("");
  const [accessDays, setAccessDays] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnailUrl,
          price,
          accessDays: accessDays ? parseInt(accessDays) : null,
          isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");

      router.push("/admin/courses");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/admin/courses" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </Link>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight font-instrument-serif text-[#014a62]">Create New Airbharath Course</h1>
        <p className="text-muted-foreground text-sm">Set course syllabus, pricing, and access duration limits.</p>
      </div>

      <div className="bg-card p-6 border border-border rounded-2xl shadow-sm">
        <form onSubmit={handleCreate} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Course Title</label>
            <input
              type="text"
              placeholder="e.g. Advanced Commercial Aviation & Structural Design"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-[#014a62] focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Description</label>
            <textarea
              placeholder="Detailed description of course syllabus, practical modules, and certification requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-[#014a62] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Total Price (INR - Incl. 18% GST)</label>
              <input
                type="number"
                placeholder="e.g. 999"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-[#014a62] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Access Duration Limit (Days)</label>
              <input
                type="number"
                placeholder="e.g. 180 (Leave empty for Lifetime)"
                value={accessDays}
                onChange={(e) => setAccessDays(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-[#014a62] focus:outline-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Number of days a student retains access after enrollment.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase">Thumbnail URL (Optional)</label>
            <input
              type="url"
              placeholder="https://assets.airbharath.in/course.jpg"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full border rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-[#014a62] focus:outline-none"
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
            <label htmlFor="published" className="text-sm font-semibold text-foreground">
              Publish Course Immediately (Draft by default)
            </label>
          </div>

          <div className="border-t pt-6 flex justify-end gap-3">
            <Link href="/admin/courses">
              <button type="button" className="px-4 py-2 border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#014a62] text-white font-bold rounded-xl text-sm hover:bg-[#01374a] transition-colors shadow-sm disabled:opacity-50"
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
