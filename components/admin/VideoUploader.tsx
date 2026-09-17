"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  AlertCircle,
  Loader2,
  RefreshCw,
  Film,
  CheckCircle2,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  /** Called once S3 upload completes and video record is created. */
  onDone: (videoId: string) => void;
  /** Called once video is successfully deleted. */
  onDelete?: () => void;
  /** Present if this lesson already has a video (video UUID). */
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

  // Seed state from existing video if present
  const [state, setState] = useState<UploadState>(() => {
    if (existingVideoId) {
      if (existingStatus === "failed") {
        return { tag: "failed", message: "Previous processing failed.", videoId: existingVideoId };
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
            message: data.errorMessage || "MediaConvert processing failed.",
            videoId: processingVideoId,
          });
        }
      } catch {
        // network blip — keep polling
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [isProcessing, processingVideoId]);

  function pickFile() {
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes("mp4") && !file.type.includes("quicktime")) {
      setState({ tag: "failed", message: "Only MP4 and MOV files are supported." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ tag: "failed", message: "File exceeds 4 GB single-upload limit." });
      return;
    }

    setState({ tag: "selected", file });
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
        throw new Error(err.error || "Failed to get upload URL");
      }

      const { videoId, uploadUrl } = await res.json();

      // 2. Upload directly to S3 via XHR for progress tracking
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
          reject(new Error("Network error during S3 upload"));
        };

        xhr.send(file);
      });

      // 3. S3 ObjectCreated triggers transcoding pipeline
      setState({ tag: "processing", videoId });
      onDone(videoId);
    } catch (err: any) {
      setState({ tag: "failed", message: err.message || "Upload failed" });
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
        throw new Error(err.error || "Failed to trigger retranscode");
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
        throw new Error(data.error || "Failed to delete video");
      }

      setShowDeleteModal(false);
      reset();
      setDeleteSuccessMsg("Video and associated transcoding assets deleted successfully.");
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

  // Active target video ID across states
  const targetVideoId =
    state.tag === "processing" || state.tag === "ready" || state.tag === "failed"
      ? state.videoId || existingVideoId
      : existingVideoId;

  const s = state;

  return (
    <div className="space-y-3">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && targetVideoId && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border border-border/80 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground font-outfit">Delete Lesson Video?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action is irreversible.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete the private source video, all generated HLS adaptive streams, and the database video record.
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
                className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Video</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Alert */}
      {deleteSuccessMsg && (
        <div className="flex items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{deleteSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessMsg(null)}
            className="hover:opacity-80 p-0.5 text-muted-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* State: Idle */}
      {s.tag === "idle" && (
        <div>
          <button
            type="button"
            onClick={pickFile}
            className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/30 hover:border-primary/60 bg-muted/20 hover:bg-primary/5 rounded-2xl py-6 px-4 text-xs font-semibold text-primary transition-all group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-foreground">Click to Upload Video Lesson</span>
            <span className="text-[10px] text-muted-foreground">
              MP4 or MOV up to 4 GB • AWS S3 & HLS Transcoding Pipeline
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* State: Selected */}
      {s.tag === "selected" && (
        <div className="space-y-3 bg-muted/20 border border-border/80 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Film className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{s.file.name}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                {(s.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => startUpload(s.file)}
              className="flex-1 rounded-xl text-xs font-bold gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Start Direct S3 Upload
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              className="rounded-xl text-xs font-semibold"
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

      {/* State: Uploading */}
      {s.tag === "uploading" && (
        <div className="space-y-3 bg-muted/20 border border-border/80 rounded-2xl p-4">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-2 truncate">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
              <span className="truncate">Uploading {s.file.name}</span>
            </span>
            <span className="text-primary font-bold tabular-nums shrink-0 ml-2">{s.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${s.progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Direct multipart to AWS S3</span>
            <button
              type="button"
              onClick={reset}
              className="hover:text-destructive underline"
            >
              Cancel upload
            </button>
          </div>
        </div>
      )}

      {/* State: Processing */}
      {s.tag === "processing" && (
        <div className="space-y-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 font-outfit">
                  Transcoding HLS Video…
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300">
                  MediaConvert
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">
                Asset ID: {s.videoId}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Generating 1080p, 720p, 480p adaptive bitrate streams. Auto-refreshing status.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Replace Video
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
              className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Delete
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

      {/* State: Ready */}
      {s.tag === "ready" && (
        <div className="space-y-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-outfit">
                  Video Transcoded & Ready
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  HLS Secure
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-1">
                Asset ID: {s.videoId}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Ready for encrypted multi-bitrate classroom playback.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3 w-3" />
              Replace Video
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
              className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20 gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Delete
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

      {/* State: Failed */}
      {s.tag === "failed" && (
        <div className="space-y-3 bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-destructive/20 text-destructive flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-destructive font-outfit">
                Processing or Upload Failed
              </span>
              <p className="text-[10px] text-destructive/80 break-words mt-1">
                {s.message}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            {targetVideoId && (
              <Button
                type="button"
                size="sm"
                disabled={isRetrying || isDeleting}
                onClick={() => retryTranscode(targetVideoId)}
                className="flex-1 rounded-xl text-xs font-bold gap-1.5"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Retrying…</span>
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
              onClick={pickFile}
              className={`${targetVideoId ? "flex-1" : "w-full"} rounded-xl text-xs font-semibold gap-1.5`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Replace File</span>
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
                className="rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/20"
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
    </div>
  );
}
