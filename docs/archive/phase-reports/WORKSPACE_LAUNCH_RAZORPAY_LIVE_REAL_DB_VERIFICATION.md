# Workspace Launch Blocker C.1 — real PostgreSQL and financial worker verification

## A. Starting branch and worktree

Branch `codex/workspace-1.8-launch`, starting HEAD `7cf7ba6`, implementation `5fc7053`; clean worktree. Phase 1.9 remains frozen at `codex/workspace-phase19-wip@a9ea151`. Verification performed on 12 October 2026. No provider HTTP, genuine Test/Live payment or refund, production database access, Dashboard/Vercel change, deployment, scheduling, Mailercloud send or coupon implementation change occurred.

## B. Authorized local DB identity

Independent TCP `localhost:5433/airbharath_lms` and application `/tmp` Unix-socket connections agreed:

| Property | Both connections |
| --- | --- |
| Database | airbharath_lms |
| Port | 5433 |
| Database OID | 16384 |
| PostgreSQL system identifier | 7680462735222304705 |
| Execution classification | DATABASE_ENV=development |

Credentials and full connection strings were not printed. Identity/ledger checks preceded mutation. One automatic approval-review timeout occurred before execution; its permitted single retry succeeded.

## C. Ledger before migration

21 entries: `0000_regular_silk_fever` through `0020_gigantic_mordo`. Every applied hash and journal timestamp matched source. SQL bytes and journal entries for 0000–0020 matched `facbd2c`; only reviewed 0021 was pending. No Phase 1.9 asset migration exists in this lineage.

Before migration, saved per-row fingerprints/counts for all 51 public tables and 2,574 original rows, including Workspace applications/eligibility, financial inbox/orders/payments/refunds, agreement catalogues/acceptances, memberships/profiles/course content/notices and legacy LMS data. Private fingerprint evidence remains outside Git.

## D. Migration 0021 integrity and application

Reviewed `0021_workspace_live_financial_modes.sql`: replaces five mode/context CHECKs and the membership fulfillment guard to admit correctly paired prospective Live evidence while preserving Test history. Live capture timing requires matching durable capture-event evidence. Existing guards, foreign keys, economics and agreement snapshots remain enforced. There is no historical row rewrite, trigger disable, ledger manipulation or database reset.

Applied only 0021 through guarded `pnpm db:migrate`, with process-only `DATABASE_ENV=development` and `ALLOW_DATABASE_MIGRATION=true`. No authorization persisted in `.env`. Migration SHA-256: `761f5926b78ed41293c8d58139df69a752ad322b8905191280f1e29ad6542421`.

PostgreSQL emitted a pre-existing local collation-version warning (database 2.39, OS 2.43). No collation alteration/reindex was attempted. This local maintenance finding remains separate from the financial migration; production collation state is unknown.

## E. Ledger afterward and no-op rerun

22 entries, 0000–0021, all source hashes/timestamps matching; no pending migrations. Second guarded invocation succeeded. Complete identity/ledger evidence was identical before and after that second invocation: no extra row, rewritten hash or timestamp. Original-row fingerprints matched immediately after migration and again after all synthetic verification.

## F. Actual constraints/functions/triggers

Inspected PostgreSQL catalogue definitions: 174 Workspace constraints, 59 noninternal triggers and 108 indexes, plus Workspace function definitions. Confirmed mode/policy CHECKs, financial identity/economics guards, provider-context foreign keys, capture-event-time guard, unique winner/origin membership, refund intent/completion guards and immutable history protection. No new schema correction was needed after applying 0021.

## G. Historical Test/financial compatibility

All 2,574 original-row fingerprints across 51 tables remained unchanged. Original genuine Test refund `rfnd_…pIsVo` remains full INR 589882 paise, with `razorpay_full_refund_fetch_v1` evidence; its order remains historically captured/Test/fulfilled. paidAt remains `2026-10-12T10:29:34.000Z`, refund deadline `2026-10-15T10:29:34.000Z`, exactly 259200000 ms later. Its membership, Creator Profile and one draft remain. Refund completion remains the authoritative access-revocation fact; no historical order-state rewrite is necessary.

Six retained WS15AVR fixtures remain unchanged: three captured/held_for_review, three unpaid/pending_activation; all retain null paidAt/deadline and zero memberships. Test membership evidence fails the production paid-entitlement resolver. No existing Test history was reclassified.

## H. Live/Test integrity probes

Rollback-only probes accepted a legitimately constructed Live-shaped order through initial acceptance/state transitions, matching durable capture-event/payment evidence and canonical quarterly membership insertion. Entire transaction rolled back; zero Live orders remain. These are synthetic database-integrity probes, not genuine provider authentication or production runtime authorization.

