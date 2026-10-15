import type { MetadataRoute } from 'next';
import { PUBLIC_ORIGIN, PUBLIC_PAGES } from '@/lib/public/metadata';
export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PAGES.map(path => ({ url: new URL(path, PUBLIC_ORIGIN).href }));
}
