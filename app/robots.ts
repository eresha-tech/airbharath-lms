import type { MetadataRoute } from 'next';
import { PUBLIC_ORIGIN } from '@/lib/public/metadata';
export default function robots(): MetadataRoute.Robots {
    return { rules: { userAgent: '*', allow: ['/', '/workspace/creator-terms', '/workspace/refund-policy', '/workspace/manual-application'],
            disallow: ['/api/', '/admin', '/dashboard', '/login', '/auth/', '/workspace/'] }, sitemap: `${PUBLIC_ORIGIN}/sitemap.xml` };
}
