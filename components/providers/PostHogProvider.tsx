"use client";

import { useEffect, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { getClientUser } from "@/lib/user-session-client";
import { identifyUser } from "@/lib/analytics";
import { getPostHogConfig } from "@/lib/posthog-config";
import { workspaceAnalyticsPath, workspaceLoginUrl } from "@/lib/workspace/analytics-privacy";

function PostHogIdentityTracker() {
  const pathname = usePathname();
  const identified = useRef(false);
  useEffect(() => {
    if (identified.current || !getPostHogConfig() || (pathname && workspaceAnalyticsPath(pathname)) || (typeof window !== "undefined" && workspaceLoginUrl(new URL(window.location.href)))) return;
    let isMounted = true;

    getClientUser()
      .then((user) => {
        if (isMounted && user?.id) {
          identified.current = true;
          identifyUser(user.id, {
            email: user.email,
            name: user.fullName,
            role: user.role || "student",
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  return null;
}

function PostHogPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;

    const queryString = searchParams?.toString();
    const fullUrl = queryString ? `${pathname}?${queryString}` : pathname;

    // Avoid duplicate pageviews on identical route states
    if (lastTrackedUrl.current === fullUrl) return;
    lastTrackedUrl.current = fullUrl;

    if (getPostHogConfig()) {
      try {
        posthog.capture("$pageview", {
          $current_url: typeof window !== "undefined" ? window.location.href : fullUrl,
          pathname,
        });
      } catch {
        // Safe no-op on adblocker/network block
      }
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogIdentityTracker />
      <Suspense fallback={null}>
        <PostHogPageViewTracker />
      </Suspense>
      {children}
    </>
  );
}
