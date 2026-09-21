import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AdminDoubtsLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-8 w-64 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
      </div>

      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl border-border/80 p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-28 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16 mt-3 rounded-lg" />
            <Skeleton className="h-3 w-32 mt-2 rounded-md" />
          </Card>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </Card>

      {/* Doubts Thread Skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl border-border/80 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-3 w-28 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
          </Card>
        ))}
      </div>
    </div>
  );
}
