/**
 * Centralized Lesson Availability & Content Release State Engine
 * AirBharath LMS — Phase 16B
 */

export type LessonAvailabilityState = "available" | "scheduled" | "live";

export interface LessonAvailabilityInput {
  deliveryType?: string | null;
  scheduledAt?: Date | string | null;
  releaseAt?: Date | string | null;
}

export interface LessonAvailability {
  state: LessonAvailabilityState;
  /** True if the student can view video playback, lesson content, and materials */
  isAccessible: boolean;
  /** True if this is a recorded lesson scheduled for a future release */
  isLocked: boolean;
  releaseAt: Date | null;
  scheduledAt: Date | null;
}

/**
 * Calculates authoritative availability state for any lesson.
 * 
 * Rules:
 * 1. LIVE lessons: state is 'live', isAccessible is true (classroom shows live session UI).
 * 2. RECORDED lessons with releaseAt in the future: state is 'scheduled', isLocked is true, isAccessible is false.
 * 3. RECORDED lessons with releaseAt null or <= now: state is 'available', isAccessible is true, isLocked is false.
 */
export function getLessonAvailability(
  lesson: LessonAvailabilityInput,
  referenceTime: Date = new Date()
): LessonAvailability {
  const deliveryType = lesson.deliveryType || "recorded";
  const scheduledAt = lesson.scheduledAt ? new Date(lesson.scheduledAt) : null;
  const releaseAt = lesson.releaseAt ? new Date(lesson.releaseAt) : null;

  if (deliveryType === "live") {
    return {
      state: "live",
      isAccessible: true,
      isLocked: false,
      releaseAt: null,
      scheduledAt,
    };
  }

  // Recorded lesson
  const isFutureRelease = Boolean(
    releaseAt && !isNaN(releaseAt.getTime()) && releaseAt.getTime() > referenceTime.getTime()
  );

  if (isFutureRelease) {
    return {
      state: "scheduled",
      isAccessible: false,
      isLocked: true,
      releaseAt,
      scheduledAt: null,
    };
  }

  return {
    state: "available",
    isAccessible: true,
    isLocked: false,
    releaseAt,
    scheduledAt: null,
  };
}

/**
 * Formats date and time consistently in Indian Standard Time (IST)
 */
export function formatISTDateTime(
  date: Date | string,
  options?: { includeTime?: boolean; includeSeconds?: boolean; shortDate?: boolean }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const includeTime = options?.includeTime ?? true;

  if (!includeTime) {
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: options?.shortDate ? "short" : "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  }

  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: options?.shortDate ? "short" : "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

/**
 * Compact IST formatter for badges, cards, and sidebar items (e.g. "28 Sep · 7:00 PM IST")
 */
export function formatCompactIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const datePart = d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  const timePart = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return `${datePart} · ${timePart} IST`;
}

