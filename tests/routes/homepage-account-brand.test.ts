import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.PropsWithChildren<{ href: string }>) => React.createElement('a', props, children) }));
vi.mock('next/image', () => ({ default: ({ priority: _priority, ...props }: { priority?: boolean }) => React.createElement('img', props) }));
import { HeroBanner } from '@/components/landing/HeroBanner';
import { PublicBrand } from '@/components/public/PublicUI';
it('renders the approved learner/Creator hierarchy and exact Sanskrit motto', () => {
  const html = renderToStaticMarkup(React.createElement(HeroBanner));
  expect(html).toContain('Professional Aviation Learning'); expect(html).toContain('lang="sa" translate="no">ज्ञानं कर्मसु कौशलम्');
  expect(html).toContain('Knowledge into Skill.'); expect(html).toContain('Skill into Possibility.');
  expect(html).toContain('For Learners'); expect(html).toContain('For Creators'); expect(html).toContain('Publication and creator-course sales are not yet available.');
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
