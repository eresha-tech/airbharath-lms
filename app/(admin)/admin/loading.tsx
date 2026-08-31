export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-56 bg-muted rounded-xl" />
        <div className="h-4 w-80 bg-muted/60 rounded-lg" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
              <div className="h-10 w-10 bg-muted rounded-xl" />
            </div>
            <div className="h-3 w-32 bg-muted/60 rounded" />
          </div>
        ))}
      </div>

      {/* Chart + table skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-48 bg-muted/30 rounded-xl" />
        </div>
        <div className="bg-card border border-border/80 rounded-2xl p-6 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <div className="h-8 w-8 bg-muted rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-2.5 w-1/2 bg-muted/60 rounded" />
              </div>
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
