import 'server-only';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { courses, coupons } from '@/lib/db/schema';
import { advertisedBundleOffer, type PublicCatalog } from './catalog-model';
export async function readPublicCatalog(): Promise<PublicCatalog> {
    try {
        const rows = await db.query.courses.findMany({
            where: and(eq(courses.isPublished, true),sql`(${courses.workspaceProjectId} IS NULL OR ${courses.workspaceState}='live')`,sql`${courses.workspaceState} IS DISTINCT FROM 'suspended'`), orderBy: [asc(courses.createdAt), asc(courses.id)], limit: 6,
            with: { discoveryStats: true, authors: { columns: { name: true }, orderBy: (a,{asc}) => [asc(a.orderIndex),asc(a.id)], limit: 1 } },
            columns: { workspaceProjectId: true, slug: true, title: true, shortDescription: true, description: true, thumbnailUrl: true,
                price: true, accessDays: true, isBundle: true, certificateStatus: true },
        });
        // This existing LMS offer is already used on Combo Pass detail. Keep its code server-side.
        const coupon = rows.some(row => row.slug === 'combo-pack') ? await db.query.coupons.findFirst({
            where: eq(coupons.code, 'ABCOMBO'), columns: { discountType: true, discountValue: true, expiryDate: true, usageLimit: true, usedCount: true },
        }).catch(() => null) : null;
        return { status: 'ready', courses: rows.filter(row => row.slug).map(row => ({
                slug: row.slug!, title: row.title,
                averageRating: row.discoveryStats?.reviewCount ? row.discoveryStats.ratingSum/row.discoveryStats.reviewCount : null, reviewCount: row.discoveryStats?.reviewCount ?? 0, creatorName: row.workspaceProjectId ? row.authors?.[0]?.name ?? null : null, description: row.shortDescription || row.description,
                thumbnailUrl: row.thumbnailUrl, price: row.price, accessDays: row.accessDays,
                isBundle: row.isBundle, certificateStatus: row.certificateStatus,
                offerPrice: row.slug === 'combo-pack' ? advertisedBundleOffer(row.price, coupon || null) : null,
            })) };
    }
    catch {
        return { status: 'unavailable', courses: [] };
    }
}
