# Workspace Launch Blocker D — durable refund notification delivery

## A. Existing communication audit

Starting branch `codex/workspace-1.8-launch`, HEAD `b9dc6c2`, clean worktree; C.1 correction `a7b9e6f`. Implementation-only work on 13 October 2026. No real database access, migration application, Mailercloud/Razorpay/private-provider request, real email, production configuration, scheduling, deployment or merge occurred. Phase 1.9 remains frozen. Public charging remains disabled.

Existing `lib/mailercloud.ts` serves LMS receipts and Workspace application/approval emails. Its private mode bounds requests but discards response receipts and treats HTTP success as success. Application receipt delivery remains best-effort; its nonprivate legacy transport may log recipient/provider details. The new notice worker does not call that logging path. Reused its endpoint and exact payload builder while preserving existing callers; the new server-only notice adapter owns stricter result handling, authorization and durable recovery. Existing escaped approval-email presentation, refund milestone copy, CRON_SECRET authentication and worker-only bounded PostgreSQL pool were reused. No second generic email infrastructure, new provider or dependency.

## B. Recipient source and verification analysis

Membership order → persisted owner users.id → users.email is the only applicable account contact source. Phone/OTP authentication does not verify email. users.email is optional, not unique, mutable through profile update, and has no verification timestamp/evidence. Creator Profile provides no independently verified email. Application email belongs to a separate manual application flow; matching by phone or name would not prove ownership and is not used.

Production repository therefore returns the owning account contact as unverified. Missing, malformed, wrong-owner and unverified addresses retain a blocked obligation (`recipient_unavailable`, `recipient_invalid` or `recipient_unverified`) without provider HTTP. No arbitrary client/admin/refund-note address is accepted. The verified-recipient seam is exercised with test fakes only; production has no fabricated verified-contact fallback. Current real account contacts consequently cannot be sent these notices until a separate verified-contact producer is implemented.

**Reliable creator recipient email is NOT confirmed; a verified creator-contact/onboarding decision is required for launch.** Existing in-app refund status remains authoritative and refunds are independent of email availability. This task does not add that onboarding journey or verification provider.

## C. Immutable notice facts

Original `workspace_refund_notices` remains unchanged: unique order/milestone obligation, protected update/delete/truncate history and insert guards for request, attributed rejection, provider initiation and authoritative full completion. New delivery rows materialize lazily against these facts. No historical outbox update/backfill/delete occurs. Renderer rechecks corresponding stored facts; completion cannot come from an admin click or HTTP success alone.

## D. Delivery data model

Two additive tables:

- `workspace_refund_notice_deliveries`: one stable UUID per notice; current state/attempt, bounded count, lease/backoff, reason, pinned hashes/template and provider acceptance time.
- `workspace_refund_notice_delivery_attempts`: unique delivery/attempt number; channel, claim/dispatch/final timestamps, normalized outcome/code and optional bounded provider reference. Final attempt results cannot be rewritten; update/delete/truncate and transition guards fence history.

Lifecycle: pending → claimed → submitted → accepted / retryable_failure / uncertain / blocked. A pre-dispatch validation failure may go directly claimed → blocked/retryable_failure. Accepted means API acceptance, never delivered-to-inbox. Uncertain and blocked are protected review states; they do not automatically become send permission. Current claim ownership and attempt state must match the delivery projection; payload/recipient/provider-scope hashes cannot change after first dispatch. No raw address, email HTML, API secret, webhook payload or financial free-text note is copied into delivery tables.

## E. Attempts and claim/lease behavior

Claim locks delivery state transactionally and creates one bounded attempt. Two workers cannot use the same active claim. Lease is 60 seconds; dispatch requires the current unexpired claim and commits before HTTP. Database locks are released before transport. Final receipt writes are claim-fenced; stale results cannot overwrite current/terminal outcomes.

Expired claimed work is known not dispatched and gets bounded backoff; the stale worker cannot dispatch it. Expired submitted work becomes uncertain and is never automatically resent. API acceptance followed by DB receipt failure leaves submitted evidence, subsequently held uncertain. Acceptance already committed before caller response loss remains accepted/idempotent on job replay. A late result after a claim has been reaped is refused and requires protected operator investigation; no late receipt overrides uncertainty automatically.

## F. Provider adapter

Uses existing Mailercloud HTTP Email API, dedicated server-only wrapper and explicit configured sender. No sender-email fallback for notices. Configuration requires classified local development/test or actual Vercel Production, API credential, syntactically valid sender, owner sender-verification attestation, non-secret provider-account scope label, validated public origin and delivery enablement. Preview/local-production-build configurations refuse. Static validation does not authenticate provider credentials or prove sender verification.

