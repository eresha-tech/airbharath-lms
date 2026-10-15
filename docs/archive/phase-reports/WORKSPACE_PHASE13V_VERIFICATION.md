# Workspace Phase 1.3V — real local PostgreSQL verification

Date: 6 October 2026. Verified source baseline: `96ae305`, containing Phase 1.3 implementation `20aeb5a` and implementation report `e3dc3f8`.

**Recommendation: Phase 1.4 GO.** The required local PostgreSQL migration, immutability, concurrency, historical-versioning and authenticated application checks passed. This recommendation permits moving on to Phase 1.4 planning/implementation when requested; it is not a production launch or deployment approval. No Phase 1.4 work was performed.

## A. Authorized environment

The user explicitly classified `localhost:5433/airbharath_lms` as this repository's development/test database and authorized migrations and synthetic verification only there. Execution used `DATABASE_ENV=development`. `ALLOW_DATABASE_MIGRATION=true` was supplied only to the two guarded migration executions. No `.env` file was changed, credentials printed, or full connection string recorded.

Before migration, separate postgres-js connections using the actual runtime `/tmp` Unix-socket configuration and the migration runner's localhost TCP target returned the same identity:

| Identity property | Socket and TCP result |
| --- | --- |
| Database | `airbharath_lms` |
| PostgreSQL port | `5433` |
| PostgreSQL version | `16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)` |
| Cluster system identifier | `7680462735222304705` |
| Postmaster start | `2026-10-05T06:02:46.695Z` |
| Database OID | `16384` |

Identity was checked again after migration. Both address the same server and database. No production/staging database, private external provider, schema push, reset, seed command, migration-ledger manipulation or infrastructure change occurred. External-service environment variables were cleared for tests/builds; only the authorized local database and synthetic loopback services were enabled.

## B. Migration state before

The actual `drizzle.__drizzle_migrations` ledger had **8 rows, IDs 1–8**, matching reviewed repository journal entries 0000–0007 by timestamp and SHA-256. `0007` was already applied. `0008` and `0009` were pending. All ten journal-referenced SQL files existed; pending SQL was inspected before execution.

The complete ledger mapping is below. `created_at` is Drizzle's migration journal timestamp, not a claimed wall-clock application time.

| Ledger ID after | Migration | Ledger `created_at` | SHA-256 | Before | After |
| --- | --- | --- | --- | --- | --- |
| 1 | `0000_regular_silk_fever` | 1789124954048 | `244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47` | Applied | Applied |
| 2 | `0001_careful_warhawk` | 1790099480260 | `24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232` | Applied | Applied |
| 3 | `0002_silky_living_tribunal` | 1790162267688 | `24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad` | Applied | Applied |
| 4 | `0003_lowly_justice` | 1790183727889 | `5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98` | Applied | Applied |
| 5 | `0004_dear_shocker` | 1790192348972 | `0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82` | Applied | Applied |
| 6 | `0005_sharp_grey_gargoyle` | 1790197129493 | `588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8` | Applied | Applied |
| 7 | `0006_great_kate_bishop` | 1790236152530 | `0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb` | Applied | Applied |
| 8 | `0007_lucky_wild_pack` | 1790924690885 | `f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa` | Applied | Applied |
| 9 | `0008_eager_energizer` | 1790935874838 | `ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac` | Pending | Applied |
| 10 | `0009_normal_baron_zemo` | 1791274423029 | `6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5` | Pending | Applied |

## C. Migrations applied

Executed the repository's guarded **`pnpm db:migrate`**, with the local development classification and acknowledgement set only in that process. It completed successfully and applied exactly:

1. `0008_eager_energizer.sql` — legacy Workspace approval-email schema.
2. `0009_normal_baron_zemo.sql` — Phase 1.3 settings, policy, eligibility, audit and immutability objects.

0000–0007 were not reapplied. No generated migration or hand-written ledger entry was introduced. PostgreSQL's expected identifier-length notices truncated long foreign-key names; all seven foreign keys exist with the intended definitions and distinct names.

## D. Migration state after

The actual ledger contains **10 rows, IDs 1–10**, matching 0000–0009 exactly. A second guarded `pnpm db:migrate` completed successfully. Comparing the actual first-run and second-run ledger row IDs, hashes and timestamps showed exact equality: **verified no-op, zero new ledger rows**. Database identity remained unchanged.

