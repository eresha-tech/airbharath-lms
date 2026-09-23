"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Upload,
  AlertCircle,
  Loader2,
  RefreshCw,
  Film,
  CheckCircle2,
  Trash2,
  X,
  FileVideo,
  Layers,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Server,
  PlayCircle,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VideoLibraryModal, VideoAsset } from "@/components/admin/VideoLibraryModal";

type UploadState =
  | { tag: "idle" }
  | { tag: "selected"; file: File }
  | { tag: "uploading"; file: File; progress: number }
  | { tag: "processing"; videoId: string }
  | { tag: "ready"; videoId: string }
  | { tag: "failed"; message: string; videoId?: string };

const MAX_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB — S3 single-PUT limit

interface VideoUploaderProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  /** Called once S3 upload completes or video is selected from library and linked. */
  onDone: (videoId: string) => void;
  /** Called once video is successfully deleted. */
  onDelete?: () => void;
  /** Present if this lesson already has a video (video UUID or URL). */
  existingVideoId?: string;
  existingStatus?: string;
}

export function VideoUploader({
  courseId,
  lessonId,
  lessonTitle,
  onDone,
  onDelete,
  existingVideoId,
  existingStatus,
}: VideoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  function handleSelectFromLibrary(video: VideoAsset) {
    if (video.status === "ready") {
      setState({ tag: "ready", videoId: video.id });
    } else if (video.status === "failed") {
      setState({
        tag: "failed",
        message: "Selected video asset transcoding failed.",
        videoId: video.id,
      });
    } else {
      setState({ tag: "processing", videoId: video.id });
    }
    onDone(video.id);
  }

  // Seed state from existing video if present
  const [state, setState] = useState<UploadState>(() => {
    if (existingVideoId) {
      if (existingStatus === "failed") {
        return { tag: "failed", message: "Previous transcoding failed.", videoId: existingVideoId };
      }
      if (existingStatus === "ready") {
        return { tag: "ready", videoId: existingVideoId };
      }
      return { tag: "processing", videoId: existingVideoId };
    }
    return { tag: "idle" };
  });

  const isProcessing = state.tag === "processing";
  const processingVideoId = state.tag === "processing" ? state.videoId : null;

  // Poll video status while processing
  useEffect(() => {
    if (!isProcessing || !processingVideoId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/videos/${processingVideoId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "ready") {
          setState({ tag: "ready", videoId: processingVideoId });
        } else if (data.status === "failed") {
          setState({
            tag: "failed",
            message: data.errorMessage || "MediaConvert transcoding encountered an error.",
            videoId: processingVideoId,
          });
        }
      } catch {
        // network blip — keep polling
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isProcessing, processingVideoId]);

  function pickFile() {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }

  function handleFileSelection(file: File) {
    if (!file.type.includes("mp4") && !file.type.includes("quicktime")) {
      setState({ tag: "failed", message: "Only MP4 and MOV video containers are supported." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ tag: "failed", message: "File exceeds 4 GB single-upload limit." });
      return;
    }

    setState({ tag: "selected", file });
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelection(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelection(file);
  }

  async function startUpload(file: File) {
    setState({ tag: "uploading", file, progress: 0 });

    try {
      // 1. Get presigned URL — server creates video record and links it to the lesson
      const res = await fetch("/api/admin/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId,
          title: lessonTitle || file.name,
          filename: file.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get presigned upload URL from AWS S3");
      }

      const { videoId, uploadUrl } = await res.json();

      // 2. Upload directly to S3 via XHR for real-time progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setState({
              tag: "uploading",
              file,
              progress: Math.round((ev.loaded / ev.total) * 100),
            });
          }
        };

        xhr.onload = () => {
          xhrRef.current = null;
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed (HTTP ${xhr.status})`));
          }
        };

        xhr.onerror = () => {
          xhrRef.current = null;
          reject(new Error("Network error during S3 multipart upload"));
        };

        xhr.send(file);
      });

      // 3. S3 ObjectCreated event triggers MediaConvert transcoding pipeline
      setState({ tag: "processing", videoId });
      onDone(videoId);
    } catch (err: any) {
      setState({ tag: "failed", message: err.message || "Video upload failed" });
    }
  }

  async function retryTranscode(targetVideoId: string) {
    setIsRetrying(true);
    try {
      const res = await fetch(`/api/admin/videos/${targetVideoId}/retranscode`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to trigger AWS MediaConvert retranscode");
      }
      setState({ tag: "processing", videoId: targetVideoId });
    } catch (err: any) {
      setState({
        tag: "failed",
        message: err.message || "Failed to retry transcoding.",
        videoId: targetVideoId,
      });
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleDelete(targetVideoId: string) {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/videos?id=${targetVideoId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete video from S3");
      }

      setShowDeleteModal(false);
      reset();
      setDeleteSuccessMsg("Video and all associated HLS adaptive bitrate streams deleted.");
      onDelete?.();
    } catch (err: any) {
      console.error("Error deleting video:", err);
      setDeleteError(err.message || "Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  }

  function reset() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
    setState({ tag: "idle" });
  }

  function copyVideoId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  const targetVideoId =
    state.tag === "processing" || state.tag === "ready" || state.tag === "failed"
      ? state.videoId || existingVideoId
      : existingVideoId;

  const s = state;

  return (
    <div className="space-y-3 font-sans">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && targetVideoId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-2xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Video Lecture?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Permanent cloud asset deletion</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete the raw video file from <strong>AWS S3</strong>, all generated <strong>HLS adaptive bitrate segments</strong>, and the database record.
            </p>

            {deleteError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="flex-1 break-words">{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => handleDelete(targetVideoId)}
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting Asset...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Alert */}
      {deleteSuccessMsg && (
        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-3.5 py-2.5 text-xs text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-2 font-medium truncate">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate">{deleteSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessMsg(null)}
            className="hover:opacity-80 p-0.5 text-muted-foreground cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* State 1: Idle (Dropzone + Library Selector) */}
      {s.tag === "idle" && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-3xl border-2 border-dashed p-6 sm:p-7 text-center transition-all duration-200 cursor-pointer",
              isDragging
                ? "border-primary bg-primary/10 scale-[1.01]"
                : "border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-primary/5"
            )}
            onClick={pickFile}
          >
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-foreground font-outfit">
                  Upload New Video Lecture
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  MP4 or MOV container up to 4 GB. Direct S3 upload &amp; MediaConvert HLS transcode.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background border border-border/80 text-[10px] font-bold text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                <span>AWS S3 Direct • Multi-Bitrate HLS</span>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime"
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          <div className="flex items-center gap-3 px-2">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
              OR REUSE ASSET
            </span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowLibraryModal(true)}
            className="w-full h-11 rounded-2xl border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2 cursor-pointer transition-all shadow-2xs"
          >
            <FolderOpen className="w-4 h-4 text-primary" />
            <span>Select Existing Video from Library</span>
          </Button>
        </div>
      )}

      {/* State 2: Selected (File ready to upload) */}
      {s.tag === "selected" && (
        <div className="space-y-4 bg-card border border-border/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Film className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-foreground truncate font-outfit">
                {s.file.name}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                <span className="font-semibold tabular-nums">
                  {(s.file.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <span>•</span>
                <span>Ready for direct S3 upload</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              size="sm"
              onClick={() => startUpload(s.file)}
              className="flex-1 rounded-xl text-xs font-bold gap-2 h-10 shadow-sm cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Start Direct S3 Upload</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              className="rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
            >
              Cancel
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* State 3: Uploading (Direct S3 multipart) */}
      {s.tag === "uploading" && (
        <div className="space-y-4 bg-card border border-border/80 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <div className="flex items-center gap-2.5 truncate">
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
              <span className="font-bold truncate font-outfit">Uploading {s.file.name}</span>
            </div>
            <span className="text-primary font-bold tabular-nums text-sm shrink-0 ml-2">
              {s.progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-200"
              style={{ width: `${s.progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Server className="h-3 w-3 text-muted-foreground" />
              <span>Direct multipart to AWS S3</span>
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-destructive text-xs font-semibold underline cursor-pointer"
            >
              Cancel Upload
            </button>
          </div>
        </div>
      )}

      {/* State 4: Processing (AWS MediaConvert Stepper) */}
      {s.tag === "processing" && (
        <div className="space-y-4 bg-blue-500/10 border border-blue-500/20 rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-300 font-outfit">
                    Transcoding HLS Video…
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                    MediaConvert
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  AWS MediaConvert is generating 1080p, 720p, and 480p adaptive bitrate HLS streams.
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Pipeline */}
          <div className="grid grid-cols-3 gap-2 bg-background/60 p-3 rounded-2xl border border-blue-500/15 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>1. S3 Uploaded</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-600 font-bold">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              <span>2. Transcoding</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
              <span>3. HLS Live</span>
            </div>
          </div>

          {/* Asset ID info */}
          {s.videoId && (
            <div className="flex items-center justify-between bg-background/40 px-3 py-1.5 rounded-xl border border-border/60 text-[10px]">
              <span className="font-mono text-muted-foreground truncate">
                Asset ID: {s.videoId}
              </span>
              <button
                type="button"
                onClick={() => copyVideoId(s.videoId!)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-semibold ml-2 cursor-pointer"
              >
                {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedId ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowLibraryModal(true)}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10 border-primary/30 h-9 cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span>Library</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground h-9 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Upload New</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 h-9 px-3.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* State 5: Ready (HLS Stream Ready) */}
      {s.tag === "ready" && (
        <div className="space-y-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300 font-outfit">
                    HLS Video Stream Ready
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for secure multi-bitrate student classroom playback via CloudFront.
                </p>
              </div>
            </div>
          </div>

          {/* Asset Details */}
          {s.videoId && (
            <div className="flex items-center justify-between bg-background/50 px-3 py-1.5 rounded-xl border border-border/60 text-[10px]">
              <span className="font-mono text-muted-foreground truncate">
                Asset ID: {s.videoId}
              </span>
              <button
                type="button"
                onClick={() => copyVideoId(s.videoId!)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-semibold ml-2 cursor-pointer"
              >
                {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedId ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowLibraryModal(true)}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10 border-primary/30 h-9 cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span>Choose from Library</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground h-9 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Upload New</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 h-9 px-3.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* State 6: Failed (Error state) */}
      {s.tag === "failed" && (
        <div className="space-y-4 bg-destructive/10 border border-destructive/20 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <span className="text-xs sm:text-sm font-bold text-destructive font-outfit">
                Video Processing or Upload Failed
              </span>
              <p className="text-xs text-destructive/90 break-words leading-relaxed">
                {s.message}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {targetVideoId && (
              <Button
                type="button"
                size="sm"
                disabled={isRetrying || isDeleting}
                onClick={() => retryTranscode(targetVideoId)}
                className="flex-1 rounded-xl text-xs font-bold gap-1.5 h-9 cursor-pointer"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Retrying AWS MediaConvert…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Transcode</span>
                  </>
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setShowLibraryModal(true)}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10 border-primary/30 h-9 cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
              <span>Choose from Library</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={pickFile}
              className="rounded-xl text-xs font-semibold gap-1.5 h-9 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload New</span>
            </Button>
            {targetVideoId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 h-9 px-3.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Video Library Modal Picker */}
      <VideoLibraryModal
        open={showLibraryModal}
        onOpenChange={setShowLibraryModal}
        onSelectVideo={handleSelectFromLibrary}
        selectedVideoId={targetVideoId}
      />
    </div>
  );
}
