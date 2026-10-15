# Workspace E.1 continuation — migration 0024 and preservation gate

13 October 2026.

**INFLUENCER COUPONS VERIFICATION BLOCKED**

Migration 0024 and the corrected influencer-history guards passed real PostgreSQL checks. Continuation stopped at the original-row preservation gate: one pre-task `workspace_course_submissions` row fingerprint no longer matches. The cause is unresolved. No course row was edited/restored, no baseline was replaced, and no financial/browser scenario was started. A clarification was requested about concurrent local edits. The previous E.1 report remains unchanged.

## A. Starting state and scope

Branch `codex/workspace-1.8-launch`; starting HEAD `089e739`, clean worktree. Source hashes matched the brief. Only 0024 pending, with no Phase 1.9 migration. All earlier applied migration bytes matched ledger/journal. Work remained local development only. No Razorpay/Mailercloud request, checkout enablement, deployment, email verification change or Phase F/1.9 work.

## B. Actual DB identity

TCP and independent `/tmp` socket checks before/after migration both matched:

- `airbharath_lms`, port `5433`, OID `16384`.
- System identifier `7680462735222304705`.
- `DATABASE_ENV=development`; exact authorized localhost target.

No credentials or full connection strings printed. Local database operations used reviewed sandbox escalations within the explicit authorization.

## C. Original-row baseline

Fresh actual baseline: **55 public tables / 3,725 original rows**. Full `to_jsonb(row)::text` fingerprints and duplicate multiplicities were recorded before applying 0024. Unlike the earlier additive-column migration, no fields were excluded from this comparison. Baseline was retained unchanged when a mismatch appeared.

## D. 0024 review/hash/application

Reviewed complete SQL. It creates an unconditional exception-raising trigger function and BEFORE TRUNCATE / FOR EACH STATEMENT guards on influencer identity and history. It changes no existing row, economic rule, row-level trigger, LMS table or prior migration.

Applied **only** `0024_workspace_influencer_history_truncate_guard.sql` via guarded `pnpm db:migrate`, with temporary process-only migration authorization. `.env` unchanged. No schema push/reset/manual ledger manipulation or trigger disabling.

0024 SHA-256 before/application:

`a43c81bc2dbe9cae06883946221e6487c51fd85d05ad2a49db38690250627f8e`

Applied 0023 remained:

`eb52bf03f803cf181d155483794f853e9d08c00240e29dd0ba3ace5cd1e7f910`

## E. Ledger before/after/no-op

Before: **24 entries, 0000–0023**. After: **25 entries, 0000–0024**. Every ledger hash/timestamp matched source/journal; only expected pending migration existed. Second guarded migration completed successfully. Full after/no-op identity and ledger JSON compared byte-for-byte equal. No unexpected pending migration or ledger edit.

## F. TRUNCATE immutability evidence

Real rollback-only probes against actual public tables:

| Probe | SQLSTATE / outcome |
| --- | --- |
| TRUNCATE influencer history | 23514, refused |
| TRUNCATE influencer identity without CASCADE | 0A000, restrictive FK dependency refusal |
| TRUNCATE history CASCADE | 23514, refused |
| TRUNCATE influencer identity CASCADE | 23514, refused |
| Multi-table history + identity CASCADE | 23514, refused |
| History UPDATE/DELETE/direct INSERT | 23514, refused |
| Influencer DELETE, bad version, non-admin actor | 23514, refused |
| Coupon reassignment/economic rewrite | 23514, refused |

Installed catalogue confirms two statement-level triggers calling `workspace_influencer_reject_truncate()`. Function raises 23514 unconditionally. Test DB role has TRUNCATE privileges on both tables and function EXECUTE, so exception cases demonstrate database guards, not merely missing privileges. Direct identity RESTRICT first fails PostgreSQL's FK dependency check; CASCADE reaches guarded rejection.

Tables already contain protected history; empty-public-history test is not relevant without deleting immutable records. All pre-task influencer/history fingerprints remained present. Legitimate creation/versioned updates still worked. **Corrected influencer-history protection passed**; full Stage A continuation clearance was withheld because overall original-row preservation failed.

## G. Influencer admin/history results

Real service create/replay produced one stable identity and history version. Rename, inactive and active updates produced three actor-attributed history snapshots. Stale version conflicted; persisted student and malformed creation denied. Existing coupon service created a canonical linked coupon for all three plans. All invalid SQL probes rolled back, and new history remained intact.

Retained clearly tagged `WSE1C_<unique run UUID>` admin/student, influencer/history, coupon/applicability and audit fixtures. No financial/profile/membership fixtures were created. No customer contact information used. Real HTTP/JWT checks were not started.

## H. Coupon pricing and plan applicability

Not executed in real PostgreSQL beyond current plan validation during synthetic coupon creation. Existing full regression suite passed; no real quote/pricing matrix PASS claimed.

