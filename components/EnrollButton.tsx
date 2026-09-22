"use client";

import { Check, AlertCircle, Loader2, Tag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";

interface EnrollButtonProps {
  courseId: string;
  isEnrolled: boolean;
  price: number;
  courseTitle: string;
  initialUser?: any;
  autoCouponCode?: string;
}

export default function EnrollButton({
  courseId,
  isEnrolled,
  price,
  courseTitle,
  initialUser,
  autoCouponCode,
}: EnrollButtonProps) {
  const [user, setUser] = useState<any>(initialUser ?? null);
  const [couponInput, setCouponInput] = useState(autoCouponCode || "");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (initialUser !== undefined && initialUser !== null) return;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, [initialUser]);

  useEffect(() => {
    if (autoCouponCode && price > 0) {
      setValidatingCoupon(true);
      fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: autoCouponCode, amount: price, courseId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.valid) {
            setAppliedCoupon(data);
          }
        })
        .catch(() => {})
        .finally(() => setValidatingCoupon(false));
    }
  }, [autoCouponCode, price, courseId]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    setAppliedCoupon(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), amount: price, courseId }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setAppliedCoupon(data);
      } else {
        setCouponError(data.error || "Failed to apply coupon");
      }
    } catch {
      setCouponError("Network error validating coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleEnroll = async () => {
    setEnrollError("");
    let activeUser = user;
    if (!activeUser) {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data?.user) {
          router.push("/login");
          return;
        }
        activeUser = data.user;
        setUser(data.user);
      } catch {
        router.push("/login");
        return;
      }
    }

    if (typeof window === "undefined" || !(window as any).Razorpay) {
      setEnrollError("Payment gateway is loading. Please try again in a moment.");
      return;
    }

    setIsEnrolling(true);

    try {
      const response = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          amount: price,
          couponCode: appliedCoupon ? appliedCoupon.code : null,
        }),
      });

      const order = await response.json();

      if (!response.ok || !order.id) {
        setEnrollError(order.error || "Failed to initiate payment. Please try again.");
        setIsEnrolling(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Air Bharath LMS",
        description: `Enrollment for ${courseTitle}`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success || verifyData.message === "Success") {
              router.refresh();
              router.push(`/dashboard/courses/${courseId}`);
            } else {
              setEnrollError(verifyData.error || "Payment verification failed.");
              setIsEnrolling(false);
            }
          } catch (err) {
            console.error("Verification error:", err);
            setEnrollError("Network error verifying payment.");
            setIsEnrolling(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsEnrolling(false);
          },
        },
        prefill: {
          contact: activeUser.phone || "",
          email: activeUser.email || "",
        },
        theme: {
          color: "#014a62",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setEnrollError(response.error?.description || "Payment failed.");
        setIsEnrolling(false);
      });
      rzp.open();
    } catch (error) {
      console.error("Error in handleEnroll:", error);
      setEnrollError("An unexpected error occurred. Please try again.");
      setIsEnrolling(false);
    }
  };

  if (isEnrolled) {
    return (
      <Button
        asChild
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 sm:h-12 rounded-2xl text-xs sm:text-sm shadow-xs transition-all duration-200 cursor-pointer"
      >
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="flex items-center justify-center gap-2"
        >
          <span>Access Course Classroom</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    );
  }

  const finalDisplayPrice = appliedCoupon ? appliedCoupon.finalAmount : price;

  return (
    <div className="space-y-4 w-full font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Coupon Application Box */}
      {price > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="PROMO CODE"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                disabled={validatingCoupon || isEnrolling}
                className="w-full border border-input rounded-xl px-3 py-2 pl-9 text-xs font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary uppercase placeholder:normal-case placeholder:font-normal"
              />
            </div>
            <Button
              type="button"
              onClick={handleApplyCoupon}
              disabled={validatingCoupon || isEnrolling || !couponInput.trim()}
              variant="outline"
              size="sm"
              className="px-4 font-bold text-xs h-9 rounded-xl border-primary/20 text-primary hover:bg-primary/10 cursor-pointer"
            >
              {validatingCoupon ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Apply"
              )}
            </Button>
          </div>

          {appliedCoupon && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-xl">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>
                Coupon applied! Saved ₹{appliedCoupon.discount}. Final price: ₹
                {appliedCoupon.finalAmount}
              </span>
            </div>
          )}

          {couponError && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{couponError}</span>
            </div>
          )}
        </div>
      )}

      {/* Primary Enrollment Button */}
      <Button
        type="button"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11 sm:h-12 rounded-2xl text-xs sm:text-sm shadow-xs transition-all duration-200 relative cursor-pointer"
        disabled={isEnrolling}
        onClick={handleEnroll}
      >
        {isEnrolling ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing Order...</span>
          </div>
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <span>
              {price === 0
                ? "Enroll Free"
                : `Enroll Now • ₹${finalDisplayPrice.toLocaleString("en-IN")}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </Button>

      {enrollError && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-xl">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{enrollError}</span>
        </div>
      )}
    </div>
  );
}
