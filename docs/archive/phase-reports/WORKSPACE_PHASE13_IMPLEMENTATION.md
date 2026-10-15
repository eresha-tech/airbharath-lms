# AirBharath Workspace — Phase 1.3 implementation

Implemented 6 October 2026. Architecture reference: `WORKSPACE_PHASE12_ARCHITECTURE.md`, narrowed by the approved Phase 1.3 brief. Implementation milestone: `20aeb5a` on `feat/workspace-registration`. Local commits only; nothing pushed or deployed.

## A. Scope implemented

Existing-account integration, authenticated eligibility submission, automatic evaluation, versioned settings/declarations, immutable decision history, returning-user routing, eligibility admin pages, abuse protection, privacy updates, additive migration and tests. Eligibility grants neither creator capability nor paid entitlement. No dependencies or lockfile changed.

## B. Product flow

`/workspace` → **Become a Creator** → normal login when anonymous → fixed `/workspace/apply` callback → **Workspace Eligibility Check** → server decision → `/workspace/eligibility-result`.

Current eligible and cooldown users skip the form. Eligible results show an IST validity deadline and activation-coming-next message. Ineligible results show controlled reasons and an IST reapply deadline. There is no payment or activation control.

## C. Authentication integration

The existing OTP/signup/account/session implementation is reused. Middleware preserves the fixed Workspace callback and removes incoming state/identity/query overrides on anonymous Workspace redirects. Server pages/APIs recheck that the session identifies a persisted account. Submissions use that account ID, never a submitted user ID.

`users.role`, account creation, JWT claims and existing LMS capabilities are unchanged. Admin pages/APIs use `getAuthorizedAdminSession()` against persisted roles. Settings publication rechecks and locks the persisted admin row inside the transaction, protecting a demotion race.

## D. Eligibility rules

All 15 approved aviation categories have stable machine codes. Professional and teaching categories must be recognized; known categories disabled by the current settings produce controlled ineligibility. Other Aviation Professional is allowed and requires a profession of at most 120 characters.

Experience selections map server-side to minimum months: 0, 12, 24, 36, 72, 132, 192 and 240. The initial threshold is 24. The pure evaluator rejects 23 and accepts 24; the UI does not offer an ambiguous 23-month selection. Client-supplied numerical experience and result fields are rejected.

Professional status is descriptive. Other status detail is optional and bounded to 120 characters. The initial professional-profile rule is required HTTPS, maximum 2,048 characters, no credentials/nonstandard port/internal host/private literal/unsafe scheme. Normalization removes fragments and normalizes the host. No profile fetching, DNS lookup, scraping or credibility scoring occurs. All IP literals are rejected, including public ones.

Teaching categories reuse the aviation list. The course idea is required, at most 200 characters, and remains eligibility context. Seven explicit declarations are required, including 18+ and legal contracting capacity; no birth date or identity documents are collected. Age is not configurable.

## E. Validation vs ineligibility behavior

Malformed JSON, unknown fields, invalid enums, unsafe URLs, missing declarations and unbounded text return validation errors without inserting an attempt. Required-profile presence is checked against the locked current settings before insertion. These errors do not start cooldown.

Valid submissions below the minimum experience or outside currently open categories create an ineligible attempt with controlled reason codes. The response never echoes submitted answers. Dependency/storage failures retain the browser form and return safe failure messages; uncertain submissions are retried with the same frozen body/key.

## F. Database entities

Exactly four tables and one eligibility result enum are added:

| Entity | Purpose and protections |
| --- | --- |
| `workspace_eligibility_settings` | Immutable configuration/evaluator/hash/version, publisher/time, unique version and partial unique current pointer; bounded configuration check |
| `workspace_eligibility_attempts` | Owner, normalized structured answers, retained settings/policy FKs, automatic source, evaluator/hash/key, outcome/reasons and authoritative timestamps; owner/key uniqueness, history indexes and outcome/date/experience/declaration checks |
| `workspace_policy_versions` | Recoverable eligibility declaration text, stable version/hash, publication time and partial unique current pointer; eligibility policy kind only |
| `workspace_audit_events` | Append-only settings-publication evidence with actor, predecessor/successor FKs, command key/hash/time and actor/key uniqueness |

