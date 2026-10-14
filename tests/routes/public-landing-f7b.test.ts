import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{
        href: string;
    }>) => React.createElement('a', props, children) }));
vi.mock('next/image', () => ({ default: ({ fill, priority, ...props }: {
        fill?: boolean;
        priority?: boolean;
    }) => React.createElement('img', props) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/workspace', useRouter: () => ({ push: vi.fn() }) }));
const mocks = vi.hoisted(() => ({ courses: vi.fn(), coupon: vi.fn(), policy: vi.fn(), plans: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: { courses: { findMany: mocks.courses }, coupons: { findFirst: mocks.coupon } } } }));
vi.mock('@/lib/workspace/eligibility/service', () => ({ getEligibilityFormConfig: mocks.policy }));
vi.mock('@/lib/workspace/membership/service', () => ({ getCurrentPlans: mocks.plans }));
import { advertisedBundleOffer, rupees, type PublicCourse } from '@/lib/public/catalog-model';
import { readPublicCatalog } from '@/lib/public/catalog';
import { readPublicWorkspaceInfo } from '@/lib/public/workspace';
import { HeroBanner } from '@/components/landing/HeroBanner';
import { FeaturedCourseCarousel } from '@/components/landing/FeaturedCourseCarousel';
import { CoursesSection, PublicCourseCard } from '@/components/landing/CoursesSection';
import { WorkspaceLanding } from '@/components/workspace/WorkspaceLanding';
import { Footer } from '@/components/Footer';
import Home from '@/app/(user)/page';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import { publicMetadata, PUBLIC_ORIGIN } from '@/lib/public/metadata';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const course: PublicCourse = { slug: 'combo-pack', title: 'A full and unexpectedly long but readable course title', description: 'Practical lessons', price: '3300.00', thumbnailUrl: null, accessDays: null, isBundle: true, certificateStatus: 'active', offerPrice: 1900 };
const coupon = { discountType: 'flat', discountValue: '1400.00', expiryDate: null, usageLimit: 100, usedCount: 2 };
const plans = ['quarterly', 'half_yearly', 'yearly'].map((code, i) => ({ code, displayName: ['Quarterly', 'Half yearly', 'Yearly'][i], durationMonths: [3, 6, 12][i], basePricePaise: [499915, 847373, 1499915][i], taxRateBps: 1800, available: true, id: 'private-plan-version' }));
beforeEach(() => { mocks.courses.mockResolvedValue([{ ...course, shortDescription: 'Practical lessons', providerPaymentId: 'private', secret: 'private' }]); mocks.coupon.mockResolvedValue(coupon); mocks.policy.mockResolvedValue({ settings: { config: { minimumExperienceMonths: 24, profileRequired: true, allowedCategories: ['pilot_flight_crew'] }, id: 'private-policy' } }); mocks.plans.mockResolvedValue(plans); });
it('represents the active offer separately from standard price without publishing a coupon code', async () => {
    const value = await readPublicCatalog();
    const result = html(React.createElement(PublicCourseCard, { course: value.courses[0] }));
    expect(result).toContain('₹3,300');
    expect(result).toContain('<del>₹3,300</del><strong>₹1,900</strong>');
    expect(result).toContain('₹1,900 with an eligible coupon');
    expect(result).toContain('Save ₹1,400 only with an eligible coupon');
    expect(result).toContain('validity and usage limits');
    expect(result).not.toContain('ABCOMBO');
    expect(value.courses[0]).not.toHaveProperty('providerPaymentId');
    expect(mocks.courses.mock.calls[0][0].limit).toBe(6);
    expect(mocks.courses.mock.calls[0][0].columns).not.toHaveProperty('instructorId');
});
it.each([{ ...coupon, usedCount: 100 }, { ...coupon, expiryDate: new Date('2000-01-01') }, { ...coupon, discountValue: 'bad' }, null])('suppresses expired, exhausted and invalid promotional amounts', item => { expect(advertisedBundleOffer('3300.00', item)).toBeNull(); });
it('keeps cents accurate and preserves real null/duration semantics in course copy', () => {
    expect(rupees('999.50')).toBe('₹999.5');
    const unknown = html(React.createElement(PublicCourseCard, { course }));
    expect(unknown).not.toMatch(/365|lifetime/i);
    expect(unknown).toContain(course.title);
    expect(unknown).not.toContain('line-clamp-1');
    expect(html(React.createElement(PublicCourseCard, { course: { ...course, accessDays: 365 } }))).toContain('365 days course access');
});
it('distinguishes catalog-unavailable from genuine-empty results, without fictional products or prices', async () => {
    mocks.courses.mockRejectedValueOnce(new Error('private connection detail'));
    const value = await readPublicCatalog();
    expect(value.status).toBe('unavailable');
    const result = html(React.createElement(CoursesSection, { catalog: value }));
    expect(result).toContain('Retry loading courses');
    expect(result).not.toMatch(/No courses|private connection|₹/);
    mocks.courses.mockResolvedValueOnce([]);
    const empty = html(React.createElement(CoursesSection, { catalog: await readPublicCatalog() }));
    expect(empty).toContain('No courses are currently listed');
    expect(empty).not.toContain('category filter');
});
it('keeps hero course-first with linked published courses and the approved secondary destination', () => {
    const result = html(React.createElement(HeroBanner, { courses: [course] }));
    expect(result.indexOf('Explore Courses')).toBeLessThan(result.indexOf('Become a Creator'));
    expect(result).toContain('href="/workspace"');
    expect(result).toContain('href="/courses"');
    expect(result).not.toMatch(/₹|aria-hidden="true"[^>]*>.*Explore Program/);
    expect(readFileSync('components/landing/HeroBanner.tsx', 'utf8')).not.toMatch(/setInterval|useEffect|HERO_SLIDES/);
});
it('keeps inactive slides inert while linking each published course to its own detail route', () => {
    const result = html(React.createElement(FeaturedCourseCarousel, { courses: [course, { ...course, slug: 'ai-skills', title: 'AI Skills', isBundle: false }] }));
    expect(result).toContain('aria-roledescription="carousel"');
    expect(result).toContain('inert="" aria-hidden="true"');
    expect(result).toContain('href="/courses/combo-pack"');
    expect(result).toContain('href="/courses/ai-skills"');
    expect(result).toContain('Next featured course');
});
it('renders one or zero published courses without rotation controls, and suppresses an unavailable offer', () => {
    for (const courses of [[course], []]) {
        const result = html(React.createElement(FeaturedCourseCarousel, { courses }));
        expect(result).not.toContain('Next featured course');
        expect(result).not.toContain('aria-roledescription="carousel"');
    }
    const result = html(React.createElement(PublicCourseCard, { course: { ...course, offerPrice: null } }));
    expect(result).not.toContain('<del>');
    expect(result).not.toContain('₹1,900');
    expect(result).toContain('₹3,300');
});
it('renders eight purposeful homepage sections with courses followed by Workspace', async () => {
    const result = html(await Home());
    expect(result.match(/<section\b/g)).toHaveLength(8);
    expect(result.indexOf('Your next skill starts here')).toBeLessThan(result.indexOf('Have aviation expertise to share'));
    expect(result).toContain('Explore Creator Workspace');
    expect(result).not.toMatch(/IIM|30\+|lifetime|365 Days Access/);
});
it('publishes current policy and exact inclusive prices without internal IDs or private evidence', async () => {
    const info = await readPublicWorkspaceInfo();
    expect(info.plans?.map(p => p.totalPaise)).toEqual([589900, 999900, 1769900]);
    expect(JSON.stringify(info)).not.toContain('private');
    expect(info.eligibility?.categories).toEqual(['Pilot / Flight Crew']);
    const result = html(React.createElement(WorkspaceLanding, { info }));
    expect(result.match(/<section\b/g)).toHaveLength(8);
    for (const text of ['₹5,899', '₹9,999', '₹17,699', '24 months', '18 or older', 'HTTPS', 'verified payment time', '72 elapsed hours', '00:00 IST', 'Admin-issued', 'proposal approval', 'Check Eligibility'])
        expect(result).toContain(text);
    expect(result).not.toMatch(/Pay Now|checkout\.js/);
    expect(result).toContain('href="/workspace/creator-terms"');
    expect(result).toContain('href="/workspace/refund-policy"');
});
it('uses changed published criteria and retains independent prices when policy reads fail', async () => {
    mocks.policy.mockResolvedValueOnce({ settings: { config: { minimumExperienceMonths: 36, profileRequired: false, allowedCategories: ['cabin_crew'] } } });
    const current = await readPublicWorkspaceInfo();
    expect(html(React.createElement(WorkspaceLanding, { info: current }))).toContain('36 months');
    expect(current.eligibility?.categories).toEqual(['Cabin Crew']);
    mocks.policy.mockRejectedValueOnce(new Error('private'));
    const partial = await readPublicWorkspaceInfo();
    const result = html(React.createElement(WorkspaceLanding, { info: partial }));
    expect(result).toContain('Eligibility requirements are temporarily unavailable');
    expect(result).toContain('₹5,899');
    expect(result).not.toContain('private-policy');
});
it('does not fabricate public prices when current catalog is unavailable', async () => {
    mocks.plans.mockRejectedValueOnce(new Error('private'));
    const result = html(React.createElement(WorkspaceLanding, { info: await readPublicWorkspaceInfo() }));
    expect(result).toContain('Membership prices are temporarily unavailable');
    expect(result).not.toMatch(/₹5,899|₹9,999|₹17,699/);
    expect(result).toContain('Payments not yet enabled');
});
it('exposes separate footer learner/Creator/legal paths without fabricated proof/social links', () => {
    const result = html(React.createElement(Footer));
    for (const path of ['/workspace/apply', '/workspace/creator-terms', '/workspace/refund-policy', '/verify-certificate', '/practice', '/contact', '/pricing'])
        expect(result).toContain(`href="${path}"`);
    expect(result).not.toMatch(/IIM|30\+|instagram|newsletter/);
});
it('provides canonical/social metadata and crawler output containing only public destinations', () => {
    const value = publicMetadata('/workspace', 'title', 'description');
    expect(value.alternates?.canonical).toBe(`${PUBLIC_ORIGIN}/workspace`);
    expect(value.openGraph).toMatchObject({ url: `${PUBLIC_ORIGIN}/workspace` });
    expect(value.twitter).toMatchObject({ card: 'summary' });
    expect(robots().sitemap).toBe(`${PUBLIC_ORIGIN}/sitemap.xml`);
    expect(robots().rules).toMatchObject({ disallow: expect.arrayContaining(['/workspace/', '/admin', '/api/']) });
    for (const entry of sitemap())
        expect(entry.url).not.toMatch(/\/api\/|\/admin|\/dashboard|\/activate|\/apply/);
});
it.each(['/robots.txt', '/sitemap.xml'])('allows only exact public crawler endpoint %s', async (path) => { expect((await middleware(new NextRequest(`https://example.test${path}`))).status).toBe(200); });
it.each(['/robots.txt/private', '/sitemap.xml/private', '/workspace/dashboard', '/workspace/courses', '/admin/workspace', '/dashboard'])('preserves anonymous authorization for %s', async (path) => { const response = await middleware(new NextRequest(`https://example.test${path}`)); expect(response.status).toBe(307); expect(new URL(response.headers.get('location')!).pathname).toBe('/login'); });
it('preserves private layout separation, existing membership/legal guards and migration source', () => {
    for (const path of ['app/(workspace)/workspace/(creator)/layout.tsx', 'app/(admin)/layout.tsx'])
        expect(readFileSync(path, 'utf8')).not.toMatch(/<Header|<Footer/);
    const shell = readFileSync('app/(user)/layout.tsx', 'utf8');
    expect(shell.match(/<main\b/g)).toHaveLength(1);
    expect(shell).toContain('id="public-content"');
});
