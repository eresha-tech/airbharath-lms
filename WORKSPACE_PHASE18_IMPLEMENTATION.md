# Workspace Phase 1.8 Implementation

Date: 10 October 2026. Scope: approved course → private structured Course Builder.

## A. Scope

Phase 1.8 implements private project creation, modules, plain text lessons, creator authoring and read-only admin inspection. No database connection, migration application, private-service request, payment operation or deployment was performed. The working tree was clean before this phase.

## B. Approved-submission source

The source is one specific `workspace_course_submissions` row. Creation requires owned `approved` status, a completed approval timestamp and the corresponding immutable `approved` review event matching submission version and completion time. Ownership agrees across authenticated persisted user, Creator Profile, draft and submission. The draft row is locked for consistency with the review workflow; its mutable content is never used for bootstrap or approved reference fields.

Approved title/category/description/target learner/outcomes/outline/tentative price are read-only references to the submission. There is no command to change an approved snapshot, hash, review event, approval time or historical feedback.

## C. Course-project model

`workspace_course_projects` has an immutable owner/profile/draft/approved-submission identity, `building` status, initial version 1 and timestamps. A unique approved-submission index enforces one project per source. Composite foreign keys enforce the complete ownership chain. Project-level metadata is not editable in Phase 1.8, so it has no shared edit-version counter. A trigger guards authoritative approval at insertion and forbids project identity rewrites/deletion.

## D. Module model

`workspace_course_modules` carries project/owner, required 2–200 character title, optional description up to 1,000 characters, zero-based position, independent positive version and timestamps. The parent/owner foreign key restricts deletion. Identity and creation time cannot change; successful updates advance exactly one version and cannot move time backwards.

## E. Lesson model

`workspace_course_lessons` carries project/module/owner, required 2–200 character title, optional summary up to 1,000 characters and optional plain text content up to 20,000 characters. Parent ownership is enforced by a composite foreign key. Each lesson has its own version and timestamps; parent reassignment is prohibited. No media/type/upload/assessment domain is added.

## F. Outline bootstrap

One transaction verifies creator edit capability and approved source, recovers an existing project or inserts the project and all initial outline modules. Repeated/concurrent calls recover one project without duplicate bootstrap modules. A failed module insertion rolls the entire bootstrap back. Modules preserve approved outline order/title/description; a one-character approved title receives only a `Module N:` builder label to satisfy the two-character module bound. The immutable approved title remains unchanged. Empty approved outlines produce an empty structure; no lesson content is invented.

## G. Builder UX

The owned course page offers Start Building Course or Continue Building Course. The private `/workspace/courses/[id]/build` page has a structure sidebar on larger screens, stacked navigation on smaller screens, a selected module/lesson editor and a read-only approved reference panel. Actual module/lesson counts are derived from stored rows. My Courses and dashboard cards distinguish Approved — Ready to Build and Building.

Explicit Save is required. Unsaved content is retained after controlled save/reorder failures; conflict messages explain how to preserve text before reload. Selection/navigation and unload guards reduce accidental text loss. Lost access removes editing while retaining copyable text. There is no autosave or completion-percentage claim. Approval copy explicitly requires separate final-content publication review, and warns that major structure/material basics changes may require further review.

If the builder schema is missing/unavailable, existing draft lists remain usable and approved course pages show a safe unavailable state instead of treating query failure as an absent project.

A synthetic static narrow-screen shell was visually inspected without accessing the local application/database. The subsequent desktop preview was interrupted by the temporary preview server closing and browser error-page handling. Hydrated desktop/mobile save flows and authenticated real-environment smoke are outstanding Phase 1.8V checks; static preview is not claimed as a full browser E2E pass. Temporary preview source was removed and its server stopped.

## H. Module operations

Create at the end, edit title/description, move up/down and delete an empty module. Nonempty module deletion is refused in service and by the restrictive lesson parent foreign key. The UI requires deletion confirmation and disables nonempty deletion. Server state is authoritative.

## I. Lesson operations

Create in an owned module, explicitly save title/summary/content, move within its module and delete with confirmation. Selected lesson content is fetched separately; tree/list responses contain bounded metadata without all lesson bodies. No cross-module move is introduced.

## J. Ordering

Positions are contiguous integers starting at zero per project (modules) and per module (lessons). Append/reorder/delete run transactionally. Position uniqueness is DEFERRABLE INITIALLY DEFERRED, allowing an atomic adjacent swap before commit. Deferred constraint triggers require committed minimum 0 / maximum count−1; unique constraints reject duplicates. Changed neighbors receive new independent versions; unchanged rows are not rewritten.

## K. Optimistic concurrency