The adapter uses shared legacy wire-format primitives, one recipient, explicit text/HTML, metadata.messageId equal to stable delivery UUID, and store_content=false. Redirects refused; response bounded to 16 KiB; individual timeout 8 seconds. Checks internal status SUCCESS/1000 as well as HTTP success; HTTP 200 errors are not acceptance. Stores normalized code/reason/reference only, never raw error body. [Send Email contract](https://apidoc.mailercloud.com/api-reference/email/send-email), [Email API internal outcomes](https://apidoc.mailercloud.com/errors).

## G. Idempotency limitations

Official documentation explicitly provides HTTP Email API metadata.messageId deduplication for 24 hours; a normal email Message-ID header or SMTP relay is not equivalent. Stable internal UUID and pinned payload are used. Documentation is not a claim of permanent exactly-once delivery. [Provider idempotency scope/window](https://apidoc.mailercloud.com/conventions).

No verified read-back contract or provider webhook integration was established for automatic ambiguity resolution in this phase. Actual account behavior, receipt semantics and deduplication need separately authorized provider verification. The implementation conservatively holds uncertain outcomes even within the documented window rather than relying on unverified replay conditions. It never resends an ambiguous send after the window expires.

## H. Uncertain-send handling

Before HTTP, canceled authorization/deadline is known not dispatched. Explicit ERROR/9001 throttling with HTTP 429 is safe retryable; known validation/auth/quota/suppression/hard-recipient failures block. Generic transport exception, timeout after possible dispatch, 5xx, oversized/malformed body, unknown code and soft/outstanding delivery outcomes become uncertain. This is deliberately more conservative than generic retry advice. [Quota/throttling policy](https://apidoc.mailercloud.com/rate-limits).

Safe retry scheduling is persisted: exponential backoff starting at 60 seconds, capped at one hour, maximum five claims. Exhaustion blocks. Retries reuse the same delivery identity and compare recipient/body/sender/configuration hashes; changes block with payload_changed. No in-process sleep loop, resend-all command or force-accepted shortcut.

Operator next action for uncertainty: pause/inspect through protected diagnostics, correlate the stable UUID/time/channel with private Mailercloud activity/support evidence, and obtain an explicitly reviewed recovery procedure. No arbitrary SQL terminal-state edit or blind resend is supported. Future controlled resolution must append verified evidence and preserve previous uncertain history.

## I. Templates

All four milestones use AirBharath Workspace, Eresha Technology Innovators Pvt. Ltd. and academy@airbharath.in. Reuses prepared messages with conservative delayed-notice language; current decision/access is linked instead of promising a stale status. Receipt warns approval is not guaranteed; rejection includes escaped, bounded attributed reason; initiation does not claim completion/bank credit; completion requires authoritative full evidence and explains entitlement ending, retained work/access rules and possible bank processing delay.

No free-text refund note, provider IDs, acceptance IDs, OTP, session, professional profile or course content. No amount/reference is necessary in these messages, avoiding client economics. Links use validated configured NEXT_PUBLIC_BASE_URL; Host/request headers do not construct email URLs. Renderer rejects unsafe origins even when called directly. Plain text and HTML are provided. Provider body storage is disabled; actual provider tracking/domain/privacy settings remain a later verification item.

## J. Worker and authentication

Separate Node `GET /api/internal/workspace/refund-notices`; financial worker unchanged. Strong CRON_SECRET Bearer auth is reused; anonymous/creator/admin cookies, fabricated Cron user agent and query secrets refuse. Sending independently gated. `?view=status` is authenticated read-only diagnostics, usable while sending is paused.

At most three candidates per run, shared 30-second provider deadline, 8-second request timeout, maxDuration 60. Reuses C.1 dedicated pool with separate application label: one connection, 5-second connection/statement/idle-transaction limits, 2-second lock timeout and bounded finally cleanup. Shared LMS pool unchanged. Per-statement/cooperative deadlines do not promise a run ends at exactly 30 seconds; platform enforcement, load and actual PostgreSQL claims require later verification. No actual scheduler configured.

## K. Environment capability and readiness

New names in `.env.example` only:

- WORKSPACE_NOTICE_DELIVERY_ENABLED=false
- WORKSPACE_NOTICE_SENDER_VERIFIED=false
- WORKSPACE_NOTICE_PROVIDER_SCOPE empty

Reuses MAILERCLOUD_API_KEY, MAILERCLOUD_SENDER_EMAIL, MAILERCLOUD_SENDER_NAME, NEXT_PUBLIC_BASE_URL, DATABASE_ENV and CRON_SECRET. Real `.env` untouched. Sending independent from new checkout, refund initiation and Razorpay configuration.

Readiness CLI distinguishes implementation present, configuration coherent and delivery authorized. Worker scheduled, actual acceptance verified and verified recipient availability remain false; **noticesReady=false** and operational_verification_pending remain explicit. Owner sender attestation is not empirical provider validation. No flag falsely changes operational email readiness to true. Default CLI and synthetic matrix passed without provider/DB access.

## L. Operational diagnostics

Protected counts for pending, claimed, submitted, retryable, uncertain, blocked and accepted; blocked reason counts identify missing/unverified recipient and other failure categories. Latest API acceptance and oldest outstanding timestamp are reported. No recipient list, address, body, provider reference, PII or credential is returned. A visited/send attempt is not an inbox-delivery claim. Errors return fixed safe 503; successful responses are no-store.

## M. Migration

Generated `0022_lethal_barracuda.sql`, snapshot and journal entry. Adds only two delivery tables, indexes, checks/FKs and state/history/claim/receipt/truncate guards. No original notice table alteration or data rewrite. **Unapplied everywhere.** No database query/migration/reset/schema push/ledger manipulation in D. Source SQL/journal entries 0000–0021 verified byte-for-byte identical to b9dc6c2. Second guarded-environment schema generation reported no changes, nothing to migrate; no 0023 generated. Real PostgreSQL verification belongs to the next separately authorized phase.

## N. Tests and build

53 notice-specific tests with provider/repository fakes cover four business-fact gates, owner/recipient verification, escaped templates/origins, provider internal-status handling, before/after-dispatch timeout, malformed/oversized responses, committed acceptance replay, concurrent claim, expired/stale claim, pinned-recipient change, retry/backoff/exhaustion, excessive backlog cap, worker cleanup, auth/diagnostics/privacy and charging-disabled sending authorization.

Final full pnpm validate passed: 74 route files / 941 tests, all five pure test files, TypeScript and lint. Existing refund/agreements/payments/membership/creator/coupon/legacy mailer regressions preserved. Payments-disabled production build passed without real provider secrets/DB, using an isolated copy and cached fonts. A final build retry was required after local quota exhaustion; only task-owned completed/failed build copies were removed. Migration no-drift generation and git diff --check passed.

These are deterministic fake tests, not genuine PostgreSQL concurrency or empirical provider delivery proof. Final SQL guards/leases/constraints and protected diagnostics must be verified against an authorized real PostgreSQL target after reviewed 0022 application. No physical Mailercloud timeout/send was exercised.

Implementation commit: `4de8596` (`feat(workspace): add durable guarded refund notice delivery`). Report committed separately; its commit hash is returned at delivery.

Files changed:

- `.env.example`
- `WORKSPACE_LAUNCH_NOTICE_DELIVERY_IMPLEMENTATION.md`
- `app/api/internal/workspace/refund-notices/route.ts`
- `drizzle/0022_lethal_barracuda.sql`
- `drizzle/meta/0022_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/mailercloud.ts`
- `lib/workspace/payments/configuration-core.d.mts`
- `lib/workspace/payments/configuration-core.mjs`
- `lib/workspace/payments/worker-database.ts`
- `lib/workspace/refund-notifications/configuration-core.d.mts`
- `lib/workspace/refund-notifications/configuration-core.mjs`
- `lib/workspace/refund-notifications/configuration.ts`
- `lib/workspace/refund-notifications/model.ts`
- `lib/workspace/refund-notifications/provider.ts`
- `lib/workspace/refund-notifications/repository.ts`
- `lib/workspace/refund-notifications/service.ts`
- `lib/workspace/refund-notifications/store.ts`
- `lib/workspace/refund-notifications/worker.ts`
- `lib/workspace/refunds/notices.ts`
- `tests/routes/workspace-notice-delivery.test.ts`
- `tests/routes/workspace-notice-fixtures.ts`
- `tests/routes/workspace-notice-provider.test.ts`
- `tests/routes/workspace-notice-worker-route.test.ts`
- `tests/routes/workspace-notice-worker.test.ts`
- `tests/setup.ts`

## O. Historical isolation

No database access means existing Terms/Refund Policy/payment/refund/member/creator/course evidence was not mutated. No notice rewrite or financial-service delivery callback introduced. Email outcomes never change paidAt, deadline, decision, completion, entitlement or coupon capacity. Shared mailer payload extraction preserves existing LMS/application/approval caller behavior; no applicant communication redesign. No coupon, pre-registration journey, publishing or Phase 1.9 work.

## P. Remaining manual provider configuration

Under separate authorization: verify intended Mailercloud account/key/sender/domain, DNS/authentication/tracking/body-storage/privacy settings, static scope label and public origin; verify actual internal status/acceptance receipts and 24-hour deduplication; arrange protected monitoring/uncertainty handling; deploy/authenticate/schedule a bounded worker only after real DB verification. No credentials or provider settings changed now.

## Q. Remaining product decisions

Implement/verify an owner-bound creator email verification source. Decide when verified contact is required in onboarding and how contact changes invalidate pending sends. Existing users.email must not be retroactively marked verified because it is present or an email was previously sent. Missing/unverified cases remain blocked and preserve in-app financial status.

Before enabling sends, define a reviewed requeue/resolution procedure for blocked/uncertain obligations that appends evidence and respects pinned recipients/payloads; never manually rewrite terminal attempt history. Provider acceptance/inbox delivery/bounce monitoring remain separate proof and operational gates. Implementation readiness is not public-launch or notice-operation readiness.

## R. Recommendation

**NOTICE DELIVERY IMPLEMENTATION READY FOR REAL DB VERIFICATION.**

**VERIFIED CREATOR RECIPIENT EMAIL REQUIRES AN ONBOARDING/CONTACT DECISION.**

Operational notices remain unverified and disabled; noticesReady=false. Public charging remains disabled. No migration applied, no provider request/email, no production configuration/deployment. Stop after Blocker D.
