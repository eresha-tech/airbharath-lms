# Workspace F.9B — existing live PostgreSQL readiness

**Readiness review complete. Production migration/release BLOCKED pending the evidence below.**

14 October 2026; branch `codex/workspace-1.8-launch`; reviewed HEAD `c37f9cc`. Production already contains real LMS learners, enrollments, orders and financial history. It must never be treated as an empty installation. This phase changed only this report. No database connection of any kind, private service/account access, environment change, migration/generation, initialization, seed, reset, cleanup, collation repair, constraint rename, deployment or payment enablement occurred. Public documentation was consulted.

## 1. Evidence boundary and exact pending migrations

Reused evidence: `docs/archive/phase-reports/WORKSPACE_LAUNCH_F6_DATABASE_AUDIT.md`, its corrective completion report, `docs/archive/phase-reports/WORKSPACE_LAUNCH_F8_INTEGRATION_CORRECTIVE_COMPLETION.md`, and `WORKSPACE_F9A_DATABASE_CONNECTION_SAFETY.md`. F.9A verified the **local** TCP/socket target, OID 16384, system identifier 7680462735222304705 and 31 matching ledger entries through `0030`. These identifiers, catalog counts, privileges and local connection limit are **not production evidence**.

**Exact production pending set: UNKNOWN.** No authorized production identity/catalog/ledger export exists in the reviewed evidence. Historical source commit `81623e2` contains seven migrations through `0006`, confirmed offline; that is not proof of production application. Do not assume `0007–0030` are pending, or that `0000–0006` are applied.

Source has 31 ordered migrations, `0000_regular_silk_fever` through `0030_workspace_retained_history_truncate_guards`. All 64 tracked schema/SQL/journal/snapshot files are unchanged from `c37f9cc`; the latest snapshot models 60 tables. Ordered source manifest SHA256: `9cbb4784a583aa683a5332d71de712ece0d00e530edd32b335052b65602ba975` (compact sorted-key JSON array of `{idx,when,tag,sha256}` in journal order).

After separately authorized read-only evidence, match **every** ledger timestamp and full SQL hash to a unique contiguous journal prefix, then compare the actual schema and migration prerequisites. Only the remaining suffix is a candidate pending chain. Through `0030` would mean none; through `0006` would mean the following 24 files, **conditionally**, in this order:

| Conditional file stem (`.sql`, directory `drizzle/`) | Change |
| --- | --- |
| `0007_lucky_wild_pack` | Manual Workspace applications |
| `0008_eager_energizer` | Application approval-email state |
| `0009_normal_baron_zemo` | Eligibility/settings/policies/audit |
| `0010_illegal_toxin` | Plans/coupons and initial catalog |
| `0011_workspace_coupon_audit_freshness` | Coupon audit guard correction |
| `0012_useful_warhawk` | Workspace orders/payment evidence/redemptions |
| `0013_peaceful_spiral` | Creator identity/membership fulfillment |
| `0014_outgoing_freak` | Profile details/private proposals |
| `0015_warm_sprite` | Course submission/review history |
| `0016_tired_prowler` | Capture evidence rule correction |
| `0017_marvelous_captain_midlands` | Private text builder |
| `0018_ambiguous_khan` | Versioned Creator Terms/acceptance |
| `0019_workspace_creator_terms_v2` | Publish successor Creator Terms |
| `0020_gigantic_mordo` | Refund policy/workflow/evidence |
| `0021_workspace_live_financial_modes` | Financial context/mode guards |
| `0022_lethal_barracuda` | Durable refund-notice delivery |
| `0023_chubby_jimmy_woo` | Influencer identity/history/coupon binding |
| `0024_workspace_influencer_history_truncate_guard` | Influencer-history TRUNCATE guard |
| `0025_workspace_held_capture_coupon_consistency` | Held capture/redemption guard correction |
| `0026_workspace_membership_pricing_v2` | Versioned successor pricing |
| `0027_workspace_verified_creator_email` | Email proof, notice binding and shared-user trigger |
| `0028_workspace_creator_access_grants` | Audited access grants |
| `0029_workspace_grant_completion_record_fix` | Grant completion trigger correction |
| `0030_workspace_retained_history_truncate_guards` | 21 additional retained-history guards |

Missing/empty ledger on a populated DB, holes, duplicates, unknown/future entries, hash mismatch or catalog conflicts are **STOP conditions**, requiring investigation and a separately reviewed compatibility plan. Do not manufacture ledger rows, replay bootstrap `0000`, schema-push or edit old migrations.

## 2. Migration compatibility findings

