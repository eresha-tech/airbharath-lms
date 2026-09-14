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
      let masterUrlObj: URL | null = null;
      try {
        masterUrlObj = new URL(playbackUrl);
      } catch (err) {
        console.error("Invalid playback URL:", err);
      }

      const masterHost = masterUrlObj?.host;
      const masterSearchParams = masterUrlObj?.searchParams;

      // Custom Hls loader to propagate CloudFront signed query params to child playlists and TS segments
      class SignedUrlLoader extends (Hls.DefaultConfig.loader as any) {
        load(context: any, config: any, callbacks: any) {
          if (context.url && masterUrlObj && masterHost && masterSearchParams) {
            try {
              const u = new URL(context.url, masterUrlObj.href);
              if (u.host === masterHost && !u.searchParams.has("Signature")) {
                masterSearchParams.forEach((val, key) => {
                  if (!u.searchParams.has(key)) {
                    u.searchParams.set(key, val);
                  }
                });
                context.url = u.toString();
              }
            } catch (err) {
              console.error("Error attaching signed query params to HLS resource:", err);
            }
          }
          return super.load(context, config, callbacks);
        }
      }

      const hls = new Hls({
        loader: SignedUrlLoader as any,
        // Buffer management for smooth VOD streaming without aggressive prefetching
        maxBufferLength: 10, // Buffer up to 10 seconds ahead
        maxMaxBufferLength: 20, // Strict ceiling of 20 seconds ahead
        maxBufferSize: 30 * 1000 * 1000, // 30 MB max buffer memory
        backBufferLength: 30, // Prune buffer older than 30 seconds behind playhead
        startFragPrefetch: false, // Do not prefetch next fragments ahead before start
        capLevelToPlayerSize: true, // Optimize ABR resolution to player viewport size
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
      // Native Safari HLS support (AVPlayer automatically resolves relative URLs)
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