## E. Real schema verification

PostgreSQL catalogs and `information_schema` confirmed all four tables, their **48 columns**, primary keys/defaults/nullability, the `workspace_eligibility_result` enum (`eligible`, `ineligible`), **7 foreign keys**, **9 checks**, **13 indexes** including primary/unique indexes, and **4 immutability triggers** covering eight update/delete events.

Verified foreign keys use `ON DELETE RESTRICT` for attempt owner/settings/policy, settings publisher, and audit actor/previous/successor settings. Verified indexes include unique `(user_id, submission_key)`, unique audit `(actor_id, request_key)`, unique settings/policy version, settings `WHERE is_current=true`, and per-kind policy `WHERE is_current=true`, plus user/result decision-time and audit lookup indexes.

Checks enforce automatic source, experience-option/month mapping, required declarations, valid eligible/cooldown deadline shapes, bounded text, settings bounds/timezone, positive version, eligibility policy kind and publication audit action. Actual invalid inserts were rejected: unknown owner **23503**; mismatched experience, missing adult declaration, missing eligible deadline, overlong course idea and invalid settings bounds **23514**; duplicate current settings/policy **23505**. These negative tests rolled back.

Immediately after migration, settings v1 matched the application defaults exactly: **24 months**, all **15** initial categories, profile required, **30 elapsed days** validity, **7 elapsed days** cooldown, `Asia/Kolkata`, launch `2026-11-08T18:30:00.000Z` = **9 November 2026 00:00 IST**. Seed policy v1's declarations/version matched the model. After synthetic publication tests, current settings are **v5 with the exact original defaults**, one current settings row and one current policy row.

## F. Trigger/immutability verification

The following operations reached actual PostgreSQL triggers, using synthetic attempts/audit records and protected published configuration. Each forbidden transaction failed and rolled back; no trigger was disabled.

| Actual operation | Result |
| --- | --- |
| Eligibility attempt UPDATE / DELETE | Both rejected, SQLSTATE `23514` |
| Audit event UPDATE / DELETE | Both rejected, SQLSTATE `23514` |
| Protected settings content UPDATE / DELETE | Both rejected, SQLSTATE `23514` |
| Protected policy content UPDATE / DELETE | Both rejected, SQLSTATE `23514` |
| Policy `is_current` pointer transition | Accepted inside a rolled-back test transaction; one current row |
| Settings pointer transition through publication | Accepted; one successor/current row and corresponding audit |

Historical results/configuration were never edited to clean up fixtures. Published settings versions 1–5 and all audit/attempt history remain intact.

## G. Real PostgreSQL concurrency results

The real service implementation ran on two independently created postgres-js/Drizzle clients, each restricted to one connection. A third control transaction held the synthetic user's row lock; both service requests were started, **two actual PostgreSQL lock waiters were observed**, and then the control transaction released the lock. This exercised database transactions/locking, not a mocked database or Promise-only simulation. Authentication is tested separately through actual HTTP routes in J/K.

| Case | Attempt count before → after | Two-connection outcome |
| --- | --- | --- |
| A: different valid request keys, same user | 0 → 1 | One created, one recovered; same eligible attempt ID |
| B: identical key and payload | 0 → 1 | One created, one recovered; same attempt ID |
| C: existing key, matching versus changed payload | 1 → 1 | Matching request recovered; changed payload conflicted |
| D: existing active eligible result, fresh requests | 1 → 1 | Both returned the existing result; neither created |
| E: existing ineligible cooldown, fresh requests | 1 → 1 | Both returned the existing ineligible result; cooldown held |

Each case observed two lock waiters and ended with one authoritative attempt. No duplicate decision or cooldown bypass occurred.

## H. Settings publication concurrency

Two independent service connections published against the same predecessor twice:

- v1 predecessor: one request published v2; the other conflicted. Exactly one current row and one audit for the successor.
- v3 predecessor: the control connection held the current settings row; **two actual lock waiters** were observed before release. One request published v4; the other conflicted. Exactly one current row and one audit for the successor.

