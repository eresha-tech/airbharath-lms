import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner Skeleton */}
      <div className="rounded-2xl bg-muted/60 p-6 sm:p-8 h-40 flex flex-col justify-between">
        <div className="space-y-2 max-w-md">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-card border border-border/70 rounded-2xl p-5 space-y-3"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-16 rounded" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* Continue Learning Skeleton */}
      <div className="bg-card border border-border/70 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex flex-col md:flex-row gap-5">
          <Skeleton className="w-full md:w-56 aspect-video rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-9 w-32 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Course Cards & Sidebar Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex justify-between">
            <Skeleton className="h-6 w-44 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-card border border-border/70 rounded-2xl overflow-hidden space-y-4"
              >
                <Skeleton className="w-full aspect-video" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-2 w-full rounded-full" />
                  <Skeleton className="h-9 w-full rounded-xl mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/70 rounded-2xl p-5 space-y-4">
            <Skeleton className="h-5 w-36 rounded" />
            <div className="space-y-2.5">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
