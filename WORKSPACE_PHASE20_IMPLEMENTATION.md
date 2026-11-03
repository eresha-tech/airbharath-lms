# Phase 2.0 implementation and verification

Branch: `feat/creator-workspace`. Scope: complete Creator course publishing into the existing AirBharath LMS. **Implementation is complete; founder acceptance is pending.** Phase 1.9 core acceptance is retained. No Phase 2.1 work, public launch, production migration, deployment, push or merge was performed.

## Implemented

**2.0A — Final course review.** Private Builder projects remain private working drafts. Submission captures an immutable, canonically hashed revision containing publication metadata, artwork, author attribution, ordered modules/lessons, explicit text/Markdown format, media revisions, verified source versions and completed processing manifests. Admin review supports beginning review, approval, change requests and immutable resubmission history. Client requests cannot supply snapshots/provider identities. Reviewer receipts exclude storage keys, provider versions and manifests. Ready PNG/JPEG project resources supply artwork; submitted artwork is privately downloadable for review.

**2.0B — Trusted Creators.** Separate profile-scoped, versioned privilege with independent persisted Admin grant/revocation and retained reason/audit history. Trusted publishing requires current effective Creator access, enabled identity, complete verified content and a currently independently approved price. It cannot bypass an active Admin review/change request. Revocation blocks future unapproved publication; it does not silently withdraw an existing course. Admin-owned Creator courses cannot self-approve content, prices or trust, and the UI hides these independent-approval controls for their owner.

**2.0C — Independent prices.** Positive INR price proposals use integer paise, immutable version numbers and explicit independent Admin decisions. One pending proposal per project. Approval alone does not change the current LMS price. Publication explicitly selects the latest approved price; stale/older-price publication is rejected. Existing pricing/payment arithmetic remains authoritative. No revenue-share, sales ledger, earnings or payout accounting was introduced.

**2.0D — Existing LMS publication adapter.** One stable LMS course per private project, with retained source-to-LMS module/lesson mappings and versioned releases. No LMS course is created for a draft, metadata edit, submission, review or price proposal. Updates preserve surviving IDs, enrollment and lesson completion; removed curriculum is retired without deleting historical lessons/progress. Course metadata, instructor/author, approved price, lesson content and ordered resource links are copied atomically from the selected frozen revision. Public cover delivery revalidates the frozen image and re-encodes a bounded PNG.

Learners use the existing course/lesson routes, enrollment and bundle resolver, progress/completion controls and curriculum navigation. Creator lesson playback reuses the accepted private Hls.js/native player with a new entitlement-checked frozen-media adapter; existing LMS video rows and legacy player paths are unchanged. Each private media response checks current learner access before and after provider reads and uses pinned source/output versions and checksums. Later Studio detachment does not invalidate published evidence. Plain text stays plain text; Creator Markdown retains the accepted restricted Workspace renderer.

Unpublish hides the course/new direct purchases while preserving enrolled learner delivery. Emergency suspension also denies actual learner delivery, including claimed/persisted Admin learner privileges. Admin review remains available through its separate authenticated inspection routes. Restore moves to unpublished; republishing is explicit. Trust or Creator membership/grant revocation does not erase learner entitlements.

**2.0E — Creator/Admin workflows.** Studio links to a dedicated review/publishing screen using existing AirBharath controls. It includes metadata/artwork, frozen revision inspection, safe resource downloads, Markdown, video/captions, review feedback, price proposals/decisions, trust, publication/withdrawal/suspension and retained history. Refresh decisions preserves unsaved metadata; version conflicts reject stale actions. Existing Studio navigation protection handles unsaved details. Admin has a publishing queue and separate review controls. Mapped Creator courses redirect from the legacy Admin Course Editor to publishing; legacy course update/delete APIs reject them before learner/financial deletion. Database guards also prevent legacy LMS mutation paths from bypassing publication approvals.

## Persistence and safeguards

Additive Drizzle migration **0034**, journal entry and generated schema snapshot follow unchanged 0000–0033 artifacts. It adds the publication state/revision/price/release/event and trust domains, stable mappings, and nullable/defaulted LMS adapter fields. Legacy LMS lesson formatting defaults to its existing Markdown behavior; private Studio text contracts remain unchanged. No historical learner content transformation is performed.

