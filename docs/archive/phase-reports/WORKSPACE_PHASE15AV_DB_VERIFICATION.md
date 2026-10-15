# Workspace Phase 1.5AV-DB verification

Date: 6 October 2026. **Phase 1.5AV-Razorpay GO**, for a separately authorized sandbox-verification phase only. This is not Phase 1.5B/public-charging approval.

## A. Authorized environment

Only `localhost:5433/airbharath_lms`, classified `DATABASE_ENV=development`, was used. Application `/tmp` socket and migration TCP identity match: PostgreSQL 16.15, database OID 16384, system identifier `7680462735222304705`, server started `2026-10-05T06:02:46.695Z`. This is the same server/database verified previously.

`ALLOW_DATABASE_MIGRATION=true` was supplied only to the two guarded migration executions. No `.env` file/acknowledgement was changed or copied into test apps. No credentials/connection strings are included in this report. No production/staging/Neon access, schema push, reset, ledger manipulation, external provider/payment, Redis, PostHog, email or OTP call occurred.

Synthetic fixtures are retained with `WS15AV_` coupon codes, `WS15AV SYNTHETIC` names and synthetic `@example.invalid` emails. Immutable history was not weakened or deleted. Four complete financial-regression runs, corrective account tests and local HTTP/hold tests retain 110 synthetic users, 112 orders, 60 ledger rows, 55 payment observations and 24 events. These are deterministic development evidence, not actual payments.

## B. Ledger before

Exactly **12 rows, 0000–0011**, verified using both SHA-256 file hashes and journal timestamps. Corrective `0011_workspace_coupon_audit_freshness` is present. `0012_useful_warhawk` was pending and had no ledger row. Its initially reviewed source hash was `f20d5a2aa00eb4c14b510bb8c93c30d8773f012118ca7154b86515541861d3fe`.

No migration proceeded until socket/TCP identity matched, all 12 applied entries matched the checked-in chain, and mandatory 0011 was confirmed.

## C. Migration 0012 application

Pre-execution review identified the composite-key readiness defect detailed in W. It was reproduced with PostgreSQL temporary tables (`42830`, transaction rolled back) and a failing checked-in ordering regression. Because 0012 was **unapplied**, the minimum correction moved its two ownership unique-index statements ahead of their foreign-key declarations. No applied migration was edited.

Only reviewed, corrected `0012_useful_warhawk.sql` was applied through guarded `pnpm db:migrate`. It succeeded. Its applied SHA-256 is `4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97` and journal timestamp remains `1791286852175`. PostgreSQL notices about long constraint-name truncation were inspected; actual catalogs show all expected distinct foreign keys.

## D. Ledger after/no-op

Exactly **13 rows, 0000–0012**. The first 12 rows, IDs/hashes/timestamps are byte-for-byte equal to the pre-migration ledger. The second guarded migration command succeeded and produced an **exact ledger no-op**. The final ledger still equals the first post-0012 ledger; no 0013 exists/is needed for the application query correction.

| Migration | Journal/ledger timestamp | SHA-256 |
|---|---:|---|
| 0000_regular_silk_fever | 1789124954048 | `244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47` |
| 0001_careful_warhawk | 1790099480260 | `24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232` |
| 0002_silky_living_tribunal | 1790162267688 | `24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad` |
| 0003_lowly_justice | 1790183727889 | `5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98` |
| 0004_dear_shocker | 1790192348972 | `0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82` |
| 0005_sharp_grey_gargoyle | 1790197129493 | `588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8` |
| 0006_great_kate_bishop | 1790236152530 | `0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb` |
| 0007_lucky_wild_pack | 1790924690885 | `f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa` |
| 0008_eager_energizer | 1790935874838 | `ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac` |
| 0009_normal_baron_zemo | 1791274423029 | `6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5` |
| 0010_illegal_toxin | 1791281066952 | `d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e` |
| 0011_workspace_coupon_audit_freshness | 1791284353170 | `92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9` |
| 0012_useful_warhawk | 1791286852175 | `4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97` |

## E. Financial schema verification

Actual `information_schema`, `pg_constraint`, `pg_indexes` and `pg_trigger` were queried, not just migration text/snapshot. Confirmed:

- Four isolated tables: membership orders, coupon redemptions, payment attempts and payment events.
- Columns: **53 / 13 / 18 / 16** respectively, **100 total**.
- **20 indexes**, including owner/request, unresolved-user, provider receipt/order/payment/event identity, one ledger per order, user/coupon partial uniqueness and one-winner partial uniqueness.
- **11 foreign keys**, including composite order-owner-coupon and order-owner-account-mode-provider-order relationships.
- Six status/economic/context check constraints, four primary keys, **seven user triggers**, including immutable history, coupon capacity and **three DEFERRABLE INITIALLY DEFERRED** financial completeness constraints.
- Financial statuses are constrained text, not a new giant enum. Test provider mode, positive INR order economics, exact GST, accepted context and 72-hour/null-timing branches are enforced.