Rejected mismatched Live commercial policy, Live `test_authoritative` timing, captured-event timing without durable evidence and wrong account evidence. SQLSTATE `23514` observed for invalid evidence/guard probes. Existing captured-order provider mode/account, total, paidAt and Creator Terms hash rewrites; payment mode/time/amount rewrites; and membership deletion each returned `23514`. Foreign-key/index definitions also retained context and uniqueness protection.

## I. Capability independence

Actual webhook route accepted duplicate HMAC-signed synthetic Test events using a dedicated synthetic Workspace secret and scoped account, with charging disabled. Actual new-order route returned controlled 503 before order/provider creation. Read-only worker recovery made zero fake order/refund mutations. Disabled refund mutation left an approved prepared intent prepared; processing/uncertain cases remained independently readable/reconcilable.

Focused configuration regressions rejected local/Preview Live-shaped credentials before fake HTTP. Coherent production-like Live authorization/capability combinations were exercised with placeholders/fakes only. No production runtime was spoofed to contact a provider or database.

## J. Worker claim/retry semantics

Real inbox claim committed processing state and lease. One claim winner across two connections. An expired committed lease recovered after a synthetic verification clock advance of 70 seconds. GET failure and post-GET/pre-update DB failure left durable retry state; later processing converged. Hash conflict remained needs_review and unclaimable. Duplicate processing retained one payment/winner. GET-only captured observations retained null paidAt/deadline and held status; matching stored capture-event timing yielded exact paidAt/deadline and normal activation.

## K. Genuine PostgreSQL concurrency

Two independently connected workers/services were forced to wait on real PostgreSQL locks; `pg_stat_activity` showed two lock waiters for each controlled race before release.

| Race | Observed result |
| --- | --- |
| Same event claim | Two waiting sessions; one committed claim winner |
| Same captured-order recovery | Both committed; one financial payment, null invented timing, no membership |
| Same membership fulfillment | Both committed; one origin membership/profile |
| Same uncertain refund | Both committed; one full-refund completion, no second refund mutation |
| Same external refund scan | Both committed; one authoritative completion |
| Completion response loss/reinvoke | Already committed membership/refund reused; no duplicate effect |

Additionally ran two concurrent invocations of actual `runWorkspaceFinancialWorker`, each with its own real bounded PostgreSQL pool and injected fake provider adapter. Both returned bounded visited summaries and converged without new order/refund mutations. These results use real PostgreSQL, not fake-store Promise concurrency. Crash/response-loss cases are controlled fault simulations and replay, not a production incident or external process kill.

## L. Payment reconciliation/activation

Durable capture-event evidence established paidAt; refund deadline equaled exactly 72 elapsed hours. Missing fulfillment converged through normal real service transactions/locks. Existing fulfillment replay was idempotent. Synthetic Test fixtures remain tagged `WSC1_` with a unique run context and are retained; immutable history was not cleaned up. Rollback-only Live evidence left no fabricated Live financial rows.

## M. Refund reconciliation

Verified prepared pause, processing recovery, uncertain outcomes, no blind retry, concurrent full completion, external observation scan and partial-refund review. Partial observation created no completion and did not prematurely revoke entitlement. Later matching full aggregate payment/refund facts converged once. All facts came from fake adapters; fixture setup used normal service workflow, not a genuine provider transaction. Read-only recovery itself made zero fake financial mutations; provider mutation counters cover fixture setup separately.

## N. Internal worker authentication

Actual route refused anonymous, cookie-only, fabricated Cron user-agent, query-string and invalid Bearer requests with 401. Short secret refused. Correct temporary strong server Bearer returned 200 and a no-store enum-only summary; no account ID/PII/secret projection. Missing provider configuration returned safe 503. Isolated secrets existed only in the short-lived harness process, never `.env` or committed credentials.

## O. Boundedness/failure recovery

Found and reproduced one implementation defect: provider AbortSignal expiration did not cancel PostgreSQL lock waits, while local statement/lock limits were both zero. A rollback-only advisory-lock probe showed DB work still blocked after provider deadline expiration.

Correction uses a dedicated worker-only PostgreSQL pool and repository factories, preserving default shared LMS/request stores. Actual session settings and behavior verified:

| Bound | Result |
| --- | --- |
| Connection / statement / idle transaction | 5 seconds each |
| Lock wait | 2 seconds; SQLSTATE 55P03 after 2005 ms |
| Long SQL | SQLSTATE 57014 after 5002 ms |
| Pool size / cleanup | One connection per invocation; bounded cleanup in finally |
| Shared application sessions | Original timeout settings unchanged |
| Provider deadline | Shared 40-second AbortSignal, individual 10-second HTTP timeout retained |
| Endpoint declaration | maxDuration 60 retained |
| Scan size | At most three candidates per scan; attempts/external observations are separate scans |

