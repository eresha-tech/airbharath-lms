# Workspace F.1 membership pricing verification

**WORKSPACE F.1 PRICING BLOCKED — catalog publication requires separately authorized migration 0026.**

This is a reviewed migration proposal and preflight report, not a claim that the revised catalog is active. F.1 section 4 explicitly prohibits applying any new migration without separate authorization. No migration SQL, including a rollback-only application, was executed. There is no alternate pricing override that bypasses the database guards.

## A. Starting branch and HEAD

- Branch: `codex/workspace-1.8-launch`.
- Starting HEAD: `ac10897`; starting worktree clean.
- Scope: F.1 only. Phase 1.9 remains frozen. No deployment, production access, genuine Razorpay operation, dependency change or public payment enablement.

## B. Pricing source-of-truth architecture

`workspace_membership_plans` is the authoritative catalog. `lib/workspace/membership/service.ts` reads current rows for both `getCurrentPlans` and `readMembershipQuote`. The model performs integer-paise, half-up GST and discount arithmetic. Activation plan cards, summary and coupon quotes use these values; they are not an independent authority.

The installed `workspace_phase14_plan_immutable` trigger forbids changing historical plan definitions. Only `is_current` can change. The installed `workspace_phase15_order_guard` checks a new order's base, duration, plan ID and version/name snapshot against its referenced current plan. An application-only monetary override would fail this check. Existing accepted order economics cannot be changed.

Payment creation/fetch/reconciliation use `order.totalPaise`, not the current catalog. Refund requests, execution intents and completed refunds use the original captured/order amount. Influencer reporting aggregates persisted order base, discount, taxable, GST and total values and confirmed refund completions; it does not join the current catalog to recompute historical money. Membership fulfillment uses the frozen order duration and existing verified-paidAt/start rule. Creator Terms and Refund Policy acceptances remain independent and unchanged.

Relevant sources: membership model/service; payments service/repository/model; refunds service; activation service; membership reporting; `ActivationPreview`, `WorkspacePlanSummary`, `MembershipCheckout`; activation/member/refund/admin financial pages. The public landing page currently has commercial-model messaging but no numeric membership catalog. Historical monetary fixtures and applied migration 0010 retain their original values intentionally.

## C. Old versus new price catalog

| Plan | Months | Current total | Proposed base | Proposed GST | Proposed total |
|---|---:|---:|---:|---:|---:|
| Quarterly | 3 | ₹5,898.82 | ₹4,999.15 | ₹899.85 | ₹5,899.00 |
| Half-yearly | 6 | ₹10,618.82 | ₹8,473.73 | ₹1,525.27 | ₹9,999.00 |
| Yearly | 12 | ₹20,058.82 | ₹14,999.15 | ₹2,699.85 | ₹17,699.00 |

Approved successor base/GST/total paise: Quarterly `499915/89985/589900`; Half-yearly `847373/152527/999900`; Yearly `1499915/269985/1769900`. These are proposed future-order amounts; the local current catalog is still version 1.

## D. Pricing version/snapshot decision

Reuse existing tables and durable `planVersionId` plus `planSnapshot.version/displayName` and immutable monetary order snapshots. Do not change `workspace-pricing-v1`: that identifies the unchanged calculation algorithm and is also checked by the database trigger. Publishing a successor plan ID/version invalidates old selections and quote hashes without a new pricing table or legal acceptance version.

Actual PostgreSQL inspection found six plan rows: the three current version-1 definitions and retained non-current Quarterly synthetic versions 2, 3 and 4 from earlier WS14V verification. The initial three-total-row assumption was corrected before any mutation. Preserve all three synthetic versions.

Proposed successor plan versions: Quarterly **5**, Half-yearly **2**, Yearly **2**. Stable codes and durations remain unchanged; successor UUIDs are new, preserving all prior plan references. The migration locks the catalog, verifies the reviewed current definitions, rejects unexpected successors/ID collisions, clears only prior current flags and inserts three immutable successor rows in the guarded runner's transaction. It does not update historical plan prices, orders or payments.

## E. GST integer arithmetic

All calculation remains integer paise using BigInt multiplication/division with half-up rounding. Revised prices are not treated as before-GST amounts. `base + rounded(base × 18%)` equals each owner's inclusive total exactly. PostgreSQL read-only `VALUES` calculations independently matched the application expectations for all nine undiscounted/fixed/percentage cases.

## F. Fixed and percentage coupon calculations

