# Workspace F.6 database audit completion — local hardening

**WORKSPACE F.6 DATABASE AUDIT COMPLETE — LOCAL HARDENING VERIFIED**

Only the owner-approved migration 0030 was applied to the authorized local development database. This completion closes F6-01 locally. It is not production migration authorization or approval to release paid Workspace. Historical blocked/proposal reports are unchanged.

## A. Starting source/HEAD

- Repository: `/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms`.
- Branch: `codex/workspace-1.8-launch`.
- Starting HEAD: `93b5669`; worktree independently confirmed clean before creating completion tooling/artifacts.
- Starting baseline: 1,092 Vitest tests and five pure Node checks.
- No changes to existing application, financial, legal, price, access-resolver or membership business code. No new migration or schema generation delta was introduced.

## B. Authorized database identity

Fresh independent TCP and `/tmp` Unix-socket connections matched:

| Property | Verified value |
| --- | --- |
| Host/port/database | localhost:5433 / airbharath_lms |
| OID | 16384 |
| System identifier | 7680462735222304705 |
| PostgreSQL | 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) |
| Classification | DATABASE_ENV=development |
| Preservation/catalog connection | transaction_read_only=on |

Connections used explicit URL parsing and catalog identity; no URL-substring heuristic. Audit reads used repeatable-read read-only transactions, maximum one connection per pool, bounded connection/statement/lock/idle timeouts and prompt connection closure. No alternative target was contacted. Credentials and full URLs were not printed or committed.

## C. Approved migration preflight

File: `drizzle/0030_workspace_retained_history_truncate_guards.sql`.

Approved and independently recomputed SHA-256:

```text
f34c190f4e7877d5b0f3fab03c89874b825ef0f2cfebca520c1dc40adfbd5bd2
```

The complete SQL was inspected. It creates only the dedicated unconditional `public.workspace_retained_history_reject_truncate()` function and 21 BEFORE TRUNCATE statement trigger attachments. Targets/names matched the approved 40-table review. The function does not use OLD/NEW, an environment flag or a runtime privilege exception; it raises SQLSTATE 23514.

Every 0000–0029 migration byte matched the reviewed hashes and starting commit. The source journal contained exactly 31 entries, with exactly 0030 pending against the actual 30-entry installed ledger. There were no uncommitted migration/schema changes, old-trigger/function discrepancies or conflicting proposed objects. All 18 pre-existing equivalent guards were enabled. No financial calculations, historic accepted prices, legal documents or creator access rules were changed.

The source SQL, journal and 0030 snapshot remain identical to starting HEAD after application. The database ledger changed through the migrator only.

## D. Application and second-run no-op evidence

Executed the repository's **guarded `pnpm db:migrate`** twice, through the existing migration script and installed Drizzle migrator. Both exited 0. `DATABASE_ENV=development` and `ALLOW_DATABASE_MIGRATION=true` were process-scoped; no migration authorization was persisted in `.env`.

| Checkpoint | Installed ledger | Total rows across 64 inspected tables |
| --- | --- | ---: |
| Fresh baseline | 0000–0029, 30 entries | 6,871 |
| First guarded migration | 0000–0030, 31 entries | 6,872 |
| Second guarded migration | Identical 31 entries | 6,872 |

The new ledger row has the exact approved SQL hash and source journal timestamp `1791948748716`. All prior ledger IDs, hashes and timestamps are unchanged. No migration remains pending.

The migrator reports successful execution on both runs; the **no-op claim comes from the complete post-first/post-second snapshot comparison**, not that generic success message. Catalog, row hashes and ledger snapshots were exactly equal:

```text
post-first SHA-256  77f708655b1b19f98d0c86135b5bdfa0b81b37dbe51c76c774f6490784d12646
post-second SHA-256 77f708655b1b19f98d0c86135b5bdfa0b81b37dbe51c76c774f6490784d12646
```

The existing local collation-version warning appeared during both runs. It remains F6-02 and was not repaired.

No manual DDL replacement, schema push, reset, seed, TRUNCATE, ledger update or migration 0031 was executed.

## E. Installed 21 + 18 trigger coverage

Read-only catalog inspection verified one new function and the following 21 attachments:

