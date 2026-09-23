"use client";

import React, { useState, useMemo } from "react";
import {
  Tag,
  Plus,
  Percent,
  IndianRupee,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
  Check,
  Search,
  X,
  Sparkles,
  ArrowUpDown,
  Filter,
  Eye,
  Layers,
  ShieldCheck,
  Gift,
  HelpCircle,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface FormattedCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "flat" | string;
  discountValue: number;
  expiryDate: string | null;
  usageLimit: number | null;
  usedCount: number;
}

interface CouponsClientProps {
  initialCoupons: FormattedCoupon[];
}

export default function CouponsClient({ initialCoupons = [] }: CouponsClientProps) {
  const [couponsList, setCouponsList] = useState<FormattedCoupon[]>(initialCoupons);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "percentage" | "flat" | "expired">("all");
  const [sortBy, setSortBy] = useState<"default" | "discount-desc" | "discount-asc" | "code-asc" | "redemptions-desc">("default");

  // Copy feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State for Create Coupon
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "flat">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState("");
  const [formExpiryDate, setFormExpiryDate] = useState("");
  const [formUsageLimit, setFormUsageLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State for Delete Confirmation
  const [targetDeleteCoupon, setTargetDeleteCoupon] = useState<FormattedCoupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal State for Coupon Details
  const [activeCouponDetail, setActiveCouponDetail] = useState<FormattedCoupon | null>(null);

  // Helper to copy code to clipboard
  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to determine real status of a coupon
  const getCouponStatus = (coupon: FormattedCoupon) => {
    const now = new Date();
    const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < now : false;
    const isLimitReached = coupon.usageLimit ? coupon.usedCount >= coupon.usageLimit : false;

    if (isExpired) return { label: "Expired", variant: "expired" as const };
    if (isLimitReached) return { label: "Limit Reached", variant: "limit" as const };
    return { label: "Active", variant: "active" as const };
  };

  // Overall Financial & Promotion Metrics
  const totalCoupons = couponsList.length;

  const activeCouponsCount = useMemo(() => {
    const now = new Date();
    return couponsList.filter((c) => {
      const isExpired = c.expiryDate ? new Date(c.expiryDate) < now : false;
      const isLimitReached = c.usageLimit ? c.usedCount >= c.usageLimit : false;
      return !isExpired && !isLimitReached;
    }).length;
  }, [couponsList]);

  const expiredOrExhaustedCount = totalCoupons - activeCouponsCount;

  const totalRedemptionsCount = useMemo(() => {
    return couponsList.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  }, [couponsList]);

  // Filtered and sorted coupons
  const filteredCoupons = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return couponsList
      .filter((coupon) => {
        // Search term matching
        const code = coupon.code.toLowerCase();
        const value = coupon.discountValue.toString();
        const matchesSearch = !term || code.includes(term) || value.includes(term);

        if (!matchesSearch) return false;

        const status = getCouponStatus(coupon);

        // Status tab filtering
        if (filterTab === "active" && status.variant !== "active") return false;
        if (filterTab === "expired" && status.variant === "active") return false;
        if (filterTab === "percentage" && coupon.discountType !== "percentage") return false;
        if (filterTab === "flat" && coupon.discountType !== "flat") return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "discount-desc") {
          return b.discountValue - a.discountValue;
        }
        if (sortBy === "discount-asc") {
          return a.discountValue - b.discountValue;
        }
        if (sortBy === "code-asc") {
          return a.code.localeCompare(b.code);
        }
        if (sortBy === "redemptions-desc") {
          return (b.usedCount || 0) - (a.usedCount || 0);
        }
        return 0;
      });
  }, [couponsList, searchTerm, filterTab, sortBy]);

  // Handle create coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode || !formDiscountValue) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim().toUpperCase(),
          discountType: formDiscountType,
          discountValue: parseFloat(formDiscountValue),
          expiryDate: formExpiryDate || null,
          usageLimit: formUsageLimit ? parseInt(formUsageLimit) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");

      if (data.coupon) {
        setCouponsList((prev) => [
          {
            id: data.coupon.id,
            code: data.coupon.code,
            discountType: data.coupon.discountType,
            discountValue: Number(data.coupon.discountValue),
            expiryDate: data.coupon.expiryDate ? new Date(data.coupon.expiryDate).toISOString() : null,
            usageLimit: data.coupon.usageLimit ? Number(data.coupon.usageLimit) : null,
            usedCount: data.coupon.usedCount || 0,
          },
          ...prev,
        ]);
      }

      // Reset form
      setFormCode("");
      setFormDiscountValue("");
      setFormExpiryDate("");
      setFormUsageLimit("");
      setIsCreateModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Failed to create coupon");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete coupon
  const handleDeleteCoupon = async () => {
    if (!targetDeleteCoupon) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons?id=${targetDeleteCoupon.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete coupon");
      }

      setCouponsList((prev) => prev.filter((c) => c.id !== targetDeleteCoupon.id));
      setTargetDeleteCoupon(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete coupon");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-primary/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Coupons
            </span>
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Tag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-outfit">
              {totalCoupons}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
              Promotional voucher codes
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-emerald-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Active & Valid
            </span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-outfit">
              {activeCouponsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Available for checkout
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-sky-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Total Redemptions
            </span>
            <div className="h-8 w-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Gift className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400 font-outfit">
              {totalRedemptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 inline-block" />
              Times coupons claimed
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/80 shadow-2xs hover:border-amber-500/30 transition-all duration-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Expired / Inactive
            </span>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-outfit">
              {expiredOrExhaustedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
              Expired or limit reached
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action & Filter Toolbar */}
      <Card className="rounded-2xl border-border/80 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by coupon code (e.g. ABCOMBO, AIRBHARATH)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full rounded-xl bg-background text-xs sm:text-sm font-medium focus-visible:ring-primary h-10"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector & Create Coupon CTA */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10"
            >
              <option value="default">Default Order</option>
              <option value="discount-desc">Discount: High to Low</option>
              <option value="discount-asc">Discount: Low to High</option>
              <option value="code-asc">Code: A → Z</option>
              <option value="redemptions-desc">Most Redemptions</option>
            </select>

            <Button
              type="button"
              onClick={() => {
                setFormCode("");
                setFormDiscountType("percentage");
                setFormDiscountValue("");
                setFormExpiryDate("");
                setFormUsageLimit("");
                setFormError(null);
                setIsCreateModalOpen(true);
              }}
              className="rounded-xl text-xs font-bold gap-2 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground h-10 px-4"
            >
              <Plus className="h-4 w-4" />
              <span>Create Coupon</span>
            </Button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: "all", label: "All Coupons", count: totalCoupons },
              { id: "active", label: "Active & Valid", count: activeCouponsCount },
              { id: "percentage", label: "Percentage (%)", count: couponsList.filter((c) => c.discountType === "percentage").length },
              { id: "flat", label: "Flat Off (₹)", count: couponsList.filter((c) => c.discountType === "flat").length },
              { id: "expired", label: "Expired / Exhausted", count: expiredOrExhaustedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5",
                  filterTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] font-extrabold",
                    filterTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {(searchTerm || filterTab !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterTab("all");
              }}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </Card>

      {/* Desktop Coupons Data Table (Visible on md+) */}
      <Card className="rounded-2xl border-border/80 shadow-2xs overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/70 text-[11px] font-bold text-muted-foreground tracking-wider uppercase">
                <th className="px-6 py-4">Coupon Voucher</th>
                <th className="px-6 py-4">Discount Value</th>
                <th className="px-6 py-4">Applicability</th>
                <th className="px-6 py-4">Redemptions</th>
                <th className="px-6 py-4">Validity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  const isCombo = coupon.code === "ABCOMBO";

                  return (
                    <tr key={coupon.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Coupon Code Column */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs sm:text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-xl border border-primary/20 tracking-wider">
                            {coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(coupon.code)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            title="Copy Coupon Code"
                          >
                            {copiedCode === coupon.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Discount Value Column */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-1.5">
                          {coupon.discountType === "percentage" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold px-2.5 py-0.5 rounded-lg"
                            >
                              <Percent className="h-3.5 w-3.5 mr-1" />
                              {coupon.discountValue}% Off
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20 text-xs font-bold px-2.5 py-0.5 rounded-lg"
                            >
                              <IndianRupee className="h-3.5 w-3.5 mr-0.5" />
                              ₹{coupon.discountValue.toLocaleString("en-IN")} Flat Off
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Applicability Column */}
                      <td className="px-6 py-4 align-middle text-xs">
                        {isCombo ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-foreground block font-outfit">
                              Combo Pass Masterclass
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Exclusive bundle discount code
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground block">
                              All Courses
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Global LMS catalog
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Redemptions Column */}
                      <td className="px-6 py-4 align-middle">
                        <div className="space-y-1 max-w-[140px]">
                          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                            <span>{coupon.usedCount || 0} claimed</span>
                            {coupon.usageLimit && (
                              <span className="text-muted-foreground text-[10px]">
                                / {coupon.usageLimit}
                              </span>
                            )}
                          </div>
                          {coupon.usageLimit ? (
                            <Progress
                              value={Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100))}
                              className="h-1.5 bg-muted rounded-full"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground block">
                              Unlimited Redemptions
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Validity Column */}
                      <td className="px-6 py-4 align-middle text-xs font-medium text-muted-foreground">
                        {coupon.expiryDate ? (
                          <div className="space-y-0.5">
                            <span className="text-foreground font-semibold block">
                              {new Date(coupon.expiryDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Expires at end of day
                            </span>
                          </div>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            No Expiration
                          </span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 align-middle">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                            status.variant === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : status.variant === "expired"
                              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                          )}
                        >
                          {status.variant === "active" && <CheckCircle2 className="h-3 w-3" />}
                          {status.variant === "expired" && <AlertCircle className="h-3 w-3" />}
                          {status.variant === "limit" && <Clock className="h-3 w-3" />}
                          <span>{status.label}</span>
                        </span>
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveCouponDetail(coupon)}
                            className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:bg-muted"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>Details</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setTargetDeleteCoupon(coupon)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-muted-foreground">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
                        <Tag className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground font-outfit">
                          No coupons found
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchTerm || filterTab !== "all"
                            ? "No coupons match your search query or selected filters."
                            : "No promotional codes have been generated yet."}
                        </p>
                      </div>
                      {(searchTerm || filterTab !== "all") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchTerm("");
                            setFilterTab("all");
                          }}
                          className="rounded-xl text-xs font-semibold"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card-Based Coupons List (Visible on screens < md) */}
      <div className="block md:hidden space-y-4">
        {filteredCoupons.length > 0 ? (
          filteredCoupons.map((coupon) => {
            const status = getCouponStatus(coupon);
            const isCombo = coupon.code === "ABCOMBO";

            return (
              <Card key={coupon.id} className="rounded-2xl border-border/80 shadow-2xs p-4 space-y-3">
                {/* Header: Code & Discount Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 tracking-wider">
                      {coupon.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(coupon.code)}
                      className="p-1 rounded bg-muted/60 text-muted-foreground hover:text-foreground"
                      title="Copy"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider border",
                      status.variant === "active"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : status.variant === "expired"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                    )}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Discount & Applicability Details */}
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discount Value:</span>
                    <span className="font-bold text-foreground">
                      {coupon.discountType === "percentage" ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {coupon.discountValue}% Off
                        </span>
                      ) : (
                        <span className="text-sky-600 dark:text-sky-400">
                          ₹{coupon.discountValue.toLocaleString("en-IN")} Flat Off
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Applies To:</span>
                    <span className="font-semibold text-foreground font-outfit">
                      {isCombo ? "Combo Pass Masterclass" : "All Courses (Global)"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Validity:</span>
                    <span className="font-medium text-foreground">
                      {coupon.expiryDate
                        ? new Date(coupon.expiryDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Lifetime (No Expiry)"}
                    </span>
                  </div>
                </div>

                {/* Redemptions Progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span className="text-muted-foreground text-[11px]">Redemption Count:</span>
                    <span>
                      {coupon.usedCount || 0} / {coupon.usageLimit ? `${coupon.usageLimit} uses` : "∞"}
                    </span>
                  </div>
                  {coupon.usageLimit && (
                    <Progress
                      value={Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100))}
                      className="h-1.5 bg-muted rounded-full"
                    />
                  )}
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveCouponDetail(coupon)}
                    className="flex-1 rounded-xl text-xs font-semibold h-9"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    <span>View Details</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTargetDeleteCoupon(coupon)}
                    className="rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/20 h-9 px-3"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="rounded-2xl border-border/80 shadow-2xs p-8 text-center text-muted-foreground space-y-3">
            <Tag className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <h4 className="text-base font-bold text-foreground font-outfit">No coupons match</h4>
            <p className="text-xs text-muted-foreground">Try clearing your search query.</p>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CREATE NEW COUPON MODAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-lg w-full border border-border/80 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Create Promotional Coupon
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Generate a promotional discount code for course checkouts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-7 w-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Coupon Code Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Coupon Code
                </label>
                <Input
                  type="text"
                  placeholder="e.g. FESTIVE50, SKILLUP30"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  className="rounded-xl font-mono uppercase font-bold text-xs sm:text-sm h-10"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Alphanumeric code entered by students at checkout.
                </p>
              </div>

              {/* Discount Type and Value Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Discount Type
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    className="w-full border border-input rounded-xl px-3 py-2 text-xs font-semibold bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-10"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Discount Value {formDiscountType === "percentage" ? "(%)" : "(₹)"}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={formDiscountType === "percentage" ? "100" : "50000"}
                    step="any"
                    placeholder={formDiscountType === "percentage" ? "20" : "500"}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    className="rounded-xl text-xs font-bold tabular-nums h-10"
                    required
                  />
                </div>
              </div>

              {/* Usage Limit & Expiry Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Usage Limit (Optional)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 500 uses"
                    value={formUsageLimit}
                    onChange={(e) => setFormUsageLimit(e.target.value)}
                    className="rounded-xl text-xs font-medium tabular-nums h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Expiration Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="rounded-xl text-xs font-medium h-10"
                  />
                </div>
              </div>

              {/* Live Preview Card */}
              {formCode && formDiscountValue && (
                <div className="bg-muted/40 p-3.5 rounded-xl border border-border/80 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Live Voucher Preview
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                      {formCode}
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formDiscountType === "percentage"
                        ? `${formDiscountValue}% Discount`
                        : `₹${parseFloat(formDiscountValue || "0").toLocaleString("en-IN")} Off`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !formCode || !formDiscountValue}
                  className="flex-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {isSubmitting ? "Generating..." : "Generate Coupon"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {targetDeleteCoupon && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-outfit text-foreground">
                  Delete Coupon Code?
                </h3>
                <p className="text-xs text-muted-foreground">
                  This action permanently removes the coupon code from the database.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 p-3.5 rounded-xl border border-border/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Coupon Code:</span>
                <span className="font-mono font-bold text-foreground">
                  {targetDeleteCoupon.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-semibold text-foreground">
                  {targetDeleteCoupon.discountType === "percentage"
                    ? `${targetDeleteCoupon.discountValue}%`
                    : `₹${targetDeleteCoupon.discountValue}`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Students will no longer be able to apply this voucher code during course checkout.
            </p>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTargetDeleteCoupon(null)}
                className="flex-1 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDeleteCoupon}
                className="flex-1 rounded-xl text-xs font-bold shadow-sm"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COUPON DETAILS MODAL */}
      {/* ========================================================================= */}
      {activeCouponDetail && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card text-card-foreground rounded-2xl p-6 max-w-md w-full border border-border/80 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-outfit text-foreground">
                    Coupon Voucher Details
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Promotional discount specifications.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCouponDetail(null)}
                className="h-7 w-7 rounded-lg bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Voucher Code:</span>
                <span className="font-mono font-bold text-sm text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                  {activeCouponDetail.code}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Discount Value:</span>
                <span className="font-bold text-foreground">
                  {activeCouponDetail.discountType === "percentage"
                    ? `${activeCouponDetail.discountValue}% Off`
                    : `₹${activeCouponDetail.discountValue.toLocaleString("en-IN")} Flat Off`}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Applicability:</span>
                <span className="font-semibold text-foreground font-outfit">
                  {activeCouponDetail.code === "ABCOMBO"
                    ? "All-in-One Combo Pass"
                    : "Global / All Courses"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Redemptions:</span>
                <span className="font-semibold text-foreground">
                  {activeCouponDetail.usedCount || 0} /{" "}
                  {activeCouponDetail.usageLimit
                    ? `${activeCouponDetail.usageLimit} maximum uses`
                    : "Unlimited"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expiration Date:</span>
                <span className="font-medium text-foreground">
                  {activeCouponDetail.expiryDate
                    ? new Date(activeCouponDetail.expiryDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Lifetime Validity (No Expiration)"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {getCouponStatus(activeCouponDetail).label}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveCouponDetail(null)}
              className="w-full rounded-xl text-xs font-semibold"
            >
              Close Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