PostgreSQL triggers prohibit attempt/audit updates or deletion. Version triggers permit only `is_current` pointer changes; published configuration and declaration content cannot be edited/deleted. These triggers are reviewed SQL additions to the generated migration and are not modeled by Drizzle snapshots.

## G. Settings/versioning

Initial settings are 24 months, all 15 categories, required profile, 30-day validity, 7-day cooldown, `Asia/Kolkata`, and launch `2026-11-08T18:30:00.000Z` (9 November 2026, 00:00 IST). Launch remains scheduling information only.

Admin publication accepts bounded values: minimum 1–600 months, validity/cooldown 1–90 whole days, nonempty unique known categories, boolean profile requirement, valid UTC minute timestamp and the canonical timezone. Unknown settings are rejected; no expression builder exists.

Publication locks the persisted admin and current settings, verifies the displayed predecessor ID, clears its current flag, inserts the next version and inserts an audit record in one transaction. Unique version/current constraints provide additional protection. Matching command-key/hash retries recover the original publication; changed payload or stale predecessor conflicts. Historical attempts never derive deadlines from newly published settings.

Declaration policy v1 and its approved text are provisioned through the reviewed migration. There is no generic policy editor or commercial-terms publication flow. Unknown evaluator/policy versions fail closed pending corresponding code support.

## H. Eligibility attempt lifecycle

The decision is inserted atomically with the normalized answers and retained versions. Server time is sampled after the per-user lock. Eligible deadlines are `decidedAt + validityDays × 86,400,000 ms`; ineligible deadlines use cooldown days. At the defaults this is exactly 30/7 elapsed days.

Validity requires `now < eligibleUntil`; equality expires it. Reapplication requires `now >= reapplyAt`; equality permits it. Earlier attempts remain unchanged. Admins can inspect history but cannot override a decision.

## I. Idempotency/concurrency

A submission UUID and SHA-256 hash cover the normalized answers and accepted settings/policy IDs. A persisted-user `FOR UPDATE` lock serializes decision-making. Within that transaction, matching saved submissions recover their existing result; changed hashes conflict. Active validity/cooldown returns the existing result instead of inserting a new attempt for a fresh tab/key. The unique `(user_id, submission_key)` index supplies a second guard.

An owned matching saved submission is recovered before the new-write limiter, including when Redis is unavailable. A recovery/block response emits no additional decision event. The browser freezes the original body/key after uncertain failure and disables answer editing until recovery or reload. Form answers are kept in component memory, not stored in browser persistent storage.

Concurrency tests exercise a serialized in-memory transaction harness and assert lock ordering/service behavior. **Real PostgreSQL lock contention, rollback and trigger execution were not exercised.**

## J. Returning user resolver

`getWorkspaceJourneyState(userId)` reads the persisted account and latest owned attempt, then delegates to a deterministic clock-injected resolver:

| State | Destination |
| --- | --- |
| `authentication_required` | Normal login with fixed Workspace callback |
| `eligibility_required` | Eligibility check |
| `eligibility_available` | New check after cooldown |
| `ineligible_cooldown` | Stored result and reapply deadline |
| `eligibility_active` | Stored result and activation-coming-next message |
| `eligibility_expired` | Fresh eligibility check |

All states report `hasCreatorAccess=false` and `hasPaidEntitlement=false`. The public receipt exposes only result identity, controlled reasons and decision/deadline timestamps, excluding answers and idempotency internals. Client state, analytics, browser clocks and query parameters cannot grant eligibility.

## K. Public routes

- `/workspace`: primary acquisition CTA and secondary manual link, preserving the existing visual design.
- `/workspace/apply`: authenticated server-routed eligibility form; expired-result notice when appropriate.
- `/workspace/eligibility-result`: authenticated owned current result; otherwise redirects to the check.
- `/workspace/manual-application`: public original four-step manual application component.
- `POST /api/workspace/eligibility`: required same-origin mutation, persisted account, bounded JSON, validation, owned recovery, limiter and transactional decision.
- `GET /api/workspace/journey` and `GET /api/workspace/eligibility/current`: owned state, no-store responses, no caller-selected identity.

