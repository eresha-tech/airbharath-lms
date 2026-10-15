'use client';
import { track } from '@/lib/analytics';
export function trackEligibilityStarted() { track('workspace_eligibility_started', { feature: 'workspace', eventVersion: '2' }); }
