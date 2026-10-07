# Workspace Phase 1.5B implementation

Date: 7 October 2026. Implementation commit: `50a5ff6`.

**Implemented; recommend Phase 1.5BV database verification next.** Migration `0013_peaceful_spiral.sql` is generated and **not applied**. This report does not claim real PostgreSQL verification or payment-launch readiness. Public checkout remains disabled.

## A. Scope

Initial creator identity, paid membership history, safe fulfillment, independent activation recovery, persisted capability/journey resolution, and minimal read-only user/admin status pages. No production access, database queries, database migrations, Razorpay calls, deployment, dependency changes, environment-file changes, or Phase 1.6 implementation occurred.

## B. Creator Profile model

`workspace_creator_profiles` is separate from `users.role`: unique user ID, profile ID, enabled/suspended/terminated status, immutable `createdAt` and `firstActivatedAt`. First activation and creation coincide. Fulfillment creates a profile only after its payment, context, ownership, and overlap checks pass. Existing enabled identity is reused. Suspended or terminated identity causes an activation hold; fulfillment never re-enables it.

The additive migration prevents deleting identity history, changing its owner/timestamps, re-enabling suspended identity, or reviving terminated identity. A deferred insert constraint requires a new identity to commit with matching membership fulfillment at its creation time. Expiry leaves identity/history intact. No creator role is added; ordinary learners remain students.

## C. Membership model

`workspace_memberships` records user, profile, financial order, immutable plan version, accepted duration, paid time, term start/end, access-grant time, fulfillment time, and creation time. An order has at most one membership. Composite foreign keys enforce consistent profile/order owners. The financial order gains a separate immutable `fulfilledAt` marker and `fulfilled` activation state.

Database guards enforce safe winning payment/coupon evidence, accepted plan/duration/start-rule context, Kolkata term calculation, overlap rejection, and atomic order/membership completion. Membership update/delete is prohibited. A later financial review may disable access while retaining fulfillment history.

## D. Membership-term calculation

Canonical launch: `2026-11-08T18:30:00.000Z`, 9 November 2026 at 00:00 IST. Pre-launch captures start their paid term at launch; captures at or after launch start at authoritative `paidAt`. Fulfillment/retry time never resets the start.

Terms use 3/6/12 calendar months in Asia/Kolkata, preserving civil time and milliseconds, clamping the day to the destination month's last day. The pure implementation uses Kolkata's fixed offset; the migration uses PostgreSQL `AT TIME ZONE 'Asia/Kolkata'` and `make_interval(months => ...)`. Database parity remains to be executed in Phase 1.5BV.

## E. Early Access

After safe fulfillment, `now < startsAt` derives early access; `startsAt <= now < endsAt` derives active; `now >= endsAt` derives expired. Early access grants creator capability immediately in the explicitly classified development/test environment. No launch/expiry status job or permanent founding-creator badge is introduced.

## F. Fulfillment transaction

The service executes through the PostgreSQL activation repository. Lock order is persisted user → owned financial order → creator profile. Financial paths share the persisted-user lock; activation does not modify the already finalized coupon ledger. Deadlock/serialization failures have bounded transaction retries.

Within one short transaction: reload owned order; return immutable existing fulfillment idempotently; require captured/pending state; validate known paid time/exact 72-hour refund deadline, accepted context, exact winning payment identity/economics/time provenance, and redeemed coupon; reject suspended/terminated identity or another nonexpired/overlapping initial membership; create/reuse profile; insert calendar term; mark the order fulfilled. There is no provider HTTP or analytics call in this transaction. Deferred database constraints verify completion at commit.

Capture finalization and activation are separate commits. Activation failure rolls back profile/membership/fulfillment together without reversing financial capture or coupon redemption.

## G. Idempotency

A persisted-owner lock serializes retries. Unique profile/user and membership/order indexes provide database backstops. An existing matching membership returns `already_fulfilled` without altering identity, term, or timestamp. Repeated financial reconciliation preserves a completed activation; a refund observation holds the order and leaves membership history intact.

## H. Activation recovery

`runWorkspaceActivationRecovery(limit)` is a server-only entry point, independent of provider reconciliation and browser redirects. It is explicitly disabled for production execution and requires `DATABASE_ENV=development` or `test` otherwise. Batch size is 1–25, default 10. Candidates are captured/pending Test Mode orders with both payment dates present; each passes the same fulfillment service checks. Failures are counted and retain pending financial truth for a later retry.

No public activation endpoint, scheduler, deployment, or browser-dependent grant was added. This worker was not executed against a real database. An immediate attempt after financial commit is optional and has not been wired into the financial transaction.

## I. Access resolver

The central Workspace journey now reads persisted membership/profile/order joins for the persisted account. Access requires enabled identity, a fulfilled order, immutable fulfillment evidence, and an early/active term. Eligibility, an unpaid/captured-pending order, held financial evidence, stale JWT role, or expired membership cannot grant capability. Missing schema/database errors propagate closed rather than assuming access.