Custom PostgreSQL constraints/triggers retain immutable snapshots, finalized prices, releases, audit events and mappings; reject delete/truncate; require independently authorized decisions and deferred audit evidence; enforce root/trust version progression; validate project/price/course/release scope and publication authority; and protect mapped LMS records from legacy editor writes. Publication takes the same effective Workspace access evidence and compatible user/order/profile/project locks used by existing Builder/access-grant services. External provider work runs outside publication database transactions. Request replay is actor/project/payload bound and access is rechecked before replay.

`WORKSPACE_PUBLICATION_ENABLED` is explicitly required for publication and defaults off. The final coordinated production release remains a separate authorization.

## Actual verification results

| Check | Result | Evidence |
| --- | --- | --- |
| Full `pnpm validate` | PASSED — **1,657 Vitest tests, 55 Node tests, TypeScript, lint** | `output/audits/workspace-phase20/validate-final.log` |
| Production `pnpm build` | PASSED; credential-free source copy, unreachable synthetic DB | `output/audits/workspace-phase20/build-final.log` |
| Drizzle source/snapshot consistency | PASSED — no schema changes to generate | `output/audits/workspace-phase20/schema.log` |
| PostgreSQL 16 migration/repository checks | PASSED — **18 checks**, fresh migrations through 0033 → 0034, repeat migration no-op, historical LMS fields preserved | `output/audits/workspace-phase20/postgres.json` |
| Real publication race checks | PASSED — **5 checks**, independent connections held at actual owner locks; trust-revoke vs publish, price-approval vs publish, unpublish vs update; grant revocation and existing bundle enrollment | `output/audits/workspace-phase20/concurrency.json` |
| Dedicated nonproduction AWS | PASSED — conditional/checksum-bound versioned S3 upload, actual MediaConvert completion, pinned HLS segments, PDF and captions; verified image upload also used for artwork | `output/audits/workspace-phase20/provider.json` |
| Actual Chrome Creator/Admin/learner workflows | PASSED — **8 workflows** covering review/resubmission, price approval, standard publish, trusted publish/revocation, real decoded HLS/caption cues, private downloads, suspension/restoration and preserved progress | `output/audits/workspace-phase20/browser.json` |
| Frozen-media retention | PASSED — published video/captions/PDF still verify and deliver after private Studio detachment | `output/audits/workspace-phase20/frozen-media.json` |
| Final UI/browser smoke | PASSED — refresh retains unsaved details, leave/stay guard, Admin queue, decoded learner HLS after detachment | `output/audits/workspace-phase20/smoke.json` |
| Preservation | PASSED — all **74** saved hashes checked for the six unrelated files and historical migration artifacts; no mismatches | Repeated local SHA256 comparison with existing preservation manifest |
| Final diff whitespace | PASSED — `git diff --check` | Local check |
| Native browser H.264/AAC compressed output | **NOT VERIFIED**, retained Phase 1.9 capable-device gap | No native-compression claim; verified original-MP4 fallback remains |
| Founder Phase 2.0 acceptance | **PENDING** | Requires founder’s actual local testing and explicit approval |

Verification used disposable PostgreSQL databases under a fresh `/tmp/airbharath-media-pg-phase20-*` cluster, synthetic users, real complimentary-grant/terms/review services and synthetic enrollments/progress. It did not connect to production/staging or migrate the existing founder database. AWS calls used only the previously authorized dedicated Workspace nonproduction target and explicit Workspace credentials; no IAM, bucket, queue or infrastructure changes were made. Real transcode completion was reconciled through provider polling. Remote test objects remain for reviewed cleanup. Build/validation copies contain no `.env` or provider credentials; the build has no usable database target.

The focused unit/HTTP regressions cover strict commands, ownership/current access, canonical JSONB hashes, immutable resubmission, independent/self approval, trust limitations, current approved prices, idempotency binding, concurrent/stale mutations, environment gates, safe receipts/errors, CSRF/origin checks and retained progress. Existing LMS and accepted Phase 1.9 regression suites pass with them. No financial provider transaction was performed.

