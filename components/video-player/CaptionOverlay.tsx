"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CaptionTextSize = "small" | "medium" | "large" | "xl";
export type CaptionStyle = "rounded_dark" | "solid_dark" | "text_shadow" | "high_contrast";
export type CaptionPosition = "lower" | "default" | "higher";

export interface CaptionPreferences {
  textSize: CaptionTextSize;
  style: CaptionStyle;
  opacity: number; // 0 to 100, default 70
  position: CaptionPosition;
}

export const DEFAULT_CAPTION_PREFERENCES: CaptionPreferences = {
  textSize: "medium",
  style: "rounded_dark",
  opacity: 70,
  position: "default",
};

export const CAPTION_STORAGE_KEY = "airbharath_caption_preferences";

export function loadCaptionPreferences(): CaptionPreferences {
  if (typeof window === "undefined") return DEFAULT_CAPTION_PREFERENCES;
  try {
    const raw = localStorage.getItem(CAPTION_STORAGE_KEY);
    if (!raw) return DEFAULT_CAPTION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      textSize: ["small", "medium", "large", "xl"].includes(parsed.textSize)
        ? parsed.textSize
        : DEFAULT_CAPTION_PREFERENCES.textSize,
      style: ["rounded_dark", "solid_dark", "text_shadow", "high_contrast"].includes(parsed.style)
        ? parsed.style
        : DEFAULT_CAPTION_PREFERENCES.style,
      opacity: typeof parsed.opacity === "number" && parsed.opacity >= 0 && parsed.opacity <= 100
        ? parsed.opacity
        : DEFAULT_CAPTION_PREFERENCES.opacity,
      position: ["lower", "default", "higher"].includes(parsed.position)
        ? parsed.position
        : DEFAULT_CAPTION_PREFERENCES.position,
    };
  } catch {
    return DEFAULT_CAPTION_PREFERENCES;
  }
}

export function saveCaptionPreferences(prefs: CaptionPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAPTION_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors (quota/private mode)
  }
}

interface CaptionOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isCaptionsOn: boolean;
  preferences: CaptionPreferences;
  showControls: boolean;
  className?: string;
}

export function CaptionOverlay({
  videoRef,
  isCaptionsOn,
  preferences,
  showControls,
  className,
}: CaptionOverlayProps) {
  const [activeCueText, setActiveCueText] = useState<string>("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function handleCueChange() {
      if (!isCaptionsOn || !video) {
        setActiveCueText("");
        return;
      }

      const tracks = video.textTracks;
      if (!tracks || tracks.length === 0) {
        setActiveCueText("");
        return;
      }

      // Collect active cues from all active tracks
      const cues: string[] = [];
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (track.mode === "hidden" || track.mode === "showing") {
          const activeCues = track.activeCues;
          if (activeCues && activeCues.length > 0) {
            for (let j = 0; j < activeCues.length; j++) {
              const cue = activeCues[j] as VTTCue;
              if (cue && cue.text) {
                // Strip any internal WebVTT tags (e.g. <v speaker>, <b>, <i>, <c.color>)
                const cleaned = cue.text.replace(/<[^>]+>/g, "").trim();
                if (cleaned) {
                  cues.push(cleaned);
                }
              }
            }
          }
        }
      }

      const newText = cues.join("\n").trim();
      setActiveCueText((prev) => (prev === newText ? prev : newText));
    }

    // Attach listeners to all tracks + timeupdate for smooth seek tracking
    const tracks = video.textTracks;
    const cleanups: Array<() => void> = [];

    const attachTrackListeners = () => {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        track.addEventListener("cuechange", handleCueChange);
        cleanups.push(() => track.removeEventListener("cuechange", handleCueChange));
      }
      handleCueChange();
    };

    attachTrackListeners();
    tracks.addEventListener("addtrack", attachTrackListeners);
    video.addEventListener("timeupdate", handleCueChange);

    return () => {
      tracks.removeEventListener("addtrack", attachTrackListeners);
      video.removeEventListener("timeupdate", handleCueChange);
      cleanups.forEach((fn) => fn());
    };
  }, [videoRef, isCaptionsOn]);

  if (!isCaptionsOn || !activeCueText) {
    return null;
  }

  // Text size classes
  const textSizeClasses = {
    small: "text-xs sm:text-sm leading-relaxed",
    medium: "text-sm sm:text-base leading-relaxed",
    large: "text-base sm:text-lg leading-snug",
    xl: "text-lg sm:text-xl leading-snug",
  }[preferences.textSize] || "text-sm sm:text-base leading-relaxed";

  // Position classes (accounting for visible control bar)
  const positionClasses = (() => {
    if (preferences.position === "lower") {
      return showControls
        ? "bottom-14 sm:bottom-16"
        : "bottom-4 sm:bottom-6";
    }
    if (preferences.position === "higher") {
      return showControls
        ? "bottom-24 sm:bottom-28"
        : "bottom-16 sm:bottom-20";
    }
    // default position
    return showControls
      ? "bottom-18 sm:bottom-22"
      : "bottom-8 sm:bottom-12";
  })();

  // Style variations
  const opacityFactor = preferences.opacity / 100;

  const styleConfig = (() => {
    switch (preferences.style) {
      case "solid_dark":
        return {
          containerStyle: {
            backgroundColor: "#000000",
            color: "#ffffff",
          },
          containerClass: "rounded-xl px-3.5 py-1.5 shadow-2xl font-medium",
        };
      case "text_shadow":
        return {
          containerStyle: {
            backgroundColor: "transparent",
            color: "#ffffff",
            textShadow:
              "0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          },
          containerClass: "px-2 py-0.5 font-bold tracking-wide",
        };
      case "high_contrast":
        return {
          containerStyle: {
            backgroundColor: "#000000",
            color: "#ffff00", // High contrast yellow
            border: "2px solid #ffffff",
          },
          containerClass: "rounded-lg px-3.5 py-1.5 shadow-2xl font-bold tracking-wide",
        };
      case "rounded_dark":
      default:
        return {
          containerStyle: {
            backgroundColor: `rgba(0, 0, 0, ${opacityFactor})`,
            color: "#ffffff",
            backdropFilter: opacityFactor > 0.3 ? "blur(4px)" : "none",
            WebkitBackdropFilter: opacityFactor > 0.3 ? "blur(4px)" : "none",
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          },
          containerClass: "rounded-xl px-3.5 py-1.5 shadow-lg border border-white/10 font-medium",
        };
    }
  })();

  return (
    <div
      className={cn(
        "absolute left-0 right-0 z-30 flex justify-center items-center pointer-events-none transition-all duration-200 px-4 sm:px-8",
        positionClasses,
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={styleConfig.containerStyle}
        className={cn(
          "max-w-[92%] sm:max-w-[80%] md:max-w-[72%] text-center select-none break-words whitespace-pre-line font-sans",
          textSizeClasses,
          styleConfig.containerClass,
          "animate-in fade-in-0 zoom-in-95 duration-100 motion-reduce:animate-none motion-reduce:transition-none"
        )}
      >
        {activeCueText}
      </div>
    </div>
  );
}