- **The existing guard is authorization, not compatibility proof.** `scripts/migrate.mjs` requires explicit classification, URL and acknowledgement, then invokes Drizzle CLI. Installed Drizzle's `pg-core/dialect.cjs` creates the ledger schema/table and selects pending SQL from the latest `created_at`; it does not compare every historical hash or detect missing earlier entries. Even a purported no-op is not a read-only inspection. No migration command was run here.
- **Populated LMS prerequisites:** `0000` contains ordinary CREATE TABLE statements. If earlier legacy migrations are actually pending, `0001–0006` alter populated LMS tables/add indexes and foreign keys; duplicates or inconsistent rows need read-only diagnosis before any approval. No fresh-install assumption is safe.
- **Workspace chain is not contention-free:** its foreign keys reference shared `users`; ordinary index/constraint/trigger DDL can require locks. The installed migrator runs the pending suffix in one transaction, retaining acquired locks until completion. `0026` explicitly locks the plan table. The CLI does not inherit F.9A web/worker SQL timeouts. Agree bounded migration lock/statement budgets and a live-service window after representative rehearsal; no zero-downtime claim.
- **Data-sensitive publication:** `0019` requires the expected current V1 terms/hash/effective timestamp, inserts V2 and changes current markers. `0026` requires the three exact current V1 plan rows and absence of conflicting successors/IDs, retains history and publishes successor prices. These migrations contain business reference-data writes; successful local execution does not prove production prerequisites. Do not seed/force them into compliance.
- **Shared LMS behavior:** `0027` installs `workspace_email_contact_change AFTER UPDATE OF email ON users`; it revokes Workspace proofs/supersedes challenges on contact changes. Review its ownership/EXECUTE/table privileges and ordinary LMS email updates in an authorized isolated clone. Earlier “no legacy table changes” evidence predates this trigger. Source inspection found no direct legacy learner/order/enrollment data rewrite in the conditional Workspace chain, but this does not establish live compatibility.
- **Drift:** F.6 found five semantically equivalent, differently named legacy foreign keys and an unmanaged `otps` table locally. Current Workspace constraint drops target Workspace constraints, not those five legacy names. Production drift remains unknown; preserve unmanaged objects/history and compare catalog definitions, truncated names, function bodies, enabled triggers and validated constraints. Do not rename constraints or repair local/production collation in this phase.

## 3. Exact identity and read-only authorization gate

Before any production connection, the owner must separately confirm the exact operation and provision restricted credentials securely, outside chat/Git. Record a non-secret expected manifest: provider/project, branch, direct/pooled endpoint mapping, database, intended read-only role and server version. Authenticate the TLS hostname against that manifest. A database name or OID alone cannot identify the intended deployment; do not reuse local identifiers as production expectations.

The future bounded evidence packet should contain only identity/metadata: current database/OID, current/session role, server version/address/port, recovery/read-only state, accessible server identifier, TLS status, ledger hashes/timestamps, schema/constraint/trigger definitions, migration prerequisite rows, aggregate connection/lock counts and role capabilities. Use SELECT-only access and a read-only transaction, fixed time limits and minimal output; no learner/contact/payment payloads or `pg_stat_activity.query` text. If a restricted role cannot read a diagnostic, record the limitation rather than escalating privileges. No app route/worker/CLI migration should be used as an inspection shortcut.

## 4. TLS and endpoint compatibility blockers

F.9A uses postgres.js 3.4.9 and certificate-verified TLS, including strengthened `sslmode=require`; no production handshake was performed. Confirm hostname/SNI, certificate trust and the actual Node runtime independently. Neon recommends verified TLS; public docs do not prove this account's endpoint configuration. [Neon secure connections](https://neon.com/docs/connect/connect-securely).

Two concrete source gates remain:

1. **Channel binding:** F.9A's URL allowlist rejects `channel_binding=require`; installed postgres.js negotiates SCRAM-SHA-256, not SCRAM-SHA-256-PLUS. If the intended production policy/URL requires channel binding, stop for a separately scoped supported-driver/configuration decision. Do not silently strip the security requirement or disable certificate verification.
2. **Factory mismatch:** web/workers use validated F.9A options; the Drizzle CLI builds its own client from the raw URL with `max=1`. Its native postgres.js `sslmode=require` disables certificate validation, unlike the app. A future approved migration must explicitly prove verified TLS in that separate path; app success is insufficient. No migration/TLS code change is authorized or made here.

