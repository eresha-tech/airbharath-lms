"use client";

import { CheckCircle2, Loader2, Check } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LessonCompleteButtonProps {
  lessonId: string;
  userId: string;
  courseId: string;
  className?: string;
  variant?: "default" | "outline" | "compact";
}

export function LessonCompleteButton({
  lessonId,
  userId,
  courseId,
  className,
}: LessonCompleteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/progress?lessonId=${lessonId}`);
        const data = await res.json();
        if (mounted) {
          setIsCompleted(data.isCompleted || false);
        }
      } catch (error) {
        console.error("Error checking lesson completion status:", error);
        if (mounted) {
          setIsCompleted(false);
        }
      }
    };
    fetchStatus();
    return () => {
      mounted = false;
    };
  }, [lessonId]);

  const handleToggle = async () => {
    try {
      setIsPending(true);

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, courseId }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCompleted(data.isCompleted);
        router.refresh();
      }
    } catch (error) {
      console.error("Error toggling lesson completion:", error);
    } finally {
      setIsPending(false);
    }
  };

  const isLoading = isCompleted === null;

  return (
    <Button
      type="button"
      onClick={handleToggle}
      disabled={isPending || isLoading}
      size="sm"
      className={cn(
        "font-bold text-xs rounded-xl transition-all shadow-xs h-9 px-4 shrink-0 cursor-pointer",
        isCompleted
          ? "border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
          : "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Status...</span>
        </span>
      ) : isPending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Updating...</span>
        </span>
      ) : isCompleted ? (
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
          <span>Completed</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Mark Lesson Complete</span>
        </span>
      )}
    </Button>
  );
}
