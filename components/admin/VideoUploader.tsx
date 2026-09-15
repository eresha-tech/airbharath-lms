"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, AlertCircle, Loader2, RefreshCw, Film, CheckCircle2, Trash2 } from "lucide-react";

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
      // uploaded / processing / undefined — show as processing (Lambda may still be running)
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
        // uploaded / processing: keep polling
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
      setState({ tag: "failed", message: "Only MP4 files are supported." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ tag: "failed", message: "File exceeds 4 GB limit." });
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

      // 3. S3 ObjectCreated → Lambda → MediaConvert (automatic)
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
      setDeleteSuccessMsg("Video and associated files deleted successfully.");
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

  // ── Render ────────────────────────────────────────────────────────────────
  const s = state;

  return (
    <div className="space-y-2">
      {/* Confirmation Dialog Modal */}
      {showDeleteModal && targetVideoId && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 rounded-full shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Delete this video?</h3>
                <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete the video, its processed HLS files, and the database record. This action cannot be undone.
            </p>

            {deleteError && (
              <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span className="flex-1 break-words">{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(targetVideoId)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Alert (Dismissible) */}
      {deleteSuccessMsg && (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{deleteSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-1 shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* State-specific UI */}
      {s.tag === "idle" && (
        <>
          <button
            type="button"
            onClick={pickFile}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#014a62]/30 rounded-xl py-4 text-xs font-bold text-[#014a62] hover:bg-[#014a62]/5 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Video
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/quicktime"
            className="hidden"
            onChange={onFileChange}
          />
        </>
      )}

      {s.tag === "selected" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-foreground bg-muted/40 border rounded-xl px-3 py-2">
            <Film className="h-4 w-4 text-[#014a62] shrink-0" />
            <span className="truncate flex-1 font-semibold">{s.file.name}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {(s.file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startUpload(s.file)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors"
            >
              <Upload className="h-3.5 w-3.5" /> Start Upload
            </button>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-2 border rounded-xl text-xs font-bold hover:bg-background"
            >
              Cancel
            </button>
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

      {s.tag === "uploading" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5 truncate">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#014a62] shrink-0" />
              <span className="truncate">Uploading {s.file.name}</span>
            </span>
            <span className="text-[#014a62] tabular-nums shrink-0 ml-2">{s.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#014a62] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${s.progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >
            Cancel upload
          </button>
        </div>
      )}

      {s.tag === "processing" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-700">Processing video…</p>
              <p className="text-blue-500 text-[10px] mt-0.5 font-mono truncate">{s.videoId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Replace Video
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-[10px] font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Delete Video
            </button>
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

      {s.tag === "ready" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-emerald-700">Video ready</p>
              <p className="text-emerald-500 text-[10px] mt-0.5 font-mono truncate">{s.videoId}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={pickFile}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-xl text-[10px] font-bold text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3 w-3" /> Replace Video
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setDeleteError(null);
                setShowDeleteModal(true);
              }}
              className="flex items-center justify-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-[10px] font-bold transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" /> Delete Video
            </button>
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

      {s.tag === "failed" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-xs">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-700">Processing Failed</p>
              <p className="text-red-500 text-[10px] mt-0.5 break-words">{s.message}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {targetVideoId && (
              <button
                type="button"
                disabled={isRetrying || isDeleting}
                onClick={() => retryTranscode(targetVideoId)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors disabled:opacity-50"
              >
                {isRetrying ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Retrying…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" /> Retry Transcode
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              disabled={isDeleting}
              onClick={pickFile}
              className={`${targetVideoId ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 py-2 border rounded-xl text-xs font-bold hover:bg-background text-foreground transition-colors disabled:opacity-50`}
            >
              <Upload className="h-3.5 w-3.5" /> Replace Video
            </button>
            {targetVideoId && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="flex items-center justify-center gap-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Video
              </button>
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

