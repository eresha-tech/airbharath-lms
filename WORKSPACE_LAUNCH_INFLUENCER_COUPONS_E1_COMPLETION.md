# Workspace E.1 completion

13 October 2026. Branch `codex/workspace-1.8-launch`; starting HEAD `fa5db5a`.

**INFLUENCER COUPONS REAL DB + BROWSER VERIFICATION PASS**

All financial evidence created here is explicitly synthetic, fake-provider/real-PostgreSQL evidence. No genuine Razorpay, Mailercloud, production database, deployment or public charging occurred.

## A. Branch/commit/source integrity

Started at expected clean HEAD. Applied migrations 0000–0025 remain unchanged. Phase 1.9 remains frozen. No dependency, lockfile, pricing or LMS payment change. Scoped application correction commit: `9d389b1`.

## B. Authorized local database identity

Independent TCP and `/tmp` socket connections matched `airbharath_lms`, port 5433, OID 16384 and PostgreSQL system identifier `7680462735222304705`. Classification `DATABASE_ENV=development`. Credentials/connection strings not printed.

## C. Ledger 0024 → 0025 and no-op

Before: 25 entries, 0000–0024; only 0025 pending. Every applied hash and timestamp matched committed source/journal. Applied only reviewed 0025 via guarded `pnpm db:migrate`, with process-only authorization. After: **26 entries, 0000–0025**. Second run succeeded; complete after/no-op ledger and identity JSON compared byte-for-byte equal.

0025 SHA-256: `b96fa25f789a333d31e2a4ce439281bf6c938460bdcae76b04797b36d88d7b03`.

## D. Migration SQL and installed function

Installed `workspace_phase15_financial_complete()` body matches 0025 exactly. Existing deferred financial trigger relationships remain. The sole changed condition permits RESERVED coupon capacity on a captured order while activation is held_for_review. Exact winner identity/amount/currency/relationship, unpaid/reservation/release rules and existing inconsistency exception remain. 0023 still rejects premature redemption; 0024 history protection remains intact. No migration data rewrite or later migration needed.

## E. Held-capture committed-state evidence

Reused the prior tagged order `8823c3a3-053b-4738-b088-d34f9440e687`, retaining original owner/coupon/provider order identity. Fake provider creation calls for this retry: **zero**.

A separate connection read the committed result: captured payment evidence present; financial=captured; activation=held_for_review; reason=capture_time_unverified; paidAt/refund deadline=NULL; coupon=RESERVED. Normal fulfillment returned not_ready, granting no membership. No paid redemption was invented.

## F. Negative financial invariants

Rollback-only probes forced `SET CONSTRAINTS ALL IMMEDIATE` before assessing deferred checks. Premature redemption, wrong amount/currency/order/owner, fabricated release, held fulfillment, artificial paidAt, creator creation without membership and manual held membership all refused **23514**. Duplicate provider payment refused **23505**. Released→reserved history reactivation also refused 23514. Every invalid probe rolled back; no trigger disabled.

The first harness attempt omitted forcing deferred constraints and was corrected before claiming these results. This was a test-harness correction, not a product guard relaxation.

## G. Authoritative paid conversion and fulfillment

Normal fake Test-authoritative capture timing through reconciliation converted the same held reservation once. paidAt persisted; refund deadline difference exactly **259,200,000 ms**. Normal fulfillment created one profile/membership; retry returned already_fulfilled with the same membership ID.

Pre-launch paid term: start `2026-11-08T18:30:00.000Z`, end `2027-02-08T18:30:00.000Z`. Separate synthetic post-launch case used real-time eligibility/agreements and advanced only payment/fulfillment clocks: paidAt/start `2026-11-10T12:00:01.000Z`, end `2027-02-10T12:00:01.000Z`. No server clock or commercial rule changed. Future-dated agreement acceptance was correctly refused in an initial harness setup; the valid case accepts agreements at actual server time.

## H. Capacity races

Prior cap-one evidence retained: two independent PostgreSQL lock waiters, one winner, one capacity refusal. New cap-three race observed **four independent lock-waiting backends**, three commits and one capacity refusal. Cap-fifteen accepted fifteen outstanding reservations and refused the sixteenth. Capacity counts outstanding reservations conservatively.

## I. Same-user/idempotency

