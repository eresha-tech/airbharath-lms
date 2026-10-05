import type { CaptureResult } from 'posthog-js';

export function workspaceAnalyticsPath(pathname: string) {
  if (pathname === '/workspace') return '/workspace';
  if (pathname.startsWith('/admin/workspace-applications/')) return '/admin/workspace-applications/[id]';
  if (pathname === '/admin/workspace-applications') return pathname;
  return null;
}

export function sanitizeWorkspaceAnalytics(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  const rawUrl = event.properties.$current_url;
  let url: URL | null = null;
  try { if (typeof rawUrl === 'string') url = new URL(rawUrl); } catch { /* Missing URL is handled by the explicit event prefix. */ }
  const path = url ? workspaceAnalyticsPath(url.pathname) : null;
  if (!path && !event.event.startsWith('workspace_')) return event;
  // Workspace uses explicit events. Suppress identity/autocapture/exception payloads here.
  if (!event.event.startsWith('workspace_') && !['$pageview', '$pageleave'].includes(event.event)) return null;
  const allowed = new Set(['feature', 'eventVersion', 'aviationBackground', 'courseReadiness', 'audienceStatus', 'audienceSize', 'stepNumber', 'failureCategory', 'entryPoint', 'pathname',
    '$current_url', 'distinct_id', '$device_id', '$session_id', '$window_id', '$lib', '$lib_version', '$browser', '$browser_version', '$os', '$os_version', '$device_type', '$screen_height', '$screen_width', '$viewport_height', '$viewport_width', '$is_identified', '$process_person_profile']);
  const properties: CaptureResult['properties'] = {};
  for (const [key, value] of Object.entries(event.properties)) if (allowed.has(key)) properties[key] = value;
  if (url) properties.$current_url = `${url.origin}${path || '/workspace'}`;
  if (typeof properties.pathname === 'string') properties.pathname = workspaceAnalyticsPath(properties.pathname) || '/workspace';
  return { uuid: event.uuid, event: event.event, timestamp: event.timestamp, properties };
}
