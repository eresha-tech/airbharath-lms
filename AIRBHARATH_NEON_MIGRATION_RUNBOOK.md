# Existing Neon database: controlled inspection and migration runbook

Prepared 15 October 2026 for RC `845419a2e6057d20f2f2bf2a14646245ccbe9436`. **Instructions for later authorized work; nothing below authorizes execution.** Production holds real LMS customers and financial history. No initialization, reset, schema push, blanket seed, constraint rename, collation repair or migration-ledger repair.

## 1. Restricted production inspection — first separate approval

Owner must identify the exact Neon project, branch, **direct** endpoint, database, restricted inspection role and separate migration role from the Neon Console. Host/OID alone does not prove branch identity; clones can retain database names/OIDs. SQL system identifiers may be unavailable and do not replace provider mapping. Confirm mapping independently, never copy local OID/system identifier into production expectations.

Provision credentials out of band, with separate permission authorization if needed. The inspection role needs CONNECT, schema USAGE and effective SELECT on the ledger/prerequisites/catalog diagnostics. It must not own objects/routines, inherit writer/migration roles, hold elevated role attributes, CREATE/TEMP, table mutation/TRUNCATE/TRIGGER or sequence USAGE/UPDATE rights. PUBLIC/inherited grants count; the tool may refuse ordinary PUBLIC TEMP privileges. **Do not modify privileges to make it pass without separate approval.** Missing diagnostics produce UNKNOWN, not escalation.

Secure process injection only, without dotenv or shell-history URLs:

| Variable | Required content |
|---|---|
| `PREFLIGHT_DATABASE_URL` | Secret direct restricted-role URL; explicit `sslmode=verify-full`, optional `sslrootcert=system` |
| `PREFLIGHT_EXPECTED_HOST`, `PREFLIGHT_EXPECTED_DATABASE`, `PREFLIGHT_EXPECTED_ROLE` | Exact approved identity, no pooled hostname |
| `PREFLIGHT_MIGRATION_ROLE` | Existing different role; inspection role cannot assume it |
| `PREFLIGHT_NEON_PROJECT_ID`, `PREFLIGHT_NEON_BRANCH_ID` | Owner-attested Console mapping |
| `PREFLIGHT_EXPECTED_DATABASE_OID` | Optional independently known production OID |

Only after explicit SELECT-only approval and secure injection:

```bash
ALLOW_PRODUCTION_READONLY_PREFLIGHT=true DATABASE_ENV=production PREFLIGHT_CONNECTION_MODE=direct pnpm exec node scripts/database-readonly-preflight.mjs
```

Do not set `ALLOW_DATABASE_MIGRATION`. CLI ignores ordinary application URLs, verifies source pins before collection, uses one verified-TLS connection and repeatable-read READ ONLY fixed SELECT queries. Limits: connect/statement/idle transaction 5s, lock 1s, collection 30s. It collects identity/TLS/role, ledger and bounded catalog/prerequisite metadata, not customer rows or active query text. Store output privately outside Git. Exit 1 = refusal/failure; exit 2 = collected evidence, **still migration BLOCKED**. No successful output authorizes writes.

Current source: **32 migrations through `0031_workspace_phone_only_onboarding`**; 66 pinned files. `loadReviewedSource()` passes offline. Ordered manifest SHA256 `e9494753700c4df15ce57261e7431ba8d0451c1e41d46db485a7d55886f6eaf8`; source-file pin `2fed961b801f528b8c92c2f200d312e4abb9d95a22e1cffa40a27b289d6b9ba9`. Historical F.9B.1 prose describes 0030; current executable pins include 0031. No source update is needed.

## 2. Exact pending-chain decision

1. Require actual identity/TLS/role/timeout checks to pass, then full ledger access.
2. Compare every ledger timestamp **and full SQL hash** to a unique contiguous journal prefix, in order. Inspect schema against that prefix plus prerequisite booleans/functions/triggers; structural matching alone is insufficient.
3. If prefix ends at 0006, candidate suffix is exactly **0007–0031, 25 files**, below. If another valid prefix ends later, take only its remaining suffix. Through 0031 means no pending SQL, not automatic compatibility approval.
4. Missing/empty ledger on a populated database, gaps, duplicate/divergent/future hashes, unknown catalog objects or permission/limit failures mean STOP. No bootstrap, skip, guessed hash, manual ledger insertion or old-file editing.
5. Before migration, re-run the independently authorized read-only comparison and compare to the approved packet. Drizzle itself selects by latest timestamp and does not validate every historical hash. Even `db:migrate` “no-op” performs ledger DDL; it is not an inspection command.

