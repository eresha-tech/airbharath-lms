"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoAsset {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  status: string;
  durationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
  courseTitle?: string | null;
  usageCount?: number;
  usedIn?: Array<{
    lessonId: string;
    lessonTitle: string;
    courseId: string;
    courseTitle: string;
  }>;
}

interface VideoLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVideo: (video: VideoAsset) => void;
  selectedVideoId?: string | null;
}

export function VideoLibraryModal({
  open,
  onOpenChange,
  onSelectVideo,
  selectedVideoId,
}: VideoLibraryModalProps) {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (open) {
      fetchVideos();
    }
  }, [open]);

  async function fetchVideos() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/videos");
      if (!res.ok) {
        throw new Error("Failed to load video library");
      }
      const data = await res.json();
      setVideos(data.videos || []);
    } catch (err: any) {
      console.error("Error fetching video library:", err);
      setError(err.message || "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.courseTitle && v.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      v.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || v.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[94vw] max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-3xl border-border bg-card">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold font-outfit text-foreground">
                AirBharath Video Asset Library
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Select an existing processed HLS video asset to link to this lesson without re-uploading.
              </DialogDescription>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by video title, course, or ID..."
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

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "ready", "processing", "failed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer shrink-0",
                    statusFilter === status
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Video List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Loading video assets...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center space-y-2">
              <AlertCircle className="w-6 h-6 text-destructive mx-auto" />
              <p className="text-xs font-semibold text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchVideos}
                className="text-xs rounded-xl mt-2"
              >
                Retry Loading
              </Button>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="py-14 text-center space-y-3">
              <Film className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold font-outfit text-foreground">
                  {searchQuery ? "No matching video assets found" : "No videos uploaded yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search query or filter criteria."
                    : "Upload your first video using the upload form to build your video library."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredVideos.map((video) => {
                const isSelected = selectedVideoId === video.id;
                const isReady = video.status === "ready";

                return (
                  <div
                    key={video.id}
                    onClick={() => {
                      if (isReady) {
                        onSelectVideo(video);
                        onOpenChange(false);
                      }
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                        : isReady
                        ? "border-border/80 bg-card hover:bg-muted/30 hover:border-primary/40 cursor-pointer shadow-2xs"
                        : "border-border/60 bg-muted/20 opacity-75 cursor-not-allowed"
                    )}
                  >
                    {/* Left: Video Details */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                          isReady
                            ? "bg-primary/10 text-primary"
                            : video.status === "processing"
                            ? "bg-amber-500/10 text-amber-600 animate-pulse"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {isReady ? (
                          <Film className="w-5 h-5" />
                        ) : video.status === "processing" ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold font-outfit text-foreground truncate max-w-md">
                            {video.title}
                          </h4>
                          {isSelected && (
                            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0">
                              Current Asset
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          {video.courseTitle && (
                            <span className="flex items-center gap-1 text-foreground/80 font-medium">
                              <BookOpen className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[200px]">{video.courseTitle}</span>
                            </span>
                          )}

                          {video.durationSeconds && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span>{formatDuration(video.durationSeconds)}</span>
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1">
                            <Layers className="w-3 h-3 text-muted-foreground" />
                            <span>
                              {video.usageCount === 1
                                ? "Used in 1 lesson"
                                : `Used in ${video.usageCount || 0} lessons`}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Select CTA */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border",
                          isReady
                            ? "bg-success/10 text-success border-success/30"
                            : video.status === "processing"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        )}
                      >
                        {video.status}
                      </Badge>

                      <Button
                        size="sm"
                        disabled={!isReady}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVideo(video);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "text-xs font-bold rounded-xl h-8 px-3.5 shadow-xs",
                          isSelected
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : "bg-primary hover:bg-primary/90 text-primary-foreground"
                        )}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Select Video</span>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
          <span>{filteredVideos.length} video asset(s) available in library</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold rounded-xl h-8 px-4 border-border"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