Module/lesson edit, move and delete commands require positive expected versions. Stale versions return controlled 409 conflicts with no overwrite. Access locks on persisted user → Workspace orders → Creator Profile, followed by scoped project/draft/submission/item locks, serialize structural mutations. This deliberately follows existing creator-access serialization; edits use independent item versions rather than one giant project version. Different lessons can both save successfully against their own current versions.

Concurrency results here use a serial transaction/rollback harness and actual repository SQL-predicate inspection. Real two-connection PostgreSQL behavior and trigger execution have NOT been tested in this implementation phase.

## L. Membership/read-edit behavior

Existing creator capability rules are reused: fulfilled early-access/active entitlement and enabled profile allow editing; expired eligible creators can read retained project/module/lesson content but cannot write or start a project. Suspended, terminated, held-for-review, pending or unpaid access is denied. Persisted access is locked/reloaded and expiration is checked again after awaited source/project/item locks. The current noncommercial Test entitlement remains unavailable to production runtime.

## M. Admin inspection

Read-only `/admin/workspace/course-builds` list and detail pages show creator/status, approved source, real module/lesson counts, private structure/content and timestamps. Pagination is bounded to 20 plus one lookahead row. The detail API exports GET only. Persisted admin role is verified at the handler/page and locked/rechecked inside inspection transactions; stale-JWT demotion or creator access does not authorize inspection. No mutation/publication method or admin builder command exists.

## N. Authorization/security

Commands strictly reject unexpected fields and client ownership IDs. All project/module/lesson queries and writes scope by persisted owner and parent; writes include expected versions. Cross-user/wrong-parent/malformed identifiers receive non-enumerating failure. Request bodies are bounded to 131,072 UTF-8 bytes and require JSON. Shared existing text normalization uses NFC, normalized line endings and trimming, rejecting HTML delimiters and unsafe control characters. Text is rendered using React escaping. Same-origin checks precede creator writes. Private JSON responses use no-store; failures reveal no SQL or credentials.

The browser build initially exposed a server crypto dependency via validation/Content imports. The correction extracts unchanged text/error/version/display helpers into `creator/text.ts` and the existing action style into `creator/styles.ts`. Existing model/Content exports remain available; the builder client imports only browser-safe helpers. Payment and activation files were not changed. A regression checks browser-safe validation imports, and the default production build passes.

## O. Privacy

Creator/admin builder pages are `ph-no-capture`, dynamic and noindex/nofollow. Analytics canonicalizes creator/admin dynamic builder paths. Existing sanitization strips IDs, title/content/price/identity values, drops autocapture/content-bearing events and restricts page telemetry to anonymous device-level allowed properties. No new builder-content telemetry, replay configuration or logging is added.

## P. LMS/storefront isolation

Instrumented repository tests demonstrate mutations write only the three new Workspace builder tables. No code is added to public courses/catalog/search/sitemap/checkout, course authors, learner enrollment, LMS lesson content, progress or certificates. Large synthetic lesson updates preserve the approved source/hash/approval evidence in the implementation harness. This phase asserts code/harness isolation; it does not claim fresh real-database row-count evidence.

## Q. Payment isolation

Razorpay adapter, webhook, authoritative capture-time reconciliation, refunds, coupons, fulfillment, membership-payment access and launch gates remain unchanged. No payment flags or credentials were edited. Existing payment/fulfillment/access regression suites pass as part of full validation. Public payments remain gated off by the existing implementation. No Razorpay or other private-service call was made.

## R. Migration

Pre-phase repository head verified: `0016_tired_prowler.sql`, with matching journal entry and snapshot. The previous payment E2E report records its local application; the live database ledger was deliberately not queried in this phase.

Generated additive migration: `0017_marvelous_captain_midlands.sql`, snapshot `0017_snapshot.json`, journal appended at index 17. **NOT APPLIED.** No migrate/push/reset/seed command was executed.

All 17 migration SQL files 0000–0016 retain their pre-phase SHA-256 values. Snapshot lineage points to 0016. Existing table definitions are unchanged except the new approved-submission composite ownership index; exactly three new tables are added. Generated FK dependency ordering was corrected so referenced composite unique indexes exist before foreign keys. New migration SQL includes approval/identity/version/time/position guards and deferred position uniqueness; those manual SQL details are not represented completely by Drizzle snapshots and must be verified against PostgreSQL in Phase 1.8V. Direct schema push is unsuitable for this migration.

Repeated safe `pnpm db:generate` returns: No schema changes, nothing to migrate. No 0018 migration was generated.

## S. Tests/validation

Completed with ignored configuration and inherited private credentials scrubbed, an unreachable synthetic database target, and no private services:

