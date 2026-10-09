# Workspace Phase 1.7 implementation

Date: 9 October 2026 (Asia/Kolkata). Scope: internal private course submission/review only. No database connection, migration execution, fixture mutation or private-service call was authorized or performed for this implementation.

## A. Scope

Implemented immutable course submissions, internal admin decisions, creator feedback/history and the review-aware draft edit gate. Preserved membership, eligibility, public payments and legacy LMS behavior. No dependency or lockfile changes.

## B. Review lifecycle

`submitted (v1) → under_review (v2) → changes_requested | approved (v3)`.

Changes-requested and approved are terminal for that submission. No rejected/published/selling state. Course review cannot grant creator access or paid entitlement. Admin approval language is “AirBharath Course Review Approved”.

## C. Submission snapshot model

`workspace_course_submissions` stores immutable draft/owner/profile identity, per-draft submission number, saved draft version, SHA-256 content hash, request context/key, all validated course content and INR tentative price. It retains submission/creation times and permits only the lifecycle fields to transition. Composite ownership references the existing draft. A new draft composite unique index is the only schema addition to an existing table, required as the foreign-key target.

Canonical content uses the existing Phase 1.6 validator, normalized text and deterministic field ordering. Hash includes title/category/description/audience/outcomes/outline/tentative price/INR; excludes IDs, numbering, request keys and timestamps. Future publication can select a specific approved submission without trusting a mutable draft.

## D. Review-event model

`workspace_course_review_events` is append-only. Each event records submission, persisted admin actor, action, from/to status, transition version, normalized creator feedback/optional note, request key/context hash and event time. Unique submission/transition-version and actor/request-key indexes prevent duplicate evidence.

Generated SQL guards prohibit snapshot/event deletion, snapshot-content changes and event rewrites. Deferred constraint triggers require every committed lifecycle change to have its exact event and every event to have the corresponding status/timestamp transition. These are structurally tested; execution remains for Phase 1.7V.

## E. Creator submission

`POST /api/workspace/course-drafts/[id]/submit` accepts only `expectedDraftVersion` and UUID `requestKey`. Owner is derived from the authenticated persisted account; content is read from the locked owned draft. No browser-supplied content or identity is accepted. Membership is checked after creator/account locks and rechecked after acquiring the draft lock, before idempotency recovery or insert.

Same owner/key/context recovers its existing submission. Changed draft/version context conflicts. Stale draft version, incomplete content, open review, approval and unchanged resubmission return controlled errors. Wrong-owner identifiers are non-enumerating not-found.

## F. Draft locking/editability

Existing creator mutations now load the latest authoritative review state inside their transaction while holding the draft lock. Editing requires ordinary membership capability AND no submission or latest changes-requested. Submitted, under-review and approved block editing. SQL independently protects review-locked drafts. Existing optimistic draft versioning is preserved; expiry is sampled again after the draft/review lookup.

## G. Changes requested

Admin feedback is required, plain text, normalized and 10–2,000 characters. Feedback is visible to the owner, escaped by React, retained in immutable history and cannot be edited by an admin. Changes-requested unlocks only the mutable draft, and only while ordinary membership remains editable.

## H. Resubmission/versioning

Creator edits/saves the original draft then resubmits its saved version. Content hash must differ from the immediately preceding changes-requested snapshot; a version-only save does not qualify. Number allocation occurs under the draft lock. N+1 is a new snapshot; old content/events stay unchanged. Partial unique open-submission index adds database protection. SQL also verifies snapshot source content, sequence and changed content.

## I. Approval

Approval requires an explicit admin command from under-review, with optional plain-text note up to 1,000 characters. The approved snapshot and underlying draft are read-only. Approval creates no LMS course/author, public slug/catalog/search/sitemap entry, selling price, checkout, enrollment, certificate, membership or entitlement. UI explains that approval is private internal review, separate from publication and regulatory approval.

## J. Admin review queue

Added `/admin/workspace/course-reviews` and `/admin/workspace/course-reviews/[id]`, plus sidebar navigation. Queue defaults to submitted/under-review, supports the four statuses and uses 20-row pagination (21 fetched for next-page detection), bounded to 500 pages. Detail renders the immutable snapshot, current authorized professional profile context, creator status, saved draft version, lifecycle dates and event history.

Submitted shows Start Review. Under-review shows Request Changes and explicit-confirmation Approve Course Review. Terminal submissions show historical read-only decisions. Admins never edit creator course/profile content. Creator expiry/suspension does not cancel an open admin review.

## K. Creator review UX

Owned draft page displays latest state, feedback/history and appropriate editor/submit/resubmit controls. History uses ten submissions per page (11 fetched), bounded page numbers, and always separately resolves page-one latest state when browsing older history. Never-submitted/changes-requested valid drafts show a saved-version submit CTA while membership permits editing. Confirmation explains the review lock and publication/regulatory distinction. API failures retain answers; uncertain retries reuse the request key for unchanged command context. Conflict asks for reload.