For pooled runtime endpoints, F.9A sends statement/lock/idle-transaction timeouts in startup parameters. PgBouncer can reject unsupported startup parameters or ignore configured ones; effective enforcement is unproven. Verify all effective settings inside repeated real transactions before selecting pooling. Do not remove limits to make a connection pass. [PgBouncer parameter handling](https://www.pgbouncer.org/config.html#ignore_startup_parameters).

Recommend separately verified **direct** connections for migrations and backup/restore; consider pooled web/workers only after compatibility proof. Neon documents transaction-pooling session limitations and recommends direct migration/backup connections. [Neon pooling guidance](https://neon.com/docs/connect/connection-pooling).

## 5. Connection budget to approve

Reuse F.9A defaults: production web **3 per isolate** (validated 1–10), each financial/notice worker **1**, CLI migration **1**. These are caps, not a deployment capacity certification.

For direct connections, require:

`peak web isolates × web cap + concurrent financial workers + concurrent notice workers + other LMS/jobs clients + migration/backup/inspection slots + operating headroom ≤ usable database slots`

Obtain actual compute minimum/autoscaling limits, PostgreSQL reserved slots, role/database limits, peak warm/cold web instances, worker overlap, existing clients and pooler per-user/database limits. For transaction pooling, budget frontend clients and backend active transactions separately; a large frontend allowance does not create backend capacity. No numeric production cap beyond the existing per-isolate defaults is approved here. Do not substitute the local 100-connection limit. [Neon compute sizing](https://neon.com/docs/manage/endpoints/).

## 6. Backup/restore evidence required before migration approval

No confirmed production backup inventory, retention/RPO/RTO, restore drill, secure archive location or measured recovery time is present in the reviewed repository evidence. Absence of evidence is not proof backups do not exist.

Require owner/operations confirmation of a recoverable pre-change point and its branch/database scope; history retention, last successful protected backup, checksum/access control, compatible client/server versions, role/ACL mapping and a named recovery operator. Neon restore availability depends on the configured history window; restoring a branch overwrites newer data and affects all its databases. Existing LMS financial activity makes an unqualified branch rollback unsafe. [Neon restore behavior](https://neon.com/docs/postgres/backup-restore/branch-restore).

Separately authorize a full protected backup and an **isolated restore rehearsal**, never restoring over the live DB. Capture all schemas/data, ledger, sequences, functions, triggers and dependencies rather than only Workspace tables; ensure dump permissions/RLS cannot silently omit records. A pg_dump client cannot dump a newer server major version. Store archives outside Git, encrypt/restrict them, and record checksums. None of these operations ran here. [PostgreSQL pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html).

Rehearse the complete archive's normal pre-data/data/post-data ordering, with fail-on-error, so history is loaded before its post-data triggers. Do not pre-install the migration chain then bypass immutable-history triggers for a data-only restore. Check ledger/hash identity, learner/enrollment/order/invoice and Workspace financial/legal/review preservation, sequence continuity, constraints and enabled guards; run relevant clone-only LMS/email/payment-disabled regressions. Confirmed backup existence without successful restore is insufficient. [PostgreSQL pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html).

Measure recovery time and agree how post-checkpoint LMS orders, enrollments and provider webhook events would be preserved/reconciled. Database restore cannot reverse external payments. Prefer a reviewed forward correction for additive failures where safe; any live rollback or writer interruption requires separate owner authorization. No existing LMS payment/service switch was changed.

## 7. Actionable gate and validation result

| Priority | Required evidence before production migration/release | Current result |
| --- | --- | --- |
| P0 | Exact target + separately authorized restricted read-only inspection | Not provided; no access attempted |
| P0 | Full production ledger/catalog match + exact pending suffix/prerequisites | Unknown; conditional source inventory above |
| P0 | Verified TLS for app, workers and independent CLI; channel-binding/pooler decision | Source incompatibilities identified; environment untested |
| P0 | Recoverable backup + isolated restoration/pending-chain rehearsal + recovery plan | Not evidenced |
| P0 | Aggregate capacity, roles, effective timeouts and bounded lock window | Not evidenced |

Completed now: **52 focused Vitest tests in five files** (configuration, runtime, worker, financial FK ordering and retained-history migration regressions); **12 existing Node database-safety checks**; journal order/uniqueness and all 64 source-file identity checks. Tests used synthetic configuration/mocks/lazy driver construction; no DB connection. `git diff --check` passed. F.9A's full **1,180 Vitest + 33 Node**, TypeScript, lint and isolated payment-disabled build results remain applicable because product source/dependencies/schema are unchanged; they were not rerun or presented as new F.9B results.

Only changed file: `WORKSPACE_F9B_EXISTING_PRODUCTION_DATABASE_READINESS.md`. This review is complete; production readiness remains blocked on the listed evidence. No deployment, payments or other phase started. Stop after F.9B.
