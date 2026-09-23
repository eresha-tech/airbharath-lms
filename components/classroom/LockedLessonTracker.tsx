"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";

interface LockedLessonTrackerProps {
  lessonId: string;
  courseId: string;
  releaseAt?: Date | string | null;
}

export function LockedLessonTracker({ lessonId, courseId, releaseAt }: LockedLessonTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    try {
      track("lesson_unlock_viewed", {
        lessonId,
        courseId,
        releaseAt: releaseAt ? new Date(releaseAt).toISOString() : null,
      });
    } catch {
      // Safe no-op
    }
  }, [lessonId, courseId, releaseAt]);

  return null;
}
