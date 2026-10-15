# Workspace E.1 final continuation — real financial verification

13 October 2026. Branch `codex/workspace-1.8-launch`; starting HEAD `2bfef3c`, clean worktree.

**INFLUENCER COUPONS VERIFICATION BLOCKED**

The owner-approved course-review exception is verified and all other originals are preserved. Real two-session final-slot reservation and request-key replay checks passed. Real held-capture reconciliation then exposed a separate applied-schema defect: the old deferred financial consistency trigger requires a captured coupon order to be redeemed, conflicting with the corrected requirement to keep an unverified/held capture RESERVED. PostgreSQL rejected the commit with 23514 and rolled back its attempted payment evidence.

Per this task's §12, generated proposed additive 0025, left it unapplied and stopped subsequent scenarios. This is not a full financial/browser PASS.

## A. Owner-confirmed course approval exception

The owner explicitly confirmed testing Admin Course Review approval at the time of the audited change. Accepted exception scope is solely:

- Submission `8bc83bf8-8a07-42d8-aeb7-7c5668c42b66`.
- Original fingerprint `55989a0858677f6f30a943cdb13d0cbc`.
- Exact approved fingerprint `0cd8a0f385694445532ba3ea845e43b1`.
- Approval event `490a8ee6-2107-40a9-aeb5-13942bf93fb2`, immutable event fingerprint `fa736cd98d3e9c538079f616df2862ee`.
- Under review → approved, version 2 → 3; completion/update time 13 October 2026 10:52:21.519 IST.

The diagnostic's audit-derived prior-state reconstruction exactly matched the original fingerprint. Current submission and event hashes/UUID/status/version were rechecked before testing and remained exact afterward. No approval reversed, event removed, table-wide waiver or future-change waiver.

## B. Preserved original baseline and exact exception

Original `/tmp/wse1c-history-before.json` retained unchanged. Its SHA-256 is `bd530ecf9f1c06242eb84868732b4117fcd98debfb5768a7e84cf8aa291b271b`.

Original baseline remains **55 public tables / 3,725 original rows**. Strict fingerprint/multiplicity checks before and after this run require 3,724 original fingerprints unchanged and the one exact approved substitution. All other original records preserved, including previous financial/provider/refund evidence, coupons, memberships/profiles, courses, agreements, audit and notice records and legacy LMS contents. No new baseline was substituted. Reports and earlier exception evidence remain unchanged.

## C. Authorized database identity/ledger

Independent TCP and `/tmp` Unix socket paths matched:

| Property | Result |
| --- | --- |
| Database | airbharath_lms |
| Port | 5433 |
| OID | 16384 |
| PostgreSQL system identifier | 7680462735222304705 |
| Environment | development |

Before tests: **25 ledger entries, 0000–0024**, source/journal hashes and timestamps verified. No migration was applied in this final continuation. Ledger remains at 25; proposed 0025 is pending source only.

0023 unchanged SHA-256: `eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910`.

0024 unchanged SHA-256: `a43c81bc2dbe9cae06883946221e6487c51fd85d05ad2a49db38690250627f8e`.

## D. Influencer history guard confirmation

Catalogue confirmed both installed BEFORE TRUNCATE/FOR EACH STATEMENT guards and rejection function remain intact. Prior successful direct/cascade/multi-table and row-history probes were not unnecessarily repeated. No guard disabling or immutable-history cleanup.

## E. Coupon capacity and real concurrency

Created clearly tagged synthetic `WSE1F_<unique UUID>` influencer/coupon and two independently eligible users with normal agreement acceptances. Coupon fixed discount ₹500, applicability all three plans, cap ONE.

Two real PostgreSQL connections accepted different users' valid quotes concurrently. A separate blocker held the coupon row; `pg_stat_activity` observed **two distinct backends waiting on locks**. After release:

- One transaction committed an accepted order and RESERVED coupon use.
- Other transaction refused with application `capacity`.
- Actual occupied coupon ledger count: **1**.
- Fake provider order creation occurred once, after acceptance committed; no real HTTP.

This proves the exercised cap-one reservation race. Cap-three burst and simultaneous same-user race were not reached after the schema stop. Successful paid-cap conversion end-to-end is not claimed.

