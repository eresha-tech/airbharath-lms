import type { CaptureResult } from 'posthog-js';
import { COUPON_ERRORS, isPlanCode } from './membership/model';
import { EVALUATOR_VERSION, ELIGIBILITY_POLICY_VERSION } from './eligibility/model';
export function workspaceAnalyticsPath(pathname: string) {
  if (pathname === '/admin/workspace') return pathname;
  if (pathname === '/admin/workspace-refunds') return pathname;
  if (pathname.startsWith('/admin/workspace-refunds/')) return '/admin/workspace-refunds/[id]';
  if (pathname === '/workspace') return '/workspace';
  if (/^\/workspace\/courses\/[^/]+\/build\/?$/.test(pathname)) return '/workspace/courses/[id]/build';
  if (pathname.startsWith('/admin/workspace/course-builds/')) return '/admin/workspace/course-builds/[id]';
  if (pathname.startsWith('/workspace/courses/') && pathname !== '/workspace/courses/new') return '/workspace/courses/[id]';
  if (pathname.startsWith('/admin/workspace/course-reviews/')) return '/admin/workspace/course-reviews/[id]';
  if (pathname.startsWith('/admin/workspace/course-drafts/')) return '/admin/workspace/course-drafts/[id]';
  if (pathname.startsWith('/workspace/')) {
    const known = ['/workspace/apply', '/workspace/eligibility-result', '/workspace/manual-application', '/workspace/activate', '/workspace/dashboard', '/workspace/profile', '/workspace/courses', '/workspace/courses/new'];
    return known.includes(pathname) ? pathname : '/workspace/[path]';
  }
  if (pathname.startsWith('/workspace/membership/orders/')) return '/workspace/membership/orders/[id]';
  if (pathname.startsWith('/admin/workspace/orders/')) return '/admin/workspace/orders/[id]';
  if (pathname.startsWith('/admin/workspace/coupons/')) return '/admin/workspace/coupons/[id]';
  if (pathname.startsWith('/admin/workspace/eligibility/')) return '/admin/workspace/eligibility/[id]';
  if (pathname.startsWith('/admin/workspace/')) return ['/admin/workspace/course-builds', '/admin/workspace/course-reviews', '/admin/workspace/course-drafts', '/admin/workspace/eligibility', '/admin/workspace/settings', '/admin/workspace/coupons', '/admin/workspace/orders'].includes(pathname) ? pathname : '/admin/workspace/[path]';
  if (pathname.startsWith('/admin/workspace-applications/')) return '/admin/workspace-applications/[id]';
  if (pathname === '/admin/workspace-applications') return pathname;
  return null;
}
export function workspaceLoginUrl(url: URL) {
  const callback = url.searchParams.get('callbackUrl') || url.searchParams.get('returnTo') || url.searchParams.get('redirect') || '';
  return url.pathname === '/login' && (callback === '/workspace' || callback.startsWith('/workspace/'));
}
export function sanitizeWorkspaceAnalytics(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  // Financial/provider events are never behavioral telemetry, even outside Workspace paths.
  if (/^workspace_(?:payment|financial|order|reservation|redemption|refund)(?:_|$)/.test(event.event)) return null;
  let url: URL | null = null;
  try { if (typeof event.properties.$current_url === 'string') url = new URL(event.properties.$current_url); } catch { /* Prefix still enforces privacy. */ }
  const path = url ? workspaceAnalyticsPath(url.pathname) : typeof event.properties.pathname === 'string' ? workspaceAnalyticsPath(event.properties.pathname) : null;
  const login = !!url && workspaceLoginUrl(url);
  if (!path && !login && !event.event.startsWith('workspace_')) return event;
  if (login) return null;
  if (!event.event.startsWith('workspace_') && !['$pageview', '$pageleave'].includes(event.event)) return null;
  const membership = event.event.startsWith('workspace_plan_') || event.event.startsWith('workspace_coupon_');
  const eligibility = membership || event.event.startsWith('workspace_eligibility_') || (path === '/admin/workspace' || !!path?.startsWith('/admin/workspace/') || !!path?.startsWith('/admin/workspace-refunds')) || (!!path?.startsWith('/workspace/') && path !== '/workspace/manual-application');
  const technical = ['$current_url', 'pathname', '$device_id', '$session_id', '$window_id', '$lib', '$lib_version', '$browser', '$browser_version', '$os', '$os_version', '$device_type', '$screen_height', '$screen_width', '$viewport_height', '$viewport_width'];
  const allowed = new Set([...technical, 'feature', 'eventVersion', ...(eligibility ? ['evaluatorVersion', 'policyVersion', ...(membership ? ['planCode', 'outcome', 'discountType', 'hasCoupon'] : [])] : ['aviationBackground', 'courseReadiness', 'audienceStatus', 'audienceSize', 'stepNumber', 'failureCategory', 'entryPoint', 'distinct_id', '$is_identified', '$process_person_profile'])]);
  const properties: CaptureResult['properties'] = {};
  for (const [key, value] of Object.entries(event.properties)) if (allowed.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) properties[key] = value;
  if (url) properties.$current_url = `${url.origin}${path || '/workspace'}`;
  else delete properties.$current_url;
  if (typeof properties.pathname === 'string') properties.pathname = workspaceAnalyticsPath(properties.pathname) || '/workspace';
  if (eligibility) {
    if (!['workspace_eligibility_started', 'workspace_eligibility_passed', 'workspace_eligibility_failed', 'workspace_plan_selected', 'workspace_coupon_applied', '$pageview', '$pageleave'].includes(event.event)) return null;
    const device = properties.$device_id;
    if (typeof device !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(device)) return null;
    properties.distinct_id = `workspace-device:${device}`;
    properties.$is_identified = false; properties.$process_person_profile = false;
    if (properties.evaluatorVersion !== EVALUATOR_VERSION) delete properties.evaluatorVersion;
    if (properties.policyVersion !== ELIGIBILITY_POLICY_VERSION) delete properties.policyVersion;
    properties.feature = 'workspace'; properties.eventVersion = membership ? '3' : '2';
    if (membership) {
      delete properties.evaluatorVersion; delete properties.policyVersion;
      if (event.event === 'workspace_plan_selected') {
        if (!isPlanCode(properties.planCode)) return null;
        delete properties.outcome; delete properties.discountType; delete properties.hasCoupon;
      } else {
        delete properties.planCode;
        if (properties.outcome !== 'success' && !(COUPON_ERRORS as readonly unknown[]).includes(properties.outcome)) return null;
        if (properties.outcome !== 'success' || !['fixed', 'percentage'].includes(String(properties.discountType))) delete properties.discountType;
        properties.hasCoupon = true;
      }
    }
  }
  return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties };
}
