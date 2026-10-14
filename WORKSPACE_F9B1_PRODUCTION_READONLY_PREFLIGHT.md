# F.9B.1 — offline production read-only preflight preparation

**F.9B.1 READ-ONLY PRODUCTION PREFLIGHT PREPARED — AWAITING OWNER AUTHORIZATION**

Starting branch `codex/workspace-1.8-launch`, clean HEAD `bc38a79`. Provider: owner-confirmed **NeonDB**, an existing live LMS database. Owner identification of `0006_great_kate_bishop` means a **provisional** seven-entry prefix and 24 pending migrations (`0007–0030`), not verified ledger evidence. The tool always uses inspected evidence rather than assuming this boundary.

No database connection, E2E/provider call, migration, backup, deployment, environment edit or repository cleanup occurred. F.9A/F.9B evidence and retained F.6 function metadata were reused offline. No production access is authorized by this report.

## Execution prerequisites — future separate approval only

1. Owner separately authorizes the exact Neon project/branch/direct endpoint/database and SELECT-only inspection. Confirm its Console mapping independently; project/branch identifiers supplied to this tool are **owner-attested**, not independently verified through Neon APIs.
2. Provision restricted credentials securely. The authenticated role must match the manifest, differ from the migration role, and have effective SELECT/USAGE access to the ledger and prerequisite tables plus normal catalog diagnostics. No elevated attributes, ownership, schema/database CREATE, table INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER, sequence USAGE/UPDATE, TEMP, or membership in a migration/writer/owner role. Inherited/PUBLIC grants count. Ordinary default TEMP grants can therefore block this strict profile; any permission changes require separate authorization and are never performed by the tool.
3. Use the exact **direct** endpoint, not its pooled sibling, with certificate-verified TLS. URLs must explicitly contain `sslmode=verify-full`; `sslrootcert=system` is optional. Unsupported parameters, required channel binding, pooled/local/non-Neon targets and manifest mismatch are rejected without rewriting or downgrade. No fallback credentials/host exist.
4. Inject credentials with an approved secrets manager/secure process launcher as `PREFLIGHT_DATABASE_URL`; do not type the full URL in a shell command/history, chat, source or `.env`. The CLI does not load dotenv or use ordinary `DATABASE_URL`/`POSTGRES_URL`.

Required process variables:

| Variable | Meaning |
| --- | --- |
| `PREFLIGHT_DATABASE_URL` | Secret restricted-role direct URL, securely injected |
| `PREFLIGHT_EXPECTED_HOST` | Exact owner-confirmed Neon direct hostname |
| `PREFLIGHT_EXPECTED_DATABASE` | Existing live database name |
| `PREFLIGHT_EXPECTED_ROLE` | Restricted inspection login role |
| `PREFLIGHT_MIGRATION_ROLE` | Different existing migration-role name |
| `PREFLIGHT_NEON_PROJECT_ID`, `PREFLIGHT_NEON_BRANCH_ID` | Owner-confirmed provider mapping |
| `PREFLIGHT_EXPECTED_DATABASE_OID` | Optional known production OID; never substitute the local OID |

After separate approval and secure injection of the above, the command is:

```bash
ALLOW_PRODUCTION_READONLY_PREFLIGHT=true DATABASE_ENV=production PREFLIGHT_CONNECTION_MODE=direct pnpm exec node scripts/database-readonly-preflight.mjs
```

**Do not run this command in F.9B.1.** `ALLOW_DATABASE_MIGRATION=true` is explicitly rejected. Output is safe JSON on stdout; if retained later, use a restricted artifact location outside Git. Exit **1** means refused/failed inspection; **2** means evidence collected while migration/release remain blocked. Neither exit code grants approval.

## Collection and fail-closed behavior

One installed postgres.js 3.4.9 pool, `max=1`, verified TLS, 5-second connection/statement/idle-transaction limits, 1-second lock limit, 30-second collection deadline and bounded two-second close. Connection startup pins `search_path=pg_catalog` and default read-only. Every query uses a repeatable-read **READ ONLY** transaction and fixed SELECT-only SQL; savepoints isolate permission failures. Actual role, authenticated identity, read-only mode, TLS and effective timeout/search-path settings must pass before history inspection.

Collects database/OID/version/role/TLS metadata; full ledger hashes/timestamps; schemas, table/column definitions, FK structure, constraint/index metadata, enums, function/trigger metadata; 0019/0026/0027 prerequisite booleans; aggregate settings/activity and accessible system identifier. It never exports learner/contact/OTP/invoice/payment rows or activity query text. Routine/default/constraint/index/trigger SQL is represented by fingerprints rather than raw text that might contain sensitive literals. Known function bodies are compared in memory to reviewed migration source. Invalid ledger fields and sensitive metadata/error messages are redacted.

