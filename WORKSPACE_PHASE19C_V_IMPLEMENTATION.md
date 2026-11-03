# Creator Workspace Phase 1.9C–V implementation

Implemented on `feat/creator-workspace`, following 1.9A/B. **Phase 1.9 is not accepted.** Genuine nonproduction AWS verification awaits the founder's test configuration; founder testing of the actual local UI and explicit approval are mandatory. Public launch remains one coordinated release after all major Creator Workspace phases.

## Delivered

- **1.9C:** durable private processing outbox, MediaConvert adapter, pinned-source staging into worker-only keys, job/source/policy/output correlation, authenticated callback and bounded polling worker. Upload verification never marks a video playable. Only a provider COMPLETE job plus verified private HLS manifests/segments establishes readiness. Each output's version, SHA-256 and size are retained for authenticated delivery. Every playback read rechecks private source/bucket evidence; malformed output from a correctly correlated completed job becomes a retained failed asset, while unrelated callbacks remain rejected. Failed jobs retain provenance and require a new asset; ambiguous dispatch is never blindly re-created outside the provider's short deduplication window. Exact authenticated callbacks can recover uncertain dispatch IDs. Canceled/replaced assets cannot be revived. Queue fairness prevents a revoked owner from starving unrelated work; internal attention counts report uncertain dispatches, detached jobs and expired intents. No storage deletion is performed.
- **Captions:** server-derived selected-video/source binding, private checksum-bound uploads, strict UTF-8/plain WebVTT validation, explicit attachment, private authenticated delivery, automatic detachment when the selected source changes. Captions cannot choose arbitrary source versions through public commands.
- **1.9D:** integrated private Studio panel for bounded-memory SHA-256 hashing, conditional upload progress/cancellation, resume/finalize recovery, processing status, explicit ready-video selection/replacement, resource attach/rename/reorder/detach and caption management. Media actions respect unsaved text and active transfer guards. Background media refresh updates Builder versions only when saved text is unchanged; concurrent text edits remain conflicts and copyable work is retained. Mobile resource names have a full-width row.
- **1.9E:** saved private course/lesson preview, explicit plain-text/Markdown choice and unsaved text preview, native/HLS.js player with seek/fullscreen/rates and subtitle tracks, authenticated forced resource downloads, lesson/structure readiness findings. The existing Markdown renderer has an opt-in private mode that makes external links/images inert; existing LMS rendering defaults are preserved. The private player has no LMS analytics/enrollment/progress coupling. Creator preview is noindex/no-capture; Admin inspection remains read-only with persisted-role checks and authenticated media delivery.
- **1.9V:** focused regression tests, real isolated PostgreSQL rehearsal, hydrated desktop/mobile Creator/Admin browser checks, genuine-provider opt-in runner, media-only local UAT launcher/worker and the founder acceptance guide. The provider runner is supplied, syntax checked and disabled by default; it has NOT been executed against AWS.

Migration **0033_workspace_media_processing** was generated from 0032 with journal/snapshot lineage and additive lifecycle/immutability/retention guards. Historical SQL and snapshots through 0032 are unchanged. The exact source-integrity manifest is repinned for 34 migrations; no historical audit was restarted. No production migration, deployment, push, merge, dependency/lockfile change, public publishing, sales, earnings or payout work was performed.

## Validation evidence

- `pnpm validate`: **PASS — 51 Node tests; 1,617 Vitest tests across 129 files; TypeScript; lint without warnings/errors.** This full validation includes the concurrent-refresh fix. The final per-request HLS privacy/source recheck additionally passed all 133 focused media tests across twelve suites.
- Production build: **PASS** on the final source, including compilation, type/lint checks, page-data collection and static generation. Builds use a source copy without environment files, explicit scrubbed environment and an unreachable synthetic database descriptor. Staging classification exists only to satisfy the repository's production-build guard; no staging database is contacted.
- Isolated PostgreSQL 16: **25 checks PASS**, with all 34 migrations, empty install through 0031, explicit 0031→0032→0033 upgrade and repeat no-op, retained text/defaults, deferred resource ordering, independent-connection replacement competition, durable/idempotent outbox and completion, atomic ready replacement, source/manifest/history guards, revision behavior, suspension/Admin demotion and unchanged historical learner course rows. Only random databases in a verified `/tmp/airbharath-media-pg-*` cluster were used. No private DB credentials. Full checks run separately from browser fixture setup, preserving the existing irreversible suspension policy.
- Hydrated Chromium: **13 checks PASS**, including a real concurrent text update plus background media revision update that preserves unsaved work and returns 409 for the stale save. Real Creator/Admin routes and the synthetic database were used. Desktop/mobile save/reload, Markdown, resource rename, unsaved-work guards, disabled-provider upload failure, saved private preview, noindex, read-only Admin controls, anonymous/wrong-owner/origin denials and absence of browser runtime errors were checked. All non-loopback browser traffic was blocked. Actual HLS/caption playback and browser PUT/CORS are not claimed.
- Strict machine callback tests also cover unauthorized, malformed/oversized and forged output evidence without provider/database use. Syntax checks completed for the local worker, local UAT launcher and all three opt-in verification scripts. The genuine AWS runner's disabled gate was exercised. Historical migration/snapshot and six unrelated-file preservation hashes passed; `git diff --check` passed.

