# Workspace F.1 revised pricing — real database completion

**WORKSPACE F.1 REVISED PRICING REAL DB + BROWSER PASS**

The exact authorized migration 0026 was applied only to the identified local development database. Revised rates now drive database-backed quotes and accepted order snapshots. Historical prices, captures, refunds, agreements and entitlements were preserved. Public payments remain disabled. This result is not production migration/deployment or public-launch authorization.

## A. Branch and starting HEAD

Branch `codex/workspace-1.8-launch`; starting HEAD `3e0f4ff`, clean worktree. Original F.1 proposal report remains unchanged as historical evidence. No Phase 1.9, email verification or broad redesign work.

## B. Authorized database identity

TCP `localhost:5433/airbharath_lms` and `/tmp` Unix socket port 5433 independently matched database `airbharath_lms`, OID `16384`, PostgreSQL system identifier `7680462735222304705`. `DATABASE_ENV=development` was supplied to local operations. No credentials or full connection strings were printed.

## C. Actual migration ledger

Before: exactly **26 entries, 0000–0025**. All source SQL SHA256 values and journal timestamps matched; journal contained exactly one pending entry, 0026.

After: exactly **27 entries, 0000–0026**. Final readback revalidated every hash/timestamp. No other migration, schema push/reset, ledger manipulation or trigger disabling occurred.

## D. Migration 0026 hash, review and no-op

Applied `drizzle/0026_workspace_membership_pricing_v2.sql` unchanged:

`5af885540dc1927ed3a7ed9fe54fb94a83f7658b2d2f7e49c09a02a37c3c66b8`

Guarded `pnpm db:migrate` succeeded. `ALLOW_DATABASE_MIGRATION=true` was supplied only to the two migration executions, never persisted in `.env`. The second invocation succeeded as a **no-op**: ledger remained 27 matching entries, catalog remained nine total rows with exactly three current successors; no duplicate versions appeared. No applied migration SQL was edited.

Both commands emitted the existing local PostgreSQL collation-version warning (database 2.39 versus host 2.43). Migration and verification succeeded. No collation rebuild/refresh was authorized or performed; local database maintenance remains separate.

## E. Development-versus-production catalog portability assessment

The migration is a narrowly guarded successor publication, not a generic catalog publisher. Its original UUIDs originate in migration 0010. Under the catalog lock, it requires the exact three current v1 definitions and rejects unexpected successor versions and reserved UUID collisions. The `UPDATE ... WHERE is_current` therefore affects exactly those three reviewed rows, not arbitrary plan references. It never updates foreign keys on historical orders.

It does **not** require Quarterly synthetic versions 2–4 to exist. Before applying it, eight real PostgreSQL read-only CTE scenarios evaluated the exact SQL precondition expression extracted from the reviewed migration:

| Catalog history | Result |
|---|---|
| Actual local history | Accepted |
| Original three-plan production-shaped history, no synthetic versions | Accepted |
| Different current price | Refused |
| Different original UUID | Refused |
| Different current version | Refused |
| Unavailable current plan | Refused |
| Unexpected historical successor | Refused |
| Reserved successor UUID collision | Refused |

Quarterly v5 is a deliberate safe successor even when versions 2–4 are absent. Half-yearly/Yearly use v2. Different production history must be inspected under separate authorization; unexpected current definitions/collisions require a new reviewed proposal rather than assuming portability. No production database was accessed to make this assessment.

## F. Preserved historical plan versions

All six pre-existing plan definitions remain present. The three original v1 rows changed only `is_current: true → false`; their UUIDs, monetary definitions, duration and publication evidence are unchanged. Non-current Quarterly synthetic v2/v3/v4 rows are entirely unchanged. Historical accepted orders still reference their original plan IDs/version snapshots. Exactly three new successor rows were inserted.

## G. Exact current catalog amounts

| Plan | Version | Months | Base paise | GST paise | Total paise | Inclusive total |
|---|---:|---:|---:|---:|---:|---:|
| Quarterly | 5 | 3 | 499915 | 89985 | 589900 | **₹5,899.00** |
| Half-yearly | 2 | 6 | 847373 | 152527 | 999900 | **₹9,999.00** |
| Yearly | 2 | 12 | 1499915 | 269985 | 1769900 | **₹17,699.00** |

Successor UUID suffixes are `...000004`, `...000005`, `...000006` respectively under `14000000-0000-4000-8000-`. Direct SQL and `getCurrentPlans` verified one current plan per stable code, exact versions/durations, INR and 1800 tax-rate basis points. Installed catalog/order/applicability constraints remain present.

## H. Real PostgreSQL plan quotes

