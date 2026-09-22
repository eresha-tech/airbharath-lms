import { Skeleton } from "@/components/ui/skeleton";

export default function CoursesLoading() {
  return (
    <main className="flex-1 pb-20 space-y-10 sm:space-y-12 animate-pulse">
      {/* Header Banner Skeleton */}
      <section className="bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pt-10 sm:pt-14 pb-12 sm:pb-16 border-b border-border/80">
        <div className="container mx-auto px-4 max-w-6xl space-y-4 sm:space-y-5 text-center flex flex-col items-center">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-10 sm:h-12 w-3/4 max-w-lg rounded-2xl" />
          <Skeleton className="h-4 w-full max-w-md rounded-lg" />
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
        </div>
      </section>

      {/* Catalog Directory Skeleton */}
      <section className="container mx-auto px-4 max-w-6xl space-y-8">
        {/* Search & Filter Bar Skeleton */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <Skeleton className="h-10 w-full sm:max-w-md rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-xl" />
            <Skeleton className="h-8 w-36 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>
        </div>

        {/* Course Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                <Skeleton className="w-full aspect-video" />
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-full rounded-md" />
                    <Skeleton className="h-3 w-2/3 rounded-md" />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-14 w-full rounded-2xl" />
                </div>
              </div>
              <div className="p-5 sm:p-6 pt-0">
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
