"use client";

import React, { useState } from "react";
import { ArrowLeft, Save, Sparkles, BookOpen, Image as ImageIcon, IndianRupee, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function NewCourse() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [price, setPrice] = useState("");
  const [accessDays, setAccessDays] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!title.trim() || !price) {
      setErrorMsg("Course title and price are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          thumbnailUrl: thumbnailUrl.trim() || null,
          price: parseFloat(price),
          accessDays: accessDays ? parseInt(accessDays) : null,
          isPublished,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");

      router.push(`/admin/courses/${data.course?.id || ""}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create course");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans pb-12 animate-fade-in">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Course Management</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Course Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Create Technical Course
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Configure course fundamentals, tuition pricing structure, access validity, and catalog publishing status.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-semibold flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleCreate} className="space-y-6">
        {/* Section 1: Basic Information */}
        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold font-outfit text-foreground">
                  Course Information
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Primary course title and syllabus description shown on the public catalog.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Course Title <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Flight Navigation, Mechanics & Avionics Masterclass"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 focus:border-primary font-medium"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Course Description
              </label>
              <Textarea
                placeholder="Comprehensive overview of syllabus modules, flight principles, real-world case studies, and career certification..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl text-xs sm:text-sm bg-background border-border/80 focus:border-primary font-medium leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Pricing & Access Duration */}
        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold font-outfit text-foreground">
                  Tuition Pricing &amp; Validity
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Set enrollment fee in INR and student access period.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Price */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Course Price (INR ₹) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2499"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="pl-8 h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 focus:border-primary font-bold tabular-nums"
                    required
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Price in INR (inclusive of 18% GST)</p>
              </div>

              {/* Access Duration */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Access Duration (Days)
                </label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Leave empty for Lifetime Access"
                    value={accessDays}
                    onChange={(e) => setAccessDays(e.target.value)}
                    className="pl-10 h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 focus:border-primary font-medium tabular-nums"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Number of days access remains valid after enrollment. Leave blank for lifetime.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Thumbnail Media */}
        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold font-outfit text-foreground">
                  Course Thumbnail
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Banner image displayed across the student dashboard and public catalog.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                Thumbnail Image URL
              </label>
              <Input
                type="url"
                placeholder="https://assets.airbharath.in/courses/avionics-preview.webp"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                className="h-11 rounded-xl text-xs sm:text-sm bg-background border-border/80 focus:border-primary font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Recommended aspect ratio 16:9 (1280×720 or 1920×1080 px).
              </p>
            </div>

            {thumbnailUrl && (
              <div className="mt-3 p-2 bg-muted/30 border border-border/80 rounded-2xl max-w-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Live Image Preview
                </span>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-muted border border-border/60">
                  <img
                    src={thumbnailUrl}
                    alt="Course Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Publishing Status */}
        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <input
                type="checkbox"
                id="publishedCheckbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary mt-0.5 cursor-pointer"
              />
              <div className="flex-1 cursor-pointer" onClick={() => setIsPublished(!isPublished)}>
                <label
                  htmlFor="publishedCheckbox"
                  className="text-sm font-bold text-foreground cursor-pointer block font-outfit"
                >
                  Publish Course to Public Catalog Immediately
                </label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When unchecked, the course is saved in <strong className="text-amber-600">Draft Mode</strong> and will only be visible to administrators.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/courses">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs font-semibold h-11 px-5"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading}
            className="rounded-xl text-xs font-bold h-11 px-6 gap-2 shadow-sm cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Creating Course..." : "Create Course & Configure Syllabus"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
