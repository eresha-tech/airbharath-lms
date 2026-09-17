"use client";

import { useState } from "react";
import { ArrowLeft, Save, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim(),
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
      alert(err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back to courses */}
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Course Management</span>
      </Link>

      {/* Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Create New Course
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Configure title, curriculum properties, pricing structure, and access validity.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="rounded-2xl border-border/80 shadow-2xs">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold font-outfit text-foreground">
                Course Information
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                Basic course details visible to prospective and enrolled students.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Course Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Advanced Commercial Aviation & Structural Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Course Description
              </label>
              <textarea
                placeholder="Comprehensive description of the syllabus modules, flight mechanics, and certification roadmap..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full border border-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium leading-relaxed"
              />
            </div>

            {/* Price and Access Limit Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Course Price (INR ₹) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2499"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full border border-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium tabular-nums"
                  required
                />
                <p className="text-[10px] text-muted-foreground">Price in INR (inclusive of 18% GST)</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Access Duration (Days)
                </label>
                <input
                  type="number"
                  placeholder="Leave empty for Lifetime access"
                  value={accessDays}
                  onChange={(e) => setAccessDays(e.target.value)}
                  className="w-full border border-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium tabular-nums"
                />
                <p className="text-[10px] text-muted-foreground">Days of access after student enrollment</p>
              </div>
            </div>

            {/* Thumbnail URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Thumbnail Image URL
              </label>
              <input
                type="url"
                placeholder="https://assets.airbharath.in/courses/structural-design.webp"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="w-full border border-input rounded-xl px-3.5 py-2.5 text-xs sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary font-medium font-mono"
              />
            </div>

            {/* Published Switch */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/80 bg-muted/20">
              <input
                type="checkbox"
                id="published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="published" className="text-xs font-semibold text-foreground cursor-pointer">
                Publish Course Immediately (unchecked = Draft mode)
              </label>
            </div>

            {/* Form Actions */}
            <div className="border-t border-border/60 pt-5 flex items-center justify-end gap-3">
              <Link href="/admin/courses">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="rounded-xl text-xs font-bold gap-2 shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? "Creating Course..." : "Create Course"}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
