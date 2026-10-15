# Workspace Launch Blocker D.1 — real PostgreSQL notice verification

## A. Branch/worktree

Started clean on `codex/workspace-1.8-launch` at `b2e54a2`, implementation `4de8596`. Verification date: 13 October 2026. No genuine email, Mailercloud/Razorpay request, production DB/configuration access, deployment, Cron configuration, creator email-verification implementation, coupon change or Phase 1.9 work occurred. Phase 1.9 remains frozen at `codex/workspace-phase19-wip@a9ea151`.

## B. Database identity

Independent TCP localhost:5433/airbharath_lms and application /tmp socket connections agreed: database airbharath_lms, port 5433, database OID 16384, PostgreSQL system identifier 7680462735222304705. Executed with DATABASE_ENV=development. No credentials/full connection strings printed.

## C. Ledger before

22 applied entries, 0000–0021; final 0021_workspace_live_financial_modes. Each hash/order/journal timestamp matched committed source. Source 0000–0021 SQL bytes/journal prefix unchanged. Only reviewed 0022 pending; no Phase 1.9 asset migration or source drift.

## D. Migration 0022 integrity/application

Reviewed and applied only `0022_lethal_barracuda.sql` through guarded pnpm db:migrate, with process-scoped migration authorization. SHA-256:

`050382a0cacd25693074ef5eeead51cf24c6ca20624fed1266f220d198e4226b`

Adds two delivery/attempt tables plus coordination/history checks, FKs, indexes and guards. No business-notice rewrite/backfill. No schema push/reset/manual ledger edits. Actual migration remained unchanged after application. PostgreSQL emitted the known local collation-version warning (2.39 database versus 2.43 OS) and normal long-identifier truncation notices; no collation repair attempted. FK relationships were inspected after creation.

## E. Ledger afterward/no-op

23 entries, 0000–0022, all hashes matching source. Second guarded invocation succeeded with exactly identical ledger/identity evidence. Final ledger check remained identical; no pending migration, no 0023 generated/applied.

## F. Schema/constraints/triggers

Inspected actual three-table notice catalogue: 35 columns, 12 constraints, seven noninternal triggers and seven indexes, including both new functions. Confirmed one delivery per notice, unique delivery/attempt ordering, protected business facts, current attempt/lease ownership, pinned dispatch payload, acceptance receipt and terminal/history guards. Actual claim→submitted→accepted/blocked/uncertain/retry transitions used production repository/service code against PostgreSQL.

Rollback probes rejected original notice ownership changes, delivery identity/payload/recipient/state rewrites, accepted/uncertain attempt rewrites, deletion/truncation and invalid attempt number with SQLSTATE 23514. Duplicate milestone INSERT returned 23505. Missing completion/rejection/initiation facts returned 23514. Public delivery guard definitions remained identical after all isolated harness work.

## G. Historical compatibility

Baseline before migration: all 51 existing public tables, 2,983 original rows. Per-row fingerprints/counts matched after migration and after all verification; legacy tables also matched entire pre-test contents. Preserves original payment/refund E2E, Terms/Refund Policy evidence, memberships/profiles/course content, immutable notice obligations and C.1 fixtures.

Migration alone created zero delivery and attempt rows. Later explicitly authorized tests materialized historical notices without editing their business facts. The genuine approved/full-refund order has **three** notices: received, initiated and completed. Rejection belongs to a separate rejected workflow; an approved order cannot truthfully contain all four milestones. All three genuine historical notices materialized as blocked, with zero fake or real email sends.

## H. Verified-recipient limitation

Production resolver reads persisted membership-order owner → users.email and always treats current account email as unverified. Real no-email, malformed, valid/unverified, changed-email and other-user-contact scenarios blocked safely. Another persisted user's injected verified contact was rejected by owner identity checks.

**Verified-recipient delivery path simulated; production verified-email source still missing.** Test-only loader/store injection supplied an owned synthetic contact while retaining actual PostgreSQL facts/delivery repository/service/worker. No email_verified column/backfill, API bypass or production verification producer was added.

## I. Real delivery materialization

Synthetic tagged fixtures used existing eligibility/agreement/order/payment/refund services with fake financial facts, never provider HTTP. Actual attributed rejection and provider initiation/full-completion paths produced the corresponding notices. Duplicate full reconciliation retained one completion obligation. All four milestones were exercised across valid requested/rejected/approved/completed workflows; invalid milestone inserts failed.