My Courses and dashboard recent-course lists derive review status from actual submission rows. No invented metrics. Expired creators retain historical feedback/approved-result reads but cannot edit or submit. No renewal flow was added.

## L. Authorization/security

Both mutation endpoints use existing same-origin protection and bounded streamed JSON (16 KiB). Admin handler uses the existing persisted-role authorization guard; the HTTP boundary and transaction recheck persisted admin state. Queue/detail lock/recheck persisted role too. Demoted admins cannot read or mutate reviews. Creator transaction uses existing account → financial-order → profile lock/access evidence; course review adds draft locking without changing financial behavior. Controlled errors never expose SQL, stack traces or credentials. Private API replies are no-store.

## M. Concurrency/idempotency

Creator submission and admin mutation share draft-before-submission ordering. Creator account locks serialize request keys across their drafts. Admin mutation locks the persisted actor FOR UPDATE before draft/submission, serializing actor request-key reuse even across different submissions; reads use FOR SHARE. Admin optimistic update predicates include ID/current status/current version. Status is monotonic for each immutable submission, so the strict expected-status command prevents stale/ABA decisions without accepting a client version field.

Service harness exercises first-submission same/different-key races, resubmission same/different-key races, two starts, approve-vs-changes, two approvals, two changes requests, same-key recovery, changed-command conflict and event-before-transition rollback. Repository tests verify real Drizzle predicates/lock order and bounded reads. The harness serializes transactions in memory; it is not evidence of real PostgreSQL concurrency. Admin retry recovers the same submission identity with its current lifecycle, without a duplicate event.

## N. Privacy/analytics

Creator shell and review pages use ph-no-capture. Creator shell and new admin review pages explicitly set noindex/nofollow. Dynamic review URLs canonicalize to `/admin/workspace/course-reviews/[id]`; existing creator-draft canonicalization remains. Sanitizer drops private content, feedback, IDs, query strings and fragments and suppresses autocapture/new content-bearing events. Added no new analytics emission or email. Creator history renders no admin email or internal identity fields; mutation receipts omit course content/owner/profile/request hashes.

## O. Legacy/storefront isolation

Review repository writes only submission/event tables. Existing creator repository still writes only private content. Snapshot comparison verifies every earlier schema object unchanged except the justified draft composite index. Migrations 0000–0014 remain unchanged. Prior Workspace/LMS/auth/payment tests pass in the full suite. No database access occurred, so no actual LMS/storefront or test-fixture records were created or mutated. Catalog/search/publication paths were not changed.

## P. Public/payment isolation

Public Workspace payments remain disabled by the existing gates/preview. Razorpay/payment-provider/fulfillment/pricing/coupon code and environment files were not changed. Retained held Razorpay fixtures were not accessed or mutated. No private-service/Razorpay call occurred. No creator access override or test-payment bypass was introduced.

## Q. Migration

Generated `drizzle/0015_warm_sprite.sql` from the existing 0014 source snapshot. Added the two private tables, ownership/index/lifecycle constraints and custom SQL guards. Reviewed generated ordering and moved the prerequisite draft composite index before the composite FK. Explicit non-null lifecycle checks avoid PostgreSQL CHECK null acceptance.

**NOT APPLIED.** No migration ledger query, database operation, schema push/reset/seed or migration-authorization environment change. A second `pnpm db:generate` completed with “No schema changes, nothing to migrate”. Trigger additions are versioned SQL; Drizzle's schema no-drift check covers declarative schema, not custom trigger execution. Migration must be separately authorized and verified in Phase 1.7V before running this app version against the database. Until migration, creator overview/history now requires the new tables and fails closed if they are unavailable.

## R. Tests/validation

- Focused Phase 1.7: 60 tests across five files (service 26, route 10, repository 5, page 11, boundary 8).
- Full `pnpm validate`: PASS; five pure test files and 633 Vitest tests across 51 files, then TypeScript and lint. Includes all prior Workspace regressions. No ESLint warnings/errors.
- Production build: PASS (`pnpm build` in the isolated source copy, cached fonts; final source revision compiled, typechecked and generated its route output).
- Second migration generation: PASS, no drift/new migration.
- `git diff --check`: PASS.

Tests run with inherited/private environment values stripped and an unreachable synthetic database URL; test setup blocks external fetch. The build uses an isolated source copy without .env files, existing dependencies and cached local Google-font assets. pnpm's automatic dependency installation check was disabled for the isolated copy; no dependencies/lockfile were changed. Initial checks exposed and corrected an old fixed-head migration assertion, two fixture typing issues, and a test that accidentally reused the original category. Admin-route policy count now includes the new guarded endpoint; the authorization requirement itself is preserved.

No actual PostgreSQL trigger, two-connection race or authenticated live-browser/database smoke result is claimed in this phase.