Loading and error boundaries present safe unavailable/retry states. Explicit 400/401/403/409/429/503 responses cover invalid input, account/origin, conflict, abuse and dependency failures. An uncertain request is not presented as an eligibility rejection.

## L. Admin routes/UI

`/admin/workspace/eligibility` lists account identity needed for operations, category, experience selection, result, decision/deadline and rules version. Twenty-row pagination and eligible/ineligible/current-eligible/expired/cooldown-active filters are evaluated server-side.

`/admin/workspace/eligibility/[attemptId]` displays structured answers, safe external professional link, submitted/decided/accepted times, retained rules/declaration versions, result and controlled reasons. Links are revalidated and use `noopener noreferrer`; free text is rendered through React escaping.

`/admin/workspace/settings` publishes bounded versions with optimistic predecessor protection and retry recovery. Corresponding admin APIs use persisted-role authorization. A Workspace sidebar group links eligibility, settings and legacy manual applications. No Make Eligible action exists.

## M. Legacy Phase 1 coexistence

The original `ApplicationForm` is reused unchanged at the public manual URL. Existing `/api/workspace/applications`, `/admin/workspace-applications`, application history, receipt references, review states and approval-email workflows are unchanged. No manual record becomes an account or automatic eligibility attempt; Approved remains separate from automatic eligibility and creator capability. Existing regression suites continue to pass.

## N. Privacy/analytics

The browser emits `workspace_eligibility_started` with only feature/version metadata. New committed decisions schedule server-side passed/failed telemetry after the transaction returns. The distinct server identifier hashes the attempt UUID; properties contain only feature/event/evaluator/policy versions and the technical person-processing suppression flag. Telemetry errors do not affect the committed result. Delivery is best effort: no outbox, retry queue or live capture verification is introduced.

SDK privacy filtering covers nested public/admin Workspace routes, canonicalizes dynamic admin IDs, removes raw queries/referrers/person updates/free text/profile values and suppresses identify/autocapture/exception events. New eligibility/admin events replace inherited account IDs with an anonymous device-scoped identifier and disable person processing; missing usable device identity drops the event. Unknown eligibility event names are dropped. Malformed/missing URLs use canonical path context or are removed.

Workspace-origin login suppresses explicit sign-in identification and global identity tracking. Existing browser opt-out behavior is unchanged. Existing legacy funnel allowlists remain supported. Form/privacy disclosure explains professional self-declarations, onboarding, abuse/security/support/admin purposes, absence of independent verification, and separate optional marketing consent. Decision deadlines are explicitly not retention periods; no new retention commitment is invented.

## O. Security

New JSON mutations require an Origin matching configured `NEXT_PUBLIC_BASE_URL`; cross-site Fetch Metadata is rejected. Production without that trusted base URL fails closed. Limits are 16 KB for eligibility and 8 KB for settings. No forwarded host is trusted for mutation authorization.

The existing Upstash REST infrastructure executes one atomic Lua script with separate `workspace:{eligibility}` namespaces: 20 new valid submission requests per account per 15 minutes, plus a global 5,000/hour budget. Account keys are HMAC pseudonyms using the existing JWT secret; raw contacts and account UUIDs are not sent in keys. Provider requests have a three-second timeout; missing/malformed/provider-failed responses return unavailable and prevent new decisions. Rate-limited requests return Retry-After. Saved matching recovery bypasses the provider; database validity/cooldown remains authoritative. No unverified proxy/IP header or additional CAPTCHA service is introduced.

Recognized fields are normalized and bounded server-side. Required declarations cannot be bypassed with truthy strings or prototype keys. Authentication/authorization/storage failures do not grant access. Existing account/payment/course/approval-email controls remain intact.

## P. Migration generated

Generated **`drizzle/0009_normal_baron_zemo.sql`**, snapshot `0009_snapshot.json`, and tool-generated journal entry after verifying repository head `0008_eager_energizer` and its preceding Workspace migration. Snapshot tests confirm every existing table/enum remains unchanged and only the four Phase 1.3 tables/result enum are added.