All 31 migration SQL files and 64 schema/journal/snapshot files are pinned to the reviewed source. A changed source set requires separate review/update. The ledger must be a unique contiguous timestamp/full-hash prefix. Missing/empty/unreadable/gapped/duplicate/divergent/future ledger evidence yields BLOCKED or UNKNOWN, never a guessed suffix or ledger repair. Result-size limits produce UNKNOWN rather than incomplete apparent success.

Catalog comparison flags missing/extra tables or schemas, column/FK/index/enum differences, legacy FK naming drift, unexpected routines/triggers and pending-name conflicts. Full expression/default/index/trigger semantics and deployment-role privileges still require review: structural matching is **not** complete compatibility certification. An unexpected object is an investigation item, not permission to remove it. Foreign/RLS-protected prerequisite relations are not queried; inaccessible diagnostics are recorded without privilege escalation.

0019 checks the exact expected V1 legal publication prerequisite; 0026 checks the migration's current V1 catalog/collision predicate; 0027 checks shared `users.email` shape and pending-trigger conflicts. If earlier pending migrations must first create prerequisite tables, these are UNKNOWN until isolated rehearsal. The 0027 shared-user email-update behavior and actual runtime permissions require clone-only regression verification.

## Separate migration TLS proposal — not implemented

The current guarded Drizzle CLI does not use F.9A's connection factory; native postgres.js `sslmode=require` does not guarantee certificate verification. A narrow future correction should validate an explicit direct migration target and force `verify-full` in the **actual CLI adapter**, refuse incompatible channel-binding/URL policy, preserve existing migration authorization guards, require ledger/source/prerequisite proof, and retain independently reviewed migration lock/statement budgets. Add verified/rejected TLS and wrong-target regressions before separately approved execution. No migrator code, guard or configuration changed here.

Neon pooled runtime compatibility remains separate: verify actual startup timeout handling and repeat-transaction settings before choosing pooled web/worker endpoints. The inspector never auto-converts a pooled URL to direct. Retain F.9B's aggregate connection-budget and protected-backup requirements.

## Mandatory gates before production migration/deployment

The tool always returns `migrationAuthorized=false` and a blocked decision. Required gates include owner-authorized actual inspection, complete source/catalog/prerequisite/TLS/budget review and **separately authorized isolated Neon branch restoration/pending-chain rehearsal**. Confirm recovery scope and preservation of existing LMS history; do not rehearse against the live branch. No branch or backup was created here.

**Founder-led local Phase 1.8 UAT is mandatory before any production migration or deployment.** The next dedicated task must prepare the existing local schema through 0030, dedicated test identities and checklist covering registration/OTP, eligibility, verified email, agreements, pricing/coupons, genuine Razorpay Test payment/signed webhooks, Creator activation, proposals/Admin review/approved private builder, refunds/notifications, grants/access denial and legacy LMS regression. Preserve retained history. External Test-provider calls need separate explicit authorization and safe configuration; no Live charging. The founder must personally review the journey and explicitly accept local UAT. Unit tests, provisional migration knowledge or inspection success cannot substitute for that acceptance. This task did not start the E2E preparation or execute the journey.

## Offline verification and changed files

**92 focused Vitest tests passed** across four files (45 new preflight checks plus the 47 existing F.9A configuration/runtime/worker checks). Repository TypeScript, targeted repository lint for all four source/test files, Node syntax checks for all three scripts and `git diff --check` passed. The opt-in-absent CLI probe returned the fixed authorization-required refusal before driver construction. No full regression/build rerun is needed for this isolated inspection tool, as specified by the brief. Production SQL execution/TLS/role/Neon mapping remain unverified and unauthorized.

Changed files only:

- `scripts/database-readonly-preflight.mjs` — gated CLI, fixed safe errors and JSON output.
- `scripts/database-readonly-preflight-core.mjs` — validation, source pinning, ledger/catalog assessment and read-only orchestration.
- `scripts/database-readonly-queries.mjs` — fixed SELECT-only metadata/prerequisite queries.
- `tests/routes/database-readonly-preflight.test.ts` — mocked/offline regressions and retained F.6 evidence reuse.
- `WORKSPACE_F9B1_PRODUCTION_READONLY_PREFLIGHT.md` — this execution/readiness guide.

**Unresolved authorization:** no production connection or migration permission; no branch/backup/provider/deployment permission; founder local UAT not yet performed or accepted. Stop after offline preparation.
