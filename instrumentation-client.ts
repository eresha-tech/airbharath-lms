import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogKey || posthogKey === "your-posthog-key") {
  if (process.env.NODE_ENV === "development") {
    console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY is not configured. Analytics is in development mode.");
  }
} else if (!posthogHost) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_HOST is not configured.");
  }
} else {
  posthog.init(posthogKey, {
    api_host: posthogHost,
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
  });
}

