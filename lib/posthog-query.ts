/**
 * Server-Side PostHog Behavioral Analytics Query Module
 * 
 * Privileged query helper that securely communicates with PostHog's Query / HogQL API.
 * Never exposes private personal access tokens or project secrets to the browser.
 * Gracefully degrades with clear unavailable states if PostHog query credentials
 * are not configured or if the external service is unreachable.
 * 
 * ponytail: Server-side HogQL aggregation with safe timeouts and structured fallback.
 */

export interface PostHogBehavioralMetrics {
  isConfigured: boolean;
  isAvailable: boolean;
  reason?: string;
  courseViews: number | null;
  courseSearches: number | null;
  courseFilterUses: number | null;
  checkoutStarts: number | null;
  lessonStarts: number | null;
  lessonMilestones: number | null;
  lessonCompletions: number | null;
  courseCompletions: number | null;
  certificateClaims: number | null;
  feedItemOpens: number | null;
  jobOpens: number | null;
  courseViewsMap: Record<string, number>; // Maps course ID or slug -> count
}

export const EMPTY_BEHAVIORAL_METRICS: PostHogBehavioralMetrics = {
  isConfigured: false,
  isAvailable: false,
  reason: "PostHog query API credentials not configured in environment.",
  courseViews: null,
  courseSearches: null,
  courseFilterUses: null,
  checkoutStarts: null,
  lessonStarts: null,
  lessonMilestones: null,
  lessonCompletions: null,
  courseCompletions: null,
  certificateClaims: null,
  feedItemOpens: null,
  jobOpens: null,
  courseViewsMap: {},
};

/**
 * Queries PostHog behavioral metrics for a specified time window.
 * Strictly executes server-side.
 */
export async function queryPostHogBehavioralMetrics(
  dateRange: "7d" | "30d" | "90d" | "1y" | "all" = "30d"
): Promise<PostHogBehavioralMetrics> {
  const personalApiKey =
    process.env.POSTHOG_PERSONAL_API_KEY || process.env.POSTHOG_API_KEY;
  const projectId =
    process.env.POSTHOG_PROJECT_ID || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  const host = (
    process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com"
  ).replace(/\/$/, "");

  // If query credentials are not present, return safe empty state
  if (!personalApiKey || !projectId || personalApiKey.startsWith("your-") || personalApiKey === "your_posthog_personal_api_key") {
    return {
      ...EMPTY_BEHAVIORAL_METRICS,
      isConfigured: false,
      reason: "Product analytics query API not configured",
    };
  }

  // Calculate timestamp boundary
  let days = 30;
  if (dateRange === "7d") days = 7;
  else if (dateRange === "30d") days = 30;
  else if (dateRange === "90d") days = 90;
  else if (dateRange === "1y") days = 365;
  else if (dateRange === "all") days = 3650;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const isoSince = sinceDate.toISOString();

  const hogql = `
    SELECT 
      event, 
      count() as event_count,
      properties.course_id as course_id,
      properties.course_slug as course_slug,
      properties.slug as slug
    FROM events 
    WHERE timestamp >= toDateTime('${isoSince}')
    GROUP BY event, properties.course_id, properties.course_slug, properties.slug
  `;

  let apiHost = host;
  if (apiHost.includes("us.i.posthog.com")) {
    apiHost = "https://us.posthog.com";
  } else if (apiHost.includes("eu.i.posthog.com")) {
    apiHost = "https://eu.posthog.com";
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second safety timeout

    const response = await fetch(`${apiHost}/api/projects/${projectId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${personalApiKey}`,
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: hogql,
        },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const status = response.status;
      return {
        ...EMPTY_BEHAVIORAL_METRICS,
        isConfigured: true,
        isAvailable: false,
        reason: `PostHog query API responded with HTTP ${status}`,
      };
    }

    const data = await response.json();
    const results: any[] = data?.results || [];

    let courseViews = 0;
    let courseSearches = 0;
    let courseFilterUses = 0;
    let checkoutStarts = 0;
    let lessonStarts = 0;
    let lessonMilestones = 0;
    let lessonCompletions = 0;
    let courseCompletions = 0;
    let certificateClaims = 0;
    let feedItemOpens = 0;
    let jobOpens = 0;
    const courseViewsMap: Record<string, number> = {};

    for (const row of results) {
      // Row format: [event, count, course_id, course_slug, slug]
      const eventName = row[0];
      const count = Number(row[1]) || 0;
      const courseId = row[2];
      const courseSlug = row[3] || row[4];

      switch (eventName) {
        case "course_viewed":
          courseViews += count;
          if (courseId) {
            courseViewsMap[courseId] = (courseViewsMap[courseId] || 0) + count;
          }
          if (courseSlug) {
            courseViewsMap[courseSlug] = (courseViewsMap[courseSlug] || 0) + count;
          }
          break;
        case "course_search":
          courseSearches += count;
          break;
        case "course_filter_used":
          courseFilterUses += count;
          break;
        case "checkout_started":
          checkoutStarts += count;
          break;
        case "lesson_started":
          lessonStarts += count;
          break;
        case "lesson_progress":
          lessonMilestones += count;
          break;
        case "lesson_completed":
          lessonCompletions += count;
          break;
        case "course_completed":
          courseCompletions += count;
          break;
        case "certificate_claimed":
        case "certificate_claim_started":
          certificateClaims += count;
          break;
        case "feed_item_opened":
          feedItemOpens += count;
          break;
        case "job_opened":
          jobOpens += count;
          break;
      }
    }

    return {
      isConfigured: true,
      isAvailable: true,
      courseViews,
      courseSearches,
      courseFilterUses,
      checkoutStarts,
      lessonStarts,
      lessonMilestones,
      lessonCompletions,
      courseCompletions,
      certificateClaims,
      feedItemOpens,
      jobOpens,
      courseViewsMap,
    };
  } catch (err: any) {
    return {
      ...EMPTY_BEHAVIORAL_METRICS,
      isConfigured: true,
      isAvailable: false,
      reason: err?.name === "AbortError" ? "PostHog query timed out" : (err?.message || "PostHog query failed"),
    };
  }
}
