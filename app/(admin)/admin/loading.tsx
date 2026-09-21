import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg max-w-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* KPI Cards Skeleton (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-9 w-9 rounded-2xl" />
            </div>
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-3.5 w-36 rounded-md" />
          </div>
        ))}
      </div>

      {/* Analytics & Quick Actions Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex justify-between items-center">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-64 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <Skeleton className="h-64 sm:h-72 w-full rounded-2xl" />
        </div>

        <div className="lg:col-span-4 bg-card border border-border/80 rounded-3xl p-6 space-y-4 shadow-xs">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-18 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Learning & Cohort Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-6 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-60 rounded-md" />
          <Skeleton className="h-44 sm:h-48 w-full rounded-2xl pt-2" />
        </div>

        <div className="lg:col-span-6 bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
          <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
