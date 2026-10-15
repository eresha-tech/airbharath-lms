# Workspace Phase 1.5A implementation

Date: 6 October 2026. Scope: financial foundation only. Implementation commit: `962d075`. Phase 1.4/1.4V, including the mandatory `0011_workspace_coupon_audit_freshness.sql`, is the baseline.

**Public payment remains disabled. No migration was applied, no database was accessed, and no Razorpay API, email or other private-service call was made in this phase. No creator capability is created by this implementation.**

## A. Scope

Implemented isolated accepted orders, coupon reservations/redemptions, durable provider-create intent, deterministic receipt recovery, payment evidence, webhook inbox, shared financial reconciliation and read-only administration. Tests use deterministic adapters and a rollback-capable in-memory store. No Phase 1.5B work, deployment, dependency changes or environment-file changes.

## B. Financial order model

`workspace_membership_orders` has 53 columns. It references the existing user, eligibility attempt, plan version, eligibility settings/policy and optional Workspace coupon. It does not reuse LMS `orders`.

The accepted record includes request key/payload hash, test commercial-policy identifier, immutable economics and attribution, provider account/test mode/receipt, create-intent evidence, separate lifecycle axes, winning payment identity and payment/refund timing. Unique indexes protect user/request, one unresolved initial purchase per user, provider receipt and provider order identity. Composite ownership indexes support ledger/payment foreign keys. Captured purchases continue blocking another initial purchase while activation is deferred.

## C. Accepted quote snapshots

The client supplies only plan code/version, optional normalized coupon code, quote hash and UUID request key. Unknown fields are rejected. The service recomputes the Phase 1.4 quote using the shared quote reader after persisted-user/coupon locks and current plan/settings/policy share locks. Preview remains read-only and unreserved.

Acceptance checks active eligibility, current available plan, coupon validity/applicability/economics, quote/context consistency, prior coupon use and occupied capacity. Changed economics/context return a controlled conflict; no silent repricing. Removing a coupon requires a newly reviewed full-price quote.

Immutable fields include integer paise values, 18% GST calculation, INR, term duration, quote/pricing/start versions, launch/conditional-start context, eligibility validity, plan display/version snapshot, coupon code and campaign/source/economic/version/limit snapshot. History never recalculates from current definitions. The insert guard independently checks owner, eligible attempt, current plan/settings/policy and supported versions; updates cannot rewrite accepted context.

## D. Order state model

| Axis | Phase 1.5A values |
|---|---|
| Provider setup | `creating`, `ready`, `recovery_required`, `closed` |
| Financial | `unpaid`, `captured` |
| Activation | `pending_activation`, `held_for_review` |

`closed` is restricted to proven never-submitted or definitive create rejection, while unpaid and without a provider order. Capture cannot revert; the winning payment cannot be replaced. Known `paidAt` and refund deadline cannot change. Every order update advances the version. No fulfilled/active creator state exists.

## E. Coupon reservation/redemption ledger

`workspace_coupon_redemptions` is a separate historical ledger: one reservation per order, owner/coupon-consistent foreign key, reserved time, advisory checkout deadline, conservative hold policy, redeemed/released time and release reason/source/evidence hash. Lifecycle is `reserved → redeemed` or `reserved → released`; terminal evidence cannot be changed or deleted.

Attribution is available through the immutable accepted-order snapshot. `checkoutDeadline` is advisory metadata and has no capacity-release effect. No legacy `usedCount` is read or changed.

## F. Capacity concurrency design

Persisted user → coupon → order → ledger/payment → event is the lock order. The coupon row is locked before checking indexed `reserved` plus `redeemed` occupancy. The ledger insert/update trigger also locks the coupon and rejects occupied capacity above `usageLimit`. Unlimited coupons still enforce owner/use uniqueness.

Order and reservation commit before provider HTTP. Deadlocks/serialization errors retry the database-only transaction up to three attempts; unique conflicts become controlled conflicts. Deferred constraints require the order, winning payment and coupon ledger to agree at commit.

**Actual PostgreSQL lock/trigger behavior has not been executed in this phase.** The deterministic store tests serialize simulated races but do not prove two-connection PostgreSQL concurrency. The guarded integration file described in W is prepared for separately authorized Phase 1.5AV.

## G. One-user/one-coupon enforcement