## 3. Provisional dependency map

Use full file tags from `drizzle/meta/_journal.json`; numbers below abbreviate those exact immutable files. Each row also depends on the earlier ordered prefix; do not cherry-pick.

| Migration | Main operation | Required predecessors / sensitive prerequisites |
|---|---|---|
| 0007 lucky_wild_pack | Manual applications | Existing `users.id`; Admin FK, no legacy learner rewrite |
| 0008 eager_energizer | Approval-email state | 0007 applications + `users`; preserve manual history |
| 0009 normal_baron_zemo | Eligibility settings/attempts, policy, audit | `users`; seeds policy/settings V1; immutable hashes/version guards |
| 0010 illegal_toxin | Membership plans/coupons | 0009 audit guard/constraint; seeds three V1 plan IDs and amounts |
| 0011 coupon_audit_freshness | Coupon guard correction | 0010 guard functions/audit state |
| 0012 useful_warhawk | Orders, attempts, events, redemption | 0009 eligibility/policy, 0010 plans/coupons, `users`; ownership unique keys must precede composite FKs |
| 0013 peaceful_spiral | Creator profiles/memberships | 0012 frozen order ownership/provider context, 0010 plans; existing order-state constraint name |
| 0014 outgoing_freak | Profile details/proposal drafts | 0013 Creator identity and `users` |
| 0015 warm_sprite | Immutable submissions/review events | 0014 drafts + persisted Admin `users`; retained review history |
| 0016 tired_prowler | Capture-time evidence rule | 0012 payment definition constraint/function; 0013 order state |
| 0017 marvelous_captain_midlands | Private text projects/modules/lessons | 0013 identity + 0015 approved submission, ownership keys |
| 0018 ambiguous_khan | Terms versions/acceptances/order binding | `users`, 0012 orders; V1 canonical text/hash and immutable acceptance guards |
| 0019 creator_terms_v2 | Publish Terms V2 | Exact expected V1 publication/hash prerequisite; no arbitrary legal text/seed replacement |
| 0020 gigantic_mordo | Refund policies/requests/attempts/completions/notices | 0012 order capture/context; agreement FKs and exact versioned Refund Policy seed/effective time |
| 0021 live_financial_modes | Test/Live context guards | 0012/0020 existing evidence consistent with new constraints; preserve history |
| 0022 lethal_barracuda | Durable notice outbox/attempts | 0020 immutable notices/refund facts and guards |
| 0023 chubby_jimmy_woo | Influencers/history/coupon binding | 0010 coupons, `users`; immutable attribution/history |
| 0024 influencer_history_truncate_guard | Statement-level history guard | 0023 history table/function |
| 0025 held_capture_coupon_consistency | Held capture/redemption guard fix | 0012/0016 financial evidence and coupon guard functions |
| 0026 membership_pricing_v2 | Versioned successor catalog | Exact three current original V1 IDs/names/durations/base amounts/tax/currency/availability; no successor/ID collisions; locks plan table |
| 0027 verified_creator_email | Proof/challenge/binding tables; shared-user contact trigger | `users.email`, 0012 orders, 0020 notices; user update permissions and existing trigger conflicts must be rehearsed |
| 0028 creator_access_grants | Audited independent access grants | `users`, 0013 Creator identity, 0009 eligibility, 0018 terms |
| 0029 grant_completion_record_fix | Grant completion trigger correction | 0028 function and completion-event invariant |
| 0030 retained_history_truncate_guards | 21 retained-history protections | All named prior tables/functions; no guard disabling for restoration |
| 0031 phone_only_onboarding | Replace new-order email prerequisite function | 0027 existing `workspace_email_order_required` trigger + `users.email`; requires valid contact syntax, retains email proof/privacy/history guards |

Inspect actual prerequisite columns/types from the matching snapshot, including shared `users` fields, existing LMS `orders`, `enrollments`, `courses` and their constraints. Five semantically equivalent differently named legacy FKs and unmanaged `otps` were previously observed **locally**; production status is unknown. Compare constrained columns, referenced keys/actions, validation/deferrability and PostgreSQL's truncated names. Preserve equivalent legacy names; separately review real semantic drift. Current Workspace DROP CONSTRAINT statements target Workspace objects, not those five legacy names.

For 0026, verify original catalog ID suffixes `001/002/003`, version 1, base paise `499900/899900/1699900`, durations `3/6/12`, GST 1800 bps and INR. Its collision checks allow only the explicitly reviewed historical Quarterly versions; do not synthesize versions 2–4 on a fresh production prefix. It publishes Quarterly version 5 and other versions 2 with totals **₹5,899 / ₹9,999 / ₹17,699**, without repricing accepted orders. Legal/catalog prerequisites are versioned migrations or normal publication services, never a general seed command.