Real `getWorkspaceMembershipQuote`/`readMembershipQuote`, payment acceptance, PostgreSQL finance store and fake-provider reconciliation verified all three current full-price totals. Each accepted row froze the correct base, GST, total, plan ID/version, eligibility context and two independent legal receipts. Fake provider creation received exactly the frozen accepted amount, outside the caller's transaction. No UI constants became checkout authority; the database catalog remains authoritative and `workspace-pricing-v1` remains the unchanged integer calculation rule.

Fixtures are tagged `WSF1R` with a unique run UUID and retained as development evidence. Eligibility was decided by the real submission service; legal acknowledgements used the real Terms and Refund Policy acceptance services. No direct eligibility approval, manual paidAt or creator/membership insert was used.

## I. Coupon applicability across successor plan versions

Actual `workspace_coupon_plans` uses stable `plan_code`, not plan-version UUID. Fixed, percentage and Quarterly-only influencer coupons were created through the real admin service **before** migration. They still apply to intended successor codes afterward. Quarterly-only applicability was refused for both six- and twelve-month plans; no duration was added.

Real invalid, expired, paused, exhausted and previously redeemed/refunded same-code refusals passed. Preview requests created zero reservations. Global capacity stays shared between modes; Test paid economics do not become Live revenue.

## J. Fixed and percentage GST calculations

Integer paise, half-up rounding, discount before GST:

| Plan | Coupon | Discount | Taxable | GST | Payable |
|---|---|---:|---:|---:|---:|
| Quarterly | ₹500 fixed | 50000 | 449915 | 80985 | **530900** |
| Quarterly | 10% | 49992 | 449923 | 80986 | **530909** |
| Half-yearly | ₹500 fixed | 50000 | 797373 | 143527 | 940900 |
| Half-yearly | 10% | 84737 | 762636 | 137274 | 899910 |
| Yearly | ₹500 fixed | 50000 | 1449915 | 260985 | 1710900 |
| Yearly | 10% | 149992 | 1349923 | 242986 | 1592909 |

All six actual PostgreSQL quote/order/capture scenarios matched. Quarterly payable is **₹5,309.00 / ₹5,309.09** respectively. A cap-15 campaign first accepted 12 reservations; four independent PostgreSQL connections were observed waiting for its coupon lock, then competed for three remaining slots: **three committed, one capacity refusal**, exactly 15 reservations. No oversell.

## K. Stale quotes and idempotency

A pre-migration unaccepted v1 quote was refused by real acceptance with `quote_changed`; the obsolete v1 plan selection returned HTTP **409** in the actual app. Two orders accepted before migration were recovered using their original request keys without re-quoting or repricing. IDs, plan snapshots, accepted legal IDs, amounts, original hashes and provider orders remained consistent. Existing client-price injection regressions passed; new quote/order values came from the server.

## L. Historical pending-order reconciliation

After the fresh preservation baseline, two new tagged old-price pending fixtures were accepted/submitted **before** migration, avoiding any mutation of pre-existing financial history. After publication:

- Old full-price Quarterly retained base `499900`, GST `89982`, total **`589882`**.
- Old ₹500-discounted Quarterly retained base `499900`, discount `50000`, taxable `449900`, GST `80982`, total **`530882`**.

Both retained original v1 plan references, request/quote and agreement snapshots. Real PostgreSQL reconciliation consumed fake captures at the original provider amounts and fulfilled once. Their later refunds also used the original amounts. New catalog prices were not required for their capture or refund.

## M. New captured-order verification

Three full-price and six coupon-discounted successor orders captured through real services. One further new fixed-discount capture without verified timing remained `captured / held_for_review / capture_time_unverified`, with `paidAt` and refund deadline null, reserved coupon and no fulfillment. Confirmed paid revenue excludes it.

Verified-timing fixtures used the existing development/Test-only `test_authoritative` fake adapter rule, not fabricated genuine webhooks. Every confirmed order retained an exact **259200000 ms** refund window and normal exactly-once profile/membership fulfillment. Repeated fulfillment returned the same membership. Winning financial rows remained unique; roles stayed `student`.

Pre-launch paid terms still start **2026-11-08T18:30:00.000Z**. Ends verified: Quarterly `2027-02-08T18:30:00.000Z`, Half-yearly `2027-05-08T18:30:00.000Z`, Yearly `2027-11-08T18:30:00.000Z`. No entitlement or term arithmetic changed.

## N. Old/new/discounted refund handling

Real request/decision/intent/reconciliation services with fake refund evidence verified four full refunds:

| Scenario | Original captured/refunded paise |
|---|---:|
| Old full price | 589882 |
| Old discounted | 530882 |
| New full price | 589900 |
| New discounted | 530900 |

