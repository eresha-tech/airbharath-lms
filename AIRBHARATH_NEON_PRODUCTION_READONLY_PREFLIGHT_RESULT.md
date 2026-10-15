# Production Neon read-only preflight result

15 October 2026. **PRODUCTION NEON READ-ONLY PREFLIGHT BLOCKED**

## Completed offline checks

- Branch `codex/workspace-1.8-launch`; starting HEAD `d3f9b06c51a3c3780e0c1b9ff4f7fb98dc32d9cc`, with a clean worktree. This is the readiness-documentation commit following approved application RC `845419a2e6057d20f2f2bf2a14646245ccbe9436`.
- Reviewed the production readiness report, Neon migration runbook, deployment runbook and repository cleanup plan. Preflight tool, migrations and schema have no changes against the RC.
- Existing `loadReviewedSource()` completed successfully, without a connection: **32 migrations, 0000–0031, and 66 pinned schema/SQL/journal/snapshot files**.
- Ordered migration manifest matches `e9494753700c4df15ce57261e7431ba8d0451c1e41d46db485a7d55886f6eaf8`; complete source-file pin matches `2fed961b801f528b8c92c2f200d312e4abb9d95a22e1cffa40a27b289d6b9ba9`.
- Checked only the presence of designated environment variables, never their credential values. No TLS-bypass or migration-authorization flag was present. No application dotenv file was loaded, and no alternative inspector was created.

## Blocking prerequisites

No required target-mapping variable or dedicated restricted URL was injected into the executing process. The authorization brief/readiness evidence does not supply an independently established production mapping. No target was guessed or derived from a writer URL.

| Required evidence | Result |
|---|---|
| Neon project / production branch | UNKNOWN; `PREFLIGHT_NEON_PROJECT_ID` and `PREFLIGHT_NEON_BRANCH_ID` absent |
| Approved direct endpoint / database | UNKNOWN; `PREFLIGHT_EXPECTED_HOST` and `PREFLIGHT_EXPECTED_DATABASE` absent |
| Dedicated restricted inspection role | UNKNOWN; `PREFLIGHT_EXPECTED_ROLE` absent; role existence and effective privileges not inspected |
| Separate existing migration role | UNKNOWN; `PREFLIGHT_MIGRATION_ROLE` absent |
| Approved securely injected inspection credential | `PREFLIGHT_DATABASE_URL` absent; no fallback attempted |
| TLS certificate / hostname verification | NOT TESTED; no connection attempted; verify-full remains mandatory |
| Actual production ledger prefix / full hash match | UNKNOWN; no ledger query executed |
| Exact pending migration count | UNKNOWN; owner-reported 0000–0006 would imply 25 pending files, 0007–0031, but remains unverified |
| Existing LMS/shared-users schema, FKs, triggers, catalog/settings/legal prerequisites | NOT INSPECTED; local schema, version 10 settings and local OID/system identifier are not production evidence |
| Live PostgreSQL version, timeouts and compatibility warnings | UNKNOWN; no server diagnostics collected |

## Tool execution and preservation

`scripts/database-readonly-preflight.mjs` **was not invoked** because target/credential prerequisites were missing. There is no database-inspector exit status to interpret. The offline source-integrity command exited **0**; it is not production inspection success. Exit 2 remains reserved for a future completed evidence collection that still does not authorize migration.

**No production connection, query or data modification occurred.** No roles/permissions, rows, sequences, ledger, schema, settings or triggers were changed. No backups, Neon branches, migrations, provider operations, workers, deployment, DNS changes or repository cleanup occurred. No production raw output exists to retain. This report contains no credentials, customer records or production target identifiers.

## Required next input and decision

The owner's narrowly scoped read-only authorization is acknowledged. To proceed, supply the **non-secret** project ID, production branch ID, direct endpoint hostname, database name, existing restricted inspection role and separate migration role, independently confirmed from owner-approved Neon configuration. Identify the approved secure local injection mechanism for the matching `PREFLIGHT_*` variables and restricted URL. Do not paste passwords or URLs into chat, commands/history, reports or Git.

Role provisioning is **not** assumed necessary: role existence is unknown. If a compliant inspection role does not already exist, stop for separate provisioning authorization; do not use an Admin/migration credential or weaken effective-privilege checks.

**Isolated rehearsal is not ready to be requested on the strength of this result.** First complete the authorized guarded inspection and resolve identity/TLS/privilege/ledger/prerequisite findings. Backup, branching, migration hardening/rehearsal, deployment and charging remain separately unauthorized. Stop at this prerequisite gate.
