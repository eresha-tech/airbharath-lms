import { Skeleton } from "@/components/ui/skeleton";

export default function CertificatesLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <Skeleton className="h-5 w-44 rounded-full" />
          <Skeleton className="h-8 w-72 rounded-xl" />
          <Skeleton className="h-4 w-full sm:w-96 rounded-lg" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-6 w-36 rounded-lg" />
            <Skeleton className="h-6 w-36 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <Skeleton className="h-11 w-44 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-2xl w-fit">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xs space-y-4"
            >
              <div className="p-6 bg-muted/30 border-b border-border/60">
                <Skeleton className="w-full h-44 rounded-2xl" />
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-36 rounded-md" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60">
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