Request-only and approval/pending provider refund produced no completed-refund row. Only processed fake provider evidence created completion; repeated reconciliation retained one completion per order. Paid editing was revoked after confirmed refund, with history retained. Redeemed coupon usage stayed consumed; the same-code quote was refused after refund. No genuine refund HTTP operation or Mailercloud delivery occurred.

## O. Mixed-price admin reporting totals

Real SQL Test report for the fixed coupon combines the old-price discounted order, three new-price discounted orders, a held capture and two full refunds:

| Metric | Fixed campaign | Percentage campaign |
|---|---:|---:|
| Original base paise | 3347103 | 2847203 |
| Discounts | 200000 | 284721 |
| Discounted taxable base | 3147103 | 2562482 |
| GST | 566479 | 461246 |
| Gross confirmed captured | 3713582 | 3023728 |
| Completed refunds | 1061782 | 0 |
| Net captured | **2651800** | **3023728** |
| Confirmed paid / fulfilled | 4 / 4 | 3 / 3 |
| Held captures | 1 | 0 |
| Redeemed / reserved capacity | 4 / 1 | 3 / 0 |
| Fully refunded / retained memberships | 2 / 2 | 0 / 3 |

Independent literal-case SQL totals across **all** this run's old/new confirmed orders: base **9541409**, discount **484721**, taxable **9056688**, GST **1630204**, gross **10686892**, refunded **2241564**, net **8445328** paise. That is **₹1,06,868.92 gross / ₹22,415.64 refunded / ₹84,453.28 net**; 11 paid/fulfilled, four full refunds, seven retained memberships. There are 27 synthetic accepted orders total: 12 captures (11 timed, one held) plus 15 unpaid cap-test orders.

Actual Test report aggregates matched independent expectations. Live report gross/net stayed zero while global capacity remained occupied. Reporting never repriced historical money from current catalog rows. An authenticated no-store report response matched fixed-campaign gross/refund/net and exposed no phone/email or provider payment/refund IDs. Legacy LMS tables remained byte-fingerprint unchanged; fixtures created no LMS orders/enrollments/certificates.

## P. Hydrated browser desktop/mobile evidence

Existing Chrome/Playwright runtime; isolated development app using the approved database, synthetic real JWT signer/session identities and no real provider configuration. **12 browser checkpoints passed**, including public release targets, all three inclusive totals, exact GST, fixed and percentage quotes, Apply/Remove, plan switching, invalid/expired/paused/exhausted refusals, obsolete quote 409, reload, current membership/dashboard and historical old-price refunded amounts. Both desktop and **390 × 844** checks passed with no material horizontal overflow.

Initial 32-character coupon testing reproduced a genuine mobile layout issue: page width **409** in a **390** viewport. A browser probe confirmed grid min-content sizing; the minimal correction allows sections to shrink, wraps long coupon labels and prevents amounts shrinking. The original failing hydrated test then passed on the rebuilt code; the viewport measured 390. No navigation/footer redesign occurred.

The initial production-build browser app intentionally refused Test entitlement as `unclassified`. This was a correct environment guard. Membership browser tests then ran with `NODE_ENV=development` and `DATABASE_ENV=development`; no guard was weakened. The separate payment-disabled production build passed.

Screenshots retained outside Git and visually inspected:

- `/tmp/wsf1r-browser-artifacts/customer-desktop-fixed.png`
- `/tmp/wsf1r-browser-artifacts/customer-mobile-fixed.png`
- `/tmp/wsf1r-browser-artifacts/member-current.png`
- `/tmp/wsf1r-browser-artifacts/historical-old-refund.png`

Checkpoint evidence: `/tmp/wsf1r-browser.json`; original failure evidence `/tmp/wsf1r-browser-before-fix.json`; production classification observation `/tmp/wsf1r-browser-production-guard.json`. External image/proxy requests were deliberately blocked; missing remote logos in screenshots do not demonstrate an asset defect. Browser recorded zero page/hydration errors and zero material console errors. The 29 expected resource-console messages came from blocked assets and intentional negative HTTP probes, not unreported application exceptions.

## Q. Payment-disabled/privacy proof

Actual disabled order endpoint returned **503** before provider/database acceptance. Activation CTA remained disabled, with **Payments not yet enabled** and **Workspace payments are awaiting launch verification**. Checkout requests **0**, analytics requests **0**; external resource requests blocked **24**. Quote/admin reporting responses were no-store with no contact or private provider fields. Independent Terms and Refund Policy controls remain intact.