Journey adds activation pending, financial review, early access, active, expired, and creator unavailable, directing these states to `/workspace/member`. It does not persist one catch-all user status or expose membership/payment records in the journey receipt. Test/noncommercial evidence is explicitly denied production capability, including a production Next.js process pointed at a development-classified database.

## J. User UX

`/workspace/member` authenticates a persisted user and reads only that owner's status. It shows plan, start/end, and derived membership status. Pre-launch safe fulfillment displays **Early Access Active** and the 9 November paid-term start. Held/pending, unavailable, and expired states explain the situation without a payment/grant action. Expiry offers no renewal checkout. Database failures render a bounded unavailable message without private exception details.

Eligibility/apply/result/activate routing respects the central membership destination. Existing public payment CTA stays disabled. No full Basic Workspace, drafts, profile editor, payment IDs, or promises of Phase 1.6 features appear on the member screen.

## K. Admin visibility

`/admin/workspace/creators` uses existing persisted admin authorization, with a sidebar link. It reads the latest 100 membership records: creator user, identity status, originating order/plan, dates, derived term state, activation state, and fulfillment time. Existing financial-order copy distinguishes capture from fulfillment. No self-grant, mark-paid, manual activation, suspension editor, or financial override endpoint is introduced.

## L. Security

Ownership is checked using a persisted account and composite database references. Activation is internal, never driven by client financial fields. Unknown/corrupt timing, wrong account/mode/order/user/payment/currency/amount, refunds, unredeemed coupons, unknown start context, suspended identity, and overlaps fail closed. Held captures are never automatically unheld. Production/unknown environment cannot grant from test evidence. Admin inspection reuses persisted-role authorization.

Source/schema tests verify immutability and completion guards; serialized transaction-adapter tests verify behavior and rollback. Neither substitutes for real PostgreSQL trigger/concurrency execution.

## M. Privacy

Member and admin containers use `ph-no-capture`. No new PostHog events or financial properties are sent. Member rendering contains no provider payment identifiers, coupon metadata, refunded amount, or raw provider payload. Worker summaries contain aggregate counts. Environment secrets are neither copied into the isolated build nor committed.

## N. Legacy isolation

No writes or schema changes to learner roles, legacy course orders/coupons, enrollments, course ownership/authors, progress, or certificates. Existing regression suites pass. The original manual Workspace flow is covered by the existing automated tests; no real-environment/manual-browser smoke is claimed in this implementation phase.

## O. Razorpay/webhook deferral

No Razorpay API/Checkout/webhook traffic occurred. Genuine event delivery, trusted capture-time provenance, restart/replay evidence and webhook infrastructure remain a manual pre-public-payment gate, per the updated brief. Existing real Test Mode captured fixtures were not queried or modified; their previously recorded held/null-timing state is not used for activation testing.

## P. Ambiguous-order policy

Escaped create intent stays `recovery_required` with `operational_review_required`. Recovery no longer enumerates receipts or attaches an apparent single candidate. It performs no second create, guesses no provider attachment, and releases no coupon capacity. Regression coverage explicitly verifies the same result even when a synthetic lookup could have returned one candidate. Operational resolution remains deferred; provider enumeration was not expanded.

## Q. Failed-payment policy

A failed/authorized attempt alone leaves the initial order unpaid and reservation reserved, with no membership grant. A later different exact captured payment on the same order can become the sole winner, redeem once, and enter pending activation. A new regression covers this sequence. Out-of-order failed evidence cannot downgrade an established capture. Refund execution is outside scope; an observed refund holds access without deleting history.

## R. Migration

Generated by the repository's declared pnpm `db:generate` workflow with sanitized environment variables and an unreachable synthetic database target. Generation does not connect to PostgreSQL. Next migration: `drizzle/0013_peaceful_spiral.sql`, journal index 13, timestamp `1791368221505`, following the verified 0012 head.

The unapplied migration includes two new tables, financial-order completion linkage, ownership indexes/foreign keys, immutable-history guards, overlap locking, and deferred completion constraints. Composite referenced unique indexes are created before the corresponding foreign keys. It replaces the existing financial order guard additively, preserving its accepted-context/provider/capture protections while allowing immutable fulfillment evidence. Existing financial completeness triggers remain installed.

Applied `0012_useful_warhawk.sql` is unchanged: SHA-256 `4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97`. Snapshot/journal cover only the new schema. A second `pnpm db:generate` reports **No schema changes, nothing to migrate**. No migration was applied; no actual database ledger was read/manipulated, no schema push/reset/seed ran, and no immutable fixture cleanup occurred.

## S. Tests/validation

Completed successfully:

