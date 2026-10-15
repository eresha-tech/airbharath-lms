import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }));
vi.mock('@/lib/admin-authorization', () => ({ hasPersistedAdminRole: vi.fn() }));
vi.mock('@/components/providers/sidebar-provider', () => ({ SidebarProvider: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/components/admin/AdminLayoutWrapper', () => ({ AdminLayoutWrapper: ({ children }: React.PropsWithChildren) => children }));
vi.mock('@/components/dashboard/StudentLayoutWrapper', () => ({ StudentLayoutWrapper: ({ children }: React.PropsWithChildren) => children }));
import { metadata as adminMetadata } from '@/app/(admin)/layout';
import { metadata as learnerMetadata } from '@/app/(dashboard)/layout';
import { WorkspaceLaunchNotice } from '@/components/workspace/ui/WorkspaceUI';
import { PricingView } from '@/components/pricing/PricingView';
import { CourseCard } from '@/components/CourseCard';

const render = (node: React.ReactElement) => renderToStaticMarkup(node);
describe('Scoped F.8C commercial copy and private metadata', () => {
  it('qualifies feature release while keeping Early Access preparation private', () => {
    const html = render(React.createElement(WorkspaceLaunchNotice));
    expect(html).toContain('Full AirBharath Workspace is targeted for 9 November 2026, subject to release readiness.');
    expect(html).toContain('not available during Early Access');
    expect(html).not.toContain('Workspace launches 9 November');
  });
  it('removes blanket pricing duration promises while preserving catalog prices and destinations', () => {
    const html = render(React.createElement(PricingView, { courses: [
      { id: 'synthetic-single', slug: 'ai-skills', title: 'AI Skills', price: 825, modulesCount: 2, lessonsCount: 3 },
      { id: 'synthetic-combo', slug: 'combo-pack', title: 'Combo Pass', price: 3300, modulesCount: 4, lessonsCount: 8 },
    ] }));
    expect(html).not.toMatch(/lifetime|365\s*days/i);
    expect(html).toContain('3,300'); expect(html).toContain('/courses/combo-pack');
    expect(html).toContain('Coupon:'); expect(html).toContain('ABCOMBO');
  });
  it.each([30, 180, 365])('uses the real per-course %i-day duration', days => {
    const html = render(React.createElement(CourseCard, { href: '/courses/synthetic', course: { id: 'synthetic', title: 'Synthetic course', price: 825, description: null, access_days: days } }));
    expect(html).toContain(`${days} Days Access`); expect(html).not.toMatch(/lifetime/i);
  });
  it('does not turn a no-fixed-expiry course into a lifetime marketing guarantee', () => {
    const html = render(React.createElement(CourseCard, { href: '/courses/synthetic', course: { id: 'synthetic', title: 'Synthetic course', price: 825, description: null, access_days: null } }));
    expect(html).not.toMatch(/lifetime|365/i);
    expect(html).toContain('No fixed expiry');
  });
  it('does not infer duration from missing course data', () => {
    const html = render(React.createElement(CourseCard, { href: '/courses/synthetic', course: { id: 'synthetic', title: 'Synthetic course', price: 825, description: null } }));
    expect(html).toContain('See course details'); expect(html).not.toMatch(/No fixed expiry|Lifetime|365/);
  });
  it.each([adminMetadata, learnerMetadata])('scopes noindex/nofollow to authenticated layouts', metadata => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
