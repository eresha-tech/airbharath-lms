"use client";

import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface LessonCompleteButtonProps {
  lessonId: string;
  userId: string;
  courseId: string;
}

export function LessonCompleteButton({
  lessonId,
  userId,
  courseId,
}: LessonCompleteButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/progress?lessonId=${lessonId}`);
        const data = await res.json();
        setIsCompleted(data.isCompleted || false);
      } catch (error) {
        console.error("Error checking lesson completion status:", error);
        setIsCompleted(false);
      }
    };
    fetchStatus();
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
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isCompleted
              ? "Lesson completed!"
              : "Ready to complete this lesson?"}
          </p>
          <p className="text-sm text-muted-foreground">
            {isCompleted
              ? "You can mark it as incomplete if you need to revisit it."
              : "Mark it as complete when you're done."}
          </p>
        </div>
        <Button
          onClick={handleToggle}
          disabled={isPending || isLoading}
          size="lg"
          variant="default"
          className={cn(
            "min-w-[200px] transition-all duration-200 ease-in-out font-bold text-xs rounded-xl",
            isCompleted
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isCompleted ? "Uncompleting..." : "Completing..."}
            </>
          ) : isCompleted ? (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Mark as Not Complete
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Complete
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