Scrubbed app/build processes had no real Razorpay/MSG91/Mailercloud credentials. No production/private provider, deployment or `.env` changes. No public payment enablement. Financial adapters were in-process synthetic fakes; global external fetch was prohibited. Notification records remain synthetic development evidence; no delivery worker was started.

Cleanup completed: only task-owned isolated app processes stopped, build copies removed, synthetic JWT secret/session token files deleted. Screenshots and immutable financial fixtures retained. Payment/refund/webhook/reconciliation flags in the browser app were false; fake financial authorization existed only in terminated verification processes, never `.env` or product defaults.

## R. Original-row preservation

Fresh repeatable-read baseline **55 public tables / 4,213 original rows**, before any F.1 continuation fixtures. File `/tmp/wsf1r-original-fingerprints.json`, SHA256:

`0b1231b9ea7051587e70d5a47a83edcaeac83664db5556457c3c6f49d91c57a9`

After migration and final verification: **4,210 unchanged fingerprints + exactly three expected original current-flag transitions + three new plan rows**. All prior non-current plans and original financial, legal, coupon, membership, course/review and influencer history remained unchanged. Full legacy table contents were unchanged, not merely original-row subsets. New tagged fixtures are additions, not preservation exceptions.

Prior F.1 baseline remains untouched at SHA256 `52ffc4d540efc0c23a97ef0737eab663da589872658cc40ccfce1cce93a62323`; prior E.1 baseline/reports remain retained. The owner-approved E.1 course approval was already in the fresh baseline and remained unchanged. No broader exception was introduced. Final evidence `/tmp/wsf1r-preservation-final.json` and `/tmp/wsf1r-final-db.json`.

## S. Tests/build

- Full `pnpm validate`: **80 Vitest files / 983 tests passed**, up from 981; all **five** pure Node test files passed, plus TypeScript and lint.
- Includes pricing/coupons/influencers, financial reconciliation, refunds, legal receipts, fulfillment/access, reporting, privacy/security and customer UI suites. Two new UI regressions verify inclusive successor presentation and release/historical amount sourcing.
- Corrected payment-disabled isolated production build: **PASS**. Cached font mock and unreachable synthetic DB prevented production/network dependencies.
- Migration generation/no-drift: **No schema changes, nothing to migrate**; no 0027 generated.
- Four new CJS harness syntax checks: PASS. Real PostgreSQL and hydrated browser harnesses completed.
- `git diff --check`: PASS. No dependency/lockfile change or applied migration rewrite.

## T. Corrections/commits

Product/UI commit **`be7d014`**: inclusive server-derived card prices, preserved original payment amount on membership history, accurate targeted-release messaging and measured mobile long-coupon correction. Verification/report committed separately; final hash returned to owner.

Changed files (entire continuation):

1. `components/workspace/ActivationPreview.tsx`.
2. `components/workspace/WorkspaceLanding.tsx`.
3. `app/(user)/workspace/activate/page.tsx`.
4. `app/(user)/workspace/member/page.tsx`.
5. `tests/routes/workspace-membership-ui.test.ts`.
6. `tests/postgres/workspace-pricing-preservation-verification.cjs`.
7. `tests/postgres/workspace-pricing-real-verification.cjs`.
8. `tests/postgres/workspace-pricing-final-verification.cjs`.
9. `tests/postgres/workspace-pricing-browser-verification.cjs`.
10. `WORKSPACE_LAUNCH_F1_PRICING_REAL_DB_COMPLETION.md`.

No financial service or migration correction was needed. A test-loader-only session preparation issue was fixed by isolating unused DB/cookie imports while retaining the real signer. Completed financial fixtures cannot be recreated by rerunning the after-harness; they remain immutable evidence.

## U. Remaining October 14 release blockers

F.1 pricing verification has no remaining blocker. Public release still requires separate production catalog/identity review and migration authorization, production provider/configuration readiness, genuine refund-webhook evidence, worker/scheduler and notification delivery readiness, commercial release review and final release smoke. No production or genuine provider verification is claimed here.

Existing membership/refund views show original amounts; a Workspace tax invoice/receipt issuance workflow was not available or invented. Commercial invoice/receipt readiness remains separate from this price verification. Local collation-version maintenance is recorded for a separately reviewed maintenance task. Planned media/publication/sales remain outside Phase 1.8 and F.1 scope.

## V. Recommendation

**WORKSPACE F.1 REVISED PRICING REAL DB + BROWSER PASS.** Exact authorized local migration, no-op, historical preservation, successor quotes/coupons, old/new real PostgreSQL financial/refund/reporting lifecycles, actual hydrated desktop/mobile checks, full validation and safe build all passed. Public payment remains OFF. Stop at F.1; do not begin another phase or production charging.