- Full `pnpm validate`: PASS — 5 pure test files; 707 Vitest tests across 56 files; TypeScript; lint.
- Phase 1.8: 57 tests across four new files — service/harness, repository predicates, HTTP/privacy/migration boundaries and rendered creator/admin pages. Existing creator/review/payment/fulfillment/access suites pass in the full run.
- Coverage includes single/concurrent idempotent creation, rollback, authoritative approval, bootstrap, module/lesson CRUD, stale conflicts, independent lesson saves, concurrent creates/updates/moves, contiguous ordering/deletes, ownership, expiry after locks, retained expiry reads, suspension/termination/held/pending/unpaid restriction, plain-text/payload bounds, approval immutability, admin demotion, safe failure states and content privacy.
- Production `pnpm build`: PASS in an isolated source copy without .env files/payment authorization, using already cached font responses/assets; final build uses the repository's unmodified Next configuration. Initial compile failures and lint reserved-variable findings were corrected before the final successful runs.
- Repeated `pnpm db:generate`: PASS, no drift.
- Migration SQL SHA-256 / snapshot lineage / existing-table preservation: PASS.
- `git diff --check`: PASS.

The deprecated existing `next lint` command reports its normal Next.js migration notice; final lint has no errors or warnings. No dependency/lockfile/configuration upgrades were performed.

## T. Files changed

All Phase 1.8 changes are listed below. No .env file, previous migration SQL, payment module, dependency manifest or lockfile is changed.

- `app/(admin)/admin/workspace/course-builds/[id]/page.tsx`
- `app/(admin)/admin/workspace/course-builds/page.tsx`
- `app/(user)/workspace/(creator)/courses/[id]/build/page.tsx`
- `app/(user)/workspace/(creator)/courses/[id]/page.tsx`
- `app/(user)/workspace/(creator)/courses/page.tsx`
- `app/(user)/workspace/(creator)/dashboard/page.tsx`
- `app/api/admin/workspace/course-builds/[id]/route.ts`
- `app/api/workspace/course-drafts/[id]/build/route.ts`
- `components/admin/AdminSidebar.tsx`
- `components/workspace/builder/Builder.tsx`
- `components/workspace/builder/StartBuild.tsx`
- `components/workspace/creator/Content.tsx`
- `components/workspace/creator/styles.ts`
- `drizzle/0017_marvelous_captain_midlands.sql`
- `drizzle/meta/0017_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/analytics-privacy.ts`
- `lib/workspace/builder/http.ts`
- `lib/workspace/builder/model.ts`
- `lib/workspace/builder/repository.ts`
- `lib/workspace/builder/service.ts`
- `lib/workspace/creator/model.ts`
- `lib/workspace/creator/text.ts`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/routes/workspace-builder-boundaries.test.ts`
- `tests/routes/workspace-builder-pages.test.ts`
- `tests/routes/workspace-builder-repository.test.ts`
- `tests/routes/workspace-builder-service.test.ts`
- `tests/routes/workspace-creator-pages.test.ts`
- `tests/routes/workspace-review-pages.test.ts`
- `WORKSPACE_PHASE18_IMPLEMENTATION.md`

## U. Known limitations

Migration 0017 remains unapplied, so the builder cannot persist content in the ordinary local application until separately authorized Phase 1.8V migration execution. Real triggers, real transaction rollback, two-connection races and authenticated desktop/mobile content persistence require that verification. Module/lesson count caps are 50 modules, 100 lessons/module and 500 lessons/project to bound structure requests. There is no paging inside one build, project renaming, cross-module lesson transfer or ownership transfer. Project timestamps record identity creation; module/lesson timestamps record authoring updates. Temporary static preview does not test hydration, authentication, keyboard behavior, navigation guards or real Save requests.

## V. Deferred media/assessment/publication work

Video/S3/HLS, resources/uploads, quizzes/assessments, AI, final publication review, publish/scheduling/public URLs, LMS conversion, course sales/enrollments/certificates/payouts, membership renewal/refunds and public Workspace payment enablement remain outside this phase.

## W. Recommendation

**Proceed to Phase 1.8V real PostgreSQL verification under separate explicit authorization.** Review and apply pending migration 0017 through guarded versioned migration workflow; verify ledger/no-op, approval/identity/version/ordering/FK triggers, real two-connection bootstrap and structure/edit races, authorization/retention, source/history/LMS/payment isolation and authenticated creator/admin responsive smoke. This recommendation does not authorize migration execution or further product scope.

Implementation commits:

- `6462634` — approved-source builder schema, services, HTTP and regression foundation.
- `2de2c89` — private creator builder, dashboard/library integration, read-only admin UI and privacy/page tests.

The report is committed separately after these changes. Phase 1.8 stops here.
