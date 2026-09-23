import { Skeleton } from "@/components/ui/skeleton";

export default function CourseDetailLoading() {
  return (
    <main className="flex-1 pb-20 animate-pulse">
      {/* 1. Hero Skeleton Header */}
      <div className="bg-card pt-24 md:pt-28 pb-10 md:pb-16 border-b border-border">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-3 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            {/* Left Hero Content Skeleton */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-36 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>

              <Skeleton className="h-10 sm:h-12 w-3/4 rounded-2xl" />
              <Skeleton className="h-4 w-full max-w-2xl rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-lg" />

              {/* Instant Access Notice Skeleton */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>

              {/* Key Specs Highlights Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl" />
                <Skeleton className="h-12 rounded-xl col-span-2 sm:col-span-1" />
              </div>
            </div>

            {/* Right Column: Pricing Card Skeleton */}
            <div className="lg:col-span-4 w-full">
              <div className="bg-card border border-border/80 p-6 sm:p-7 space-y-6 rounded-3xl shadow-xl">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28 rounded" />
                  <Skeleton className="h-9 w-24 rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-3/4 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Course Body Content Skeleton */}
      <div className="container mx-auto px-4 py-10 sm:py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Left Content Area Skeleton */}
          <div className="lg:col-span-8 space-y-8">
            {/* Learning Outcomes Skeleton */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-5">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-7 w-52 rounded-lg" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
              </div>
            </div>

            {/* Curriculum Breakdown Skeleton */}
            <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <Skeleton className="h-7 w-48 rounded-lg" />
                <Skeleton className="h-6 w-36 rounded-xl" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Details Skeleton */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-xl" />
                <Skeleton className="h-5 w-36 rounded" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>

            <div className="bg-card border border-border/80 rounded-3xl p-6 space-y-4">
              <Skeleton className="h-4 w-28 rounded" />
              <div className="space-y-2.5 pt-1">
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
                <Skeleton className="h-5 w-full rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