Reviewed SQL additions provision the two approved settings/policy records with content hashes and enforce immutable history. They do not create accounts, change roles or touch manual application records. Previous migration files and the database migration ledger were not edited.

**Status: generated/reviewed, NOT APPLIED to any database.** No schema push, migration execution, database reset, production seed, Neon query or deployment was performed. The current applied state of any shared/staging/production target is unverified. Review the full ordered migration chain, including any outstanding 0008 migration, before a separately authorized execution through the guarded repository `pnpm db:migrate` workflow.

## Q. Tests/validation

Completed successfully against credential-isolated environment variables and an intentionally unreachable loopback database target:

| Check | Result |
| --- | --- |
| `pnpm validate` | Passed: five Node policy test files; 247 Vitest tests across 22 files; TypeScript and lint |
| `pnpm typecheck` | Passed within final validation |
| `pnpm lint` | Passed; existing Next lint deprecation notice only |
| `pnpm build` | Passed on final application code; 52 static pages generated and new dynamic routes compiled |
| `pnpm db:generate` | Passed; generated additive 0009 migration, no database execution |
| `git diff --check` and staged diff check | Passed |
| Local production browser smoke | Landing CTA reached normal login with fixed `/workspace/apply` callback; public manual application rendered its original four-step UI |

New tests cover normalized boundaries, approved/disabled/Other categories, declarations, URL safety, bounds, elapsed/equality deadlines, historical settings, matching/changed keys, two-tab behavior, active-state suppression, expiry/cooldown renewal, persisted ownership, publication concurrency/demotion, auth/origin/failure HTTP responses, post-commit telemetry, limiter behavior, nested privacy/login context, middleware routing and rendered required/optional form controls. Test-runner JSX support uses its existing OXC transform; no new test dependency was installed.

Local browser testing sent no OTP or application and published no settings. Existing header course loading attempted only the intentionally unreachable local target during preview, producing expected connection-refused diagnostics. The preview server was stopped. No authenticated database-backed UI smoke, live Redis script, real database concurrency/trigger execution or live PostHog delivery was claimed.

### Separately authorized environment smoke checklist

1. Establish the exact nonproduction target, human migration authorization and repository guard values. Review migration history/backups and pending chain, then use the guarded migration command only with that authorization. Verify the new enum, four tables, seed settings/policy, triggers and unique-current indexes.
2. Configure trusted public base URL, existing account/JWT/OTP infrastructure and Workspace Upstash credentials for that environment. Keep analytics optional; use synthetic accounts and approved provider sandbox behavior.
3. Complete normal login from the Workspace CTA, submit 24-month and below-threshold checks, inspect owned results/admin history and confirm no role, creator profile, course or membership is created.
4. Race two connections/tabs with matching and different keys, assert one decision during active validity/cooldown, then test deadlines with isolated fixtures. Verify changed-key payload conflicts and committed retry recovery during a limiter outage.
5. Publish settings concurrently from the same predecessor, verify one current version and one successful successor/audit; confirm prior attempt answers/deadlines stay unchanged. Exercise demoted-admin rejection and database immutability/rollback.
6. Confirm unavailable Redis/database, rate-limit and stale-settings UX without false rejection or duplicate writes. Review analytics network payloads for permitted versions and canonical routes only, and verify opt-out/adblock behavior. Recheck the legacy manual/admin/email path using authorized sandbox delivery only.

These steps are documented, not executed here.

## R. Files changed

The implementation milestone changes 46 files; this report is the 47th file. Paths below are relative to the repository root.