Synthetic users/financial history are identifiable by WSD1_ run tags and retained. No protected evidence was deleted to clean fixtures.

## J. PostgreSQL claim concurrency

Two independent connections were blocked on the same delivery row. pg_stat_activity showed two distinct lock-waiting backends before blocker release. Both claim transactions completed with one nonnull winner, one active identity and one attempt. The corresponding dispatch race also had two real lock waiters and one eligible dispatch. No deadlock or duplicate send eligibility.

## K. Lease and retry behavior

Controlled time tests ran in a clearly isolated retained `wsd1_clock_<run>` schema with copied delivery structures/guards, an explicitly test-only clock and dedicated search path. Public guards/system clock were not changed; ordinary application connections cannot see this clock through their default search path.

Expired claimed work became retryable with persisted backoff; stale claim dispatch/completion refused. Later claim kept the delivery UUID and used a new attempt ID. Expired submitted work became uncertain and remained unclaimable/unresendable. Five safe throttling attempts reused one UUID, honored scheduled exponential delays and terminated blocked/retry_exhausted. Changed recipient/payload/provider configuration/template bindings blocked instead of dispatching different content. Terminal uncertain state/result rewrites failed.

These are real PostgreSQL transitions with controlled time in an isolated harness, not in-memory repository substitutes or unnecessary minute-long sleeps. Tagged isolated-schema evidence is retained as development verification data; no production clock bypass was introduced.

## L. Provider acceptance with fake transport

Actual Mailercloud adapter used documented SUCCESS/1000 fake HTTP responses. Before every fake send, independent SQL read observed committed submitted/dispatch evidence; a separate transaction acquired delivery and attempt FOR UPDATE NOWAIT, proving provider HTTP was outside those database locks. Acceptance/code/reference/time persisted and finalized the attempt. Replay made zero additional calls. This proves **provider accepted** under simulated transport, not recipient inbox delivery.

Real DB outcomes covered internal HTTP-200 rejection, explicit throttling, server error, malformed/oversized body and post-dispatch timeout. Definitive errors blocked, throttling retried safely, ambiguous results held uncertain. An individual eight-second pending fake HTTP request aborted at about 8,026 ms, persisted uncertain and was not resent. Pre-dispatch abort acquired no claim and sent nothing.

## M. Uncertain outcome recovery

Simulated acceptance/receipt loss left real submitted intent; its actual expired public lease recovered to uncertain without another call. A separate real PostgreSQL receipt transaction fault returned observed SQLSTATE 22012 after fake acceptance; transaction rolled back, submitted intent survived and controlled-time recovery held uncertain with exactly one fake send. Committed acceptance followed by job-response loss remained accepted on replay.

No automatic resend of uncertainty, including beyond a provider deduplication window. Stable metadata.messageId reuse is internal evidence here; actual Mailercloud deduplication behavior remains unverified. Stale results cannot override protected uncertainty; operator recovery still needs a reviewed evidence-preserving procedure.

## N. Actual two-worker race

Ran two actual runRefundNoticeWorker invocations with separate real worker PostgreSQL pools and controllable fake HTTP. Forced overlap at the same pending delivery using a third blocking connection. Observed two distinct notice-worker backends waiting on the lock, one attempt and one fake provider invocation; final accepted state and repeated invocation remained duplicate-free.

Only fixture selection, verified-contact simulation and transport were injected. Production worker, pool, repository, service, claim/dispatch/result transactions and cleanup ran normally. No fake-store Promise concurrency is presented as database evidence.

## O. Worker authentication

Actual Node Request/Response route handler with real DB-backed worker exercised without starting a public app/tunnel. Anonymous, creator/admin cookie-only, forged Cron agent, query secret, invalid Bearer and short server secret returned 401. Correct isolated strong Bearer followed capability/configuration gates. Disabled sending returned safe 503; authenticated view=status returned 200, no-store counts/reasons/timestamps, no email/credential/body/provider reference. Secrets were generated only in temporary harness processes and never printed/persisted.

## P. Capability independence

