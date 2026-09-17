"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, Trash2, Percent, IndianRupee, Sparkles, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.coupons) setCoupons(data.coupons);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: parseFloat(discountValue),
          expiryDate,
          usageLimit,
        }),
      });

      if (res.ok) {
        setCode("");
        setDiscountValue("");
        setExpiryDate("");
        setUsageLimit("");
        fetchCoupons();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to create coupon");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    try {
      const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCoupons();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete coupon");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
          Coupons & Discounts
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Generate promotional discount codes, manage redemption limits, and track usage.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* Create Coupon Form Card */}
        <Card className="rounded-2xl border-border/80 shadow-2xs">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <span>Create New Coupon</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5">
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Code */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Coupon Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. AIRBHARATH20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-bold font-mono uppercase bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* Discount Type and Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Type
                  </label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full border border-input rounded-xl px-2.5 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Value
                  </label>
                  <input
                    type="number"
                    placeholder={discountType === "percentage" ? "15" : "500"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                    required
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Usage Limit */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Usage Limit (Optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100 uses"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className="w-full border border-input rounded-xl px-3 py-2 text-xs font-medium bg-background focus:outline-none focus:ring-2 focus:ring-primary tabular-nums"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl text-xs font-bold shadow-sm"
              >
                {isSubmitting ? "Creating..." : "Generate Coupon Code"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Coupons List Table Card */}
        <Card className="lg:col-span-2 rounded-2xl border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-sm font-bold font-outfit text-foreground flex items-center justify-between">
              <span>Active Coupon Inventory</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {coupons.length} {coupons.length === 1 ? "coupon" : "coupons"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="p-16 text-center text-xs font-medium text-muted-foreground">
                Loading coupon inventory...
              </div>
            ) : coupons.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Discount</th>
                      <th className="px-6 py-3.5">Redemptions</th>
                      <th className="px-6 py-3.5">Expiration</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold text-xs sm:text-sm text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
                            {coupon.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-foreground">
                          {coupon.discount_type === "percentage" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <Percent className="h-3.5 w-3.5" />
                              {coupon.discount_value}% Off
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {coupon.discount_value} Flat Off
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                          {coupon.used_count || 0} / {coupon.usage_limit || "∞"} redeemed
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                          {coupon.expiry_date
                            ? new Date(coupon.expiry_date).toLocaleDateString()
                            : "No expiry"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center text-muted-foreground">
                <Tag className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm font-semibold text-foreground">No active coupons</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create a new promotional code using the form on the left.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