Real SQL attempts exercised these constraints and triggers. Final global checks found zero capacity, ownership or winning-capture inconsistencies.

## F. Accepted-order immutability

Orders were created through the actual acceptance service and Drizzle/PostgreSQL repository, with server-recomputed quotes. Persisted rows equal the returned accepted snapshots, including user/attempt/plan/settings/policy, integer money/GST, plan version/name, coupon attribution/version/limit, approved launch context, pricing/start versions, quote/request hashes, test account/mode and noncommercial test-policy identifier.

Real attempted rewrites of owner, plan, base/discount/taxable/GST/total, currency, coupon code/snapshot (campaign/source context), launch, duration and quote/context hashes were rejected with **23514**. Order deletion also returned 23514. History remained unchanged after those rolled-back transactions.

## G. Request/idempotency verification

Identical key/payload recovered the same persisted order. Changed payload under the same key returned controlled `conflict`. Two independent service connections using different request keys were deliberately blocked on the persisted-user row; **two PostgreSQL lock waiters** were observed, then one order committed and one request conflicted. Different keys cannot create overlapping initial purchases.

Repeated actual local HTTP order creation and browser confirmation also recovered the same financial result. No browser signature alone established capture.

## H. Coupon capacity concurrency

A fresh limit-one coupon and two independently eligible synthetic users were used. A third connection held its coupon row; both service connections were observed waiting in `pg_stat_activity` with `wait_event_type=Lock`. Releasing the blocker yielded **one accepted order/reservation, one controlled capacity conflict and exactly one occupied slot**.

A direct SQL order-plus-ledger attempt against the full coupon was rejected with **23514**, rolling the order back. Unlimited-coupon reservations succeeded. Safe released rows ceased occupying capacity. The limited winning reservation was later captured/redeemed; it still occupied its slot, and another user received `capacity`.

The prepared `tests/postgres/workspace-financial-concurrency.test.mjs` also ran with reviewed real-service-derived snapshots, two real PostgreSQL connections, exact local target and explicit opt-in. It passed final-slot, immutable-economics, ledger-delete and deferred incomplete-close checks. Its committed winning reservation remains identifiable. Final global `reserved + redeemed <= usageLimit` audit passed for every limited coupon.

## I. One-user/one-coupon verification

An active duplicate ledger insertion was rejected with **23505**. Never-submitted release succeeded, and the same user could reserve that coupon again. After another safe unpaid release, a different coupon was independently accepted.

A consumed redemption remains `redeemed`; actual authoritative `couponUse` returns it permanently, while another coupon returns no use. Another initial purchase for the captured user is rejected by the stronger unresolved/captured initial-purchase constraint. Thus a different coupon is independently unused, but does not bypass the initial-purchase rule; renewals are outside this phase. Same-user/coupon partial uniqueness was verified in the real catalog.

## J. Reservation release rules

Actual never-started closure atomically closed the unpaid order and released its ledger with reason/source/evidence. Definitive synthetic rejection stored matching order/ledger proof and safely released.

Committed ambiguous intent and attached provider order prevented ordinary closure (`conflict`) and direct SQL closure (23514). An elapsed checkout deadline did not free capacity. Additional real-DB tests paused/reactivated/expired/archived a synthetic coupon: new acceptance was blocked with the correct controlled error, accepted attribution stayed unchanged, and an expired provider-backed order plus failed-payment observation remained unpaid/reserved. No browser/timer/absence-of-payment release was added.

## K. Provider-intent state verification

Deterministic adapters were used with real PostgreSQL. Mock create execution checked the intent/request count from an independent connection and confirmed the service connection was **idle with no open transaction**, proving committed intent and execution outside held financial locks.

Success attached an exact synthetic order; definitive rejection safely closed/released; ambiguous timeout/loss retained a recovery state and one create attempt. A malformed/incompatible attachment entered recovery and later attached one exact receipt match without another create. No native Razorpay adapter or external HTTP was called.

The account-scope correction also verifies that a worker for a different configured account visits its own queue rather than retained foreign-account rows, and cannot claim a foreign inbox event.

## L. Payment identity constraints

Real SQL tests returned:

| Attempt | Result |
|---|---|
| Reuse provider payment ID on another order | 23505 |
| Second winning payment on one order | 23505 |
| Wrong owner/order/account relationship | 23503 |
| Live provider mode | 23514 |
| Rewrite amount/currency/payment identity/provider-created time | 23514 |
| Delete payment evidence | 23514 |

