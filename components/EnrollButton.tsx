"use client";

import { CheckCircle, Check, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Script from "next/script";

function EnrollButton({
  courseId,
  isEnrolled,
  price,
  courseTitle,
  initialUser,
  autoCouponCode,
}: {
  courseId: string;
  isEnrolled: boolean;
  price: number;
  courseTitle: string;
  initialUser?: any;
  autoCouponCode?: string;
}) {
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
      .catch(() => { });
  }, [initialUser]);

  useEffect(() => {
    if (autoCouponCode && price > 0) {
      setValidatingCoupon(true);
      fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: autoCouponCode, amount: price }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.valid) {
            setAppliedCoupon(data);
          }
        })
        .catch(() => { })
        .finally(() => setValidatingCoupon(false));
    }
  }, [autoCouponCode, price]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    setAppliedCoupon(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, amount: price }),
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
        name: "Airbharath LMS",
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
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="w-full rounded-xl px-6 py-3.5 font-bold bg-[#014a62] text-white hover:bg-[#01374a] transition-all h-12 flex items-center justify-center gap-2 group shadow-md"
      >
        <span>Access Dashboard</span>
        <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform text-cyan-300" />
      </Link>
    );
  }

  return (
    <div className="space-y-4 w-full">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Coupon Application Box */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="PROMO CODE"
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value)}
            disabled={validatingCoupon || isEnrolling}
            className="flex-1 border border-border rounded-xl px-3 py-2 text-xs font-semibold bg-background focus:outline-none focus:ring-1 focus:ring-[#014a62] uppercase"
          />
          <button
            type="button"
            onClick={handleApplyCoupon}
            disabled={validatingCoupon || isEnrolling || !couponInput.trim()}
            className="px-4 py-2 bg-[#014a62] text-white font-bold rounded-xl text-xs hover:bg-[#01374a] transition-colors disabled:opacity-50"
          >
            {validatingCoupon ? "..." : "Apply"}
          </button>
        </div>

        {appliedCoupon && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            <span>Coupon applied! Saved ₹{appliedCoupon.discount}. Final price: ₹{appliedCoupon.finalAmount}</span>
          </div>
        )}

        {couponError && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{couponError}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        className={`w-full rounded-xl px-6 py-3.5 font-bold transition-all duration-300 relative h-12 text-sm shadow-md
          ${isEnrolling
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-[#014a62] text-white hover:bg-[#01374a]"
          }
        `}
        disabled={isEnrolling}
        onClick={handleEnroll}
      >
        <span className={isEnrolling ? "invisible" : ""}>
          Enroll Now {appliedCoupon ? `(₹${appliedCoupon.finalAmount})` : `(₹${price})`}
        </span>
        {isEnrolling && (
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold">Processing...</span>
          </div>
        )}
      </button>

      {enrollError && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{enrollError}</span>
        </div>
      )}
    </div>
  );
}

export default EnrollButton;
