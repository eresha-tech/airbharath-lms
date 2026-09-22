"use client";

import { useEffect, Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { identifyUser } from "@/lib/analytics";

interface AuthenticatedUser {
  id: string;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
}

function PostHogIdentityTracker() {
  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const user = data?.user as AuthenticatedUser | null;
        if (isMounted && user?.id) {
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
  }, []);

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

    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey && posthogKey !== "your-posthog-key" && posthogKey !== "your_posthog_project_api_key") {
      try {
        posthog.capture("$pageview", {
          $current_url: typeof window !== "undefined" ? window.location.href : fullUrl,
          pathname,
        });
      } catch {
        // Safe no-op on adblocker/network block
      }
    } else if (process.env.NODE_ENV === "development") {
      console.debug(`[Analytics Dev] Pageview: ${fullUrl}`);
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
