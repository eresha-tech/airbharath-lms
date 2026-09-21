import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Welcome Banner Skeleton */}
      <div className="rounded-3xl bg-muted/60 p-6 sm:p-8 lg:p-9 h-44 flex flex-col justify-between border border-border/60">
        <div className="space-y-2.5 max-w-md">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-8 sm:h-9 w-64 sm:w-80 rounded-xl" />
          <Skeleton className="h-4 w-full sm:w-96 rounded-lg" />
        </div>
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* 2. Continue Learning Spotlight Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex flex-col md:flex-row gap-5 sm:gap-6 items-start md:items-center">
          <Skeleton className="w-full md:w-64 aspect-video rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3.5 w-full">
            <Skeleton className="h-6 w-3/4 rounded-xl" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-3 pt-1">
              <Skeleton className="h-10 w-36 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-2.5"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 sm:h-8 w-16 rounded-lg mt-2" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* 4. Course Cards & Sidebar Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-card border border-border/80 rounded-2xl overflow-hidden space-y-4"
              >
                <Skeleton className="w-full aspect-video" />
                <div className="p-4 sm:p-5 space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-9 w-full rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <div className="space-y-2.5">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>

          <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 space-y-4">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="space-y-2.5">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
