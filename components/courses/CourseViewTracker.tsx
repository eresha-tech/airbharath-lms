"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface CourseViewTrackerProps {
  courseId: string;
  slug?: string | null;
  title: string;
  price: number;
  isFree: boolean;
}

export function CourseViewTracker({
  courseId,
  slug,
  title,
  price,
  isFree,
}: CourseViewTrackerProps) {
  useEffect(() => {
    track("course_viewed", {
      course_id: courseId,
      slug: slug || courseId,
      title,
      price,
      is_free: isFree,
    });
  }, [courseId, slug, title, price, isFree]);

  return null;
}