- Full `pnpm validate`: 478 Vitest tests across 38 files plus five Node test files; TypeScript and lint pass with no ESLint warnings/errors.
- New tests cover Kolkata calendar months, leap/day clamp, milliseconds, launch ±1ms, exclusive end, late fulfillment, immediate early access, safe/unsafe capture, profile reuse/suspension/termination, wrong owner, concurrent same-order retries, overlap, rollback at membership/order writes, independent bounded recovery, duplicate financial reconciliation, observed refunds, central persisted journeys, page authorization, privacy/legacy boundaries, and migration guard structure.
- Existing payment, coupon, eligibility, admin/security, and legacy regressions pass, including failed attempt → later exact capture.
- Production `pnpm build` passes using sanitized environment, an isolated `/tmp` source copy, and existing cached Google fonts: compile, type/lint checks, 59 static pages, and both new dynamic routes succeed. No deployment or provider call. The application `.next` is preserved.
- Second migration generation: no schema drift.
- `git diff --check` and staged diff checks pass.

Existing Next.js `next lint` deprecation notice remains; no tooling upgrade was made. Database migration execution, real triggers, two-connection races, and browser smoke are intentionally deferred to Phase 1.5BV.

## T. Files changed

All paths below are relative to the repository root `/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms`.

| File | Purpose |
| --- | --- |
| `lib/db/schema.ts` | Creator/membership schema and order fulfillment linkage |
| `drizzle/0013_peaceful_spiral.sql` | Unapplied additive schema/guard migration |
| `drizzle/meta/0013_snapshot.json` | New schema snapshot |
| `drizzle/meta/_journal.json` | Append the next migration entry |
| `lib/workspace/activation/model.ts` | Calendar terms, evidence checks, persisted capability derivation |
| `lib/workspace/activation/service.ts` | Atomic/idempotent fulfillment and bounded recovery |
| `lib/workspace/activation/repository.ts` | PostgreSQL locks, writes, owner reads, admin listing |
| `lib/workspace/activation/runtime.ts` | Server-only development/test worker |
| `lib/workspace/eligibility/service.ts` | Central persisted member journey |
| `lib/workspace/payments/model.ts` | Fulfilled activation-state type |
| `lib/workspace/payments/service.ts` | Operational-review-only ambiguous recovery |
| `app/(user)/workspace/member/page.tsx` | Private minimal membership status |
| `app/(user)/workspace/apply/page.tsx` | Route member states to their status page |
| `app/(user)/workspace/eligibility-result/page.tsx` | Route member states directly to their status page |
| `app/(admin)/admin/workspace/creators/page.tsx` | Read-only membership/creator visibility |
| `app/(admin)/admin/workspace/orders/page.tsx` | Clarify capture versus fulfillment |
| `components/admin/AdminSidebar.tsx` | Creator-history navigation |
| `tests/routes/workspace-activation.test.ts` | Term, fulfillment, rollback, retry, capability tests |
| `tests/routes/workspace-activation-pages.test.ts` | Owner/admin and safe page failure tests |
| `tests/routes/workspace-activation-boundaries.test.ts` | Migration, privacy, legacy, disabled checkout boundaries |
| `tests/routes/workspace-eligibility-service.test.ts` | Persisted membership journey regressions |
| `tests/routes/workspace-payments-fixtures.ts` | New nullable fulfillment marker in synthetic fixtures |
| `tests/routes/workspace-payments-migration.test.ts` | Keep 0012 assertions valid as the journal grows |
| `tests/routes/workspace-payments-service.test.ts` | Conservative recovery and failed/later-captured regression |
| `WORKSPACE_PHASE15B_IMPLEMENTATION.md` | Implementation evidence and release gates |

## U. Known limitations

No real PostgreSQL application/trigger/concurrency result is claimed. Transaction-adapter concurrency tests serialize in memory. No authenticated real-browser smoke ran. Status pages require the reviewed migration after separate authorization; absent tables fail closed. The worker is not scheduled/deployed and has no public/manual admin grant endpoint. Administrative history is bounded to 100 rows. Synthetic test evidence cannot grant production capabilities. No final commercial policies or real capture-time ingestion have been introduced.

## V. Deferred launch requirements

Before public payments: approve/version final Creator Terms, Refund Policy and commercial acceptance; verify trusted capture time and genuine webhook delivery/replay/restart behavior; establish controlled operational resolution for escaped provider creates; separately authorize/configure production credentials, production migrations and worker scheduling; verify production entitlement behavior with approved commercial evidence. Public payment must remain disabled until these manual gates are completed. Changing a webhook URL alone does not satisfy them.

## W. Phase 1.6 readiness

**Recommend Phase 1.5BV database verification next**, using a separately authorized local development/test PostgreSQL target and identifiable authoritative synthetic fixtures. Verify migration ledger/no-op, actual triggers, owner/plan/date checks, independent financial/activation commits, two-connection idempotency/overlap races, recovery, status routing, admin privacy and legacy smoke. Do not activate previously held real Razorpay captures or weaken immutable-history constraints for fixture cleanup.

Phase 1.6 implementation has not begun. Its next decision should follow Phase 1.5BV results; genuine webhook proof remains the explicitly deferred pre-public-payment gate.
