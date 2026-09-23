"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Tv,
  Check,
  Loader2,
  AlertCircle,
  Sliders,
  Gauge,
  Subtitles,
} from "lucide-react";
import { track } from "@/lib/analytics";

interface HlsPlayerProps {
  videoId: string;
  courseId?: string;
  lessonId?: string;
  lessonTitle?: string;
  lessonIndex?: number;
  watermarkText?: string;
  watermarkEmail?: string;
  watermarkPhone?: string;
  className?: string;
  onEnded?: () => void;
  captionAvailable?: boolean;
  captionUrl?: string;
}

interface QualityLevel {
  index: number;
  height: number;
  width: number;
  bitrate: number;
  label: string;
}

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

function formatPhoneDisplay(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  const cleaned = rawPhone.trim();
  // If already starts with +91 and 10 digits
  if (cleaned.startsWith("+91")) {
    const digits = cleaned.slice(3).trim();
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return cleaned;
  }
  // If 10 raw digits e.g. 9112345678
  if (/^\d{10}$/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  // Other format
  return cleaned.startsWith("+") ? cleaned : `+91 ${cleaned}`;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function HlsPlayer({
  videoId,
  courseId,
  lessonId,
  lessonTitle,
  lessonIndex,
  captionAvailable,
  captionUrl,
  watermarkText = "Airbharath LMS",
  watermarkEmail,
  watermarkPhone,
  className = "",
  onEnded,
}: HlsPlayerProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Analytics milestone & start tracking refs
  const hasTrackedStartRef = useRef<boolean>(false);
  const milestonesReachedRef = useRef<Set<number>>(new Set());

  // Reset analytics progress trackers when video/lesson changes
  useEffect(() => {
    hasTrackedStartRef.current = false;
    milestonesReachedRef.current = new Set();
  }, [videoId, lessonId]);

  // Core stream states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  // Playback control states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true); // true initially until media is playable
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Quality & Speed menu states
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number>(-1); // -1 = Auto
  const [currentLevelLabel, setCurrentLevelLabel] = useState<string>("720p");
  const [activeMenu, setActiveMenu] = useState<"none" | "main" | "quality" | "speed">("none");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  // Captions state
  const [hasServerCaptions, setHasServerCaptions] = useState<boolean>(false);
  const [isCaptionsOn, setIsCaptionsOn] = useState<boolean>(false);

  const isCaptionAvailable = captionAvailable ?? hasServerCaptions;
  const effectiveCaptionUrl =
    captionUrl ||
    (isCaptionAvailable && courseId && lessonId
      ? `/api/videos/${videoId}/captions?courseId=${courseId}&lessonId=${lessonId}&language=en`
      : undefined);

  // Keep refs up-to-date for timers
  const isPlayingRef = useRef(false);
  const activeMenuRef = useRef<string>("none");
  isPlayingRef.current = isPlaying;
  activeMenuRef.current = activeMenu;

  // 1. Fetch playback session & signed URL
  useEffect(() => {
    let isMounted = true;
    setIsCaptionsOn(false);

    async function initSession() {
      try {
        setLoading(true);
        setIsBuffering(true);
        setError(null);

        const res = await fetch(`/api/videos/${videoId}/playback-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, lessonId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to authorize video playback");
        }

        const data = await res.json();
        if (isMounted) {
          setPlaybackUrl(data.playbackUrl);
          if (data.durationSeconds && typeof data.durationSeconds === "number") {
            setDuration(data.durationSeconds);
          }
          if (data.hasCaptions !== undefined) {
            setHasServerCaptions(Boolean(data.hasCaptions));
          }
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
      fetch(`/api/videos/${videoId}/playback-session`, { method: "DELETE" }).catch(() => {});
    };
  }, [videoId, courseId, lessonId]);

  // 2. Initialize Hls.js player with signed URL propagation and 720p initial resolution
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
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        maxBufferSize: 30 * 1000 * 1000,
        backBufferLength: 30,
        startFragPrefetch: false,
        capLevelToPlayerSize: true,
      });

      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      // On Manifest Parsed: find the level closest to 720p as default start quality
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        if (data.levels && data.levels.length > 0) {
          const parsed = data.levels.map((lvl, index) => ({
            index,
            height: lvl.height,
            width: lvl.width,
            bitrate: lvl.bitrate,
            label: `${lvl.height}p`,
          }));
          setLevels(parsed);

          let closest720Idx = 0;
          let minDiff = Infinity;
          data.levels.forEach((lvl, idx) => {
            const diff = Math.abs(lvl.height - 720);
            if (diff < minDiff) {
              minDiff = diff;
              closest720Idx = idx;
            }
          });

          hls.startLevel = closest720Idx;
          const found = data.levels[closest720Idx];
          setCurrentLevelLabel(found ? `${found.height}p` : "720p");
        }
      });

      // Capture exact VOD duration from HLS manifest details
      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
        if (data.details && data.details.totalduration > 0) {
          setDuration(data.details.totalduration);
        }
      });

      // Track active level switches
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          setCurrentLevelLabel(`${lvl.height}p`);
        }
      });

      // Buffering event
      hls.on(Hls.Events.BUFFER_APPENDED, () => setIsBuffering(false));

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

  // 3. Autohide controls management
  const resetHideTimer = useCallback(() => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }

    setShowControls(true);

    if (isPlayingRef.current && activeMenuRef.current === "none") {
      hideControlsTimerRef.current = setTimeout(() => {
        if (isPlayingRef.current && activeMenuRef.current === "none") {
          setShowControls(false);
        }
      }, 2500);
    }
  }, []);

  // When play/pause or menu opens/closes, update controls visibility
  useEffect(() => {
    if (!isPlaying || activeMenu !== "none") {
      setShowControls(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
    } else {
      resetHideTimer();
    }
  }, [isPlaying, activeMenu, resetHideTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Video HTML5 event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Update duration if available
    const activeDuration = video.duration && isFinite(video.duration) && video.duration > 0 ? video.duration : duration;
    if (video.duration && isFinite(video.duration) && video.duration > 0) {
      setDuration((prev) => (prev > 0 ? prev : video.duration));
    }

    // Update buffer progress
    if (video.buffered && video.buffered.length > 0) {
      for (let i = 0; i < video.buffered.length; i++) {
        if (video.buffered.start(i) <= video.currentTime && video.currentTime <= video.buffered.end(i)) {
          setBufferedEnd(video.buffered.end(i));
          break;
        }
      }
    }

    // Track lesson progress milestone analytics (25%, 50%, 75%, 90%, 100%)
    if (activeDuration > 0 && (lessonId || courseId)) {
      const currentPercent = (video.currentTime / activeDuration) * 100;
      const milestones = [25, 50, 75, 90, 100];
      for (const m of milestones) {
        if (currentPercent >= m && !milestonesReachedRef.current.has(m)) {
          milestonesReachedRef.current.add(m);
          track("lesson_progress", {
            course_id: courseId,
            lesson_id: lessonId,
            lesson_title: lessonTitle,
            milestone: m,
            progress_percent: Math.min(100, Math.round(currentPercent)),
            duration: Math.round(activeDuration),
            current_time: Math.round(video.currentTime),
          });
        }
      }
    }
  };

  const handleDurationChange = () => {
    const video = videoRef.current;
    if (video && isFinite(video.duration) && video.duration > 0) {
      setDuration(video.duration);
    }
  };

  // Playback control actions
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    resetHideTimer();
  };

  const seekRelative = (offsetSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(duration || video.duration || 0, video.currentTime + offsetSeconds));
    video.currentTime = target;
    setCurrentTime(target);
    resetHideTimer();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
    resetHideTimer();
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * (duration || 0));
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    resetHideTimer();
  };

  const handleVolumeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
    resetHideTimer();
  };

  const setSpeed = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setActiveMenu("none");
    resetHideTimer();
  };

  const setQuality = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setSelectedLevel(levelIndex);
    if (levelIndex === -1) {
      const current = hlsRef.current.levels[hlsRef.current.currentLevel];
      if (current) setCurrentLevelLabel(`${current.height}p`);
    } else {
      const chosen = levels.find((l) => l.index === levelIndex);
      if (chosen) setCurrentLevelLabel(chosen.label);
    }
    setActiveMenu("none");
    resetHideTimer();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    const isCurrentlyFullscreen =
      !!document.fullscreenElement ||
      !!(document as any).webkitFullscreenElement ||
      !!(document as any).mozFullScreenElement ||
      !!(document as any).msFullscreenElement;

    if (!isCurrentlyFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {
          if ((video as any)?.webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
          }
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((video as any)?.webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
    resetHideTimer();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture in Picture error:", err);
    }
    resetHideTimer();
  };

  // Synchronize TextTrack mode with isCaptionsOn state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateTrackMode = () => {
      const tracks = video.textTracks;
      if (tracks && tracks.length > 0) {
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = isCaptionsOn ? "showing" : "disabled";
        }
      }
    };
    updateTrackMode();
    video.textTracks.addEventListener("addtrack", updateTrackMode);
    return () => {
      video.textTracks.removeEventListener("addtrack", updateTrackMode);
    };
  }, [isCaptionsOn, effectiveCaptionUrl]);

  // Toggle Closed Captions / Subtitles
  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    const nextState = !isCaptionsOn;
    if (tracks && tracks.length > 0) {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = nextState ? "showing" : "disabled";
      }
    }
    setIsCaptionsOn(nextState);
    resetHideTimer();
  }, [isCaptionsOn]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyM", "KeyF", "KeyK", "KeyJ", "KeyL", "KeyC"].includes(e.code)) {
      e.preventDefault();
    }
    switch (e.code) {
      case "Space":
      case "KeyK":
        togglePlay();
        break;
      case "KeyC":
        if (isCaptionAvailable || effectiveCaptionUrl) {
          toggleCaptions();
        }
        break;
      case "ArrowLeft":
      case "KeyJ":
        seekRelative(-10);
        break;
      case "ArrowRight":
      case "KeyL":
        seekRelative(10);
        break;
      case "ArrowUp": {
        const video = videoRef.current;
        if (video) {
          const v = Math.min(1, video.volume + 0.1);
          video.volume = v;
          video.muted = false;
          setVolume(v);
          setIsMuted(false);
        }
        break;
      }
      case "ArrowDown": {
        const video = videoRef.current;
        if (video) {
          const v = Math.max(0, video.volume - 0.1);
          video.volume = v;
          video.muted = v === 0;
          setVolume(v);
          setIsMuted(v === 0);
        }
        break;
      }
      case "KeyM":
        toggleMute();
        break;
      case "KeyF":
        toggleFullscreen();
        break;
    }
    resetHideTimer();
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-950 text-red-400 aspect-video rounded-xl border border-red-900/30 p-6 ${className}`}>
        <div className="flex flex-col items-center text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mb-2 opacity-90" />
          <p className="font-semibold text-base text-zinc-200">Unable to Play Video</p>
          <p className="text-xs text-zinc-400 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  // Construct multi-line watermark: Email on line 1, Phone on line 2
  const formattedPhone = formatPhoneDisplay(watermarkPhone);
  const displayWatermark =
    watermarkEmail || watermarkPhone
      ? [watermarkEmail, formattedPhone].filter(Boolean).join("\n")
      : watermarkText;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={resetHideTimer}
      onMouseEnter={resetHideTimer}
      onMouseLeave={() => {
        if (isPlaying && activeMenu === "none") {
          setShowControls(false);
        }
      }}
      className={`relative overflow-hidden bg-black aspect-video rounded-xl group select-none outline-none border border-zinc-800/60 shadow-2xl ${
        !showControls && isPlaying ? "cursor-none" : "cursor-default"
      } ${className}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        onEnded={onEnded}
        onClick={togglePlay}
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
          if (!hasTrackedStartRef.current) {
            hasTrackedStartRef.current = true;
            if (lessonId || courseId) {
              track("lesson_started", {
                course_id: courseId,
                lesson_id: lessonId,
                lesson_title: lessonTitle,
                lesson_index: lessonIndex,
                video_id: videoId,
              });
            }
          }
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={handleDurationChange}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onSeeked={() => setIsBuffering(false)}
        className="w-full h-full object-contain cursor-pointer"
      >
        {effectiveCaptionUrl && (
          <track
            key={effectiveCaptionUrl}
            kind="captions"
            src={effectiveCaptionUrl}
            srcLang="en"
            label="English"
            default={false}
          />
        )}
      </video>

      {/* Multi-line Watermark Overlay (Email + Mobile Number) */}
      {displayWatermark && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none select-none text-white/50 text-[9px] sm:text-[11px] font-mono font-medium z-20 text-right leading-tight whitespace-pre-line drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {displayWatermark}
        </div>
      )}

      {/* Prominent Loading & Buffering Spinner Overlay */}
      {(loading || isBuffering) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30 bg-black/10">
          <div className="relative flex items-center justify-center p-3 rounded-2xl bg-black/60 shadow-2xl border border-white/10">
            <div className="w-12 h-12 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
            <Loader2 className="w-5 h-5 text-emerald-400 absolute animate-spin opacity-90" />
          </div>
          <span className="text-[11px] font-medium text-white px-2.5 py-1 rounded-md bg-black/60 shadow mt-2.5 tracking-wider uppercase border border-white/5">
            {loading ? "Authorizing video stream..." : "Buffering..."}
          </span>
        </div>
      )}

      {/* Center Big Play Button (When Paused) */}
      {!isPlaying && !loading && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10 bg-transparent transition-all"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/90 text-white flex items-center justify-center pl-1 shadow-2xl shadow-black/80 hover:scale-110 active:scale-95 transition-all border border-white/20">
            <Play className="w-8 h-8 fill-current" />
          </div>
        </div>
      )}

      {/* Settings / Quality / Speed Menu Overlays */}
      {activeMenu !== "none" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 right-2 sm:bottom-16 sm:right-4 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-xl p-2 w-48 max-w-[calc(100vw-32px)] text-xs text-zinc-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Main Settings Menu */}
          {activeMenu === "main" && (
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
                Playback Settings
              </div>
              <button
                onClick={() => setActiveMenu("quality")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 transition text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  Quality
                </span>
                <span className="text-zinc-400 text-[11px] font-mono">
                  {selectedLevel === -1 ? `Auto (${currentLevelLabel})` : currentLevelLabel}
                </span>
              </button>
              <button
                onClick={() => setActiveMenu("speed")}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/10 transition text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                  Speed
                </span>
                <span className="text-zinc-400 text-[11px] font-mono">{playbackRate}x</span>
              </button>
            </div>
          )}

          {/* Quality Submenu */}
          {activeMenu === "quality" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800">
                <button
                  onClick={() => setActiveMenu("main")}
                  className="text-[10px] font-semibold text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">Quality</span>
              </div>
              <button
                onClick={() => setQuality(-1)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition text-left cursor-pointer ${
                  selectedLevel === -1 ? "text-emerald-400 font-semibold" : ""
                }`}
              >
                <span>Auto {selectedLevel === -1 ? `(${currentLevelLabel})` : ""}</span>
                {selectedLevel === -1 && <Check className="w-3.5 h-3.5" />}
              </button>
              {levels
                .slice()
                .sort((a, b) => b.height - a.height)
                .map((lvl) => (
                  <button
                    key={lvl.index}
                    onClick={() => setQuality(lvl.index)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition text-left cursor-pointer ${
                      selectedLevel === lvl.index ? "text-emerald-400 font-semibold" : ""
                    }`}
                  >
                    <span>{lvl.label}</span>
                    {selectedLevel === lvl.index && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
            </div>
          )}

          {/* Speed Submenu */}
          {activeMenu === "speed" && (
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800">
                <button
                  onClick={() => setActiveMenu("main")}
                  className="text-[10px] font-semibold text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
                >
                  ← Back
                </button>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase">Speed</span>
              </div>
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSpeed(rate)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition text-left cursor-pointer ${
                    playbackRate === rate ? "text-emerald-400 font-semibold" : ""
                  }`}
                >
                  <span>{rate}x</span>
                  {playbackRate === rate && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-8 pb-3 px-3 sm:px-4 z-20 transition-opacity duration-300 ${
          showControls ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Scrubber / Progress Bar */}
        <div
          className="relative group/progress cursor-pointer py-2 -mt-2"
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Time Hover Preview Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 transform -translate-x-1/2 bg-zinc-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow border border-zinc-700/50 pointer-events-none"
              style={{ left: `${hoverPos}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          <div className="relative h-1.5 group-hover/progress:h-2 bg-white/20 rounded-full overflow-hidden transition-all">
            {/* Buffered Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all duration-150"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Played Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek video position"
          />
        </div>

        {/* Buttons and Time Bar */}
        <div className="flex items-center justify-between text-white text-xs mt-1 gap-2">
          {/* Left Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="p-1.5 sm:p-2 hover:text-emerald-400 hover:scale-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
              title={isPlaying ? "Pause (Space/k)" : "Play (Space/k)"}
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
            </button>

            {/* Seek -10s */}
            <button
              onClick={() => seekRelative(-10)}
              className="p-1.5 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative touch-manipulation cursor-pointer"
              title="Back 10s (Left/j)"
              aria-label="Seek back 10 seconds"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute text-[7px] sm:text-[8px] font-bold top-[6px] sm:top-[7px] pointer-events-none">10</span>
            </button>

            {/* Seek +10s */}
            <button
              onClick={() => seekRelative(10)}
              className="p-1.5 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative touch-manipulation cursor-pointer"
              title="Forward 10s (Right/l)"
              aria-label="Seek forward 10 seconds"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="absolute text-[7px] sm:text-[8px] font-bold top-[6px] sm:top-[7px] pointer-events-none">10</span>
            </button>

            {/* Volume & Slider */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 text-zinc-300 hover:text-white transition-all touch-manipulation cursor-pointer"
                title={isMuted ? "Unmute (m)" : "Mute (m)"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeSlider}
                className="hidden md:block w-14 lg:w-16 h-1 bg-white/30 accent-emerald-500 rounded-lg cursor-pointer transition-all"
                aria-label="Volume slider"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-[10px] sm:text-[11px] font-mono text-zinc-300 ml-0.5 sm:ml-1 select-none">
              <span className="text-white font-medium">{formatTime(currentTime)}</span>
              <span className="text-zinc-500 mx-0.5 sm:mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Closed Captions Button (Visible only when English captions exist) */}
            {(isCaptionAvailable || effectiveCaptionUrl) && (
              <button
                onClick={toggleCaptions}
                className={`p-1.5 sm:p-1.5 rounded-lg transition-all touch-manipulation cursor-pointer flex items-center justify-center ${
                  isCaptionsOn
                    ? "bg-emerald-500/25 text-emerald-400 font-bold border border-emerald-500/40 shadow-xs"
                    : "text-zinc-300 hover:text-white hover:bg-white/10"
                }`}
                title={isCaptionsOn ? "Turn captions off (c)" : "Turn captions on (c)"}
                aria-label={isCaptionsOn ? "Turn captions off" : "Turn captions on"}
              >
                <Subtitles className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}

            {/* Current Quality & Speed Settings Button */}
            <button
              onClick={() => setActiveMenu(activeMenu === "none" ? "main" : "none")}
              className="px-2 py-1.5 sm:py-1 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-200 text-[10px] sm:text-[11px] font-mono font-medium flex items-center gap-1 sm:gap-1.5 transition touch-manipulation cursor-pointer"
              title="Quality & Speed Settings"
              aria-label="Quality and Speed Settings"
            >
              <span className="hidden xs:inline sm:inline">{selectedLevel === -1 ? `Auto (${currentLevelLabel})` : currentLevelLabel}</span>
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {/* Picture in Picture (Desktop only) */}
            <button
              onClick={togglePiP}
              className="hidden sm:flex p-1.5 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
              title="Picture in Picture (p)"
              aria-label="Picture in Picture"
            >
              <Tv className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-1.5 text-zinc-200 hover:text-white hover:bg-white/10 rounded-lg hover:scale-110 active:scale-95 transition-all touch-manipulation cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen (f)" : "Fullscreen (f)"}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 sm:w-4.5 sm:h-4.5" /> : <Maximize className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