## S. Files changed

- [WORKSPACE_PHASE17_IMPLEMENTATION.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_PHASE17_IMPLEMENTATION.md)
- [app/(admin)/admin/workspace/course-reviews/[id]/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(admin)/admin/workspace/course-reviews/[id]/page.tsx)
- [app/(admin)/admin/workspace/course-reviews/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(admin)/admin/workspace/course-reviews/page.tsx)
- [app/(user)/workspace/(creator)/courses/[id]/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/(creator)/courses/[id]/page.tsx)
- [app/(user)/workspace/(creator)/courses/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/(creator)/courses/page.tsx)
- [app/(user)/workspace/(creator)/dashboard/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/(creator)/dashboard/page.tsx)
- [app/(user)/workspace/(creator)/layout.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/(creator)/layout.tsx)
- [app/api/admin/workspace/course-reviews/[id]/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace/course-reviews/[id]/route.ts)
- [app/api/workspace/course-drafts/[id]/submit/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/workspace/course-drafts/[id]/submit/route.ts)
- [components/admin/AdminSidebar.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/admin/AdminSidebar.tsx)
- [components/workspace/creator/Content.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/creator/Content.tsx)
- [components/workspace/review/Actions.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/review/Actions.tsx)
- [components/workspace/review/History.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/review/History.tsx)
- [drizzle/0015_warm_sprite.sql](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/0015_warm_sprite.sql)
- [drizzle/meta/0015_snapshot.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/0015_snapshot.json)
- [drizzle/meta/_journal.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/_journal.json)
- [lib/db/schema.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/db/schema.ts)
- [lib/workspace/analytics-privacy.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/analytics-privacy.ts)
- [lib/workspace/creator/http.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/creator/http.ts)
- [lib/workspace/creator/model.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/creator/model.ts)
- [lib/workspace/creator/repository.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/creator/repository.ts)
- [lib/workspace/creator/service.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/creator/service.ts)
- [lib/workspace/review/http.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/http.ts)
- [lib/workspace/review/model.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/model.ts)
- [lib/workspace/review/repository.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/repository.ts)
- [lib/workspace/review/service.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/service.ts)
- [lib/workspace/review/snapshot.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/snapshot.ts)
- [lib/workspace/review/transaction.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/review/transaction.ts)
- [tests/admin-route-authorization-policy.test.mjs](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/admin-route-authorization-policy.test.mjs)
- [tests/routes/workspace-creator-boundaries.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-creator-boundaries.test.ts)
- [tests/routes/workspace-creator-pages.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-creator-pages.test.ts)
- [tests/routes/workspace-creator-service.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-creator-service.test.ts)
- [tests/routes/workspace-review-boundaries.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-review-boundaries.test.ts)
- [tests/routes/workspace-review-pages.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-review-pages.test.ts)
- [tests/routes/workspace-review-repository.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-review-repository.test.ts)
- [tests/routes/workspace-review-routes.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-review-routes.test.ts)
- [tests/routes/workspace-review-service.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-review-service.test.ts)

## T. Known limitations

0015 is pending. Real PostgreSQL SQL execution, trigger rejection/commit consistency, FK/index readiness, transaction rollback and multi-connection races need Phase 1.7V authorization and verification. Component tests render markup rather than exercising a migrated live browser. Queue/history offsets are bounded (500 pages). Review history remains immutable; no deletion cleanup is offered. Admin mutation throughput is intentionally serialized per actor to give deterministic cross-submission request-key semantics. No post-approval revision policy or membership renewal exists.

## U. Deferred publication/full-course work

Publication/LMS conversion, public course pages, selling price/commerce, learner enrollment, video/HLS/resources/quizzes/assessment/certificates, AI tools, revenue/payouts/coupons, renewal/refunds, public membership payments and notifications are deferred. No later phase was started.

## V. Recommendation

**Phase 1.7V real PostgreSQL verification recommended.** Implementation checks pass; this is not a production-launch or migration-execution approval. Next phase should separately authorize the exact non-production target, confirm runtime/migration identity, inspect ledger, apply only reviewed pending 0015, verify second-run no-op, execute immutable/unaudited/event-only/role/draft-lock SQL attempts, actual two-connection creator/admin races, expiry/suspension history, cross-user/admin HTTP and authenticated UI smoke, and no LMS/payment/storefront mutation. Stop at Phase 1.7 implementation completion.

Local commits (no push):

- `d6086ce` — immutable course submission/review backend, generated unapplied migration and core tests.
- `f8d58fa` — creator/admin review UI, privacy protections and component/schema regression tests.
- This report is committed separately after those implementation commits; its hash is returned in the completion response.

Final diff reviewed across all 37 files. Environment files, dependency manifests/lockfile, migrations 0000–0014, public catalog/search and financial/provider/fulfillment code have no changes in this phase.
