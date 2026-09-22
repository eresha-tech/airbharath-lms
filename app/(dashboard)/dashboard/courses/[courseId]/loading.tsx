import { Skeleton } from "@/components/ui/skeleton";

export default function CourseLoading() {
  return (
    <div className="min-h-full flex flex-col bg-background font-sans">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6 sm:space-y-7">
        {/* Header skeleton */}
        <div className="space-y-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3.5 w-40 rounded-md" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-2/3 max-w-sm rounded-xl" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>

        {/* Video placeholder skeleton */}
        <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 aspect-video w-full flex items-center justify-center">
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>

        {/* Content tabs skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-9 w-56 rounded-xl" />
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xs">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-full rounded-md" />
            <Skeleton className="h-3.5 w-3/4 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

