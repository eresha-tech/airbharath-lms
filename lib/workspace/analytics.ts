'use client';
import { track } from '@/lib/analytics';
import { AVIATION_BACKGROUNDS, COURSE_READINESS, AUDIENCE_STATUS, AUDIENCE_SIZES } from './options';
import type { ApplicationInput } from './validation';

export type WorkspaceEvent = 'workspace_page_view' | 'workspace_apply_clicked' | 'workspace_application_started' |
  'workspace_step_1_completed' | 'workspace_step_2_completed' | 'workspace_step_3_completed' | 'workspace_step_4_completed' | 'workspace_application_submitted' |
  'workspace_step_viewed' | 'workspace_validation_failed' | 'workspace_submission_attempted' | 'workspace_submission_failed';
export function trackWorkspace(event: WorkspaceEvent, data?: Partial<ApplicationInput>, stepNumber?: number, context?: { failureCategory?: string; entryPoint?: string }) {
  // Existing global sanitizer does not remove all PII. Explicitly allow only known enum values.
  const properties: Record<string, string | number> = { feature: 'workspace', eventVersion: '1' };
  for (const [key, options] of Object.entries({ aviationBackground: AVIATION_BACKGROUNDS, courseReadiness: COURSE_READINESS, audienceStatus: AUDIENCE_STATUS, audienceSize: AUDIENCE_SIZES })) {
    const value = data?.[key as keyof ApplicationInput];
    if (typeof value === 'string' && (options as readonly string[]).includes(value)) properties[key] = value;
  }
  if (stepNumber && stepNumber >= 1 && stepNumber <= 4) properties.stepNumber = stepNumber;
  if (context?.failureCategory && ['validation', 'conflict', 'rate_limited', 'unavailable', 'network', 'unknown'].includes(context.failureCategory)) properties.failureCategory = context.failureCategory;
  if (context?.entryPoint && ['hero', 'founding_cohort'].includes(context.entryPoint)) properties.entryPoint = context.entryPoint;
  track(event, properties);
}
