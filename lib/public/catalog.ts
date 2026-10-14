import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, coupons } from '@/lib/db/schema';
import { advertisedBundleOffer, type PublicCatalog } from './catalog-model';
export async function readPublicCatalog(): Promise<PublicCatalog> {
    try {
        const rows = await db.query.courses.findMany({
            where: eq(courses.isPublished, true), orderBy: [asc(courses.createdAt), asc(courses.id)], limit: 6,
            columns: { slug: true, title: true, shortDescription: true, description: true, thumbnailUrl: true,
                price: true, accessDays: true, isBundle: true, certificateStatus: true },
        });
        // This existing LMS offer is already used on Combo Pass detail. Keep its code server-side.
        const coupon = rows.some(row => row.slug === 'combo-pack') ? await db.query.coupons.findFirst({
            where: eq(coupons.code, 'ABCOMBO'), columns: { discountType: true, discountValue: true, expiryDate: true, usageLimit: true, usedCount: true },
        }).catch(() => null) : null;
        return { status: 'ready', courses: rows.filter(row => row.slug).map(row => ({
                slug: row.slug!, title: row.title, description: row.shortDescription || row.description,
                thumbnailUrl: row.thumbnailUrl, price: row.price, accessDays: row.accessDays,
                isBundle: row.isBundle, certificateStatus: row.certificateStatus,
                offerPrice: row.slug === 'combo-pack' ? advertisedBundleOffer(row.price, coupon || null) : null,
            })) };
    }
    catch {
        return { status: 'unavailable', courses: [] };
    }
}
