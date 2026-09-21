import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCouponsLoading() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl shrink-0" />
      </div>

      {/* KPI Stats Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-2xl border-border/80 shadow-2xs">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-8 w-16 rounded-lg" />
              <Skeleton className="h-3 w-32 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action & Filter Toolbar Skeleton */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <Skeleton className="h-10 w-full md:w-80 rounded-xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </Card>

      {/* Coupons List Skeleton */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="divide-y divide-border/60">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-28 rounded-xl" />
                <Skeleton className="h-6 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