## F. Same-user/idempotency

Actual real DB service replay with the winning user's same request key/payload returned the same order ID. Same key with changed quote hash refused `conflict`; a different key for the same unresolved user/order also refused `conflict`. One reservation retained, no duplicate accepted/provider order. These replay checks were sequential; do not interpret them as the unexecuted simultaneous same-user race.

## G. Coupon pricing/GST

Normal real quote/acceptance paths used current committed Quarterly pricing and a fixed ₹500 pre-GST coupon. Full current pricing/percentage/plan/error matrix was interrupted and is not a real-DB PASS.

Source regression suite continues verifying integer paise, half-up tax, pre-GST discount and all current plan economics. Plan prices/terms and order history were not changed. The owner's newly approved launch totals (₹5,899 / ₹9,999 / ₹17,699 including GST) are **not implemented here** and remain a critical subsequent release task requiring safe versioned pricing; no silent repricing/backfill.

## H. Reservation uncertainty

One fake provider order was created outside DB locks and attached normally. The reservation remains occupied after the later reconciliation failure. Ambiguous create/TTL/recovery/safe-release matrices were not reached. No blind replacement provider order or cleanup release was attempted.

## I. Held capture versus paid redemption

Fake provider fetch returned an exact matching captured payment for the accepted discounted order, but capturedAt/capture-time source were NULL. The real reconciler attempted:

- financial captured;
- activation held_for_review / capture_time_unverified;
- paidAt and refund deadline NULL;
- reservation RESERVED;
- no membership grant.

At commit, actual PostgreSQL returned **23514**, message:

`Order and coupon financial ledger must commit together`

The transaction rolled back. Observed database state afterward:

| Field | Actual persisted value |
| --- | --- |
| financial_state | unpaid |
| activation_state | pending_activation |
| paid_at | NULL |
| coupon reservation | reserved |
| payment attempt rows for this order | 0 |

This is a failure to persist observed captured financial facts, not proof of a correctly committed held capture. No manual override or membership insertion was used.

The installed `workspace_phase15_financial_complete()` body exactly matches applied migration 0012. It is used by three DEFERRABLE INITIALLY DEFERRED constraint triggers (order, payment, redemption). Its captured-coupon check rejects any non-redeemed row except the existing reservation-inconsistent review case. That predates the correction requiring held captures to remain reserved, and conflicts with it. The new 0023 transition guard correctly prevents prematurely redeeming that held capture; weakening it is not a solution.

A separate valid authoritative capture, normal fulfillment and duplicate convergence were not reached.

## J. Refund/capacity behavior

Not reached. No synthetic or genuine refund initiated. Original refund evidence and redeemed usage remain unchanged. Requested/approved/full-refund reporting and same-code reuse after refund require continuation after schema correction authorization.

## K. Actual SQL reporting figures

No real aggregate revenue/report query matrix was completed. Verified direct capacity figure for the exercised coupon is one RESERVED use; no successful new paid redemption, membership or refund. The failing transaction produced zero persisted payment attempts. These are database state observations, not a substitute for expected aggregate financial-report totals.

Historical held-redemption reporting and concurrent report consistency remain unverified.

## L. Test/Live reporting separation

Not reached. Fake adapters use Test-shaped synthetic context only. No Live-shaped records persisted, no Live/Test provider contacted. Shared capacity model unchanged. Operational recommendation remains: **different campaign codes for Test verification and real commercial influencer promotions**.

## M. Attribution stability

New test coupon has a stable synthetic influencer FK. No historical relationship changed. Paid/refund attribution rename/reassignment matrix was not reached; prior immutability proofs remain historical evidence, not a substitute for this missing financial scenario.

## N. Admin browser verification

Not reached after required schema-stop condition. No isolated authenticated browser application started. Persisted admin service boundaries used for synthetic influencer/coupon creation; real HTTP/JWT/demotion and hydrated admin forms/reports remain unverified.

## O. Creator browser verification

Not reached. No real Checkout opened or public payment enablement changed. No hydrated customer PASS claimed.

## P. Mobile/privacy

