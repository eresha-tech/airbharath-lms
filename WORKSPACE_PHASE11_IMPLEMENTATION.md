# Workspace Phase 1.1 — Approval Communication and Coupon Audit

## Scope

Adds deliberate admin approval-email preview/send/resend, communication state and privacy-limited Workspace analytics. Includes a read-only LMS coupon audit. Does not create creator accounts, activate Workspace memberships, collect payments, implement subscriptions, coupons/redemptions for Workspace, payouts, commissions or creator dashboards. Future pricing remains contextual only and does not appear in the email.

## Admin Experience

On `/admin/workspace-applications/[id]`, **Approval & Communication** appears below the review form. It shows Not Sent / Sending / Sent / Failed, attempt time, last provider-accepted time and the sending admin's name (or stored user ID/deleted-admin fallback). Only a saved Approved application can preview/send. Unsaved review edits block communication until saved or discarded. Saving Approved never sends an email.

The controlled template includes the subject, stored applicant name, reference, AirBharath branding, full approval copy and standard footer. The exact same rendering function supplies the sandboxed HTML iframe preview and the provider payload. A personal note is optional, limited to 1,000 characters, rejects control characters and is escaped as plain text. Editing it invalidates the preview. Recipient, subject, application reference and full HTML cannot be supplied by the client.

Send becomes available after a preview. A changed application/template/note makes the preview hash stale and sending returns a conflict. Sending again after a successful attempt requires an explicit Resend action plus confirmation; a recorded failure requires an explicit Retry action plus the same warning that a copy may already have been accepted.

## Authorization and Concurrency

Both new POST handlers perform existing persisted-role admin authorization, same-origin checking, UUID validation and bounded JSON parsing. Public/anonymous applicants and non-admin/demoted users cannot preview or send. The recipient and applicant details come from the stored application.

Sending atomically claims the row only when its status remains Approved and its communication status/review timestamp match the previewed state. The claim records a unique attempt ID and Sending state before contacting Mailercloud. A second tab or admin loses the conditional update and never calls the provider. Review writes are blocked while communication is Sending, preventing a concurrent decline during the send. Completion is conditional on that same attempt ID and Sending state.

Approval and communication remain separate. No send changes application status to `invited_to_activate`, creates a user/account or grants access. Existing Sent timestamp/admin remain available if a later resend fails; they describe the last accepted send, while Failed describes the latest attempt.

## Persistence and Migration

Generated `drizzle/0008_eager_energizer.sql`, `drizzle/meta/0008_snapshot.json`, and the appended journal entry. The migration adds `workspace_approval_email_status` (not_sent/sending/sent/failed) and eight Workspace-only columns:

- `approval_email_status` (default not_sent)
- `approval_email_sent_at`
- `approval_email_sent_by` (users FK, delete → null)
- `approval_email_attempted_at`
- `approval_email_attempted_by` (users FK, delete → null)
- `approval_email_attempt_id`
- `approval_email_error_category`
- `approval_email_personal_note` (default empty text)

Snapshot comparison confirmed only `public.workspace_applications` changed; prior LMS/coupon tables are unchanged. This migration follows `0007_lucky_wild_pack.sql`, so a target missing Phase 1 must apply the reviewed pending migration chain in order. Local Phase 1 was successfully applied earlier in this conversation; that does not establish the state of another environment.

**0008 has not been executed against any database in this phase.** It must be applied through the guarded `pnpm db:migrate` workflow to the explicitly authorized, verified target before using Phase 1.1. Existing database safety guards still require `DATABASE_ENV`, `DATABASE_URL` and `ALLOW_DATABASE_MIGRATION=true`. No schema push or seed was run. Do not change the ledger of another environment based on the earlier local baseline repair.

## Provider and Failure Behavior

Approval delivery reuses Mailercloud through an opt-in private-delivery mode: an eight-second AbortSignal timeout, no recipient/body/provider-response logging, and only not_configured/provider_rejected/timeout/delivery_unknown error categories. Existing non-Workspace email behavior is not otherwise redesigned. Sent means HTTP provider acceptance, not guaranteed inbox delivery; no delivery/open webhook is added.

Provider rejection or timeout records Failed and leaves creator approval unchanged. Network ambiguity is explicitly warned about before retry. If the process stops or provider acceptance cannot be persisted, the row deliberately remains Sending. It has no automatic lease expiry or retry, because those can send duplicates after an unknown outcome. Exact-once delivery is not claimed. An operator must inspect provider activity before authorizing any narrowly scoped recovery of the recorded attempt. No reset/force-send endpoint or production recovery query is included.

The UI uses a 15-second bounded request and requires reload after uncertain send outcomes, rather than silently sending another copy. Known provider failure state is returned safely. Client-facing errors contain no raw provider/database details.

## Workspace Analytics

See [WORKSPACE_ANALYTICS.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_ANALYTICS.md) for event definitions, privacy behavior, configuration and dashboard setup. Existing funnel events are retained and extended with step views, validation/submission errors and attempts, CTA placement, authoritative save/review events and persisted approval-email results. No live PostHog project or dashboard was modified.

## Changed Files in Phase 1.1

