import React from "react";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import CouponsClient, { FormattedCoupon } from "@/components/admin/CouponsClient";
import { Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const couponsList = await db.query.coupons.findMany({
    orderBy: [asc(coupons.expiryDate)],
  });

  const formattedCoupons: FormattedCoupon[] = couponsList.map((c: any) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType || "percentage",
    discountValue: Number(c.discountValue) || 0,
    expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : null,
    usageLimit: c.usageLimit ? Number(c.usageLimit) : null,
    usedCount: c.usedCount || 0,
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs">
              <Tag className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              Coupons & Discounts
            </h1>
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Create and manage promotional offers for your courses.
          </p>
        </div>
      </div>

      <CouponsClient initialCoupons={formattedCoupons} />
    </div>
  );
}