New charging and refund initiation remained disabled during notice dispatch tests. Independent notice enablement permitted the controlled fake acceptance path. Disabled notice capability made no dispatch while protected status stayed readable. Production recipient resolution remained unverified regardless of sender configuration; no financial truth or paid access changed because of notice failure.

Maximum three candidates per invocation verified over a seven-notice scoped backlog. Actual global repository queue also processed 50 safe blocking claims across 17 bounded runs, with zero fake HTTP; subsequent reruns processed only newly added fixtures. No endless loop, queue starvation or process-global send deduplication.

Actual notice-worker pool: 2-second lock timeout (55P03 at 2,006 ms), 5-second query timeout (57014 at 5,001 ms), 5-second connection/idle limits and bounded cleanup. Shared session settings unchanged. Shared 30-second provider deadline, individual 8-second HTTP limit and endpoint maxDuration 60 retained; actual Vercel enforcement/load/cadence remains a later gate.

## Q. Privacy/financial isolation

All original financial/request/decision/order/payment/paidAt/deadline/completion/member/coupon/course/user rows remained fingerprint-identical. Notice scenarios also compared financial projections around delivery. No Razorpay mutation occurred; financial fixture adapters were fake.

Persistent attempts contained no raw recipient address, HTML/script body or raw provider response. Owned-contact data was read only as needed; test transport content was not logged. Rejection text was bounded/escaped, links used configured validated origin rather than Host headers, operator results contained only safe aggregates. No PostHog/private analytics or real email ingestion was exercised.

## R. Migration atomicity

Executed a scoped copy of full 0022 inside a disposable transaction/private schema, adapting only the internal delivery FK namespace. Injected SQLSTATE 22012 after table/function/guard creation. Rollback left no schema, partial table or guard from that transaction. Main development schema/ledger untouched. This is an atomicity fault probe, not partial application or ledger manipulation of the real migration.

## S. Tests/build

Real PostgreSQL phases passed: initial catalogue/materialization, 31 core named checks, actual worker/lease/retry/atomicity checks, milestone/historical/backlog/privacy/timeout checks, global recovery and terminal guards, plus actual pool limits. Four opt-in harnesses parse and executed successfully.

Full pnpm validate passed: 74 route files / 941 tests, all five pure test files, TypeScript and lint. Payments-disabled isolated production build passed with no real provider secrets, unreachable synthetic DB and cached fonts. Migration generation reported no schema changes/nothing to migrate. git diff --check passed. No genuine provider calls.

## T. Corrections/commits

No production implementation/schema defect was found; no corrective migration or product code change. Applied 0022 was not rewritten. Harness-only syntax, nested connection usage and result-recording issues were corrected without weakening public guards. A task-owned blocked harness process was stopped to release its transaction; application/PostgreSQL were not stopped.

Verification harness commit: `cc1fd10`. Final evidence/report commit returned at delivery.

Files changed:

- tests/postgres/workspace-notice-delivery-verification.cjs
- tests/postgres/workspace-notice-worker-verification.cjs
- tests/postgres/workspace-notice-final-verification.cjs
- tests/postgres/workspace-notice-recovery-verification.cjs
- WORKSPACE_LAUNCH_NOTICE_DELIVERY_REAL_DB_VERIFICATION.md

Private baseline/catalogue/ledger/results logs remain outside Git. Temporary isolated build copies created by this task were removed after successful checks.

## U. Remaining recipient/provider/scheduling blockers

Implement and genuinely verify owner-bound creator contact; define safe contact-change and blocked/uncertain resolution procedures. Separately authorize actual Mailercloud account/sender/domain/configuration, acceptance/deduplication/privacy/delivery monitoring tests. Review production ledger/migration/deployment and worker scheduling/authentication/capacity under later authorization. Local collation warning remains a separate maintenance finding. No production notification readiness claim.

## V. Recommendation

**NOTICE DELIVERY REAL DB VERIFICATION PASS.**

**VERIFIED CREATOR EMAIL STILL BLOCKED.**

**GENUINE MAILERCLOUD DELIVERY STILL UNVERIFIED.**

Public charging remains disabled. No genuine email/provider request, production configuration/access/deployment, email-verification implementation, coupon change or Phase 1.9 work. Temporary flags/secrets were process-scoped only; all verification processes ended. Stop after D.1.