Two real sessions with the same user/key converged on one order. Competing keys produced one commit and one conflict. Changed payload with reused key refused; duplicate recovery did not create another unsafe provider order. Repeated previews created no reservation or provider order.

## J. Pricing/GST and restrictions

Actual services verified current no-coupon totals: Quarterly 589882, half-yearly 1061882, yearly 2005882 paise. Fixed ₹500 and 10% coupons validated across all three plans using independent integer calculations. Quarterly fixed total 530882/GST 80982; percentage total 530894/GST 80984.

Actual invalid, expired, future-start, paused, inactive-influencer, wrong-plan, exhausted and used-code cases refused. ValidFrom boundary preview worked. Forged money and stale plan-switch quote refused; removal restores standard pricing. Zero/negative/free/overflow discounts rejected by service/model checks. Frozen accepted economics remained valid after pause.

## K. Provider uncertainty

Ambiguous creation with an elapsed local deadline retained reservation capacity; recovery/ensure did not issue another create. Closure of that submitted uncertain intent refused. Proven definitive pre-provider rejection followed the guarded hashed release path. A separate never-submitted closure produced durable RELEASED history. Normal fake provider paths assert external transport would occur outside their caller's SQL transaction; no actual transport was used.

## L. Refund/reuse restrictions

Controlled cases covered request-only, approved/pending initiation and authoritative full refund. Request/approval did not reduce net captured revenue or release usage. Full refund retained redemption and influencer attribution; duplicate completion counted once. Same-code preview after refund refused; another coupon remained independently previewable, with overlapping membership/initial-order protection unchanged.

Actual creator access resolver: fulfilled member had paid entitlement/edit access; fully refunded member had no paid entitlement/edit access, retaining historical read access. No genuine refund or email sent.

## M. Actual SQL report totals

Real aggregate query fixture set: unpaid reservation, held capture, paid-unfulfilled order, fulfilled member, refund-requested member, approved/pending-refund member, fully refunded member and safely released unpaid order. Expected totals were calculated independently from five identical frozen Quarterly sales.

| Metric | Actual and expected |
| --- | ---: |
| Reserved capacity | 2 |
| Redeemed capacity | 5 |
| Safely available (cap 15) | 8 |
| Released reservations | 1 |
| Held captures | 1 |
| Confirmed paid orders | 5 |
| Fulfilled memberships | 4 |
| Fully refunded conversions | 1 |
| Net retained memberships | 3 |
| Original base | 2499500 paise |
| Discounts | 250000 paise |
| Original GST | 404910 paise |
| Gross captured | **2654410 paise / ₹26,544.10** |
| Completed refunds | **530882 paise / ₹5,308.82** |
| Net captured | **2123528 paise / ₹21,235.28** |

Net captured is not profit. Report before a paused, uncommitted capture transaction consistently showed zero paid/gross and one reserved; after commit it consistently showed one paid, gross 530882 and one redeemed. Existing historical held/unverified redeemed fixture remained consumed capacity=1, held=1, confirmed paid=0; no historical rewrite.

## N. Test/Live segregation

Test fixture revenue was absent from Live totals. Rollback-only Live-shaped simulation, using normal services and pure in-process provider values, showed Live gross 530882 and Test gross 0. Shared cap-two saw one Test reservation plus one temporary Live redemption, leaving zero safely available capacity; a third user was refused. Outer transaction deliberately rolled back, and global Live-order count remained unchanged.

The simulation used a coherent transaction-time clock to satisfy actual CURRENT_TIMESTAMP capture guards; no guard modified. No Live financial activity persisted or genuine endpoint called. Operating recommendation: **separate Test and Live campaign codes**.

## O. Attribution stability

Renaming the paid/refunded campaign influencer changed display name, retained the same UUID/coupon relation and left report net revenue unchanged. Earlier names persist in immutable influencer history. Coupon reassignment remains forbidden. Original frozen economics and refunded usage retained.

## P. Admin authorization/browser

Real signed synthetic app sessions and persisted roles: anonymous, student, creator and demoted admin refused all tested privileged APIs with 403; valid admin permitted. Invalid identifiers/mode and injected actor rejected. Revenue response no-store and contained no contacts/payment/refund IDs.

Hydrated browser created and edited influencer, toggled inactive/active, created Quarterly coupon with fixed discount/cap 15, paused/reactivated, reloaded persisted state and inspected real refunded/net reports with Test/Live selector.

