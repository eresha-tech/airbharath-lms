# Workspace Analytics — Phase 1.1

## Configuration

Workspace uses the existing PostHog SDK/project configuration. A valid `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com` or `https://eu.i.posthog.com`) enable production capture. Browser requests use `/api/telemetry`; server capture uses the configured regional cloud host. No dependency, provider account, credential or live dashboard was created or changed in this phase.

Local development is deliberately disabled unless `NEXT_PUBLIC_POSTHOG_ENABLE_DEV=true`. Restart the development server after changing it; rebuild/redeploy for public environment changes in production. Keep test and production projects separate when verifying live capture. Do not paste project keys into source, logs or screenshots.

## Event Contract

Every explicit Workspace event has `feature=workspace` and `eventVersion=1`. Client properties are an explicit allowlist: controlled aviation-background, readiness and audience enums, step number 1–4, a controlled CTA placement and a controlled failure category. No applicant name, email, mobile, application reference, submission key, course text, personal note or internal review note is sent.

| Event | Trigger | Counting meaning |
| --- | --- | --- |
| `workspace_page_view` | Workspace landing mount | Once per mounted page, not a durable unique visitor count |
| `workspace_apply_clicked` | CTA click | Click count; `entryPoint=hero` or `founding_cohort` |
| `workspace_application_started` | First answer change | Once per mounted form |
| `workspace_step_viewed` | First view of each step | Step number; repeated back navigation is deduplicated within the form mount |
| `workspace_step_1_completed` through `workspace_step_4_completed` | Validated forward progress/final step | Once per step per mounted form |
| `workspace_validation_failed` | Client/server field validation rejection | Attempts, not affected people; step number only |
| `workspace_submission_attempted` | Final validated submit | Includes explicit retries; not applications created |
| `workspace_submission_failed` | Request rejected, timed out or unconfirmed | Controlled category: validation, conflict, rate_limited, unavailable, network or unknown |
| `workspace_application_submitted` | Browser receives a valid receipt | Client acknowledgment; can occur for recovery of an already-saved submission |
| `workspace_application_saved` | Server successfully creates a new application | Scheduled after response; not emitted for idempotent retries |
| `workspace_review_saved` | Authorized admin successfully persists a review | Controlled application status; a review event may only change notes |
| `workspace_approval_email_result` | Provider outcome is persisted for a claimed attempt | Controlled action send/resend/retry and outcome sent/failed; safe error category only |

Server lifecycle events use a SHA-256 pseudonym of the opaque application UUID, not applicant details, applicant URLs or an admin identity. They deliberately do not join the browser identity to the application. These events are best effort, not financial/audit records. Database records remain authoritative for saved applications and communication state. Failed persistence or an interrupted post-response callback can mean there is no analytics event.

## Privacy Controls

The form and admin detail/preview retain `ph-no-capture` and sensitive-element markers. The SDK's `before_send` filter additionally applies to explicit `workspace_*` events and the Workspace/public-admin paths. It removes query strings, fragments, referrers, campaign parameters, free text, initial URL/person properties and top-level/nested person updates. Admin application URLs become `/admin/workspace-applications/[id]` so application IDs do not enter analytics URLs. Only approved technical and event properties are retained. Workspace autocapture, identification, exception and other automatic event payloads are suppressed; pageview/pageleave and controlled Workspace events remain.

The global identity tracker skips Workspace routes. Existing unrelated LMS capture behavior remains in place. Existing PostHog opt-out behavior is not bypassed or explicitly opted back in. A first-party endpoint is transport, not permission to collect additional data. Do not add arbitrary UTM values or contact information to the allowlist to make campaign reporting convenient.

## Initial PostHog Dashboard Definition

Create a **Workspace Phase 1** dashboard in the already-configured project when authorized access to that project is available:

1. **Application funnel:** `workspace_page_view` → `workspace_apply_clicked` → `workspace_application_started` → step 1 completed → step 2 completed → step 3 completed → step 4 completed → `workspace_application_submitted`. Use the same browser distinct ID and an explicit conversion window, initially 24 hours. Direct-to-form visitors can skip Apply clicks, so add a second funnel starting at Application Started.
2. **Step drop-off:** unique browser identities per `workspace_step_viewed` and completed step, broken down by step number. Do not mistake retry/error events for distinct applicants.
3. **Submission reliability:** attempts, client failures grouped by `failureCategory`, client receipt confirmations and server-created applications. Display the server-created count separately; do not put it in the same-person browser funnel because the identities intentionally differ.
4. **Application creation trend:** `workspace_application_saved` count by day. Compare against database `submittedAt` counts; telemetry can be absent due to consent, blockers or service failure.
5. **Admin review activity:** `workspace_review_saved` count grouped by application status. This is activity, not current application inventory or unique approved creators. Current status inventory comes from the database, and repeated saves must not inflate an approval-conversion claim.
6. **Approval communication:** `workspace_approval_email_result` grouped by action/outcome/error category. Distinguish initial sends from retries/resends. Sent means provider accepted, not delivered/opened. Show database Sending/Failed states in operations reviews when reconciling analytics gaps.

All insights should filter to `feature=workspace`; keep admin activity out of the public application funnel. Definitions are documented here; no live PostHog dashboard configuration was written during implementation.

## Verification

Automated tests cover allowed client categories, server outcome properties, pseudonymous IDs, automatic-event suppression, query/application-ID masking, and removal of both nested and top-level identity properties. The existing proxy tests cover regional routing, credential stripping, body limits and provider failure handling.

For a separately authorized live smoke test, use a test PostHog project and controlled email provider/recipient. Verify Workspace page → CTA → each step → submit; inspect outgoing browser payloads including pageleave for PII. Repeat with an ad blocker and local analytics disabled. Confirm an idempotent retry creates no second server-save event. Review an application and send a controlled approval email, then confirm safe server events without name/email/reference/note. No live analytics project queries or emails were executed in this phase.
