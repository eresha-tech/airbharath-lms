# Non-destructive repository and release-artifact cleanup plan

15 October 2026; baseline RC `845419a2e6057d20f2f2bf2a14646245ccbe9436`. **Inventory/proposal only. No tracked file was deleted, archived or moved.** Cleanup approval is separate from production preflight/deployment approval.

## Current inventory

Git inventory before these four documents: **1,171 tracked files**, including **71 root Markdown files**, **270 `output/` evidence files**, **206 `tests/` files**, **18 `scripts/` files**, and **65 migration/journal/snapshot files under `drizzle/`**. Add `lib/db/schema.ts` to obtain the 66 pinned source files. `public/` has five SVG files; current Masterclass art is remote, not a local cleanup candidate.

| Category | Observed location | Proposed treatment |
|---|---|---|
| Phase/completion reports | Root `WORKSPACE_*.md`, `AIRBHARATH_*.md` and related Markdown | Retain evidence and links now; optional later indexed archive under `docs/archive/` after owner review |
| Tracked database/audit evidence | `output/audits/` — 72 files across F.6–F.8C groups | Keep integrity/source baselines; classify sensitive metadata/fingerprints and access controls before any archive |
| Tracked browser screenshots/results | `output/playwright/` — 198 files across F.4–F.8C groups | Retain verification evidence; review possible identity/content exposure; exclude from deployment source/runtime artifact |
| Security/finance tests | `tests/` | Keep tracked, including synthetic fixtures and PostgreSQL harnesses; not public/static assets |
| Dev/verification/operational scripts | `scripts/`, local `/tmp` helpers | Preserve reviewed guards, preflight/migration/readiness scripts; do not run fixture/UAT scripts in hosting or upload `/tmp` sessions |
| Local DB/runtime files | `.postgres_data`, `.postgres_log`, `.next`, `node_modules` present | Local DB/private state must never be uploaded. Rebuild dependencies/output in isolated CI; no database cleanup authorized |
| Private local configuration | `.env`, `.aws` present; no local `.vercel` attachment | Names only inspected; values not read/copied. `.env` is ignored; `.aws` needs explicit packaging exclusion regardless of Git/global ignore behavior |
| Dumps/logs/session artifacts | No tracked `.dump`, `.bak`, `.sql.gz`, `.log`, HAR, trace ZIP or `storageState` filename found | This is filename inventory, **not** certification that no secrets/customer data exist in content, ignored files or Git history |
| Hosting exclusions | No `.vercelignore`; `.gitignore` covers common build/env/DB folders but not all `output/` evidence | Propose reviewed exclusions below; do not assume `.gitignore` governs every upload or runtime trace |

No broad private-directory crawl, customer dump export or secret-value report occurred. `.env.example` is the sole tracked env-like filename found and contains example placeholders; never replace it with real values.

## What must stay versioned or immutable

- All 32 SQL migrations, 32 snapshots, journal and schema pins. No renaming, consolidation, edits or ledger manipulation. Future source pin changes require separate review.
- Security, payment/refund, entitlement, coupon, legal acceptance, grants, ownership and retention regressions, with repository-approved synthetic fixtures.
- Source-pinned production preflight, guarded migrator, database-safety checks, operational readiness scripts, lockfile and CI configuration.
- Current deployment/Neon runbooks, acceptance decisions, rollback/recovery evidence and provenance linking prior phase reports to commits.
- Required versioned reference/legal/catalog data; frozen Phase 1.9 remains unmerged. Database financial/legal history is not a repository-cleanup target.

## Proposed packaging boundary — approval required before implementation

1. Review the actual hosting upload method (Git integration vs CLI archive) and function tracing. Keep application `app/`, `components/`, imported `lib/`, required assets, `public/`, Next/PostCSS/Tailwind/TypeScript configuration, package manifest and lockfile. Build environment needs declared dependencies; do not manually remove required modules or source imports.
2. Proposed source-upload exclusions: `.git/`, `.env*` except the reviewed example if needed, `.aws/`, `.codex/`, `.agents/`, local DB/logs/backups, `.next/`, `node_modules/`, `output/`, `coverage/`, browser sessions/traces/screenshots and task scratch. Review exact patterns in a **proposed** `.vercelignore`/approved upload manifest; none was added in this task.
3. Reports/tests/dev scripts should remain in Git. Exclude unnecessary deployment uploads only after confirming the selected build/install workflow does not need them. Keep migrations/preflight/runbooks in the controlled release/operations repository even if web functions do not import them. Do not remove legal/reference source that is actually used at runtime.
4. Inspect build `.nft.json` function dependency traces, static/public assets and the provider's final upload listing. Separate “present in source upload” from “served publicly” and “bundled into a server function”; absence from one is not absence from all. Review source maps/log retention too.
5. Run a redacted content/secret scan with false-positive review, including deployment package and relevant Git history, in a restricted environment. Never emit matches/secret values into a report. If a real credential/customer artifact is found, contain exposure with separately approved remediation; do not casually rewrite Git history or rotate credentials in this task.
6. Archive only after review: create an index of original paths, phase, commit and checksums; preserve Git history and internal references. Update links with a scoped reviewed docs commit. Choose restricted external storage for sensitive evidence instead of making it publicly browsable. No evidence deletion or archive move is approved by this plan.

## Safe generated scratch created by this preparation

The isolated build and validation cache use task-specific generated paths under `output/release-candidate-build-*` and `output/release-readiness-validation-tmp`; their paths are recorded in `/tmp/release-candidate-build-path`. Only this task's exact generated directories may be removed after verification. Do not wildcard-delete `output/`, older artifacts, local DB, user files or `/tmp` sessions belonging to another task. Private task/build logs and safe public-host evidence stay outside Git in `/tmp`.

## Approval requested later

Review deployment exclusions first; that is safer than deleting tracked history. Approve any archive/move/delete list explicitly, with recovery/index and no broken source pins. Initial proposal contains **zero deletions**. Deployment remains blocked until the actual package is shown to exclude local secrets/customer evidence; this plan is not a clean-artifact certification.
