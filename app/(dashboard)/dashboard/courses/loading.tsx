import { Skeleton } from "@/components/ui/skeleton";

export default function MyCoursesLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-pulse">
      {/* Page Header Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-full sm:w-96 rounded-lg" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-6 w-28 rounded-lg" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-11 w-44 rounded-xl shrink-0" />
      </div>

      {/* Schedule Banner Skeleton */}
      <div className="bg-muted/40 border border-border/60 p-6 rounded-3xl flex items-center gap-4">
        <Skeleton className="h-11 w-11 rounded-2xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-56 rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </div>

      {/* Continue Learning Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <Skeleton className="w-full md:w-64 aspect-video rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3.5 w-full">
            <Skeleton className="h-6 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-md" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-10 w-36 rounded-xl" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Tabs Skeleton */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-28 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full sm:w-72 rounded-xl" />
        </div>

        {/* Course Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div>
                <Skeleton className="w-full aspect-video" />
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/3 rounded-md" />
                  </div>
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-3 w-8 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0 space-y-2 border-t border-border/50">
                <Skeleton className="h-10 w-full rounded-xl mt-3" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