Actual service tests for wrong amount, currency, order, account/mode, authorized-only and failed evidence left the order unpaid. A second exact captured ID was retained as a controlled multiple-capture incident with one winner and one redemption. No creator authorization changed.

## M. Deterministic captured finalization

Actual service/repository finalization committed the synthetic exact winning payment, captured order, proven test timestamp/refund deadline, redeemed ledger and processed event together. Compatible capture remains **captured / pending_activation**. Repeated reconciliation/confirmation did not produce another winner or redemption.

No profile, membership, entitlement, enrollment or course ownership was created. Provider/financial evidence and activation state remain separate.

## N. 72-hour refund-window verification

Persisted timestamp differences equal **259,200,000 milliseconds / 259,200 seconds**. Exact test evidence, rather than creation/callback/observation time, was used. Real PostgreSQL results include:

| Authoritative test paidAt (UTC) | Stored refundEligibleUntil (UTC) |
|---|---|
| 2026-11-08T18:29:59.500Z | 2026-11-11T18:29:59.500Z |
| 2026-11-08T18:30:00.000Z | 2026-11-11T18:30:00.000Z |
| 2026-11-08T18:30:00.001Z | 2026-11-11T18:30:00.001Z |

These cover pre-launch, launch and one millisecond after launch; all used compatible synthetic eligibility and the frozen 9 November 2026 00:00 Asia/Kolkata launch context. The final global captured-order audit also checked exact deadline/capture consistency.

## O. Unverified-capture-time held behavior

A synthetic exact captured monetary observation with no authoritative capture time persisted as **captured / held_for_review**, with `capture_time_unverified`, redeemed coupon, and **null paidAt/null refundEligibleUntil**. No current time was substituted. No creator access was granted. This limitation is intentionally preserved for the Razorpay evidence/policy gate.

## P. Atomic rollback/retry

A controlled actual PostgreSQL **22012** error was injected at event completion inside the same financial transaction, after payment/order/ledger work. PostgreSQL rolled all that work back: order unpaid, no inserted payment, ledger reserved and event not processed. The durable inbox receipt then remained retryable.

After advancing the deterministic retry clock, the identical capture converged once to captured/redeemed/processed. Direct incomplete closure also failed at deferred COMMIT with 23514. SQL transactions, not in-memory rollback, provided this proof.

## Q. Webhook inbox/auth verification

Actual inbox/service persistence verified same-ID/same-hash deduplication, first-evidence preservation under different-hash anomaly, recognized unmatched retry, unrelated ignored event, course-receipt isolation and deletion refusal (23514). Processing failure retained durable receipt and a retry state.

Actual local HTTP route tests used synthetic HMAC secrets only. Exact raw signed bytes were accepted without a cookie and with an unrelated Origin; one durable row acknowledged 202. Duplicate receipt remained one row. Missing/invalid signatures returned 403; oversized body returned 400; changed body under the same event ID returned 409 and durable needs-review. No real provider webhook/secret was used.

Positive route tests ran in a **temporary loopback-only development copy** with only the provider adapter injected outside the repository. Its original handlers, auth, service and PostgreSQL repository executed normally. This synthetic adapter and its ephemeral flags were not committed or deployed. The unchanged production app was separately exercised with payment disabled. All three task-owned loopback servers were stopped after testing.

## R. Feature-gate verification

The unchanged production app with flags absent rejected creation and confirmation with **503/disabled** before financial work. A second unchanged production runtime supplied every development/test flag and synthetic dedicated key; creation, confirmation and webhook still returned **503/disabled**. Production cannot be enabled by those development flags.

The temporary positive-route fixture required explicit ephemeral local-only test configuration and had no Razorpay checkout/native provider call. Public UI still says **Payment activation coming next**, with no usable payment button. `.env` and persisted gate defaults remain unchanged.

## S. Admin financial UI

A synthetic persisted admin viewed `/admin/workspace/orders` (HTTP 200) and paginated API data accurately covering unpaid, creating/ready/recovery, captured/pending and held/review states, payment evidence and known/null timing. No Mark Paid, Grant Membership or Make Creator command exists. Coupon API reserved/redeemed/released/held counts were compared with direct authoritative PostgreSQL counts.

A non-admin received 403. The synthetic admin was temporarily demoted while retaining the old admin JWT: both read-only financial APIs returned 403 and the page redirected to login (307). The synthetic admin role was restored after that check. All unrelated original users retained their original fingerprint.

These are real HTTP/SSR checks, not browser visual automation; no behavioral telemetry was contacted.

## T. No-creator-access verification

For captured synthetic users, actual journey service/API reports `hasCreatorAccess=false` and `hasPaidEntitlement=false`; destination remains the activation preview. User roles remain student. The creator-profile, membership and course-draft tables are absent. Synthetic enrollments are zero, and all original courses/course-author relationships are unchanged with no additional rows. No creator dashboard entitlement/ownership mutation occurred.

