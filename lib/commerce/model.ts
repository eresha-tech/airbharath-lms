export type PurchaseEvidence = {
  commercial?: import('@/lib/workspace/sponsorship/model').CommercialSnapshot;
  academyEntitlementPolicy?: import('@/lib/academy-entitlements/model').AcademyPolicy;
  version: 1; currency: 'INR'; listPaise: number; discountPaise: number; totalPaise: number;
  taxablePaise: number; taxPaise: number; taxRate: 18; taxInclusive: true;
  couponId: string | null; couponCode: string | null; couponType: string | null; couponValue: string | null;
  courseTitle: string; accessDays: number | null; creatorId: string | null; projectId: string | null; priceId: string | null;
};
export class CommerceError extends Error { constructor(public status: number, message: string) { super(message); } }
export function moneyPaise(value: string | number) {
  const n = Number(value); const paise = Math.round(n * 100);
  if (!Number.isFinite(n) || !Number.isSafeInteger(paise) || paise < 0 || paise > 100000000) throw new CommerceError(409,'Course price is unavailable.');
  return paise;
}
export function priceEvidence(course: { title: string; price: string; accessDays: number | null; instructorId: string | null; workspaceProjectId: string | null },
  priceId: string | null, coupon: { id: string; code: string; discountType: string | null; discountValue: string } | null): PurchaseEvidence {
  const listPaise = moneyPaise(course.price);
  const value = Number(coupon?.discountValue ?? 0);
  const raw = coupon?.discountType === 'percentage' ? listPaise * value / 100 : coupon && ['flat','fixed'].includes(coupon.discountType ?? '') ? value * 100 : 0;
  if (!Number.isFinite(raw) || raw < 0) throw new CommerceError(409, 'Coupon is unavailable.');
  // Preserve the existing coupon workflow's whole-rupee rounding.
  const totalPaise = coupon ? Math.max(0, Math.round((listPaise - raw) / 100) * 100) : listPaise;
  const taxablePaise = Math.round(totalPaise / 1.18);
  return { version: 1, currency: 'INR', listPaise, discountPaise: listPaise - totalPaise, totalPaise, taxablePaise,
    taxPaise: totalPaise - taxablePaise, taxRate: 18, taxInclusive: true,
    couponId: coupon?.id ?? null, couponCode: coupon?.code ?? null, couponType: coupon?.discountType ?? null, couponValue: coupon?.discountValue ?? null,
    courseTitle: course.title, accessDays: course.accessDays, creatorId: course.workspaceProjectId ? course.instructorId : null, projectId: course.workspaceProjectId, priceId };
}
export function capturedPayment(payment: { id: string; order_id?: string; amount: string | number; currency: string; status: string; amount_refunded?: number }, order: { razorpayOrderId: string; amount: string }, paymentId: string) {
  return payment.id === paymentId && payment.order_id === order.razorpayOrderId && payment.currency === 'INR' &&
    payment.status === 'captured' && Number(payment.amount) === moneyPaise(order.amount) && !payment.amount_refunded;
}