## 4. TLS and transaction execution decision

`scripts/migrate.mjs` only authorizes classification/URL/acknowledgment, then invokes Drizzle CLI. It does **not** use `lib/db/configuration.ts`. Installed Drizzle Kit 0.30.6 checks `pg` before `postgres`; both root and CLI-context resolution found no `pg` and did find `postgres`, so the reviewed path constructs postgres.js **3.4.9** from the raw URL with `max=1`. Recheck adapter resolution under the eventual locked install, including the CLI package resolver.

Installed postgres.js `src/connection.js` explicitly sets `rejectUnauthorized=false` for `require/allow/prefer`. Its `verify-full` path retains Node certificate/hostname validation. **Do not rely on `sslmode=require`**, regardless of generic provider examples. The application factory already normalizes enabled TLS to verify-full; the migration CLI is independent. [Neon recommends verify-full](https://neon.com/docs/connect/connect-securely); [PostgreSQL explains hostname verification](https://www.postgresql.org/docs/16/libpq-ssl.html).

Safest proposed execution: retain guarded `pnpm db:migrate`, require the exact reviewed **direct hostname**, securely inject an explicit `sslmode=verify-full` URL (optional `sslrootcert=system` for this driver), reject duplicate/unknown TLS options, and forbid TLS-bypass process variables. Verify a valid certificate and refusal of wrong hostname/untrusted certificate before rehearsal. The current CLI does not enforce these assertions: separately approved fail-closed runner hardening is recommended before production execution. Do not silently drop `channel_binding=require`; current inspector/application parsers reject it. If provider policy requires SCRAM-PLUS, choose a reviewed compatible adapter/workflow before proceeding.

Installed Drizzle's PgDialect creates ledger schema/table outside its migration transaction, then runs **the entire pending suffix in one transaction**, including ledger inserts. DDL locks persist until commit; this is not one commit per file. No source file uses CREATE INDEX CONCURRENTLY. Ordinary index/constraint creation and FKs can block shared `users`; 0026 uses SHARE ROW EXCLUSIVE on plans. Agree one migration operator, writer/worker coordination, measured lock/statement budgets and an abort window. CLI does not inherit app timeouts; review secure session/connection timeout injection for the actual adapter in rehearsal. Do not add URL parameters or PGOPTIONS on assumption; prove effective settings. No zero-downtime guarantee.

Use direct connections for inspection/migration/backup. Pooled web/worker connections are candidates only after transaction-pool startup/session-timeout compatibility is measured. `prepare:false` alone is insufficient. Budget web-isolate count × pool 3, workers × 1, existing LMS/other clients, migration/backup slots and reserve below usable capacity; separately budget pooler frontend and active backend transactions. No production pool capacity is established here. [Neon pooling limitations](https://neon.com/docs/connect/connection-pooling).

## 5. Backup and isolated rehearsal — second separate approval

1. Name recovery/operator owners; confirm Neon history retention, recovery point, project/branch/database scope, RPO/RTO and treatment of orders/webhooks after the checkpoint. Obtain a protected full backup and checksum; use a compatible pg_dump major version, direct verified TLS, reviewed permissions/RLS completeness, encrypted restricted storage outside Git. Database dumps alone omit cluster roles; retain an approved role/ACL mapping and infrastructure recovery metadata separately.
2. Authorize creation of an isolated Neon child branch at that exact checkpoint or restore into a separately verified empty isolated target. Confirm Console lineage and distinct endpoint/branch, restricted access and no public/provider/webhook/scheduler routing to the copy. A schema-only branch cannot establish customer preservation. A copied branch contains sensitive live data: restrict access and outbound integrations before any smoke.
3. If using an archive, restore its normal pre-data/data/post-data order with fail-on-error; restore existing schema/history before installing pending migrations. Never preinstall immutable triggers then use data-only restore/trigger disabling. Do not run `--clean` against live or reset a branch to hide failure. [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).
4. Capture a fresh per-original-row preservation baseline in restricted storage, including learner/auth, enrollments/expiry/progress, LMS orders/invoices/certificates, all existing Workspace financial/legal/review rows, sequences and ACLs. Metadata preflight does not collect this customer-row baseline; its expanded scope needs the backup/rehearsal approval. Match counts plus stable key/content digests, not counts alone.
5. Recheck exact isolated target, full ledger/source pins/prerequisites, TLS and effective limits. Run only the independently verified pending suffix through the guarded workflow under temporary classification/authorization appropriate to that branch. No flag in `.env`. Capture runtime, warnings, lock waits, adapter/version and before/after ledger. Failure: preserve evidence; stop; no skips or ledger edits.
6. Verify 32 matching ledger entries, all expected tables/columns/FKs/indexes and `indisvalid`/`convalidated`, enabled history guards/function fingerprints. Compare every original baseline row; permit only documented version-publication current-flag transitions from reviewed migrations. No existing learner/order/enrollment or financial economics change is permitted. Check no orphan ownership, duplicates or sequence regression.
7. Run clone-only synthetic regression through normal services: existing learner login/access, LMS order/enrollment/invoice/certificate authorization, shared email update trigger, eligibility, agreements/contact syntax, paid/grant/refunded access, proposals/review/private builder and refund invariants. Block real provider/notification traffic. Rehearse concurrent limits and negative trigger tests transactionally without deleting protected history.
8. Run guarded migration a second time on the isolated target; require zero new ledger entries or changed business data. Test restoration/recovery into another authorized isolated target and record measured RTO, integrity and warnings. Successful migration without a successful recovery drill is insufficient.

## 6. Later production window and postchecks — new approval required

Proceed only after inspection, source/TLS/capacity review, backup/rehearsal, explicit founder local UAT acceptance and exact-window authorization. Revalidate production mapping/ledger/prerequisites immediately before writes; freeze concurrent migration runners. Coordinate existing LMS writers/webhooks/queues rather than casually switching off existing paid service. Inject only the reviewed migration URL and temporary `DATABASE_ENV=production`, `ALLOW_DATABASE_MIGRATION=true` into the authorized migration process. Keep Workspace charging/providers OFF. Run `pnpm db:migrate` once; capture private logs without URLs/secrets. Re-inspect ledger/schema and protected original data; an authorized second migration command is a write-capable no-op check, not a read-only probe.

Expected read-only postchecks include:

```sql
SELECT current_database(), current_user, current_setting('server_version');
SELECT ssl, version FROM pg_catalog.pg_stat_ssl WHERE pid = pg_backend_pid();
SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at;
SELECT conrelid::regclass::text, conname FROM pg_constraint
 WHERE connamespace = 'public'::regnamespace AND NOT convalidated;
SELECT indexrelid::regclass::text FROM pg_index WHERE NOT indisvalid;
SELECT version, config->>'minimumExperienceMonths' AS experience_months,
 config->>'eligibilityValidityDays' AS validity_days, config->>'cooldownDays' AS cooldown_days
 FROM workspace_eligibility_settings WHERE is_current;
```

Run these only in the appropriate newly authorized read-only context; metadata tools remain preferred. Compare existing invalid constraints against the approved baseline rather than attempting repair. Add reviewed guard/function/sequence checks and full original-row preservation comparison from rehearsal. Do not export customer values to logs/reports.

### Production settings publication

After schema success and separate settings approval, a persisted Admin opens `/admin/workspace/settings`, records the actual current production ID/version/config and changes only `minimumExperienceMonths=12`, `eligibilityValidityDays=1`, `cooldownDays=7`. Preserve categories, profile requirement, launch timestamp/timezone and every other field; review the values before pressing “Publish new settings version”. Submit its normal POST `/api/admin/workspace/settings`, which carries `expectedSettingsId`, idempotent `requestKey` and complete validated config. On uncertain response retry **the same publication**, or reload to inspect; on 409 reload/review rather than overwrite. Record new production version/hash/audit event; it need not be version 10. Verify new attempts get exactly 86,400,000ms validity; prior attempts/deadlines, orders and memberships remain unchanged. Do not edit SQL history.

## 7. Failure and recovery

Before migration commit, allow normal transaction rollback; inspect residual ledger-schema DDL and collect evidence without automatic cleanup. After commit, do not blindly reverse immutable history or apply destructive down migrations. Prefer reviewed forward corrections. Roll application back only to a rehearsed schema-compatible build. Database recovery needs new explicit approval: restore to an isolated target first, validate, then perform a planned cutover while preserving/reconciling legitimate post-checkpoint LMS orders, enrollments and provider events. A database restore cannot undo external charges. [Neon recovery scope and procedures](https://neon.com/docs/postgres/backup-restore/branch-restore).

STOP on identity/ledger/hash/TLS/privilege mismatch, unknown prerequisites, unexpected original-row changes, unsupported channel binding/pooler settings, lock-budget breach, backup/recovery failure or missing approval. Never repair these by weakening triggers, deleting evidence, renaming legacy objects or manipulating the ledger.