| Plan | Coupon | Discount paise | Taxable paise | GST paise | Payable paise |
|---|---|---:|---:|---:|---:|
| Quarterly | ₹500 fixed | 50000 | 449915 | 80985 | **530900** |
| Quarterly | 10% | 49992 | 449923 | 80986 | **530909** |
| Half-yearly | ₹500 fixed | 50000 | 797373 | 143527 | 940900 |
| Half-yearly | 10% | 84737 | 762636 | 137274 | 899910 |
| Yearly | ₹500 fixed | 50000 | 1449915 | 260985 | 1710900 |
| Yearly | 10% | 149992 | 1349923 | 242986 | 1592909 |

Quarterly payable: **₹5,309.00 fixed / ₹5,309.09 percentage**. Existing capacity, conservative reservations, redeemed-use retention after refund, source attribution and Test/Live report separation are unchanged. The existing coupon regression suite ran; new real financial fixtures are deferred until publication authorization.

## G. Stale quote handling

Existing acceptance re-reads the current plan and server quote inside financial locks. A selection referencing the old plan ID returns `quote_changed`; an altered hash also fails. An accepted same-key/same-payload request resolves its persisted order before re-quoting, preserving its original economics. New adapter regressions exercised both outcomes after a simulated successor catalog switch. Client `totalPaise` injection was rejected for each proposed plan.

## H. Existing pending order preservation

All existing local rows were unchanged, including pending provider-backed orders, payment observations, legal receipts, memberships, reviews, refunds and historical attribution. No existing order was closed, recaptured or repriced. A focused fake-provider service test exercised an old pending Quarterly order across a simulated catalog switch and retained `499900` base, `89982` GST, `589882` total and original plan ID/version.

**Real PostgreSQL reconciliation across actual catalog publication: NOT RUN**, because 0026 is unapplied. Preservation fingerprints prove no changes, not successful post-publication reconciliation.

## I. Old/new reconciliation

Adapter verification passed old pending reconciliation at the original amount and accepted/new synthetic financial reconciliation for all three successor full-price totals. Provider creation received the exact accepted order amount; the old scenario created its provider order once. These are fake adapters using real service logic, not genuine Razorpay or real SQL financial transactions. Real old/new service scenarios remain required after authorized migration.

## J. Refund correctness

Code inspection confirms request/attempt/completion amounts derive from the original captured order and winner; no current-plan lookup reprices refunds. Existing refund regression tests passed in full validation. Old-order adapter reconciliation retained an exact `259200000` ms refund deadline. Real old/new/discounted refund verification after publication remains pending; no refund was executed during F.1.

The official paid-term boundary remains `2026-11-08T18:30:00.000Z` (9 November IST); elapsed 72-hour refund and calendar-month membership calculations were not changed.

## K. Admin reporting

The persisted-order aggregation architecture preserves historical prices and refunds. All existing reporting tests passed. **A real mixed old/new-price report is NOT VERIFIED**: no new-price financial rows were created while catalog publication is blocked. Required continuation: tagged fake-provider old/new captures, held classifications, completed refunds and membership counts against real PostgreSQL.

## L. Browser desktop/mobile evidence

**NOT RUN for F.1.** The revised catalog cannot be displayed by an honest database-backed isolated app until separately authorized migration publication. No browser screenshot is offered as revised-price evidence and no Checkout was launched. Existing UI regressions passed against the still-valid old catalog.

Required continuation: customer cards with inclusive totals, explicit GST label, coupon Apply/Remove, plan switching, immediate quote totals, reload, historical order details, desktop/mobile overflow, console/hydration and payment-disabled checks. Public landing/release copy must describe available private Early Access preparation and scheduled full Workspace launch on 9 November 2026 without promising current uploads/publication/sales. No UI copy/layout was prematurely changed during this blocked proposal stage.

## M. Original data preservation

Authorized target independently verified through TCP `localhost:5433` and the application's `/tmp` Unix socket on port 5433:

- Database `airbharath_lms`, OID `16384`.
- System identifier `7680462735222304705`.
- `DATABASE_ENV=development`; no migration authorization flag supplied.
- Both connections matched the exact intended server/database.
- All 26 applied ledger entries `0000–0025` matched their source SQL SHA256 and journal timestamps. Applied SQL files, including 0025, were untouched.

Independent F.1 repeatable-read, read-only fingerprints: **55 public tables / 4,213 original rows**, all unchanged in the final comparison. Baseline `/tmp/wsf1-preflight.json`, SHA256 `52ffc4d540efc0c23a97ef0737eab663da589872658cc40ccfce1cce93a62323`. It contains only safe identity, catalog, ledger and row fingerprints, not private row contents; it was never overwritten.

