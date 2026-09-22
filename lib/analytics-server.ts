import { PostHog } from "posthog-node";

let serverPostHogClient: PostHog | null = null;

/**
 * Get or initialize the singleton server-side PostHog client
 */
export function getServerPostHogClient(): PostHog | null {
  if (serverPostHogClient) return serverPostHogClient;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!posthogKey || posthogKey === "your-posthog-key" || posthogKey === "your_posthog_project_api_key") {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_KEY variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_KEY is configured"
      );
    }
    return null;
  }

  if (!posthogHost) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured"
      );
    }
    return null;
  }

  try {
    serverPostHogClient = new PostHog(posthogKey, {
      host: posthogHost,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    });
    return serverPostHogClient;
  } catch (err) {
    console.warn("[Server Analytics] Failed to initialize PostHog node client:", err);
    return null;
  }
}

/**
 * Server-side event tracking utility for authoritative events (e.g., payment verification, admin issuance)
 */
export async function serverTrack(
  distinctId: string,
  eventName: string,
  properties?: Record<string, any>
): Promise<void> {
  try {
    const client = getServerPostHogClient();
    if (!client) {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[Server Analytics Dev] ${eventName} for user ${distinctId}:`, properties);
      }
      return;
    }

    client.capture({
      distinctId,
      event: eventName,
      properties: sanitizeServerProperties(properties),
    });

    // Flush immediately for short-lived serverless/route handler execution
    await client.flush();
  } catch (err) {
    // Never let analytics failures crash a server request
    console.warn(`[Server Analytics] Track error for ${eventName}:`, err);
  }
}

/**
 * Helper to strip any sensitive PII before sending
 */
function sanitizeServerProperties(props?: Record<string, any>): Record<string, any> {
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
    if (typeof value === "string" && (value.startsWith("data:") || value.length > 2000)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}