Real 15-order backlog fairness test visited all 15 candidates through bounded scans, including older held work. Persisted scan markers and refund last-check ordering rotate candidates rather than permanently occupying the first batch. Retry/lease times and protected review states remain deliberate. DB failure before claim, committed claim interruption, provider GET failure, post-GET DB failure and committed completion replay retained safe durable truth.

The provider deadline is cooperative; SQL timeout is per statement, not a promise the entire invocation ends at exactly 40 seconds. Actual Vercel 60-second enforcement, network timing, sustained load/cadence/backlog capacity remain production verification gates. A run can visit at most three candidates in each of five scans (events, orders, attempts, external observations, activation); use measured throughput and monitoring before scheduling. No production schedule configured.

## P. Readiness CLI

Both `pnpm workspace:payments:readiness` and `--matrix` passed with sanitized environment/synthetic configuration. Default output had all financial capabilities false, unconfigured provider and noticesReady=false. Synthetic coherent production, charging-stopped, mutations-stopped, Preview and local cases reflected expected separation/refusals. Output contained only fixed reasons/enums/booleans, not credentials. CLI has no DB/provider operations or optional DB mode; none was added.

## Q. Notice delivery gap

**NOTICES DELIVERY STILL BLOCKED.** Original notice records/templates remain intact. Financial worker processes no notice delivery, and noticesReady remains false. Unit timeout/failure coverage confirms financial completion does not depend on sending a message; no actual Mailercloud call occurred.

Separate implementation/verification must provide durable delivery claims/leases, retry/failure policy, provider attempt/response evidence, sent receipts, ordinary retry deduplication, uncertain-delivery handling, explicit Mailercloud authorization, safe templates/privacy and monitoring. An in-memory sent tracker would not satisfy this gate.

## R. Legacy LMS isolation

All original public rows preserved, including users/auth roles, LMS orders/enrollments/courses/coupons/certificates and Workspace retained evidence. Non-Workspace legacy tables matched entire pre-test contents. Shared DB session settings unchanged by the worker-only pool. No LMS financial code, influencer coupon behavior or Phase 1.9 source changed.

## S. Validation/build

- Real PostgreSQL suite: 36 named checks passed, plus worker DB timeout/shared-session regression.
- Focused route configuration/webhook/worker/auth/database tests: 41 passed.
- Full pnpm validate: 70 route test files, 888 tests; all five pure test files; TypeScript; lint passed.
- Payments-disabled production build passed in an isolated source copy with no real provider secrets, unreachable synthetic database and cached fonts.
- git diff --check passed.

Harness-only mistakes corrected during verification: PostgreSQL Result-array normalization, required initial-order state transitions in the rollback probe, compiler default-import interoperability, and normal refund intent progression instead of an illegal direct prepared→processing transition. Guards were not weakened. No migration rewrite, dependency or lockfile change.

## T. Corrections/commits

Correction commit `a7b9e6f`: `fix(workspace): bound financial worker PostgreSQL waits`. Migration 0021 remained unchanged; no further migration generated. The final report/runbook commit is returned at delivery.

Files changed in C.1:

- lib/workspace/activation/repository.ts
- lib/workspace/payments/repository.ts
- lib/workspace/payments/worker.ts
- lib/workspace/payments/worker-database.ts
- lib/workspace/refunds/repository.ts
- tests/postgres/workspace-financial-loader.cjs
- tests/postgres/workspace-live-worker-verification.cjs
- tests/postgres/workspace-worker-database-verification.cjs
- tests/routes/workspace-worker-database.test.ts
- WORKSPACE_RAZORPAY_LIVE_OPERATIONS.md
- WORKSPACE_LAUNCH_RAZORPAY_LIVE_REAL_DB_VERIFICATION.md

## U. Remaining production blockers

Notice delivery implementation/verification; genuine refund webhook evidence; separately authorized production DB identity/ledger/hash/backup/migration rehearsal and application deployment; Production-only credentials/account/capture/webhook configuration; actual Vercel runtime/cron authentication/timeouts/cadence/capacity/monitoring; final commercial/legal/release gates. Local collation warning remains a separate local maintenance finding. Production is uninspected. No C.2, coupon phase, integrated pre-registration journey or Phase 1.9 work executed.

## V. Recommendation

**BLOCKER C.1 REAL POSTGRESQL + WORKER VERIFICATION PASS.**

**NOTICES DELIVERY STILL BLOCKED.**

This local/fake-provider verification does not authorize production configuration, migration, deployment, Live transactions or public charging. Persisted WORKSPACE_PAYMENT_ENABLED, Live authorization and Test authorization are absent; no temporary enablement was added. Public payments remain disabled. No temporary app/tunnel/scheduler was started; test processes ended. Stop after C.1.
