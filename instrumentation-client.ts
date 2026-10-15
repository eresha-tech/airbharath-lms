import posthog from "posthog-js";
import { getPostHogConfig, POSTHOG_PROXY_PATH } from "@/lib/posthog-config";
import { sanitizeWorkspaceAnalytics } from "@/lib/workspace/analytics-privacy";

const config = getPostHogConfig();

if (config) {
  posthog.init(config.key, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: config.uiHost,
    defaults: "2026-01-30",
    capture_pageview: false, // Handled with route change detection in PostHogProvider
    capture_pageleave: true,
    autocapture: true,
    capture_dead_clicks: false, // Prevents dead-clicks script load
    disable_session_recording: true, // Prevents session recorder script load
    disable_external_dependency_loading: true, // Prevents loading external CDN scripts (recorder, dead clicks, surveys, toolbar)
    disable_surveys: true,
    person_profiles: "identified_only",
    capture_exceptions: true,
    persistence: "localStorage",
    cross_subdomain_cookie: false,
    tracing_headers: typeof window !== "undefined" ? [window.location.hostname] : [],
    debug: false,
    before_send: sanitizeWorkspaceAnalytics,
  });
}
