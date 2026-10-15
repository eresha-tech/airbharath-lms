import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: { priority?: boolean }) => React.createElement('img', props) }));
import { HeroBanner } from '@/components/landing/HeroBanner';
import { PublicBrand } from '@/components/public/PublicUI';
it('renders concise hero copy and preserves the motto and CTA destinations', () => {
  const html = renderToStaticMarkup(React.createElement(HeroBanner));
  expect(html).toContain('Professional Aviation Learning'); expect(html).toContain('lang="sa" translate="no">ज्ञानं कर्मसु कौशलम्');
  expect(html).toContain('Knowledge into Skill.'); expect(html).toContain('Skill into Possibility.');
  expect(html).toContain('AirBharath combines industry-aligned aviation learning with AI-powered practice and immersive VR training innovation. Build career-ready skills, or use Creator Workspace to turn your aviation expertise into structured course drafts.');
  expect(html).not.toMatch(/For Learners|For Creators|Creator Early Access supports private course preparation|Publication and creator-course sales are not yet available/);
  expect(html).toContain('href="/courses"'); expect(html).toContain('href="/workspace/apply"');
});
it('renders plain AirBharath branding without the removed logo subtitle', () => {
  const html = renderToStaticMarkup(React.createElement(PublicBrand));
  expect(html).toContain('AirBharath'); expect(html).not.toMatch(/LEARN|CREATE|LMS|brand-caption/);
});
it('keeps navigation free of artificial delays and retains original static artwork', () => {
  const login = readFileSync('app/(auth)/login/page.tsx', 'utf8');
  expect(login).not.toMatch(/setTimeout|router\.(push|refresh)/); expect(login).toContain('completeLoginNavigation');
  expect(readFileSync('components/landing/HeroBanner.tsx', 'utf8')).not.toMatch(/setInterval|HERO_SLIDES/);
});