## Local setup and founder checklist

Read **WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md** for exact startup/configuration commands, synthetic Creator/Admin session setup, precise page paths, standard and Trusted Creator checklists, and recovery after logout. Existing `pnpm dev --media` is the persistent founder workflow, with explicit local publication enablement. Its guarded upgrade/setup commands have been prepared for 0034; this task did not run them against the existing founder database. An additional isolated acceptance server and separately authenticated synthetic Creator/Admin/learner windows are prepared for the disposable verification fixture.

No new unfinished Phase 2.0 core work was identified by these checks. The retained native compression capable-device verification gap is explicitly unresolved. Artwork currently reuses project image resources, and the review queue/history have documented display limits. Phase 2.0 is not declared accepted, and production publishing remains disabled by default.

## Files changed in Phase 2.0

The working tree already contained accepted Phase 1.9 and user changes. The following list identifies this phase’s files, rather than attributing all dirty files to this task. Historical migration SQL/snapshots and the six preserved unrelated files were not changed.

```text
WORKSPACE_PHASE20_IMPLEMENTATION.md
WORKSPACE_PHASE20_LOCAL_ACCEPTANCE.md
app/(admin)/admin/courses/[id]/page.tsx
app/(admin)/admin/workspace/course-builds/page.tsx
app/(admin)/admin/workspace/publishing/[id]/page.tsx
app/(admin)/admin/workspace/publishing/page.tsx
app/(dashboard)/dashboard/courses/[courseId]/layout.tsx
app/(dashboard)/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx
app/(dashboard)/dashboard/courses/[courseId]/page.tsx
app/(user)/courses/[slugOrId]/page.tsx
app/(workspace)/workspace/(creator)/courses/[id]/publishing/page.tsx
app/api/admin/courses/route.ts
app/api/admin/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/[name]/route.ts
app/api/admin/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/stream/[name]/route.ts
app/api/admin/workspace/publishing/[id]/route.ts
app/api/courses/[courseId]/artwork/route.ts
app/api/courses/[courseId]/lessons/[lessonId]/media/[assetId]/[name]/route.ts
app/api/courses/[courseId]/lessons/[lessonId]/media/[assetId]/stream/[name]/route.ts
app/api/payments/razorpay/order/route.ts
app/api/progress/route.ts
app/api/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/[name]/route.ts
app/api/workspace/publishing/[id]/revisions/[revisionId]/media/[assetId]/stream/[name]/route.ts
app/api/workspace/publishing/[id]/route.ts
components/workspace/builder/Builder.tsx
components/workspace/builder/PublishedVideo.tsx
components/workspace/publishing/Publishing.tsx
drizzle/0034_workspace_course_publishing.sql
drizzle/meta/0034_snapshot.json
drizzle/meta/_journal.json
lib/certificate-service.ts
lib/course-access.ts
lib/courseProgress.ts
lib/db/schema.ts
lib/workspace/publishing/delivery.ts
lib/workspace/publishing/http.ts
lib/workspace/publishing/model.ts
lib/workspace/publishing/repository.ts
lib/workspace/publishing/service.ts
scripts/database-readonly-preflight-core.mjs
scripts/workspace-media-local-migrate.cjs
scripts/workspace-media-local-setup.cjs
scripts/workspace-media-open-browser.cjs
scripts/workspace-publishing-local-test.cjs
scripts/workspace-publishing-open-browser.cjs
scripts/workspace-publishing-test-env.cjs
tests/admin-route-authorization-policy.test.mjs
tests/postgres/workspace-publishing-browser.cjs
tests/postgres/workspace-publishing-concurrency.cjs
tests/postgres/workspace-publishing-ephemeral.cjs
tests/postgres/workspace-publishing-frozen-media.cjs
tests/postgres/workspace-publishing-provider.cjs
tests/postgres/workspace-publishing-smoke.cjs
tests/routes/database-readonly-preflight.test.ts
tests/routes/lms-entitlement-consistency.test.ts
tests/routes/workspace-publishing-http.test.ts
tests/routes/workspace-publishing-service.test.ts
```
