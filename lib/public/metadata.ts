import type { Metadata } from 'next';
// Existing invoice and certificate links identify this as the public LMS origin.
export const PUBLIC_ORIGIN = 'https://lms.airbharath.in';
export const PUBLIC_PAGES = ['/', '/courses', '/pricing', '/practice', '/about', '/contact', '/faq', '/privacy', '/terms', '/verify-certificate', '/workspace', '/workspace/creator-terms', '/workspace/refund-policy'] as const;
export function publicMetadata(path: string, title: string, description: string): Metadata {
    const url = new URL(path, PUBLIC_ORIGIN).href;
    return { title, description, alternates: { canonical: url },
        openGraph: { type: 'website', title, description, url, siteName: 'AirBharath', locale: 'en_IN' },
        twitter: { card: 'summary', title, description } };
}
