# Creator Workspace UX refinement — Phase 2.0 acceptance candidate

Phase 2.0 is **not founder accepted**. No Phase 2.1, public launch, deployment, push or merge was performed. This is a functional refinement of the existing integrated LMS/Workspace.

## Implemented

- Lavender Dashboard/My Courses cards distinguish course idea approval from finished course approval and show relevant next actions. The existing idea approval prerequisite remains.
- Shared five-step navigation: Course details → Build lessons → Preview → Price approval → Publish. Forms have associated labels, responsive curriculum/cards/actions, explicit empty states and unsaved-change protection. Creating a module immediately opens its first lesson form; new lessons default to plain text.
- Upload finalization durably creates the existing processing outbox job in the same transaction as verification. Concurrent retries create one job. The existing dispatcher/callback/reconciliation infrastructure remains authoritative; no page or client-side processing request is required. Failed replacements retain the selected video; ready uploads need explicit selection.
- Shared UploadStatus (also used by Admin VideoUploader) highlights measured upload percentage/bytes and indeterminate processing. It never invents MediaConvert progress. Saved queued/processing/failure/recovery states remain visible after navigation.
- Direct project-owned PNG/JPEG cover upload, private sanitized preview, progress, replace/remove, save feedback and interrupted-upload recovery. Existing authorized images remain a secondary choice. No fake lesson or draft LMS course is created. Unvalidated images/resources are not embedded inline.
- Creator previews, submitted Admin inspection and Creator-published learner delivery reuse the actual AirBharath HlsPlayer, with private authenticated manifest transport. Legacy LMS playback-session behavior remains for ordinary LMS videos.
- Publishing screens use plain language, separate prices from content decisions, retain immutable submitted versions, show feedback/resubmission, and preserve Standard/Trusted permissions and independent Admin-approved pricing. Admin sees the sanitized submitted cover and actual lesson player.

## Necessary persistence change

New sequential **0035_workspace_project_artwork.sql** permits a null lesson only for private, unattached PNG/JPEG project artwork. The owner/project composite constraints, prior lesson-owned guard, lifecycle evidence/version guards and frozen publication proof remain. Cover changes use a monotonic project-scoped sum of asset versions under the project lock; they do not mutate lesson revisions or submitted snapshots.

Historical migrations/snapshots through 0034 were preserved byte-for-byte. Only the journal is appended. Local migration/setup guards and read-only schema review pins were updated for 0035. The six pre-existing unrelated modifications were preserved byte-for-byte against the start-of-task baseline.

## Verification

- Focused processing/artwork security tests cover transactional enqueue rollback/retry, concurrent finalization, access revocation, strict project/ownership binding, sanitization and post-read authorization; shared progress tests exclude fabricated percentages.
- Full validation and build results: see final verification record below.
- PostgreSQL verification used only the explicitly guarded disposable `/tmp` PostgreSQL 16 target, synthetic users/complimentary grants and test media. The 0034→0035 upgrade and repeat no-op preserved existing learner/financial fingerprints; project artwork constraints, stale updates and monotonic revisions passed.
- Real integration used the previously authorized dedicated nonproduction Workspace S3/MediaConvert account/bucket/role. No generic LMS AWS credentials or production/staging database/provider were used. Test objects are retained for reviewed cleanup.
- Browser checks use separate synthetic Creator/Admin/learner/unrelated sessions and the actual local Next server/worker, with real S3 uploads and MediaConvert HLS output.

## Remaining acceptance

The founder must test the revised UI using [WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md](WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md) and explicitly approve Phase 2.0. Successful native browser H.264/AAC compressed-output processing on a capable device remains **NOT VERIFIED**. The supported original-MP4 fallback and genuine server processing/playback are verified; ffmpeg-generated synthetic input does not establish native-browser compression support.

## Final verification record

- **PASSED:** `pnpm validate`: 1,668 Vitest tests across 135 files, 55 Node tests, TypeScript and lint (no ESLint warnings/errors). Run in a credential-free source copy using synthetic test configuration.
- **PASSED:** 19 distinct actual browser checks across the real creation/media journey, replacement/publishing/learner journey, trusted/mobile journey and player/recovery controls. Real S3 verification automatically persisted one processing job, processing completed after leaving the page, a genuinely invalid MP4 failed MediaConvert without replacing the old video, and a ready replacement waited for explicit selection. Standard change request/resubmission, independent prices, trusted publication/revocation, learner completion and stable IDs/progress passed. Shared player play/pause/seek/audio/captions/speed/fullscreen/keyboard focus and mobile preview passed.
- **PASSED:** 4 isolated PostgreSQL artwork/migration checks, including guarded 0034→0035 upgrade, repeated migration no-op, existing learner/financial fingerprints, project ownership/type constraints, stale updates and monotonic cover revisions. Historical artifacts and the six protected files remain unchanged.
- **PASSED:** focused processing/artwork/Builder/Creator/review/progress regressions, included again in full validation. Existing Admin authorization/video-webhook regressions and shared UploadStatus coverage passed; no legacy LMS AWS upload operation was invoked.
- **PASSED:** `git diff --check` and Node syntax checks for the new standalone browser helpers.
- **PASSED:** final production `pnpm build`, including optimized compilation, type/lint validation and page generation. Synthetic build-only configuration was used; no production credentials or database were accessed.

