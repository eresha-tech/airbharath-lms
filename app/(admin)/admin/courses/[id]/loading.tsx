import { Skeleton } from "@/components/ui/skeleton";

export default function EditCourseLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-64 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Side (Modules & Lessons): 8 Cols */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-44 rounded-lg" />
                <Skeleton className="h-3.5 w-64 rounded" />
              </div>
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>

            <div className="space-y-4 pt-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-border/60 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-48 rounded" />
                    <Skeleton className="h-7 w-24 rounded-lg" />
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-border/40">
                    <Skeleton className="h-8 w-full rounded-xl" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side (Settings): 4 Cols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <div className="space-y-3 pt-2">
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