- `WORKSPACE_PHASE13_IMPLEMENTATION.md`
- `app/(admin)/admin/workspace/eligibility/[attemptId]/page.tsx`
- `app/(admin)/admin/workspace/eligibility/page.tsx`
- `app/(admin)/admin/workspace/error.tsx`
- `app/(admin)/admin/workspace/settings/page.tsx`
- `app/(auth)/login/page.tsx`
- `app/(user)/privacy/page.tsx`
- `app/(user)/workspace/apply/page.tsx`
- `app/(user)/workspace/eligibility-result/page.tsx`
- `app/(user)/workspace/error.tsx`
- `app/(user)/workspace/loading.tsx`
- `app/(user)/workspace/manual-application/page.tsx`
- `app/api/admin/workspace/eligibility/[attemptId]/route.ts`
- `app/api/admin/workspace/eligibility/route.ts`
- `app/api/admin/workspace/settings/route.ts`
- `app/api/workspace/eligibility/current/route.ts`
- `app/api/workspace/eligibility/route.ts`
- `app/api/workspace/journey/route.ts`
- `components/admin/AdminSidebar.tsx`
- `components/providers/PostHogProvider.tsx`
- `components/workspace/EligibilityForm.tsx`
- `components/workspace/EligibilitySettings.tsx`
- `components/workspace/EligibilityShell.tsx`
- `components/workspace/WorkspaceLanding.tsx`
- `drizzle/0009_normal_baron_zemo.sql`
- `drizzle/meta/0009_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/analytics-privacy.ts`
- `lib/workspace/eligibility/analytics-server.ts`
- `lib/workspace/eligibility/analytics.ts`
- `lib/workspace/eligibility/limiter.ts`
- `lib/workspace/eligibility/model.ts`
- `lib/workspace/eligibility/request.ts`
- `lib/workspace/eligibility/service.ts`
- `middleware.ts`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/routes/workspace-eligibility-fixtures.ts`
- `tests/routes/workspace-eligibility-form.test.ts`
- `tests/routes/workspace-eligibility-limiter.test.ts`
- `tests/routes/workspace-eligibility-migration.test.ts`
- `tests/routes/workspace-eligibility-model.test.ts`
- `tests/routes/workspace-eligibility-privacy.test.ts`
- `tests/routes/workspace-eligibility-routes.test.ts`
- `tests/routes/workspace-eligibility-routing.test.ts`
- `tests/routes/workspace-eligibility-service.test.ts`
- `vitest.config.mts`

## S. Known limitations and architecture deviations

- Migration execution and real database/provider behavior remain unverified. New authenticated routes require the reviewed migration and existing service configuration before environmental acceptance testing.
- Service concurrency tests simulate serialization; they are not proof of PostgreSQL READ COMMITTED contention, rollback or trigger behavior. The migration and ordered lock/uniqueness strategy are reviewed, with real two-connection checks explicitly left for authorized testing.
- Professional links require domain names; public IP literals are rejected along with private ones. This deliberately narrows URL acceptance while supporting reasonable professional HTTPS pages.
- The architecture proposed set-null publisher/audit actor foreign keys. This implementation uses restrictive user FKs to retain actor references consistently with immutable-history triggers. Consequently, deleting a referenced account is blocked; future approved erasure/redaction work must account for this rather than blindly cascading or silently modifying history. No account-deletion behavior was implemented here.
- Settings/policy configuration is retained as bounded typed JSON plus stable FK/version/hash, rather than a generic rules engine. Audit targets are concrete predecessor/successor settings FKs, with only the required publication action. Initial policy text is versioned through migration; a policy editor and manual override remain absent per the narrowed Phase 1.3 authorization.
- No auth provider, credential verification, DNS classification, optional-IP limiter, scheduled expiry job or reliable analytics delivery queue was added. State is derived from persisted timestamps on server requests; an already-open result page refreshes its state on a new request.
- Required declarations are onboarding self-declarations, not finalized commercial acceptance. Ordinary immutable-history CRUD does not implement the privacy retention/erasure workflow. Form memory is not restored after a hard reload; saved decisions are recovered through the server journey.

## T. Items intentionally deferred to Phase 1.4+

Membership plans/prices/quotes, GST checkout, coupons/redemptions, Razorpay/payments/webhooks, creator profiles or roles, memberships/paid entitlement, refunds, invoices, outbox/payment workers, Basic/full Workspace dashboards, course drafts/ownership and full November creator tools remain unimplemented. No manual eligibility override or fake activation control was added.

Phase 1.3 stops here. No migration application, push, deployment or Phase 1.4 work is authorized by this report.
