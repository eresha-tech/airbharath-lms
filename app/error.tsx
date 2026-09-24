"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      posthog.captureException(error);
    } catch {
      // Safe no-op
    }
    console.error("App render error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-card border border-border/80 p-8 rounded-3xl shadow-sm">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-xs">
          <AlertCircle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-outfit text-foreground">Something went wrong</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We encountered an unexpected error while loading this page. Please try refreshing or return to the home page.
          </p>
          {error?.digest && (
            <p className="text-[10px] font-mono text-muted-foreground/60">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto font-bold text-xs rounded-xl h-10 px-5 gap-2 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto font-bold text-xs rounded-xl h-10 px-5 gap-2 border-border/80 cursor-pointer"
          >
            <Link href="/dashboard">
              <Home className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