Browser screenshots were visually inspected, including the corrected mobile resource layout. Temporary browser sessions, application server and disposable PostgreSQL server are stopped after verification. Initial harness failures were fixture enum/environment/wait issues; application security/retention guards were preserved. A browser-discovered accessible-name issue and final-review concurrency risk were fixed and reverified.

## Founder handoff / remaining gates

Read **WORKSPACE_PHASE19_LOCAL_ACCEPTANCE.md** for exact environment variable names, dedicated bucket/IAM/CORS requirements, media worker/callback setup, local startup, Creator/Admin account preparation, the step-by-step checklist and known limits.

1. Supply the dedicated nonproduction Workspace storage/MediaConvert configuration locally, then run genuine provider verification and actual browser upload/CORS/HLS/caption/callback checks. No AWS resource or external pipeline was assumed to be compatible or provisioned here.
2. Review/apply migrations through 0033 to the separately confirmed founder local test database; this implementation only migrated its disposable verification cluster. Start `pnpm dev:uat --media` after configuration. Default `pnpm dev:uat` supports text/UI testing with providers disabled.
3. Founder tests the actual UI and explicitly approves Phase 1.9. Until then, acceptance remains pending. No public release is authorized by successful tests.

Known limits: one 720p H.264/AAC rendition; bounded HLS output verification and authenticated per-segment application proxy; plain WebVTT only; original resources download-only (structural verification is not malware certification); no automatic orphan-object deletion; failed processing uses a new upload intent and uncertain dispatch needs callback recovery/cancellation. Native media/browser compatibility and service throughput need real target/device evidence. Existing Phase 1.9A asset limits remain authoritative.

## Every file changed in this implementation (since 1.9B)

Earlier 1.9A/B files remain uncommitted on this branch and are listed in their existing reports. The following list distinguishes this implementation's changes from those earlier changes and the six unrelated user modifications.

- New: `WORKSPACE_PHASE19C_V_IMPLEMENTATION.md`
- New: `WORKSPACE_PHASE19_LOCAL_ACCEPTANCE.md`
- New: `app/(workspace)/workspace/(creator)/courses/[id]/preview/page.tsx`
- New: `app/api/admin/workspace/course-builds/[id]/media/[assetId]/stream/[name]/route.ts`
- New: `app/api/internal/workspace/media/route.ts`
- New: `app/api/workspace/media/[id]/captions/route.ts`
- New: `app/api/workspace/media/[id]/process/route.ts`
- New: `app/api/workspace/media/[id]/stream/[name]/route.ts`
- New: `app/api/workspace/media/transcoded/route.ts`
- Modified: `components/content/MarkdownContent.tsx`
- Modified: `components/workspace/builder/Builder.tsx`
- New: `components/workspace/builder/LessonMedia.tsx`
- New: `components/workspace/builder/Preview.tsx`
- New: `drizzle/0033_workspace_media_processing.sql`
- New: `drizzle/meta/0033_snapshot.json`
- Modified: `drizzle/meta/_journal.json`
- Modified: `lib/db/schema.ts`
- Modified: `lib/workspace/analytics-privacy.ts`
- New: `lib/workspace/builder/readiness.ts`
- New: `lib/workspace/media/captions.ts`
- New: `lib/workspace/media/delivery.ts`
- New: `lib/workspace/media/file-checksum.ts`
- Modified: `lib/workspace/media/http.ts`
- New: `lib/workspace/media/processing-provider.ts`
- New: `lib/workspace/media/processing.ts`
- Modified: `lib/workspace/media/provider.ts`
- Modified: `lib/workspace/media/repository.ts`
- Modified: `lib/workspace/media/runtime.ts`
- Modified: `lib/workspace/media/service.ts`
- Modified: `lib/workspace/media/uploads.ts`
- New: `lib/workspace/media/worker.ts`
- Modified: `scripts/database-readonly-preflight-core.mjs`
- Modified: `scripts/workspace-local-uat.mjs`
- New: `scripts/workspace-media-local-worker.mjs`
- Modified: `tests/admin-route-authorization-policy.test.mjs`
- New: `tests/postgres/workspace-media-browser.cjs`
- Modified: `tests/postgres/workspace-media-ephemeral-verification.cjs`
- New: `tests/postgres/workspace-media-provider-verification.cjs`
- Modified: `tests/routes/database-readonly-preflight.test.ts`
- New: `tests/routes/workspace-media-callback.test.ts`
- Modified: `tests/routes/workspace-media-http.test.ts`
- Modified: `tests/routes/workspace-media-migration.test.ts`
- New: `tests/routes/workspace-media-processing-provider.test.ts`
- New: `tests/routes/workspace-media-processing.test.ts`
- New: `tests/routes/workspace-media-readiness.test.ts`
- New: `tests/routes/workspace-media-studio.test.ts`
- Modified: `tests/routes/workspace-media-upload-fixtures.ts`
- New: `tests/routes/workspace-media-worker-auth.test.ts`
