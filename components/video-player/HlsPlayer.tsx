"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  videoId: string;
  watermarkText?: string;
  className?: string;
  onEnded?: () => void;
}

export function HlsPlayer({ videoId, watermarkText = "Airbharath LMS", className = "", onEnded }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // 1. Fetch playback session & signed cookies
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/videos/${videoId}/playback-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to authorize video playback");
        }

        const data = await res.json();
        if (isMounted) {
          setPlaybackUrl(data.playbackUrl);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load video");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (videoId) {
      initSession();
    }

    return () => {
      isMounted = false;
      // Release session on unmount
      fetch(`/api/videos/${videoId}/playback-session`, { method: "DELETE" }).catch(() => {});
    };
  }, [videoId]);

  // 2. Initialize Hls.js player when playbackUrl is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          // ponytail: Ensure browser sends HTTP-only CloudFront signed cookies with each HLS segment request
          xhr.withCredentials = true;
        },
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("HLS network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("HLS media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError("Fatal playback error occurred.");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Safari HLS support
      video.src = playbackUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playbackUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-black text-white aspect-video rounded-lg ${className}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Authorizing secure stream...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-900 text-red-400 aspect-video rounded-lg p-4 ${className}`}>
        <div className="text-center">
          <p className="font-semibold text-lg">Unable to Play Video</p>
          <p className="text-sm text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-black aspect-video rounded-lg group ${className}`}
      onContextMenu={(e) => e.preventDefault()} // Disable right-click context menu
    >
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        playsInline
        onEnded={onEnded}
        className="w-full h-full object-contain"
      />

      {/* Static Watermark Overlay */}
      {watermarkText && (
        <div className="absolute top-4 right-4 pointer-events-none select-none text-white/30 text-xs font-mono font-semibold px-2 py-1 bg-black/20 backdrop-blur-xs rounded">
          {watermarkText}
        </div>
      )}
    </div>
  );
}
