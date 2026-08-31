/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Plus, Tag, Trash2, Percent, IndianRupee } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();

  const fetchCoupons = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("expiry_date", { ascending: true });
    if (data) setCoupons(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) return;

    setIsSubmitting(true);
    const { error } = await supabase.from("coupons").insert({
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      usage_limit: usageLimit ? parseInt(usageLimit) : null,
    });

    setIsSubmitting(false);

    if (error) {
      alert(error.message);
    } else {
      setCode("");
      setDiscountValue("");
      setExpiryDate("");
      setUsageLimit("");
      fetchCoupons();
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      fetchCoupons();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Coupons & Discounts</h1>
        <p className="text-muted-foreground text-sm">Create and manage promotional discount codes for checkout.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Coupon Form */}
        <div className="bg-card p-6 border rounded-2xl shadow-sm h-fit">
          <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create New Coupon
          </h3>
          <form onSubmit={handleCreateCoupon} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">COUPON CODE</label>
              <input
                type="text"
                placeholder="e.g. GROW50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">DISCOUNT TYPE</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">VALUE</label>
                <input
                  type="number"
                  placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">EXPIRY DATE (OPTIONAL)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">USAGE LIMIT (OPTIONAL)</label>
              <input
                type="number"
                placeholder="e.g. 100 uses"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Generate Coupon"}
            </button>
          </form>
        </div>

        {/* Coupon List */}
        <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="font-bold text-lg">Active & Scheduled Coupons</h3>
          </div>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading coupon inventory...</div>
          ) : coupons.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                    <th className="px-6 py-4">Code</th>
                    <th className="px-6 py-4">Discount</th>
                    <th className="px-6 py-4">Usage</th>
                    <th className="px-6 py-4">Expires</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-sm text-foreground">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        <div className="flex items-center gap-1.5">
                          {coupon.discount_type === "percentage" ? (
                            <>
                              <Percent className="h-3.5 w-3.5 text-primary" />
                              <span>{coupon.discount_value}% Off</span>
                            </>
                          ) : (
                            <>
                              <IndianRupee className="h-3.5 w-3.5 text-primary" />
                              <span>₹{coupon.discount_value} Off</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {coupon.used_count} / {coupon.usage_limit || "∞"} used
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {coupon.expiry_date ? new Date(coupon.expiry_date).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No active coupon codes created yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
