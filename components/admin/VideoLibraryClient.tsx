"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Film,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Sparkles,
  Play,
  Check,
  X,
  Trash2,
  RefreshCw,
  Copy,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface VideoItem {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  status: string;
  rawS3Key: string;
  processedS3Prefix: string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  courseTitle?: string | null;
  usageCount: number;
  usedIn: Array<{
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
  }>;
}

export default function VideoLibraryClient() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion modal state
  const [deleteCandidate, setDeleteCandidate] = useState<VideoItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Retranscode state
  const [retranscodingId, setRetranscodingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  async function fetchVideos() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/videos");
      if (!res.ok) {
        throw new Error("Failed to load video assets");
      }
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err: any) {
      console.error("Error fetching videos:", err);
      setError(err.message || "Failed to load video assets");
    } finally {
      setLoading(false);
    }
  }

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetranscode = async (video: VideoItem) => {
    try {
      setRetranscodingId(video.id);
      const res = await fetch(`/api/admin/videos/${video.id}/retranscode`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to trigger retranscoding");
      }
      // Refresh list
      await fetchVideos();
    } catch (err: any) {
      alert(`Retranscode error: ${err.message}`);
    } finally {
      setRetranscodingId(null);
    }
  };

  const handleDeleteVideo = async (force = false) => {
    if (!deleteCandidate) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      const res = await fetch(`/api/admin/videos?id=${deleteCandidate.id}${force ? "&force=true" : ""}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete video");
        return;
      }

      setDeleteCandidate(null);
      await fetchVideos();
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const totalVideos = videos.length;
  const readyVideos = videos.filter((v) => v.status === "ready").length;
  const processingVideos = videos.filter((v) => v.status === "processing").length;
  const totalPlaytimeSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
  const totalPlaytimeMins = Math.round(totalPlaytimeSeconds / 60);
  const totalReusedLessons = videos.reduce((sum, v) => sum + (v.usageCount || 0), 0);

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.courseTitle && v.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || v.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <Film className="w-3.5 h-3.5" />
            <span>Reusable Content Assets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-foreground tracking-tight">
            Video Asset Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Centralized library of processed HLS adaptive bitrate videos. Link the same video asset across multiple course lessons with zero storage duplication.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            onClick={fetchVideos}
            disabled={loading}
            className="rounded-xl text-xs font-semibold h-10 px-4 border-border hover:bg-muted"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
            <span>Refresh Library</span>
          </Button>

          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs h-10 px-5 shadow-xs"
          >
            <Link href="/admin/courses">Go to Course Editor</Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Assets
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Film className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalVideos}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Uploaded to S3 raw bucket</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Ready Streams
            </span>
            <div className="h-8 w-8 rounded-xl bg-success/10 text-success flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {readyVideos}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">HLS multi-bitrate active</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Lesson Usages
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalReusedLessons}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Total active curriculum links</p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-border/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Playtime
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalPlaytimeMins} min
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Recorded video duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by video title, course, or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs rounded-xl bg-background border-border/80 h-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["all", "ready", "processing", "failed", "uploaded"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer shrink-0",
                  statusFilter === status
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                {status} ({status === "all" ? videos.length : videos.filter((v) => v.status === status).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-9 h-9 animate-spin text-primary mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">Loading video library...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button variant="outline" onClick={fetchVideos} className="rounded-xl text-xs mt-2">
            Try Again
          </Button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-card border border-dashed border-border text-center space-y-4">
          <Film className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-lg font-bold font-outfit text-foreground">
              {searchQuery ? "No matching video assets found" : "Your Video Library is Empty"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {searchQuery
                ? "Try searching for a different keyword or removing the status filter."
                : "Upload videos inside course lessons in the Course Editor. Once uploaded and transcoded, videos appear here for multi-course reuse."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => {
            const isReady = video.status === "ready";
            const isProcessing = video.status === "processing";
            const isFailed = video.status === "failed";

            return (
              <div
                key={video.id}
                className="bg-card border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md hover:border-primary/30 transition-all duration-200 flex flex-col justify-between space-y-5"
              >
                {/* Top Section */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border",
                        isReady
                          ? "bg-success/10 text-success border-success/30"
                          : isProcessing
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse"
                          : isFailed
                          ? "bg-destructive/10 text-destructive border-destructive/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {video.status}
                    </Badge>

                    {video.durationSeconds && (
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDuration(video.durationSeconds)}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-outfit text-foreground leading-snug">
                      {video.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-primary" />
                      <span className="truncate">{video.courseTitle || "Standalone Upload"}</span>
                    </p>
                  </div>
                </div>

                {/* Middle: Usage & Asset Coordinates */}
                <div className="space-y-2.5 pt-3 border-t border-border/60 text-xs">
                  {/* Usage Summary */}
                  <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Curriculum Usage</span>
                      </span>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-1.5 py-0">
                        {video.usageCount === 1 ? "1 Lesson" : `${video.usageCount} Lessons`}
                      </Badge>
                    </div>

                    {video.usedIn && video.usedIn.length > 0 ? (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {video.usedIn.map((usage, uIdx) => (
                          <div
                            key={uIdx}
                            className="flex items-center justify-between text-[10px] p-1.5 rounded-lg bg-card border border-border/60"
                          >
                            <span className="font-medium text-foreground truncate max-w-[140px]">
                              {usage.lessonTitle}
                            </span>
                            <span className="text-muted-foreground truncate max-w-[100px]">
                              {usage.courseTitle}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">
                        Not linked to any lesson yet.
                      </p>
                    )}
                  </div>

                  {/* Copyable Video ID */}
                  <div className="flex items-center justify-between gap-2 p-2 bg-muted/20 rounded-xl border border-border/60">
                    <span className="font-mono text-[10px] text-muted-foreground truncate select-all">
                      {video.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(video.id)}
                      className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                      title="Copy Video Asset ID"
                    >
                      {copiedId === video.id ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  {isFailed ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retranscodingId === video.id}
                      onClick={() => handleRetranscode(video)}
                      className="text-xs font-semibold rounded-xl h-9 border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", retranscodingId === video.id && "animate-spin")} />
                      <span>Retry MediaConvert</span>
                    </Button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Created {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleteCandidate(video);
                    }}
                    className="text-xs font-semibold rounded-xl h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <Dialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
          <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
            <DialogHeader className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <DialogTitle className="text-center text-lg font-bold font-outfit text-foreground">
                Delete Video Asset?
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground">
                This will permanently delete the raw S3 video and all processed HLS multi-bitrate streams from AWS storage.
              </DialogDescription>
            </DialogHeader>

            {deleteCandidate.usageCount > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Referenced in {deleteCandidate.usageCount} active lesson(s):</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                  {deleteCandidate.usedIn.map((u, i) => (
                    <li key={i}>
                      <strong>{u.lessonTitle}</strong> ({u.courseTitle})
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] pt-1 text-amber-700 dark:text-amber-400 font-medium">
                  Deleting will unlink this video from all listed lessons and disable their playback.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteCandidate(null)}
                disabled={isDeleting}
                className="rounded-xl text-xs font-semibold h-10 border-border"
              >
                Cancel
              </Button>

              <Button
                disabled={isDeleting}
                onClick={() => handleDeleteVideo(true)}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold rounded-xl text-xs h-10 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Deleting Storage Files...</span>
                  </>
                ) : (
                  <span>Confirm Permanent Deletion</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