## I. Final-slot PostgreSQL concurrency

Not started because preservation gate failed. No real financial lock-wait or cap-race outcome claimed.

## J. Same-user reservation/idempotency

Influencer create replay passed; financial same-user/request-key/reservation matrix not executed.

## K. Held capture/paid-redemption integrity

Not executed. No captured payment or financial override created.

## L. Provider uncertainty

Not executed. Verification harness globally blocks external fetch; no genuine or fake provider financial operation was invoked.

## M. Refund and coupon capacity

Not executed. Original refunds/redemptions remain fingerprint-identical. No refund initiated or completed by this task.

## N. SQL reporting totals

Actual financial aggregate fixture/query tests not executed; no exact new fixture revenue totals to report.

## O. Test/Live segregation

Not exercised. No fabricated Live financial activity persisted or contacted. Keep shared capacity unchanged. Recommend separate Test and Live campaign codes so testing does not consume commercial campaign capacity; this remains an operating recommendation, not a rule change.

## P. Reporting consistency

Real concurrent financial reporting not executed.

## Q. Attribution stability

Basic identity/history/coupon reassignment protection passed. Paid/refunded attribution rename scenario not executed.

## R. Hydrated admin UI

Not started. No authenticated admin browser PASS claimed.

## S. Hydrated creator UI

Not started. Public payments remain disabled; no Razorpay Checkout launched.

## T. Mobile/privacy

Browser/mobile/network/source checks not executed. No production PostHog ingestion claimed. No auth session cookie or OTP issued by this task; no real provider secret copied into source/report. Existing privacy/default-disabled regression tests passed.

## U. Migration atomicity

Guarded migration succeeded and invalid SQL probes rolled back. Disposable-schema injected migration-failure proof was not executed after preservation interruption. These successful transactions are not presented as a substitute for that missing proof.

## V. Historical preservation

Read-only diagnostic compared **all** tables after the initial preservation checker stopped at its first mismatch:

- **3,724 / 3,725 original row fingerprints preserved**.
- **54 / 55 original tables have no missing original fingerprints**.
- One missing fingerprint in `workspace_course_submissions`; row count remains 78.
- Original influencer identity/history, coupon/reservation, order/payment/refund, membership/profile, agreement/notice/delivery and legacy tables are preserved.
- Only tagged influencer verification additions were made by the task.

The differing baseline fingerprint is `55989a0858677f6f30a943cdb13d0cbc`. A fingerprint mismatch does not identify which column changed or who/what changed it. Read-only session inventory showed other idle local clients, but that does not attribute the change to them. Neither migration 0024 nor the service/probe harness issues committed course-submission mutations. The mismatch remains unexplained; do not claim all original data unchanged or silently restore/rebaseline it.

The user was asked whether concurrent course edits occurred. Stage B remains paused pending resolution/authorization of the preservation discrepancy.

## W. Tests/build

- Full `pnpm validate`: PASS — five pure test files, 78 Vitest files / 964 tests, TypeScript and lint.
- Source-only `pnpm db:generate`: no schema changes/drift.
- Payment-disabled isolated production build: PASS — scrubbed isolated source copy, payments disabled; task-owned build copy removed.
- `git diff --check`: clean.
- Real Stage A opt-in integrity harness: corrected truncation and legitimate history checks pass.
- Original-row preservation check: **FAILED** as described above.

Offline validation/build use scrubbed process environments, fake unreachable DB target, no provider credentials and cached font responses. No dependencies/lockfile changes.

## X. Corrections/commits

No product/schema correction made or needed for 0024's tested guards. No 0025 generated: the preservation mismatch has not been attributed to an implementation defect. Applied 0023/0024 bytes unchanged. Previous report retained.

Changed files:

- `tests/postgres/workspace-influencer-continuation-integrity.cjs` — opt-in real local SQL proof, external fetch blocked; direct, cascade, multi-table and row-history probes with tagged fixtures.
- `WORKSPACE_LAUNCH_INFLUENCER_COUPONS_E1_CONTINUATION.md` — this report.

## Y. Remaining launch gates

Resolve the one course-submission preservation mismatch without rewriting protected history or replacing the baseline silently. Then resume remaining E.1 real financial races, pricing/preview/uncertainty, held/paid/fulfillment/refunds, reporting totals/Test-Live segregation/snapshot consistency, HTTP/JWT and hydrated admin/customer/mobile/privacy tests, and disposable-schema migration atomicity. Full financial/browser PASS is still unestablished. No public charging, deployment, Phase F or Phase 1.9 authorization follows.

## Z. Recommendation

**INFLUENCER COUPONS VERIFICATION BLOCKED** — 0024 guards pass, but complete original-row preservation cannot be confirmed. Stop without claiming financial/browser verification; preserve baseline, original evidence and tagged additions.
