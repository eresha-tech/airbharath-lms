# Creator Workspace Phase 1.9A — implementation

31 October 2026. Branch `feat/creator-workspace`, baseline `03785c2`. Scope: contracts and owned persistence only.

## Implemented

- Added `lib/workspace/media/{model,service,repository,runtime}.ts`: strict browser-safe commands, owned asset reservations, context-bound idempotency, metadata allowlists, revision/version checks, resource attachment/rename/reorder/detachment, and atomic video replacement. No provider SDK, signing, upload/finalization endpoint, processing worker or UI was added.
- Assets belong to the existing Creator profile, private project and lesson through composite foreign keys. No fake LMS course or learner media record is created. Caption assets bind to a specific selected video and source object version; replacement retires its old captions. Processing source/job/policy/output identity fields are foundations for later trusted provider integration, not proof that processing exists.
- Explicit `plain_text` / `markdown` lesson format; existing rows default to `plain_text`. Omitted format on an update preserves the existing format. Existing plain-text validation remains intact; formatted rendering belongs to a later phase.
- Every asset write derives a monotonic lesson `media_revision` and advances the existing lesson version atomically, protecting stale Builder saves. Project identity/version and existing module/lesson ordering behavior remain unchanged.
- Reused current paid membership, refund, complimentary grant, suspension and retained-access evidence, persisted owner locks and authoritative approved-submission checks. No Admin bypass or new global role. Access is rechecked after awaited operations and before commit returns.
- New migration guards immutable identity/evidence, lifecycle transitions, selected-video uniqueness, replacement generations, source-bound captions, private output identity, contiguous resource ordering, retention and derived revisions. Resource uniqueness is deferred for atomic swaps.
- Deletion policy: asset detach retains provenance and never deletes storage. Builder hard deletion of any lesson with media history returns controlled `media_exists`; text-only lesson deletion still works. The restrictive FK enforces this independently. No retention cleanup policy is invented.
- Limits: MP4 up to 2 GiB; PDF/PNG/JPEG resources up to 20 MiB, ten active resource reservations per lesson; VTT captions up to 1 MiB, sixteen active caption reservations; 200 total asset intents/history records per lesson. Expired pending intents become failed on subsequent reservation. History remains retained and counted.
- Ordinary metadata omits storage account/container/key, source/output versions, checksum, request hash, processing job and signed URLs. Runtime reservation requires explicit storage enablement/identity; disabled storage still permits authorized metadata reads/detachment.

## Migration and compatibility

Generated `0032_workspace_course_media.sql`, `0032_snapshot.json` and journal index 32 from head 0031, in a temporary generation directory without environment files or credentials. Corrected generated FK dependency ordering so referenced composite indexes exist first. Added reviewed custom SQL guards/deferred constraints after generation, following the repository's existing migration pattern. The snapshot does not represent custom triggers or deferrability; the SQL is authoritative for those details.

Snapshot delta: one new table, `workspace_course_assets`; existing `workspace_course_lessons` gains defaulted format/revision fields, a check and ownership index; `workspace_course_projects` gains an ownership index. No learner or financial table definition changed. SHA-256 checks confirm all historical migration/snapshot files remain unchanged and the first 32 journal entries are preserved.

The existing read-only preflight intentionally pins migration SQL, schema and snapshots. Its exact chain/source hashes and offline regression expectations were extended to 0032, with new tamper checks. Target authorization, TLS, roles, query policy and fail-closed integrity checks were not relaxed. An old historical migration test now asserts its preserved journal prefix instead of forbidding future additive migrations. No production preflight or historical audit was executed.

**Migration is unapplied everywhere by this task.** No database connection/query, migration, seed, schema push, private-provider operation or deployment occurred.

## Validation

- Focused media + existing Builder run: **111 tests / eight files passed** before the additional transition-contract case; final full validation includes that case.
- Final `pnpm validate`: **PASS — 51 pure Node tests; 1,535 Vitest tests across 120 files; TypeScript; lint without warnings/errors.** The four new media suites contain 54 tests.
- Isolated production `pnpm build`: **PASS**, including compile, type/lint checks, page-data collection and static generation. No application build configuration was changed.
- Repeated safe Drizzle generation: **No schema changes, nothing to migrate**; no 0033 was created.
- `git diff --check`, snapshot lineage/delta and preservation hashes: **PASS**.

Validation uses installed `pnpm 11.15.1` and Node 22. Full tests/build run in a temporary source copy without environment files, with reused installed dependencies and an unreachable synthetic database target. Existing offline catalog/coverage test fixtures were included. Initial sandbox subprocess checks failed; the permitted rerun with normal local child-process permissions passed those checks. An initial full run exposed migration-dependent source/count expectations, corrected as described above. The production build correctly rejected `DATABASE_ENV=test`; the final invocation uses `staging` classification with the same synthetic unreachable target, without changing application configuration or using private credentials.

## Verification still requiring separate isolated PostgreSQL authorization

Unit/service concurrency uses a serialized transaction/rollback harness; repository tests inspect emitted SQL scopes and locks. Migration tests inspect artifacts. They do **not** prove PostgreSQL execution or real two-session behavior.

Before enabling media persistence against any runtime database, separately authorize an isolated target and verify: empty-install and 0031→0032 upgrade; generated FK ordering and custom PL/pgSQL; deferred resource swaps/contiguity; concurrent replacements and lesson deletion; grant/refund/suspension revocation races; rollback after partial detachment; invalid direct SQL lifecycle/evidence/ownership changes; retained DELETE/TRUNCATE guards; derived lesson revisions and stale Builder saves; historical row preservation. No real PostgreSQL or AWS verification is claimed here. Provider finalization and processing evidence acquisition are Phase 1.9B/later work, not reachable through an API in 1.9A.

## Every file changed by this task

New:

- `lib/workspace/media/model.ts`
- `lib/workspace/media/service.ts`
- `lib/workspace/media/repository.ts`
- `lib/workspace/media/runtime.ts`
- `drizzle/0032_workspace_course_media.sql`
- `drizzle/meta/0032_snapshot.json`
- `tests/routes/workspace-media-model.test.ts`
- `tests/routes/workspace-media-service.test.ts`
- `tests/routes/workspace-media-repository.test.ts`
- `tests/routes/workspace-media-migration.test.ts`
- `WORKSPACE_PHASE19A_IMPLEMENTATION.md`

Modified:

- `lib/db/schema.ts`
- `lib/workspace/builder/model.ts`
- `lib/workspace/builder/service.ts`
- `lib/workspace/builder/repository.ts`
- `lib/workspace/builder/http.ts`
- `drizzle/meta/_journal.json`
- `scripts/database-readonly-preflight-core.mjs`
- `tests/routes/database-readonly-preflight.test.ts`
- `tests/routes/workspace-builder-service.test.ts`
- `tests/routes/workspace-builder-pages.test.ts`
- `tests/routes/workspace-retained-history-truncate-migration.test.ts`

Preserved byte-for-byte: the six pre-existing modified files listed in the inventory, including `tests/setup.ts` and the Razorpay webhook. The pre-existing untracked `WORKSPACE_PHASE19_INVENTORY_AND_PLAN.md` is retained. No dependency/lockfile, environment file, learner application code, payment behavior or old migration was changed. No commit/merge/push. Stop before Phase 1.9B.
