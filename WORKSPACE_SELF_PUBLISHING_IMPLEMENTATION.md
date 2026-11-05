# Creator self-publishing and pricing — implementation report

Implemented on `feat/creator-workspace`, starting from `fafecb5`. Founder acceptance is pending. No production/staging database was accessed, no existing founder database was migrated, and no deployment, push, merge or Phase 2.2 work occurred.

## Delivered behavior

- Eligible Creators create owned drafts and enter Studio without a proposal submission, content review or Trusted publishing status. Direct project origins use an immutable owned-draft snapshot, without manufactured approvals or authoring LMS courses. Legacy proposal/review records remain intact and read-only in the active UI.
- Creator-controlled INR prices are immutable versioned records. Server validation enforces the existing positive amount bounds. Published-course price changes atomically update future checkout pricing without rewriting curriculum, existing orders, tax/refund evidence, enrollments or progress. Historical approved prices remain readable.
- Direct publication captures technically ready saved content into an immutable revision, requires current explicit guideline acknowledgment and valid access, and respects unresolved moderation restrictions. Stable Creator-to-LMS mapping, secure media delivery and learner progress are reused.
- Admin moderation supports reasons, flags, correction requests, withdrawal, suspension and resolution. Notifications persist in-app in an append-only table tied to audit events. Creators submit corrections and appeals without lifting restrictions. Independent Admin resolution is required before republishing a seriously restricted course; resolving suspension leaves it unpublished until the Creator explicitly republishes.
- Active screens follow Create course → Build lessons → Set price → Preview → Accept guidelines → Publish. Admin screens expose post-publication moderation instead of content/price approval queues. Legacy Trusted/review records are preserved but grant no publishing privilege. Legacy approval HTTP mutation endpoints retire with an authenticated error rather than silently approving anything.
- Membership/grant/refund/suspension authorization remains effective for Builder and media mutations. Financial payout approval and membership accounting were not changed. Pricing/publishing contain no new Admin self-approval mechanism.

## Persistence and concurrency

Migration **0037_workspace_self_publishing** extends the current head, journal and snapshot. All 74 historical migration SQL/snapshot artifacts are byte-identical to the task baseline. Historical approval rows are preserved. New project ownership/source checks, immutable price/revision proofs, append-only moderation notices and deferred release proofs enforce the new policy in PostgreSQL as well as the service.

Version checks and transaction locks serialize price/publication changes. Checkout rechecks the authoritative versioned price after provider order creation and refuses a stale quote. An already issued order continues at its immutable purchase-time amount and tax evidence; a later price edit does not retroactively change its capture or entitlement. Purchase insert guards retain the existing financial, attribution and tax proofs while allowing Creator-set prices.

The six pre-existing unrelated modified files were verified byte-for-byte against `/tmp/self-publish-baseline.json`: refund detail page, access-grant detail page, reports page, Workspace Razorpay webhook, Admin details module and `tests/setup.ts`. Their existing changes remain untouched. No dependencies or lockfile changed.

## Completed verification

| Check | Result and evidence |
| --- | --- |
| `pnpm validate` | PASSED: 1,709 Vitest tests across 139 files; 55 Node tests; strict TypeScript; lint with no warnings/errors. Run in a credential-free source copy with an unreachable synthetic database URL. |
| Production build | PASSED using synthetic configuration and no provider credentials. Existing Next workspace-root/deprecation notices do not block the build. |
| Drizzle schema generation | PASSED: “No schema changes, nothing to migrate” in the credential-free validation copy. No database connection or extra migration generated. |
| Isolated PostgreSQL | PASSED: 9 integration groups plus 3 negative SQL/Admin-list groups. Fresh PostgreSQL 16 cluster under this task's `/tmp` prefix, verified Unix-socket/data-directory identity, synthetic data only. |
| Actual Chrome workflows | PASSED: 7 workflow groups: direct creation, real nonproduction S3 cover verification/private preview, lesson/price/preview, guideline-bound independent publication, synthetic checkout plus price-edit preservation, moderation/corrections/appeals/resolution/progress, responsive navigation. Desktop/Admin and mobile screenshots inspected. |
| Final local app/worker | Isolated acceptance app restarted from final source at `http://localhost:3000`; existing media worker returned HTTP 200 against the local app with the dedicated nonproduction configuration. |
| Source preservation | PASSED: protected six files and historical migrations unchanged; final diff checked for whitespace; new verification helpers syntax-checked. |

PostgreSQL checks include the 0036→0037 upgrade and repeat/no-op migration, preservation of historical customer/financial/review/approval data, creation without approval records, direct publication by a nontrusted eligible Creator, concurrent price-update version conflict, checkout quote changes during provider creation, frozen capture/tax evidence, moderation/republication restrictions, stable learner IDs/progress, immutable prices/orders/notices, invalid currency/ownership, SQL-forged publication rollback during suspension and persisted-role Admin list authorization.

Evidence is under `output/audits/workspace-self-publishing/`: `postgres.json`, `constraints.json`, `browser.json`, `creator-mobile.png` and `admin-moderation.png`. Validation/build logs are `/tmp/self-publishing-validate.log` and `/tmp/self-publishing-build.log`; database/browser logs use the matching `/tmp/self-publishing-*.log` names. Temporary build caches/source copies are generated verification artifacts, not shipping application code. A temporary filesystem quota during an earlier browser attempt caused a safe rollback; relocating this task's Next cache and removing its failed disposable clusters resolved it. The successful browser run completed afterward.