## U. Legacy payment isolation

All original row hashes across **14 baseline tables** remain present and identical; additions are marked synthetic only. No original settings/policy/plan row changed. Counts below are final after repeated regressions and HTTP smoke:

| Table | Before | After |
|---|---:|---:|
| users | 74 | 184 |
| courses | 6 | 6 |
| course_authors | 2 | 2 |
| enrollments | 8 | 8 |
| orders | 1 | 1 |
| coupons | 2 | 2 |
| workspace_applications | 2 | 2 |
| workspace_eligibility_attempts | 28 | 134 |
| workspace_eligibility_settings | 9 | 9 |
| workspace_policy_versions | 4 | 4 |
| workspace_membership_plans | 6 | 6 |
| workspace_coupons | 27 | 44 |
| workspace_coupon_plans | 45 | 62 |
| workspace_audit_events | 49 | 69 |

Courses, course authors, enrollments, LMS orders, legacy coupons and manual applications have unchanged counts and complete fingerprints. Recognized course-payment evidence was ignored by the Workspace reconciler. Actual manual-application page and admin manual-list API returned 200. No unrelated LMS payment defect was changed.

## V. Validation

- Final real financial service/repository regression: **72 checks passed**.
- Additional paused/expired/archived hold regression: **7 checks passed**.
- Real account-isolation regression: **2 checks passed after two reproduced failures**.
- Prepared two-connection PostgreSQL harness: **1 integration test passed**, actual body enabled/executed, no skip.
- Local authenticated HTTP/SSR regression: **12 checks passed**, plus three production-runtime development-flag denials.
- Full `pnpm validate`: **419 Vitest tests / 35 files and five Node test files passed**, TypeScript and lint passed with no lint warnings/errors.
- Final isolated production build: passed, **59/59 static pages**, using the existing cached-font approach with secrets cleared and unreachable synthetic database configuration. No font/dependency/Next configuration change.
- Checked-in opt-in CJS harness syntax and final `git diff --check`: passed.
- Historical SQL/snapshots 0000–0011, dependencies, lockfile and environment files: unchanged. Applied corrected 0012 remains unchanged after application.

## W. Defects/corrections

1. **Migration readiness:** composite ownership foreign keys preceded their required unique indexes in pending 0012. Recorded before editing; temporary PostgreSQL reproduction returned **42830**, and the checked-in ordering test failed. Since 0012 was not yet applied, only the two statements were moved before foreign keys. Regression then passed; guarded migration succeeded. Commit **51a7645**. No applied history was edited.
2. **Worker account isolation:** real retained-data tests reproduced own-account batch starvation (zero reads instead of one) and claiming a foreign event (pending became ignored). Both failures were recorded before correction. Queue queries and event claim now filter provider account/mode; real tests and added unit tests pass. Commit **409137f**. This is an application query correction, so **no additive 0013 migration is required**.

No remaining DB invariant failure was observed. Both corrections remain within Phase 1.5A; no Phase 1.5B functionality was added.

## X. Remaining Razorpay sandbox blockers

No Razorpay call/payment/provider credential was authorized or used. A separate explicit test-account/environment authorization is required. Remaining sandbox work includes actual account/key binding, API error classification as safe rejection, deterministic receipt lookup/recovery limitations, capture/payment identity behavior, webhook delivery/replay/order, and an approved authoritative capture-time strategy near launch/refund boundaries.

Unverified capture timing must continue to hold, not guess. Deployed worker scheduling/monitoring, final commercial acceptance, public charging and creator/membership activation remain later release prerequisites. This database-only result does not remove those gates.

## Y. Recommendation

**Phase 1.5AV-Razorpay GO.** Proceed only under a separate Razorpay sandbox-verification authorization. Public charging remains disabled; no creator access, membership, dashboard or entitlement was created. **STOP: Phase 1.5B was not started.**

Verification harness commit: **a8a201b**. Corrections are separately committed as **51a7645** and **409137f**.

### Changed repository files in this phase

- `WORKSPACE_PHASE15AV_DB_VERIFICATION.md`
- `drizzle/0012_useful_warhawk.sql`
- `lib/workspace/payments/repository.ts`
- `lib/workspace/payments/service.ts`
- `tests/postgres/workspace-financial-account-scope.cjs`
- `tests/postgres/workspace-financial-hold-verification.cjs`
- `tests/postgres/workspace-financial-http-verification.cjs`
- `tests/postgres/workspace-financial-loader.cjs`
- `tests/postgres/workspace-financial-verification.cjs`
- `tests/routes/workspace-financial-migration-readiness.test.ts`
- `tests/routes/workspace-payments-fixtures.ts`
- `tests/routes/workspace-payments-inbox.test.ts`
