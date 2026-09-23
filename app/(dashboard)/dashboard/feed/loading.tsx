import { Skeleton } from "@/components/ui/skeleton";

export default function StudentFeedLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-5 w-44 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-full sm:w-96 rounded-lg" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-11 w-36 rounded-xl shrink-0" />
      </div>

      {/* Two Column Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Column Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-3.5">
                <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-5/6 rounded-md" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <div className="pt-4 border-t border-border/60 flex justify-between">
                <Skeleton className="h-3 w-32 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-3 shadow-xs">
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