## Local acceptance and remaining limits

Use [WORKSPACE_SELF_PUBLISHING_LOCAL_ACCEPTANCE.md](WORKSPACE_SELF_PUBLISHING_LOCAL_ACCEPTANCE.md) for exact startup commands, nonproduction configuration, separate synthetic role sessions, optional persistent local upgrade and the manual checklist.

- Detailed founder publishing guidelines are pending. The UI explicitly presents an interim, versioned acknowledgment; it does not claim the detailed guidelines are final. A future guideline version requires a new acknowledgment and matching database proof policy.
- Checkout/capture verification used a synthetic provider only in the isolated source copy. No real Razorpay charge or invoice/email/SMS delivery was performed. Moderation notifications are in-app.
- This policy task verified actual dedicated nonproduction S3 cover upload, checksum/version-bound finalization and private delivery. It did not rerun a complete new MediaConvert/HLS/caption integration. Accepted Phase 1.9 media behavior remains covered by the full regression suite. Native adaptive H.264/AAC compressed output on a capable device remains **NOT VERIFIED**, with the previously verified original-MP4 fallback retained.
- The persistent founder database remains unchanged. Its guarded local migration helper now recognizes 0037. No production migration or release was executed.

No known unfinished self-publishing/pricing/moderation implementation blocks local acceptance. Founder testing and explicit approval are required before proceeding.

## Changed source files

The following manifest excludes the six untouched pre-existing changes and generated audit/build artifacts. Every file changed or added by this task is listed.

```text
WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md
WORKSPACE_PHASE21_LOCAL_ACCEPTANCE.md
WORKSPACE_SELF_PUBLISHING_IMPLEMENTATION.md
WORKSPACE_SELF_PUBLISHING_LOCAL_ACCEPTANCE.md
app/(admin)/admin/workspace/course-builds/page.tsx
app/(admin)/admin/workspace/course-reviews/[id]/page.tsx
app/(admin)/admin/workspace/page.tsx
app/(admin)/admin/workspace/publishing/[id]/page.tsx
app/(admin)/admin/workspace/publishing/page.tsx
app/(workspace)/workspace/(creator)/courses/[id]/build/page.tsx
app/(workspace)/workspace/(creator)/courses/[id]/page.tsx
app/(workspace)/workspace/(creator)/courses/new/page.tsx
app/(workspace)/workspace/(creator)/courses/page.tsx
app/(workspace)/workspace/(creator)/dashboard/page.tsx
components/admin/WorkspaceShell.tsx
components/workspace/builder/Builder.tsx
components/workspace/builder/LessonMedia.tsx
components/workspace/builder/StartBuild.tsx
components/workspace/course/CourseSteps.tsx
components/workspace/creator/Content.tsx
components/workspace/creator/DraftEditor.tsx
components/workspace/creator/Navigation.tsx
components/workspace/publishing/Publishing.tsx
components/workspace/review/Actions.tsx
drizzle/0037_workspace_self_publishing.sql
drizzle/meta/0037_snapshot.json
drizzle/meta/_journal.json
lib/commerce/service.ts
lib/db/schema.ts
lib/workspace/admin/lists.ts
lib/workspace/builder/model.ts
lib/workspace/builder/repository.ts
lib/workspace/builder/service.ts
lib/workspace/creator/dashboard.ts
lib/workspace/creator/repository.ts
lib/workspace/creator/service.ts
lib/workspace/media/repository.ts
lib/workspace/publishing/http.ts
lib/workspace/publishing/model.ts
lib/workspace/publishing/policy.ts
lib/workspace/publishing/repository.ts
lib/workspace/publishing/service.ts
lib/workspace/review/http.ts
scripts/database-readonly-preflight-core.mjs
scripts/self-publishing-isolated-postgres.cjs
scripts/self-publishing-local-test.cjs
scripts/self-publishing-open-browser.cjs
scripts/self-publishing-safe-source.cjs
scripts/workspace-media-local-migrate.cjs
scripts/workspace-media-local-setup.cjs
tests/postgres/self-publishing-browser.cjs
tests/postgres/self-publishing-constraints.cjs
tests/postgres/self-publishing-verification.cjs
tests/routes/database-readonly-preflight.test.ts
tests/routes/workspace-builder-pages.test.ts
tests/routes/workspace-builder-repository.test.ts
tests/routes/workspace-builder-service.test.ts
tests/routes/workspace-creator-dashboard.test.ts
tests/routes/workspace-creator-pages.test.ts
tests/routes/workspace-creator-repository.test.ts
tests/routes/workspace-media-repository.test.ts
tests/routes/workspace-publishing-http.test.ts
tests/routes/workspace-publishing-service.test.ts
tests/routes/workspace-review-boundaries.test.ts
tests/routes/workspace-review-pages.test.ts
tests/routes/workspace-review-routes.test.ts
tests/routes/workspace-review-service.test.ts
tests/routes/workspace-self-publishing-pages.test.ts
```