## Q. Creator/mobile browser

Hydrated actual activation UI verified three plans, Apply/Remove, correct GST/total, incompatible plan switch, invalid/expired/exhausted/paused feedback and independently displayed agreement controls. Actual used-owner quote API refused coupon_used. Desktop and 390×844 customer/admin checks passed without final horizontal overflow or hydration errors. Disabled payment CTA remained disabled; **zero Checkout requests**.

Noindex privacy metadata was missing on activation; scoped correction added noindex/nofollow to activation and coupon admin pages. Long coupon heading overflow was corrected with wrapping. These are the only product changes; no redesign.

Screenshots (local evidence, not committed): `/tmp/wse1g-admin.png`, `/tmp/wse1g-admin-mobile.png`, `/tmp/wse1g-customer-desktop.png`, `/tmp/wse1g-customer-mobile.png`. Image proxy/external requests were intentionally blocked, so missing logo assets in screenshots do not establish a product asset defect. Browser recorded zero analytics requests; production PostHog ingestion remains untested.

## R. Original preservation and approved exception

Original baseline `/tmp/wse1c-history-before.json` SHA-256 remains `bd530ecf9f1c06242eb84868732b4117fcd98debfb5768a7e84cf8aa291b271b`.

**55 tables / 3,725 original rows: 3,724 unchanged fingerprints plus exactly one owner-approved exception**. Exception submission `8bc83bf8-8a07-42d8-aeb7-7c5668c42b66`, original `55989a0858677f6f30a943cdb13d0cbc`, approved `0cd8a0f385694445532ba3ea845e43b1`, event `490a8ee6-2107-40a9-aeb5-13942bf93fb2`. Exact record/event rechecked before and after. No other original difference, baseline replacement or history cleanup. Tagged fixtures, including safe failed harness attempts, remain identifiable development evidence.

## S. Tests/build

PASS: full `pnpm validate`, **79 Vitest files / 966 tests**, five pure test files, TypeScript, lint; payment-disabled production build; source migration no-drift; CJS syntax checks; `git diff --check`. Financial, agreements, worker/notice, creator/access, privacy/security and relevant legacy regressions included.

One temporary build hit disk quota; only this task's copies/app processes were removed and final build passed. Final isolated app was stopped, build copy and temporary authentication files removed. Screenshots and non-secret evidence retained. `.env` untouched; public charging and Live authorization remain off. No production configuration changed.

## T. Corrections/commits

`9d389b1`: scoped noindex and mobile code-wrap corrections, with metadata regression and real browser re-verification. No new schema correction or applied migration edit. Verification harness/report committed separately.

Changed files:

- `app/(admin)/admin/workspace/coupons/page.tsx`
- `app/(user)/workspace/activate/page.tsx`
- `components/workspace/WorkspaceCoupons.tsx`
- `tests/routes/workspace-membership-ui.test.ts`
- `tests/postgres/workspace-influencer-0025-verification.cjs`
- `tests/postgres/workspace-influencer-postlaunch-verification.cjs`
- `tests/postgres/workspace-influencer-stageb-verification.cjs`
- `tests/postgres/workspace-influencer-restrictions-verification.cjs`
- `tests/postgres/workspace-influencer-live-rollback-verification.cjs`
- `tests/postgres/workspace-influencer-browser-verification.cjs`
- `tests/postgres/workspace-influencer-final-integrity-verification.cjs`
- `WORKSPACE_LAUNCH_INFLUENCER_COUPONS_E1_COMPLETION.md`

## U. Remaining October 14 paid-launch blockers

Revised approved totals **₹5,899 / ₹9,999 / ₹17,699 including GST remain unimplemented** and require a separate versioned-pricing task preserving history. Verified creator email/real notice delivery, dedicated Creator UI work, production credentials/migration authorization, worker scheduling/operations and final commercial release smoke remain separately scoped gates. This PASS does not authorize public charging or deployment. Early Access paid-term boundary unchanged; Phase 1.9 remains frozen.

## V. Final decision

**INFLUENCER COUPONS REAL DB + BROWSER VERIFICATION PASS**.

Local synthetic verification completed with original preservation plus the exact approved exception. Stop at E.1; do not begin pricing, email, redesign, production setup or Phase 1.9.