Browser evidence: `output/audits/workspace-ux/verification.json` and desktop/Admin/mobile screenshots. A four-second caption assertion was corrected to seek back after loading; a speed-menu selector was made unambiguous. Next development mode restarted at its memory threshold during a trusted request; the saved-state retry completed successfully. Local cold compilations can be slow. No production business logic was changed to resolve test issues.

## Files changed by this refinement

The following manifest compares source contents with the preserved start-of-task baseline, including files already untracked from Phase 2.0. It excludes generated local audit screenshots and credentials.
<!-- refinement-file-manifest -->

- `WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md`
- `WORKSPACE_PHASE20_UX_REFINEMENT.md`
- `app/(workspace)/workspace/(creator)/courses/[id]/page.tsx`
- `app/(workspace)/workspace/(creator)/courses/new/page.tsx`
- `app/(workspace)/workspace/(creator)/courses/page.tsx`
- `app/(workspace)/workspace/(creator)/dashboard/page.tsx`
- `app/api/workspace/publishing/[id]/cover/[assetId]/route.ts`
- `app/api/workspace/publishing/[id]/cover/route.ts`
- `components/media/UploadStatus.tsx`
- `components/video-player/HlsPlayer.tsx`
- `components/workspace/builder/Builder.tsx`
- `components/workspace/builder/LessonMedia.tsx`
- `components/workspace/builder/NavigationProtection.tsx`
- `components/workspace/builder/Preview.tsx`
- `components/workspace/builder/StartBuild.tsx`
- `components/workspace/course/CourseSteps.tsx`
- `components/workspace/creator/Content.tsx`
- `components/workspace/creator/DraftEditor.tsx`
- `components/workspace/creator/Fields.tsx`
- `components/workspace/creator/Navigation.tsx`
- `components/workspace/creator/Shell.tsx`
- `components/workspace/publishing/CoverUpload.tsx`
- `components/workspace/publishing/Publishing.tsx`
- `components/workspace/review/Actions.tsx`
- `drizzle/0035_workspace_project_artwork.sql`
- `drizzle/meta/0035_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/builder/model.ts`
- `lib/workspace/builder/repository.ts`
- `lib/workspace/media/artwork.ts`
- `lib/workspace/media/processing.ts`
- `lib/workspace/media/provider.ts`
- `lib/workspace/media/repository.ts`
- `lib/workspace/media/runtime.ts`
- `lib/workspace/media/service.ts`
- `lib/workspace/media/uploads.ts`
- `lib/workspace/publishing/delivery.ts`
- `lib/workspace/publishing/model.ts`
- `lib/workspace/publishing/repository.ts`
- `lib/workspace/review/model.ts`
- `scripts/database-readonly-preflight-core.mjs`
- `scripts/workspace-media-local-migrate.cjs`
- `scripts/workspace-media-local-setup.cjs`
- `scripts/workspace-publishing-local-test.cjs`
- `scripts/workspace-publishing-open-browser.cjs`
- `tests/postgres/workspace-ux-artwork.cjs`
- `tests/postgres/workspace-ux-browser.cjs`
- `tests/postgres/workspace-ux-controls-browser.cjs`
- `tests/postgres/workspace-ux-fixture.cjs`
- `tests/postgres/workspace-ux-publishing-browser.cjs`
- `tests/routes/database-readonly-preflight.test.ts`
- `tests/routes/workspace-builder-pages.test.ts`
- `tests/routes/workspace-creator-dashboard.test.ts`
- `tests/routes/workspace-creator-pages.test.ts`
- `tests/routes/workspace-media-preparation.test.ts`
- `tests/routes/workspace-media-service.test.ts`
- `tests/routes/workspace-media-upload-fixtures.ts`
- `tests/routes/workspace-publishing-service.test.ts`
- `tests/routes/workspace-review-pages.test.ts`
- `tests/routes/workspace-ui-consistency.test.ts`
- `tests/routes/workspace-ux-artwork.test.ts`
- `tests/routes/workspace-ux-processing.test.ts`
