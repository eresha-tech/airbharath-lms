import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminAnalyticsLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Row Skeleton (5 columns on large screens) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="rounded-2xl border-border/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-20 mt-3 rounded-lg" />
            <Skeleton className="h-3 w-28 mt-2 rounded-md" />
          </Card>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <Card className="rounded-2xl border-border/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-60 w-full rounded-xl" />
        </Card>

        <Card className="rounded-2xl border-border/80 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-60 w-full rounded-xl" />
        </Card>
      </div>

      {/* Course Performance Table Skeleton */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex items-center justify-between">
          <Skeleton className="h-5 w-52 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <div className="divide-y divide-border/60 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pt-3 first:pt-0 flex items-center justify-between gap-4">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