No synthetic data writes were made. The prior E.1 owner-confirmed course approval remains in its existing state; no new preservation exception was introduced. The after-check also confirmed the same 26-entry ledger and absence of applied 0026.

A harness-only comparison issue (postgres-js `Result` prototype versus parsed JSON arrays) was normalized without changing the baseline or weakening row comparisons. The initial automatic approval review did not recognize attachment authorization; after surfacing sections 4/15, the same read-only command was approved. No rejected action was bypassed.

## N. Tests/build

- Focused F.1: **15/15 tests passed**.
- Full `pnpm validate`: **80 Vitest files / 981 tests passed**, plus all five pure Node test files; TypeScript and lint passed. Prior count 966; added 15.
- Includes existing pricing/coupon, payment/reconciliation, refund, agreement snapshot, fulfillment, creator access, admin report and membership UI suites.
- Initial new-test TypeScript excess-property error was corrected by assigning the tampered payload to a variable; its extra field still reaches the real runtime parser and is rejected. Validation then passed in full.
- Isolated production build with payment flags false, no real provider credentials, unreachable synthetic DB and cached Google-font mock: **PASS**. No production database or font service contacted.
- `pnpm db:generate` after the custom proposal: **No schema changes, nothing to migrate**; it produced no extra migration. This verifies structural no-drift, not applied-data readiness.
- New PostgreSQL harness `node --check`: PASS. The task-owned isolated build directory was removed after success; no app process or payment flags remain.
- `git diff --check`: PASS.

Local validation commands use scrubbed environments; no `.env` modification, secret output or dependency/lockfile change.

## O. Corrections/commits

Proposal implementation commit: `857d2f2` (`chore(workspace): propose versioned F.1 membership pricing catalog`). This report is committed separately; its final commit hash is returned to the owner.

Changed files:

1. `drizzle/0026_workspace_membership_pricing_v2.sql` — unapplied transactional successor catalog proposal and preconditions.
2. `drizzle/meta/_journal.json` — append proposed migration entry only; existing entries unchanged.
3. `drizzle/meta/0026_snapshot.json` — generated unchanged-schema successor snapshot.
4. `tests/routes/workspace-pricing-f1.test.ts` — 15 monetary, version, stale/tampered input and frozen-order fake-provider regressions.
5. `tests/postgres/workspace-pricing-preflight-verification.cjs` — opt-in, exact-target read-only identity/hash/arithmetic/preservation checks.
6. `WORKSPACE_LAUNCH_F1_MEMBERSHIP_PRICING_VERIFICATION.md` — this report.

No product code was changed: database publication is the necessary first step, and no UI-only price override was introduced. No broad redesign, email verification or Phase 1.9 work.

## P. Proposed migration

`0026_workspace_membership_pricing_v2.sql` SHA256:
`5af885540dc1927ed3a7ed9fe54fb94a83f7658b2d2f7e49c09a02a37c3c66b8`.

**UNAPPLIED.** It adds catalog data in the existing table, not a new schema/table. Review and explicit local migration authorization are needed before using guarded `pnpm db:migrate`. A rollback-only rehearsal would still execute migration SQL and was not performed. After authorization, recheck identity/hashes/current versions, fingerprint originals, apply only reviewed 0026, verify second-run no-op, and compare every historical row with only the explicitly intended three `is_current` flag transitions plus three new plan rows accounted for. Do not broaden exceptions to financial/history tables.

## Q. Remaining October 14 release blockers

1. Authorize and verify local catalog migration 0026.
2. Complete real PostgreSQL new quote/order, discounted capture, old pending reconciliation, refunds, capacity and mixed-price reporting verification.
3. Complete inclusive-price/customer release copy and hydrated desktop/mobile checks with the published catalog.
4. Production/commercial release remains a separate gate: genuine refund webhook evidence, Live configuration, production migration authorization, scheduler/worker operations, notification delivery and final release smoke require their own review; F.1 does not authorize these operations.

Payment-disabled behavior, both independent legal acknowledgements, provider/domain isolation and frozen financial history remain intact. No temporary payment authorization was enabled or persisted; no local payment app was started.

## R. Recommendation

**WORKSPACE F.1 PRICING BLOCKED.** Exact failing stage: publication of the revised durable catalog, requiring new migration 0026 that this brief explicitly leaves unauthorized. Arithmetic, offline adapter regressions, read-only database preflight/preservation, validation and safe build passed. Revised-price real PostgreSQL service and hydrated browser PASS criteria remain unmet. Stop for review; do not enable public charging or continue another phase.