Direct duplicate-current inserts failed with `23505`. Both test successors safely changed minimum experience to 25 months. Defaults were restored by normal audited publication to v3 and then **v5**, never by editing historical configuration. Final state: five retained settings versions, **v5 current**, four publication audits. An identical publication retry recovered the same v5 version. A stale predecessor through the authenticated admin API returned **409** without adding settings.

## I. Historical versioning verification

A synthetic 24-month eligible attempt created under v1 remained byte-for-byte equal after publishing the 25-month v2 threshold: same settings reference, result, answers and deadlines. The v1 configuration content also remained equal. A new synthetic 24-month submission evaluated under v2 was **ineligible** and referenced v2. The old attempt remained unchanged through later publications/restoration to v5. No historical eligible-until or reapply-at value was recalculated.

## J. Authenticated user smoke tests

Actual production-build HTTP routes and server-rendered pages ran on loopback against the runtime socket database. Synthetic persisted users received short-lived standard HS256 `ab_session` cookies signed with an isolated synthetic test secret; application session verification and persisted-user checks ran unchanged. No OTP was sent and no authentication bypass was added.

| Check | Actual result |
| --- | --- |
| Anonymous current-result API | `401` |
| Authenticated apply page | `200`, eligibility form rendered |
| User A: two-year/24-month valid submission | `201`, eligible, one row; deadline exactly 30 elapsed days |
| Returning A apply route | Streamed `200` response containing Next.js redirect to `/workspace/eligibility-result`; no repeated form |
| A result page | `200`, eligible status and validity deadline rendered |
| User B: one-year/below-threshold submission | `201`, ineligible, `insufficient_experience`; deadline exactly 7 elapsed days |
| B repeated fresh-key submission during cooldown | `200`, `created=false`, same result ID, count stayed 1 |
| B result page | `200`, ineligible state rendered |
| Malformed/private profile URL, absent profile, missing declaration, forged `userId` | Four `400` responses; zero attempts/no cooldown for validation fixture |

These were real HTTP/database checks, not interactive browser/OTP-delivery tests. Synthetic declarations and data alone were submitted.

## K. Ownership/admin authorization

A current-result request carrying B's user/attempt IDs in the query while authenticated as A returned only A's result, with no B attempt ID in the response. A forged user ID in a mutation payload was rejected (`400`). A student accessing B's admin detail received **403**; a persisted synthetic admin received **200**. Admin eligibility list/detail/settings pages rendered **200**.

The synthetic admin was demoted in PostgreSQL while its existing JWT still claimed admin. List/detail/settings APIs all returned **403**, and the admin page did not return 200. The synthetic fixture's admin role was then restored. No existing user was demoted and no auth control was weakened.

## L. No-premature-creator-access verification

After successful eligibility, actual journey responses reported **`hasCreatorAccess=false`**, **`hasPaidEntitlement=false`**, and eligible fixture roles remained **student**. Database table inspection found no new creator-profile, membership or Workspace payment/order/paid-entitlement structures.

Whole-row aggregate fingerprints and counts of existing orders, courses, course authors and enrollments matched the pre-verification baseline at completion:

| Existing table | Before / after rows | Whole-row fingerprint |
| --- | --- | --- |
| orders | 1 / 1 | Unchanged |
| courses | 6 / 6 | Unchanged |
| course_authors | 2 / 2 | Unchanged |
| enrollments | 8 / 8 | Unchanged |

No new order/payment, membership, creator role/profile, Workspace coupon redemption, course ownership or paid entitlement resulted from eligibility. Existing LMS capabilities were not expanded.

## M. Legacy Workspace regression

The public manual application page returned **200**. Authenticated legacy admin list/detail APIs and pages returned **200**, with both existing manual application records present. Their full-row fingerprint matched the baseline; counts remained **2 → 2**. Review/application status and approval-email state were available in detail responses after 0008. No review mutation, approval send or provider request was performed.

## N. Failure-path checks

| Practical failure | Actual response and invariant |
| --- | --- |
| Database unavailable | Separate loopback app worker pointed at an intentionally closed local port; journey/current/submission APIs each returned **503**, with no connection/stack/credential detail and zero additional attempts |
| Limiter unavailable | Synthetic HTTPS adapter returned unavailable; new submission **503**, zero rows; identical saved submission still recovered **200** |
| Limiter denied | **429**, `Retry-After: 60`, zero rows |
| Stale settings predecessor | Admin API **409**, settings row count unchanged |
| Malformed/invalid payload | **400**, zero attempts/no cooldown |
| Cross-site mutation | **403**, zero attempts |