A partial unique index on coupon/user for `reserved` and `redeemed` prevents two active/consumed uses. A released unpaid reservation remains historical and permits a safe retry. A redeemed coupon remains consumed. Another coupon is independent after safe unpaid closure; future renewals require their own purchase policy and are not implemented.

## H. Provider order creation/recovery

Accepted order/reservation carries a deterministic `wso` plus UUID-hex receipt (35 characters). Before the single create POST can escape, a separate short transaction commits `providerCreateStartedAt` and `providerRequestCount=1`. Database guards prevent resetting the intent/count or replacing attached provider identity. HTTP is outside database transactions.

Success attaches only an exact account/mode, receipt, amount and currency match. Timeout, connection loss, malformed/lost response, crash or unconfirmed attachment retains capacity and enters/requires recovery. A retry never issues a replacement POST after committed intent.

Recovery searches by receipt, exact-matches locally and attaches only one matching order. Zero matches do not prove absence/non-payability; multiple matches or bounded-result ambiguity require review and preserve the hold. No natural provider-create idempotency is assumed. Razorpay documents a receipt limit of 40 characters and supports receipt filtering; receipt recovery is not a guarantee of exhaustive or immediate visibility. [Create order](https://razorpay.com/docs/api/orders/create/), [Fetch orders](https://razorpay.com/docs/api/orders/fetch-all/).

The only provider-started release classification is HTTP 400 with `BAD_REQUEST_ERROR` / `input_validation_failed`; it stores the response hash on the order and the identical release proof on the ledger. All other failures remain ambiguous. This classification and account/key binding require authorized sandbox verification before any release use outside deterministic tests. The internal never-submitted close operation proves no intent/order escaped. There is no public close/release/operator-mark-paid route.

## I. Payment attempts

`workspace_payment_attempts` separates observations from orders. Unique account/mode/payment identity prevents one payment funding two orders; a partial unique index permits one winner per order. Composite foreign keys enforce order owner, account, mode and stored provider order. Amount/currency/provider-created time and identity remain immutable. Captured evidence cannot downgrade; observed refunded amount cannot decrease.

Wrong amount/currency observations are preserved for review without financial success. Another exact captured payment ID is retained as a multiple-capture incident with one winner. The provider payload is reduced to necessary evidence; provider creation time stays separate from capture timing.

## J. Razorpay adapter

Dedicated test-only native-fetch adapter implements create order, exact receipt lookup, fetch order, fetch payment and order-payment listing. It sends integer paise/INR, deterministic receipt, `partial_payment:false` and empty notes. It bounds provider response bodies to 256 KB, uses a ten-second timeout, disallows redirects and emits sanitized failures without logging credentials/payloads.

Only dedicated Workspace keys are used. Returned evidence explicitly copies account/mode rather than spreading credential-bearing configuration. No existing LMS Razorpay credentials enable this integration. All adapter tests inject deterministic HTTP responses; **no sandbox/provider behavior is claimed**.

## K. Browser confirmation

The future-facing confirmation route requires the default-disabled runtime gate, same Origin, persisted authenticated user, order ownership, bounded strict identifiers and HMAC using the stored provider order ID. It then fetches authoritative provider payment evidence outside locks and calls the shared reconciler. A browser signature alone never marks capture. Repeated valid callbacks converge on the same financial result.

## L. Webhook inbox

The dedicated route reads at most 32 KB, verifies dedicated HMAC against exact raw bytes before JSON parsing, validates provider event ID and configured account, then commits minimized inbox receipt before acknowledging. It has no cookie/session/normal-Origin requirement.

`workspace_payment_events` uniquely identifies account/mode/event ID and stores the first body hash, routing identifiers, event time as metadata, processing/retry lease state and matched order. Same ID/hash is idempotent. Different hash preserves first evidence and records an immutable anomaly requiring review. Provider email, phone, card, UPI/bank data, notes and professional profile are not persisted in the inbox. Webhook acknowledgement does not claim capture/finalization.

Out-of-order observations cannot downgrade a known capture. Unrecognized event types are ignored. Recognized unmatched events remain retryable; provider orders with non-Workspace receipts are ignored without LMS writes. [Razorpay webhook validation](https://razorpay.com/docs/webhooks/validate-test/), [Webhook practices](https://razorpay.com/docs/webhooks/best-practices/).

## M. Reconciliation/finalization

Browser confirmation, event processing and order recovery converge on one financial reconciler. It rechecks configured account/test mode, stored order/payment identity, exact amount/currency and capture status. One short transaction locks current financial rows, records/matches the payment, chooses one winner, marks the order captured, stores proven timing when available, redeems the reservation and finishes matched event processing.

Deferred constraints check the final state at commit. A failed finalization rolls back payment/order/redemption/event progress together; the durable received inbox remains retryable. Authorized/failed payment evidence leaves the order unpaid and capacity reserved. No email, PostHog or invoice is on the financial commit path.

`runWorkspaceReconciliation(limit)` is a server-only service boundary, not a public worker route. Batches are bounded to 25. Inbox leases/retry delays and a 100-attempt review ceiling prevent endless event processing. Persisted recovery scan markers and least-recently-checked selection prevent older orders from starving later candidates. The batch reports observed captured/pending-activation orders; administration lists them. No scheduler is configured or deployed.

## N. Captured pending-activation state

An exact capture with proven compatible timing becomes `captured / pending_activation`. Late eligibility, unverified timing, refund observations, mismatched/conflicting evidence or duplicate capture become controlled review states. Valid matched money is retained as captured, and a genuinely consumed coupon is redeemed, even when activation cannot proceed.

Every owner-facing financial receipt explicitly says `hasCreatorAccess:false` and `hasPaidEntitlement:false`. No profile, membership, enrollment, order in the LMS course system, course ownership or entitlement creation is invoked. Captured financial state is never consulted as creator authorization.

## O. Refund-window calculation

With an authoritative capture timestamp, `refundEligibleUntil = paidAt + 72 × 3,600,000 ms`. The database requires the matching elapsed 72-hour interval, explicitly non-null deadline, and immutable known dates. Boundary tests include pre-launch timing. No launch date, provider-created time, callback time or current observation time is substituted for success. No refund approval/API/processing is implemented.

## P. Membership-start snapshot

Accepted orders preserve the settings launch context (approved default: **9 November 2026 00:00 Asia/Kolkata**, `2026-11-08T18:30:00.000Z`), start-rule version, conditional display rule and plan duration. Future activation can start a pre-launch buyer at launch and a post-launch buyer at proven capture time. No membership row/start/end dates are issued now.

Razorpay's documented payment entity exposes creation time, but does not establish an exact capture timestamp through the fetched entity. The adapter deliberately ignores a non-contract `captured_at` field. A fetched valid capture therefore has `paidAt/refundEligibleUntil=null` and `held_for_review / capture_time_unverified`. Only deterministic internal test evidence supplies `test_authoritative` capture timing. This follows the brief's explicit timing-review exception rather than guessing a launch/refund boundary. [Payment entity](https://razorpay.com/docs/api/payments/entity/).

## Q. Feature gating

The existing public CTA remains **Payment activation coming next**; no Razorpay checkout UI was added. Missing/false configuration fails closed before database/provider access. Enabling a development test runtime requires all of:

- `WORKSPACE_PAYMENT_ENABLED=true` and separately authorized `WORKSPACE_RAZORPAY_TEST_AUTHORIZED=true`;
- `DATABASE_ENV=development` or `test`, and `NODE_ENV` must not be `production`;
- `WORKSPACE_RAZORPAY_MODE=test`, dedicated `rzp_test_` key ID, valid dedicated secrets and account ID.

These flags were **not set** in project environment files. Live mode/keys and production runtime are rejected even with the feature flag. Internal deterministic test service construction does not create an HTTP bypass. The commercial-policy identifier is explicitly `workspace-test-noncommercial-v1`; it is not legal acceptance. Final versioned commercial acceptance and any production enablement require later changes and authorization.

## R. Admin financial visibility

`/admin/workspace/orders` is authenticated read-only financial reporting: user/order, immutable selected plan/amount/coupon, setup/recovery state, captured/unpaid and activation/review state, paid/refund timing, minimized payment evidence and inbox processing counts. It never labels a membership active and has no Mark Paid control. The table is bounded to 25; the read-only API supports bounded page numbers. Migration/database failure produces a sanitized unavailable state.

Coupon administration lazily loads authoritative reserved, redeemed, released and captured-held counts through a separate admin-only endpoint. Missing new tables do not block existing Phase 1.4 coupon management. No totals are derived from analytics or a legacy mutable use counter; attribution stays in immutable order snapshots. Refund reporting is deferred.

## S. Security

Strict bounded payloads reject forged financial fields; current eligibility/plan/coupon/context is recomputed. Persisted authentication, ownership and same-Origin checks protect financial browser mutations; durable HMAC-authenticated webhook receipt has its separate authentication model. Constraints enforce identity, owner, economics, safe release and one initial purchase/winner/use. Trigger guards prevent historical deletion or rewrites. Payment success depends on fetched exact provider facts, never client status/signature alone.

Dedicated secrets are not returned or logged. Errors and private responses are sanitized/non-cacheable. There are no unauthenticated test-charge routes, admin mark-paid, timer release, public recovery mutation, production-key fallback or weakened existing auth controls.

## T. Privacy

Normal PostHog sanitization drops Workspace payment/financial/order/reservation/redemption/refund event prefixes, strips financial/provider identifiers, coupon attribution, amounts and refund timing from allowed page events, and canonicalizes admin order paths. Admin financial/coupon content is inside `ph-no-capture`. No new behavioral financial events or private-service telemetry were emitted.

Database/admin evidence remains authoritative. Test setup clears dedicated payment flags/secrets and blocks uninjected network fetch. No consent/legal policy text was invented. No real customer email was sent.

## U. Legacy payment isolation

Existing LMS course payment routes/services, legacy `orders`, coupons, enrollments, ownership and learner roles were not changed. Snapshot comparison verifies all pre-existing tables/enums remain identical. Course receipts/events cannot mutate Workspace through the isolated reconciler, which writes only the four new financial tables. Manual Workspace/eligibility/Phase 1.4 regressions remain in the full passing test suite; no real-environment legacy smoke is claimed without Phase 1.5AV authorization.

## V. Migration

Generated and reviewed **`drizzle/0012_useful_warhawk.sql`**, `drizzle/meta/0012_snapshot.json` and additive journal entry 12 from the verified `0011` head. Four tables, indexes/checks/composite foreign keys, immutable-history guards, capacity guard and three deferred completeness triggers are included. No seed or historical-row rewrite is included. Nullable check branches explicitly require evidence/timestamps rather than relying on SQL null comparisons.

**NOT APPLIED.** No `db:migrate`, schema push, reset, migration-ledger operation or database query ran. Applied SQL/snapshots 0000–0011, dependencies and lockfile are unchanged. Future verification must establish the actual ledger, retain 0011, review pending 0012, authorize the exact local database, use guarded migration execution and verify a second no-op. SQL trigger execution remains unverified until then.

## W. Tests/validation

Completed checks:

- Full `pnpm validate`: PASS — 5 Node test files and **416 Vitest tests across 34 files**, TypeScript `tsc --noEmit`, and lint with no warnings/errors.
- Payment-specific tests: **78 tests across five files** in that full run (service/model/inbox/routes/migration), plus all existing eligibility, membership, privacy, manual-flow and security regressions.
- Isolated `pnpm build`: PASS with previously cached local font assets, secrets cleared, no project `.env` files copied, and an unreachable synthetic database configuration. The build generated all 59 static pages. Normal remote-font build failed in the existing font loader; no font/dependency/source workaround was committed.
- `git diff --check`: PASS.
- Opt-in PostgreSQL harness syntax and disabled entry point: checked. Its real database body was not enabled/executed.
- Pre-existing migration SQL/snapshots 0000–0011 and `pnpm-lock.yaml`: unchanged.

Initial TypeScript test-helper/config typing failures were corrected, then the complete validation command passed. No dependency install, schema application, live provider test or real financial smoke was performed.

Deterministic coverage includes changed price/plan/settings/policy/launch/hash, expired eligibility/coupon, paused/wrong-plan/removed coupon, payload/key idempotency and overlap, simulated final-slot/unlimited capacity, safe closure/retry, provider rejection/ambiguity/crash/receipt recovery, exact callback capture, wrong owner/amount/currency/order/account, authorized/failed/out-of-order evidence, duplicate captures, atomic rollback/retry, callback/webhook convergence, event hash anomaly/unmatched/course events, raw HMAC/size/authentication, gate safety, exact 72 hours, no access, migration scope and analytics privacy.

`tests/postgres/workspace-financial-concurrency.test.mjs` is an opt-in two-connection harness for future Phase 1.5AV. It requires an explicit verification flag, development/test classification, exact localhost:5433/airbharath_lms URL and separately reviewed fixtures with two persisted synthetic eligible users plus a fresh `WS15AV_` limit-one coupon. It commits one winning reservation, expects the competing capacity rejection, and checks economic immutability, ledger deletion refusal and deferred incomplete-closure refusal. It retains history and never migrates/resets. Syntax/disabled-harness checks ran; **the database integration body did not run**. The future fixture JSON must contain reviewed snake_case accepted-order fields; preparation is part of the separately authorized verification.

## X. Files changed

- `WORKSPACE_PHASE15A_IMPLEMENTATION.md`
- `app/(admin)/admin/workspace/orders/page.tsx`
- `app/api/admin/workspace/coupons/[id]/financial/route.ts`
- `app/api/admin/workspace/orders/route.ts`
- `app/api/workspace/membership/orders/[id]/route.ts`
- `app/api/workspace/membership/orders/route.ts`
- `app/api/workspace/payments/razorpay/confirm/route.ts`
- `app/api/workspace/payments/razorpay/webhook/route.ts`
- `components/admin/AdminSidebar.tsx`
- `components/workspace/WorkspaceCoupons.tsx`
- `drizzle/0012_useful_warhawk.sql`
- `drizzle/meta/0012_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/analytics-privacy.ts`
- `lib/workspace/membership/service.ts`
- `lib/workspace/payments/http.ts`
- `lib/workspace/payments/model.ts`
- `lib/workspace/payments/provider.ts`
- `lib/workspace/payments/repository.ts`
- `lib/workspace/payments/runtime.ts`
- `lib/workspace/payments/service.ts`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/postgres/workspace-financial-concurrency.test.mjs`
- `tests/routes/workspace-payments-fixtures.ts`
- `tests/routes/workspace-payments-inbox.test.ts`
- `tests/routes/workspace-payments-migration.test.ts`
- `tests/routes/workspace-payments-model.test.ts`
- `tests/routes/workspace-payments-routes.test.ts`
- `tests/routes/workspace-payments-service.test.ts`
- `tests/setup.ts`

## Y. Known limitations

Phase 1.2 differences required by this brief: financial capture and activation are separated, all profile/membership issuance is deferred, the refund window is exactly 72 elapsed hours, and an unproven capture timestamp is an explicit held state with null timing. Phase 1.5A does not provide a real-provider timestamp strategy; that remains a release prerequisite rather than guessed evidence. No unrelated architecture or product scope was changed.

1. New SQL, real PostgreSQL races/triggers and authenticated real-environment smoke remain unverified until separately authorized Phase 1.5AV. Simulated concurrency is not a substitute.
2. No Razorpay sandbox call was authorized/made. Credential/account binding, receipt-search behavior, documented error classification, webhook delivery and capture evidence need authorized sandbox verification before release use.
3. Exact provider capture timing is unresolved by the fetched contract: money is captured/held, not silently assigned an invented timestamp. An approved authoritative timing strategy is required before real launch/refund boundaries can be finalized.
4. Recovery is a service foundation only: no deployed scheduler, alerting or operator command. Ambiguous payable holds intentionally remain occupied; lookup absence is never a release signal. Inbox lease overlap may duplicate provider reads, but locked financial idempotency prevents duplicate winners/redemptions.
5. The admin table initially displays 25 orders; additional pages are available through the read-only API. Full operational tooling, alerts, refund displays and live financial monitoring are deferred.
6. Final commercial terms and public charging are intentionally absent. The database currently permits only the test/noncommercial policy and test provider mode; Phase 1.5B needs a separately reviewed commercial-policy extension.
7. The initial remote-font production build failed in the existing Next font loader while parsing Google font URLs. Cached local font assets are used for the isolated build check; the normal environment font fetch remains a build-environment check, with no unrelated font/dependency edits.

## Z. Deferred Phase 1.5B items

Creator profile/membership issuance, creator entitlement, public purchase/checkout, final versioned commercial consent, complete authoritative capture-time policy, activation fulfillment/retry/outbox, emails/invoices, refunds, renewals and production enablement remain deferred. Dashboard/course drafts/course ownership/payouts/commission/course sales are outside this phase.

**Recommendation: perform a separately authorized Phase 1.5AV verification before Phase 1.5B or any public charging. STOP at Phase 1.5A.**