Mobile viewport/network/analytics checks not executed. No PostHog ingestion, provider request or email sent. No real personal contact data, provider credentials, cookie or OTP used. Provider fake verifies it is outside the calling SQL transaction, while global fetch is forbidden. Generated fixtures and reports identify development evidence explicitly.

## Q. Historical-data preservation

After financial failure and fixture retention, strict preservation recheck passed with exactly the approved course transition: **3,724 unchanged originals + one owner-approved exact exception**. No other original mismatch. Original baseline SHA unchanged. Retain all tagged users/eligibility/agreement/influencer/coupon/order/reservation evidence; no reset/history deletion. Failed captured facts did not commit, and the original accepted order remains recoverable under its existing identity.

## R. Tests/build

- Full `pnpm validate`: PASS — five pure test files, 79 Vitest files / **965 tests**, TypeScript and lint. Includes coupon/admin, payment/refund/activation, agreements, financial/notice workers, privacy/security and legacy regressions.
- Real final financial harness: cap-one/replay checks pass; held-capture commit **fails 23514** as described. Not an E.1 PASS.
- Payment-disabled isolated production build: PASS — payment-disabled scrubbed source copy, cached fonts; task-owned temporary build copy removed.
- Source-only `pnpm db:generate`: no schema drift.
- `git diff --check`: clean.

Safe offline validation/build use scrubbed process environment, unreachable fake DB, no private provider credentials and cached fonts. No dependency/lockfile modification. No genuine financial/provider transaction.

## S. Corrections/commits

Generated proposed additive correction through repository custom Drizzle generation:

`drizzle/0025_workspace_held_capture_coupon_consistency.sql`

SHA-256: `b96fa25f789a333d31e2a4ce439281bf6c938460bdcae76b04797b36d88d7b03`.

**UNAPPLIED**. No migration was executed or manually spliced into the real schema. Migrations 0000–0024 unchanged. Correction commit `ed24c96` contains SQL, Drizzle snapshot/journal and regression test.

The proposal replaces only the old deferred consistency function. It preserves exact winning-payment identity/amount/currency/timing checks, owner/coupon matching, unpaid reservation and closed/released checks, and existing reservation-inconsistent exception. It adds a narrowly defined allowance for an existing RESERVED row while its captured order is held_for_review. The 0023 guard still prevents held/unverified RESERVED→REDEEMED transitions; pending/fulfilled captured orders still require redemption. No historical row rewrite or new entitlement path.

Source regression checks all pre-existing function text remains identical except that single allowance and pins applied 0023/0024 hashes. The opt-in real DB harness is the failing reproduction and must be rerun after separately reviewed/authorized migration application. No successful real-DB correction re-verification is claimed while the proposal remains unapplied.

Files changed:

- `drizzle/0025_workspace_held_capture_coupon_consistency.sql`
- `drizzle/meta/0025_snapshot.json`
- `drizzle/meta/_journal.json`
- `tests/routes/workspace-held-coupon-consistency-migration.test.ts`
- `tests/postgres/workspace-influencer-final-financial.cjs`
- `WORKSPACE_LAUNCH_INFLUENCER_COUPONS_FINAL_VERIFICATION.md`

No application UI/service or previous report was edited.

## T. Remaining October 14 launch requirements

Review/separately authorize 0025, apply guarded workflow and verify no-op; rerun held capture, negative direct SQL, preservation and valid paid redemption/fulfillment. Finish remaining cap-three/same-user races, pricing/preview/uncertainty/refund, actual reporting/consistency/Test-Live isolation, HTTP/JWT, hydrated admin/customer/mobile/privacy checks. No expanded preservation exception.

Implement the separately approved revised launch prices in a later scoped release task, preserving historical economics. Creator UI redesign, verified creator email and production configuration/commercial release gates remain separate and unstarted here. Phase 1.9 stays frozen. No public charging/deployment authorized by these results.

## U. Recommendation

**INFLUENCER COUPONS VERIFICATION BLOCKED** — real held-capture transaction cannot commit with a reserved coupon under the old deferred guard. The narrow course preservation exception is resolved and honored; this new financial-schema blocker is independent. Proposed 0025 remains reviewable/unapplied. Stop before further financial or browser scenarios.