| File | Purpose |
| --- | --- |
| [lib/db/schema.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/db/schema.ts) | Communication enum/columns and admin FKs |
| [lib/workspace/options.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/options.ts) | Communication statuses/labels |
| [lib/workspace/types.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/types.ts) | Sender display name in admin detail |
| [lib/workspace/approval-email.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/approval-email.ts) | Input validation, controlled renderer, preview hash, provider adapter |
| [lib/mailercloud.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/mailercloud.ts) | Opt-in bounded/private approval delivery |
| [app/api/admin/workspace-applications/\[id\]/approval-email/preview/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace-applications/[id]/approval-email/preview/route.ts) | Authorized real-email preview |
| [app/api/admin/workspace-applications/\[id\]/approval-email/send/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace-applications/[id]/approval-email/send/route.ts) | Atomic controlled send/resend/retry |
| [app/api/admin/workspace-applications/\[id\]/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace-applications/[id]/route.ts) | Sender display data, Sending review guard, review analytics |
| [app/api/workspace/applications/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/workspace/applications/route.ts) | New-application server event after persistence |
| [components/workspace/ApprovalCommunication.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/ApprovalCommunication.tsx) | Communication section, note, iframe preview, resend confirmation |
| [components/workspace/WorkspaceApplicationDetail.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspaceApplicationDetail.tsx) | Communication UI integration and busy/dirty review guards |
| [lib/workspace/analytics.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/analytics.ts) | Client event/property allowlist |
| [lib/workspace/analytics-server.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/analytics-server.ts) | Pseudonymous server lifecycle events |
| [lib/workspace/analytics-privacy.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/analytics-privacy.ts) | SDK-wide Workspace payload filtering |
| [instrumentation-client.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/instrumentation-client.ts) | Install Workspace before-send filter |
| [components/providers/PostHogProvider.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/providers/PostHogProvider.tsx) | Skip Workspace identity capture and avoid repeated identity tracking |
| [components/workspace/ApplicationForm.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/ApplicationForm.tsx) | Step/error/attempt events and bounded submit request |
| [components/workspace/WorkspaceLanding.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspaceLanding.tsx) | Controlled CTA-placement analytics |
| [drizzle/0008_eager_energizer.sql](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/0008_eager_energizer.sql) | Versioned additive migration |
| [drizzle/meta/0008_snapshot.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/0008_snapshot.json) | Generated schema snapshot |
| [drizzle/meta/_journal.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/_journal.json) | Append migration 0008 |
| [tests/routes/workspace-approval.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-approval.test.ts) | Auth, template, send state, race, retry/resend and failure coverage |
| [tests/routes/workspace-mailer.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-mailer.test.ts) | Private provider mode and real timeout signal coverage |
| [tests/routes/workspace-analytics.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-analytics.test.ts) | Analytics privacy and safe outcome coverage |
| [tests/routes/workspace-public.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-public.test.ts) | New-row analytics and no duplicate save event |
| [tests/routes/workspace-admin.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-admin.test.ts) | Review guard and post-response callback integration |
| [tests/routes/workspace-validation.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-validation.test.ts) | Updated versioned client event expectations |
| [tests/admin-route-authorization-policy.test.mjs](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/admin-route-authorization-policy.test.mjs) | Account for both new persisted-admin routes |
| [WORKSPACE_COUPON_AUDIT.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_COUPON_AUDIT.md) | Current-code evidence and future-only recommendations |
| [WORKSPACE_ANALYTICS.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_ANALYTICS.md) | Configuration, event contract and dashboard definition |
| [WORKSPACE_PHASE11_IMPLEMENTATION.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_PHASE11_IMPLEMENTATION.md) | Implementation scope, migration, operation and validation report |

Existing Phase 1 and PostHog changes were present at task start and preserved. No unrelated coupon implementation was modified.

## Validation and Remaining Launch Work

Completed checks:

- `pnpm validate`: five pure-test files, 14 Vitest files / 175 tests, TypeScript and lint passed.
- `git diff --check`: passed.
- Generated migration snapshot comparison: only `public.workspace_applications` changed.
- Browser inspection of the actual rendered approval template using synthetic data: complete copy, branding, reference, personal-note separation and footer verified. This was an HTML preview, not a live provider send or an authenticated admin end-to-end test.

`pnpm build --debug` completed successfully with private-service configuration disabled. It emitted the existing nonfatal `/dashboard` dynamic-cookie diagnostic and the existing Next.js lint deprecation notice. The final small dialog failure-message adjustment was subsequently covered by a fresh successful `pnpm validate` run. Tests use mocked databases/providers and blocked network access, including an actual eight-second timeout signal; they do not establish real provider delivery or live analytics capture. Migration generation and schema-snapshot comparison are local file operations, not database execution.

Before release, explicitly authorize and apply the pending migration on a verified staging target, then test persisted-admin authorization, real preview/send with a controlled recipient, provider rejection/timeout, concurrent send attempts, stale preview, unchanged Approved status, safe retry/resend and recorded admin attribution. Verify the live PostHog event payloads with a test project. Production deployment/migration/provider sends remain outside this implementation run.
