"use client";

import posthog from "posthog-js";

/**
 * Client-side event tracking utility
 */
export function track(eventName: string, properties?: Record<string, any>): void {
  if (typeof window === "undefined") return;

  try {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey || posthogKey === "your-posthog-key" || posthogKey === "your_posthog_project_api_key") {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Analytics Dev] Track: ${eventName}`, properties);
      }
      return;
    }

    posthog.capture(eventName, sanitizeProperties(properties));
  } catch (err) {
    // Analytics failures must NEVER break LMS flows
    console.warn(`[Analytics] Track failed for ${eventName}:`, err);
  }
}

/**
 * Client-side user identification
 */
export function identifyUser(userId: string, properties?: Record<string, any>): void {
  if (typeof window === "undefined" || !userId) return;

  try {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!posthogKey || posthogKey === "your-posthog-key" || posthogKey === "your_posthog_project_api_key") {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Analytics Dev] Identify: ${userId}`, properties);
      }
      return;
    }

    posthog.identify(userId, sanitizeProperties(properties));
  } catch (err) {
    console.warn("[Analytics] Identify failed:", err);
  }
}

/**
 * Reset user identity on logout
 */
export function resetUser(): void {
  if (typeof window === "undefined") return;

  try {
    posthog.reset();
  } catch (err) {
    console.warn("[Analytics] Reset failed:", err);
  }
}

/**
 * Helper to strip any sensitive PII before sending
 */
function sanitizeProperties(props?: Record<string, any>): Record<string, any> {
  if (!props) return {};

  const forbiddenKeys = new Set([
    "phone",
    "phonenumber",
    "phone_number",
    "otp",
    "password",
    "jwt",
    "token",
    "secret",
    "key",
    "razorpay_signature",
    "razorpay_secret",
    "pdfbase64",
    "pdf_base64",
    "pdfdata",
    "pdf_data",
    "privatekey",
    "private_key",
    "rawcontent",
  ]);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (forbiddenKeys.has(key.toLowerCase())) {
      continue;
    }
    // Prevent huge payloads (e.g. data URIs or large byte arrays)
    if (typeof value === "string" && (value.startsWith("data:") || value.length > 2000)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