| New guarded table | Exact trigger name | Verified properties |
| --- | --- | --- |
| `public.workspace_applications` | `workspace_applications_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_audit_events` | `workspace_audit_events_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_coupon_plans` | `workspace_coupon_plans_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_coupon_redemptions` | `workspace_coupon_redemptions_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_coupons` | `workspace_coupons_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_drafts` | `workspace_course_drafts_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_lessons` | `workspace_course_lessons_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_modules` | `workspace_course_modules_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_projects` | `workspace_course_projects_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_review_events` | `workspace_course_review_events_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_course_submissions` | `workspace_course_submissions_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_creator_profile_details` | `workspace_creator_profile_details_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_creator_profiles` | `workspace_creator_profiles_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_eligibility_attempts` | `workspace_eligibility_attempts_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_eligibility_settings` | `workspace_eligibility_settings_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_membership_orders` | `workspace_membership_orders_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_membership_plans` | `workspace_membership_plans_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_memberships` | `workspace_memberships_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_payment_attempts` | `workspace_payment_attempts_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_payment_events` | `workspace_payment_events_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |
| `public.workspace_policy_versions` | `workspace_policy_versions_retained_truncate_guard` | BEFORE TRUNCATE / statement / enabled O / public function |

All 21 have `tgtype=34` (BEFORE/TRUNCATE, statement), `tgenabled=O`, zero arguments and no WHEN predicate. All reference the function in namespace `public`. The installed function's body exactly matches the approved SQL body; it has no arguments, returns trigger, is PL/pgSQL/SECURITY INVOKER and has exactly `search_path=pg_catalog`. PostgreSQL's deparsed formatting differs from CREATE source, so catalog identity/body/security attributes were checked rather than claiming identical presentation bytes.

The existing 18 guarded tables remain protected with their unchanged enabled statement guards:

- `public.workspace_access_grant_events`
- `public.workspace_access_grants`
- `public.workspace_creator_terms_acceptances`
- `public.workspace_creator_terms_versions`
- `public.workspace_email_challenges`
- `public.workspace_email_notice_bindings`
- `public.workspace_influencer_history`
- `public.workspace_influencers`
- `public.workspace_refund_attempts`
- `public.workspace_refund_completions`
- `public.workspace_refund_notice_deliveries`
- `public.workspace_refund_notice_delivery_attempts`
- `public.workspace_refund_notices`
- `public.workspace_refund_observations`
- `public.workspace_refund_policy_acceptances`
- `public.workspace_refund_policy_versions`
- `public.workspace_refund_requests`
- `public.workspace_verified_emails`

**39 of 40 Workspace tables now have explicit retained-history TRUNCATE protection.** All old row-level financial, legal, review, email and access guards remain identical. The full catalog gained exactly one function and 21 triggers, with no unexpected function/trigger additions. Recorded totals across all inspected non-system schemas: 57 → 58 functions and 89 → 110 user triggers.

No retained table was truncated, even inside a rollback transaction. No trigger was disabled. The earlier F.6R disposable proof remains the destructive evidence: 70 completed checks, including 56 refused statements, original-gap reproduction, single/multi-table/cascade atomicity, non-owner privilege refusals and ordinary paid/complimentary financial/course-service compatibility. Its source SQL hash is exactly the now-applied hash. Its synthetic database/role cleanup already passed; it was not rerun against retained history.

## F. Deliberate operational-counter exclusion

`public.workspace_email_rate_limits` remains without a TRUNCATE trigger, as explicitly reviewed/approved. It stores pseudonymous operational window counters, rather than authoritative verified-email, challenge, financial or legal history. The existing separate proof/challenge/binding tables retain their guards.

No rate-limit cleanup or TRUNCATE privilege was added. Clearing active windows could still impair abuse protection; ordinary runtime roles should exclude TRUNCATE here too, and any future expiry maintenance requires a separately reviewed retention/security policy.

## G. Historical row and schema preservation

A **fresh** baseline measured 64 tables and 6,871 rows, including the retained D.1 history and 30 migration rows. It was captured before migration and never overwritten. Prior F.6 and F.6R private baselines and their committed reports/artifacts remain unchanged.

Original rows were compared as JSON-normalized whole-row MD5 multisets with multiplicities, table by table. Every original row is unchanged. The ledger comparison also checks every original ID/hash/timestamp and removes only the single verified newly added row from the after fingerprint comparison. Its added row is expected and not hidden as a preservation failure.

- Original non-ledger rows: **6,841 unchanged**.
- Original migration rows: **30 unchanged**.
- New migration row: **exactly one**.
- New customer/financial/grant/legal/eligibility/review/course/email/coupon/LMS fixtures: **zero**.
- No table added, removed, emptied or cleaned.
- Existing schema namespaces, object ownership/ACLs, columns/defaults, foreign keys/CHECK/other constraints, index definitions/validity/readiness, enums, views, policies, extensions, existing functions/triggers and runtime privileges: unchanged.
- Allowed schema delta: the single new function plus 21 reviewed triggers only.

Complete private snapshots (permissions 0600, no row payload export) are retained separately:

```text
/tmp/workspace-f6-application-before.json
/tmp/workspace-f6-application-after.json
/tmp/workspace-f6-application-noop.json
```

Committed catalogs contain safe definitions/counts/ledger metadata and snapshot/row-hash-set digests, not customer rows or per-row fingerprint exports. The read-only verifier refuses to overwrite its baseline. A changed original row or old schema object would fail comparison; unit regressions explicitly test those failures.

Evidence: `output/audits/workspace-f6-completion/catalog-before.json`, `catalog-after.json`, `catalog-no-op.json` and `application-summary.json`.

## H. Functional regressions and final validation

- Full `pnpm validate`: **1,095 Vitest tests across 91 files PASS**, plus **five pure Node checks PASS** (starting 1,092 + three preservation regressions).
- TypeScript: PASS. Lint: PASS; no ESLint warnings/errors. Existing Next lint deprecation notice remains.
- Read-only audit harness `node --check`: PASS.
- `pnpm db:generate`: PASS, “No schema changes, nothing to migrate”; journal and installed ledger both have 31 entries, with zero pending migration. No 0031 generated.
- Payment-disabled isolated production build: PASS, exit 0. Source copy omitted `.env`, actual provider credentials and local agent/cloud configuration; DB target was unreachable/synthetic, payment and Test authorization false, fonts served from cached local mocks. This verifies compilation/default disabled-payment integration, not production configuration or live connectivity. The task-owned build copy was removed afterward.
- `git diff --check`: PASS.
- No genuine provider requests, fixture creation or persisted payment/migration enablement occurred.

Validation evidence: `output/audits/workspace-f6-completion/validation.json`.

The ordinary suites include eligibility, email/OTP guards, Terms/Refund Policy, order acceptance/GST-inclusive pricing, coupons/influencer capacity, capture/held/webhook handling, refunds/completions/notices, grant lifecycle and paid/complimentary coexistence, private proposal/review/module/lesson editing, Admin authorization/pagination, privacy and legacy LMS behavior. No retained fixture was edited to exercise them. Test environment used an unreachable synthetic DB and no provider credentials.

Three new preservation regressions verify: (1) accept exactly the approved additive delta plus one ledger row; (2) reject changed old membership/ledger evidence even when counts match; (3) reject unexpected functions and changed old triggers. The verifier itself performs only SELECT/catalog reads against the retained database.

## I. Original F6-01 status

**F6-01 corrected locally.** Exact approved 0030 is installed; the 21 missing retained-history guards and 18 existing equivalents are verified. Old financial, legal, audit, grant and course semantics remain intact.

This does not certify resistance to a superuser/object owner deliberately dropping/disabling protection, altering trigger execution settings or destroying a database. Runtime-role separation, backup/recovery and production-specific authorization remain independent requirements.

## J. Inventory disposition

**61 KEEP, 3 REVIEW, 0 UNKNOWN**, consistent with the preserved 64-table inventory. The three review tables remain the unmanaged legacy OTP table and two retained isolated D.1 notification-test copies. Nothing is reclassified as disposable merely because it is a review candidate.

The earlier approved all-40 table retention responsibility matrix remains authoritative for guard selection/exclusion; this continuation changes only installed guard coverage, not table retention policy.

## K. Explicit no-deletion/no-cleanup confirmation

**No table was deleted or cleaned.** No original or historical fixture row was removed, rewritten or added by this phase. No TRUNCATE, reset, seed, forced cascade deletion, constraint drop, trigger disablement or erasure workflow ran against retained tables. No new disposable database or fixture was required in this continuation.

## L. Outstanding F6-02 through F6-07

| Finding | Status and required separate work |
| --- | --- |
| F6-02 | OPEN — local collation 2.39 → 2.43 mismatch. Requires separately approved backup/rebuild/validation plan; production status unknown. No REFRESH COLLATION or reindex performed. |
| F6-03 | OPEN — five semantically matching legacy FKs have different names. Production compatibility remains unverified. No constraint renamed. |
| F6-04 | OPEN — shared connection URL substring heuristic and pool/timeout concerns. Requires dedicated correction/review **before production-sensitive database workflows rely on it**. Explicit exact-target verification was used here; application connection configuration is unchanged. |
| F6-05 | OPEN — potential FK/index/search/count scaling concerns. No speculative query/index tuning. |
| F6-06 | OPEN — retention policy and three REVIEW tables. No deletion approval exists; legacy OTP and D.1 notification copies remain intact. |
| F6-07 | OPEN — invoice PDF base64 storage growth. No storage rewrite or cleanup. |

These findings remain visible and are not waived by the local F.6 completion verdict.

## M. Production portability and operational risks

No production or staging catalog, migration ledger, credential, role, data or configuration was accessed. Production applicability of 0030 remains unverified for that specific catalog and requires separate human authorization.

Before a production-sensitive workflow, first correct/review F6-04, then verify exact parsed target/runtime, source/ledger correspondence, expected tables/functions/guards and object-name conflicts, migration ownership/privileges, runtime non-owner permissions, backups and a bounded operational lock window. Source portability does not prove production catalog compatibility. Owner/superuser local credential privileges remain unchanged and do not represent a certified least-privilege production setup.

The local collation warning must receive its own plan; no maintenance guidance was executed opportunistically. Concurrent unrelated changes would require investigation rather than silently replacing a baseline. No production capacity, recovery or backup-restore certification is claimed from these checks.

## N. Remaining owner requirements and release gates

All **13 owner-agreed Workspace improvements remain mandatory before the paid Phase 1.8 launch**. This closes the authorized local F.6 table audit/hardening scope, alongside prior phase results; it does not claim all 13 requirements complete or invent a replacement checklist.

F.7 main landing-page audit/owner-approved improvements remain mandatory pre-launch work requiring their own authorization. Admin restructuring, pagination, landing-page improvements and database auditing are not approved post-launch deferrals. No F.7A or other phase was started. Frozen Phase 1.9/media, publication, creator-course sales and later phases remain excluded.

Production release gates remain: unresolved F6-02–F6-07 review/corrections, genuine refund webhook evidence still blocked in the B.2R report, separately authorized genuine transactional email/sender/delivery verification, production configuration/credentials and migrations, worker/scheduler/durable-notice operations, commercial/release sign-off, operational handling/documentation and final release smoke. F.2's owner-bound verified-email implementation is preserved; older D.1 limitations do not erase that later implementation result or establish genuine delivery readiness.

Public charging remains OFF. Configuration inspection confirmed no migration-authorization, payment/test/live, refund, webhook/reconciliation or notice-delivery flag persisted as true in `.env`. These files/configurations were not changed. No genuine Razorpay, MSG91, Mailercloud or other provider operation occurred, and there was no deployment or production configuration change.

## O. Commits and changed-file inventory

Verification tooling/evidence commit: `2f40a2722b851c513e2d5b31abe18342c26feece`.

This completion report is committed separately; its own commit hash is returned to the owner to avoid a self-referential hash. Historical F.6 blocked/proposal reports, migration SQL 0000–0030, the journal/snapshots, `.env`, dependency declarations/lockfile and all application code are unchanged.

Complete changed-file list:

- `scripts/audits/workspace-f6-guard-application-verification.cjs` — opt-in read-only before/after/no-op collection and exact-delta preservation checks.
- `tests/routes/workspace-guard-application-preservation.test.ts` — three preservation failure/allowed-delta regressions.
- `output/audits/workspace-f6-completion/catalog-before.json` — fresh identity/ledger/schema/privilege/count metadata and private snapshot digests.
- `output/audits/workspace-f6-completion/catalog-after.json` — exact installed guard properties and original-data/schema comparison.
- `output/audits/workspace-f6-completion/catalog-no-op.json` — exact second-run no-op snapshot/comparison.
- `output/audits/workspace-f6-completion/application-summary.json` — migration/log digests, expected delta, preservation and unchanged historical evidence.
- `output/audits/workspace-f6-completion/validation.json` — completed validation/build/no-drift results and safe environment classification.
- `WORKSPACE_LAUNCH_F6_DATABASE_AUDIT_COMPLETION.md` — this separate completion report.

No corrective product-code patch or migration rewrite was necessary.

## P. Final assessment

**WORKSPACE F.6 DATABASE AUDIT COMPLETE — LOCAL HARDENING VERIFIED**

The exact approved 0030 applied locally; ledger 30 → 31; second run proved no-op; all 21 new and 18 existing guards verified by read-only catalogs. Original rows and original schema structures are preserved except the authorized additions, with no destructive retained-table test. Validation passes. F6-02–F6-07 and separate paid-release requirements remain open.

STOP after this authorized F.6 completion. No table cleanup, F.7A, production work or public charging is authorized by this result.