The database was never stopped or destabilized. Limiter tests used a local authenticated HTTPS adapter implementing the expected EVAL response contract, trusted with a temporary test certificate. TLS verification stayed enabled. Actual app limiter code ran and adapter inspection observed zero unsafe/raw-user-ID keys. **Live Redis/Upstash and Redis Lua execution were not tested**; the adapter verified app failure handling only. All original current settings stayed valid.

## O. Analytics/privacy verification

**Live analytics remains unverified.** No explicitly safe non-production PostHog project was established, so analytics credentials/configuration remained disabled. No production analytics was contacted or enabled for convenience.

Fresh automated privacy/analytics tests passed within the full suite, including allowlists, identifier handling and non-blocking telemetry failure behavior. This is automated coverage, not an outgoing-event/live-person-profile claim. The real HTTP decisions succeeded with telemetry disabled. Professional URLs, course ideas, declarations and user data were confined to synthetic local fixtures; no real applicant data was emitted in logs or this report.

## P. Validation results

Completed successfully after the database/application verification:

- Full **`pnpm validate`**: five Node policy/security test files; **22 Vitest files, 247 tests**, including Phase 1.3 model/service/API/admin/limiter/privacy tests; strict TypeScript; lint with no errors/warnings.
- Production **`pnpm build`** on an isolated tracked-source copy of the same baseline, using the repository-declared pnpm version and existing node_modules. Next.js 15.5.19 generated **52 static pages**, type/lint checks passed and build completed.
- Actual PostgreSQL identity, ledger, schema, immutability, two-connection eligibility/settings, historical-versioning and final unchanged-data checks passed.
- Actual authenticated loopback HTTP smoke and safe failure checks passed.
- **`git diff --check`** passed; final diff/file scope reviewed before report commit.

The existing root `.next` was a development artifact and could not be served with `next start`; it was left untouched. Initial restricted build attempts failed with generic webpack errors. The isolated build succeeded with approved execution permissions, with private-service credentials cleared. Test harness adjustments for PostgreSQL statistics snapshots, driver result-array metadata, Next.js streamed redirects, configured origin and fingerprint algorithm were verification corrections; none required a product patch.

## Q. Defects found

**No genuine Phase 1.3 implementation defect was established by this verification.** The original environment-authorization blocker is resolved by the user's explicit designation. Concurrent eligibility/settings, constraints, immutable history, authorization and tested failures behaved as designed.

## R. Corrective changes if any

None. No corrective code/schema/migration commit was needed. The only tracked change is **`WORKSPACE_PHASE13V_VERIFICATION.md`**, replacing the prior blocked report with real evidence. No application, architecture, dependencies, lockfile, environment file or Phase 1.4 feature was changed. The report is committed separately under the standing local-commit authorization; nothing was pushed/deployed. The resulting report commit hash is returned in the completion message (not embedded in its own file).

## S. Remaining environment limitations

This is local PostgreSQL verification only; production, staging/Neon, live Redis, live PostHog, OTP delivery, approval-email delivery and external billing providers remain unverified and unauthorized. Those are not represented as passed checks or launch readiness.

Synthetic development fixtures are intentionally retained: **31 clearly marked `WS13V SYNTHETIC` users and 8 eligibility attempts**, including fixtures from interrupted/failed harness setup. Names and phone markers identify the runs; emails use `example.invalid`. Five settings versions and four synthetic publication audit events remain. Current **v5 restores the exact initial defaults**, with one current settings row and one current policy v1. No immutable record was removed, no reset/ledger edit occurred, and no trigger/constraint was weakened for cleanup. Temporary loopback app workers and the HTTPS adapter were stopped after testing. Harnesses/evidence stayed in `/tmp` and were not committed; migration acknowledgement was never persisted.

## T. Recommendation: approve or block Phase 1.4

**Phase 1.4 GO**, based on the completed authorized local verification gate and the limitations explicitly recorded above. This does not authorize production migrations or establish production launch readiness. **Stop here; Phase 1.4 was not implemented.**
