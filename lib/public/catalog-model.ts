export type PublicCourse = {
    slug: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    price: string;
    accessDays: number | null;
    isBundle: boolean;
    certificateStatus: string;
    offerPrice: number | null;
};
export type PublicCatalog = {
    status: 'ready';
    courses: PublicCourse[];
} | {
    status: 'unavailable';
    courses: [
    ];
};
export type LmsOfferRecord = {
    discountType: string | null;
    discountValue: string;
    expiryDate: Date | null;
    usageLimit: number | null;
    usedCount: number;
};
// Read-only presentation of the existing LMS coupon route's rounding and validity.
// No code, counter, order or entitlement is published/changed by this projection.
export function advertisedBundleOffer(price: string, coupon: LmsOfferRecord | null, now = new Date()): number | null {
    const standard = Number(price);
    if (!coupon || !Number.isFinite(standard) || standard <= 0 ||
        (coupon.expiryDate && coupon.expiryDate < now) ||
        (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit))
        return null;
    const value = Number(coupon.discountValue);
    if (!Number.isFinite(value) || value <= 0)
        return null;
    const discount = coupon.discountType === 'percentage' ? Math.round(standard * value / 100) :
        coupon.discountType === 'flat' || coupon.discountType === 'fixed' ? Math.round(value) : 0;
    const total = Math.max(0, Math.round(standard - discount));
    return discount > 0 && total > 0 && total < standard ? total : null;
}
export function rupees(value: number | string) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value));
}
