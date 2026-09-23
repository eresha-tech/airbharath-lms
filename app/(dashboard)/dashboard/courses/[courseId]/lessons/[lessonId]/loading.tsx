import { Skeleton } from "@/components/ui/skeleton";

export default function LessonLoading() {
  return (
    <div className="min-h-full flex flex-col bg-background font-sans">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 sm:space-y-7">
        {/* Top Context & Header Action Bar Skeleton */}
        <div className="space-y-3 pb-3 border-b border-border/60">
          {/* Breadcrumbs Row */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-28 rounded-md" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3.5 w-36 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md ml-auto" />
          </div>

          {/* Title and Complete Button Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <Skeleton className="h-7 sm:h-9 w-3/4 max-w-md rounded-xl" />
            <Skeleton className="h-9 w-36 rounded-xl shrink-0 self-start sm:self-auto" />
          </div>
        </div>

        {/* Video Focal Container Skeleton */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 aspect-video w-full flex items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>

        {/* Learning Tabs Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-9 w-60 rounded-xl" />

          {/* Card Content */}
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
            <Skeleton className="h-5 w-48 rounded-lg" />
            <div className="space-y-2.5 pt-2">
              <Skeleton className="h-3.5 w-full rounded-md" />
              <Skeleton className="h-3.5 w-[92%] rounded-md" />
              <Skeleton className="h-3.5 w-[85%] rounded-md" />
              <Skeleton className="h-3.5 w-[70%] rounded-md" />
            </div>
          </div>
        </div>

        {/* Navigation Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
          <Skeleton className="h-[72px] rounded-2xl border border-border/60" />
          <Skeleton className="h-[72px] rounded-2xl border border-border/60" />
        </div>
      </div>
    </div>
  );
}

