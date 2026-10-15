# Workspace Phase 1.6 implementation

Date: 8 October 2026. Implementation commit: `2cea76dbc3dfd4c0b64940b94befc8f381aa6c27`.

**Phase 1.6 implementation complete. Recommend Phase 1.6V real database verification.** Migration generated, not applied. No database queries, schema push, migrations, seeds, resets or ledger operations were executed. The prior Phase 1.5BV database authorization was not reused. No private-service calls, deployment or push occurred.

## A. Scope

Basic Creator Workspace only: overview, a separate professional profile, owned private course drafts, explicit draft editing, expiry retention, and read-only admin inspection. No course publication, commerce, media infrastructure or expanded financial functionality.

Primary references inspected: Phase 1.2 architecture, Phase 1.5B implementation and Phase 1.5BV verification, alongside the existing activation, membership, eligibility, auth and privacy code. Frontend-design, Next.js and data-fetching skill guidance applied within the existing application design system.

## B. Workspace shell/navigation

Private routes: `/workspace/dashboard`, `/workspace/profile`, `/workspace/courses`, `/workspace/courses/new`, `/workspace/courses/[id]`. Route group `(creator)` adds no URL segment. Small horizontal navigation: Overview, My Courses, Creator Profile, with active-page indication. My Learning and Membership status remain available. Desktop and mobile authenticated account navigation now include Workspace. Learner role remains unchanged.

Public `/workspace` and `/workspace/manual-application` remain acquisition/manual-flow surfaces. No repurposing of the public page. The existing membership screen remains the fallback for unavailable, pending and held accounts and links legitimately retained creator content to the dashboard.

## C. Dashboard

Displays actual owned draft count and up to five recent drafts, plan name, creator identity status and immutable membership start/end dates. Early Access Active prominently states: “Your paid membership term begins on 9 November 2026.” Active and expired variants use server-derived membership state. No fabricated sales, revenue, learners or completion metrics. Create Course appears only with edit capability; profile/course navigation remains available to retained expired creators.

## D. Creator profile details

`workspace_creator_profile_details` is separate from the immutable identity table. Required displayName 2–100, optional headline up to 160, optional bio up to 1,000, required controlled aviation category, optional normalized public HTTPS professional URL up to 2,048 characters. URL validation reuses the existing restrictive normalizer; no scraping or URL fetching. No image upload.

Account name can be suggested in an unsaved form. Nothing persists until explicit Save Profile. Private eligibility answers are never copied into editable details. Initial expectedVersion 0 creates version 1; later saves match the current version and increment it. Concurrent/stale saves return conflict. Identity/status and eligibility history remain independent.

## E. Course-draft model

`workspace_course_drafts` holds private content only. Columns: id, userId, creatorProfileId, immutable requestKey and creationHash, title, category, description, targetLearner, learningOutcomes, outline, nullable tentativePricePaise, INR currency, draft status, version, createdAt and updatedAt. No public slug or storefront linkage.

Archive/restore are omitted as explicitly permitted in the brief. Status is only `draft`; no hard-delete endpoint or publication states. Full revision history is deferred.

## F. Draft ownership

The authenticated persisted account supplies owner identity; the locked persisted creator profile supplies creatorProfileId. Command/content validation rejects extra fields, including forged ownership/status/currency. Reads and writes filter on owner at the repository query boundary. Cross-owner and malformed draft IDs produce a non-enumerating 404. Composite foreign keys bind `(creatorProfileId, userId)` to the existing creator identity owner pair; user foreign keys restrict deletion.

## G. Draft fields/validation

- Title: required 3–200 characters.
- Category: one of the existing 15 controlled aviation categories; shared vocabulary is suitable for course subject areas and is labelled as such.
- Description: required 50–5,000 characters.
- Target learner: required 1–1,000 characters.
- Learning outcomes: 1–10 plain-text strings, each 1–300 characters.
- Outline: 0–20 objects, each with title 1–200, optional description 0–1,000, and sequential zero-based ordering. Unexpected keys, arbitrary JSON and invalid ordering are rejected.

Text is trimmed, NFC-normalized and rejects HTML delimiters and unsafe control characters. React renders plain text. Mutations accept bounded streamed JSON of at most 196,608 bytes (192 KiB), sufficient for the bounded editor content; malformed/non-JSON and oversized bodies fail before persistence.

Database checks enforce controlled categories, required text bounds, array type/count, positive version, timestamp ordering, draft/INR state and price range. Element-level JSON shape and normalization are enforced by application validation rather than a generic CMS schema.

## H. Tentative pricing

Nullable positive integer paise, 1–100,000,000 inclusive: ₹0.01 through ₹10,00,000. Null means undecided. Zero/free, negative, fractional paise, strings and out-of-range values are rejected. UI parses decimal INR into integral paise by splitting rupees/fraction, rather than multiplying a floating-point decimal. Currency is always INR.

Labelled Tentative Price / Planned Pricing. Not an approved selling price, checkout price, order or published course price. No free-course or advanced pricing policy added.

## I. Draft editor

Numbered Basics, Audience & outcomes, Course Outline and Planned Pricing sections. Outcomes use one line per outcome. Outline supports add/remove and simple up/down controls. Explicit Save Draft only; no autosave, uploads, rich HTML or complex drag/drop builder.

Saving, saved, failure and conflict states are displayed. Network/503 failures preserve entered content. A create request retains the same client-generated UUID for retry; the server serializes per owner and compares the normalized creation hash before replaying an existing draft. A reused key with changed content conflicts. Clients are advised to retry the same save/check My Courses when a save cannot be confirmed.

Updates match owner + draft ID + expected version. A stale save cannot overwrite a newer state. Conflict preserves unsaved content; explicitly choosing Reload saved version replaces it. Success navigates new drafts to their owned editor.

## J. Membership-based read/edit capabilities

`creatorCapabilities` delegates grants to the existing persisted `resolveMembershipAccess`: edit requires both hasCreatorAccess and hasPaidEntitlement, an enabled identity, verified fulfilled membership, and no held latest order. No grant from user role, JWT creator claims, client state, eligibility or capture alone.

Historical read is separate: a legitimately fulfilled enabled creator may read after expiry. Pending/held/unpaid identities cannot use that path. Existing test-provider/noncommercial development/test environment restrictions are preserved; test evidence cannot grant creator viewing/editing in production, staging or an unclassified environment.

Repository transactions lock the persisted user, financial orders in deterministic order, then creator profile; access is re-read using the same transaction. The service samples time after lock acquisition/access reads. Mutations recheck edit capability there rather than trusting a page rendered earlier. Admin role is not creator edit authority.

Safely fulfilled early/active and legitimate expired creators default to `/workspace/dashboard`. Eligibility-result routing recognizes that destination and preserves pending/held membership fallback.

## K. Expired/suspended behavior

At the exact membership end, editing stops and retained own content remains readable. Dashboard hides Create Course; new-draft route redirects to My Courses; draft/profile routes render read-only content. Direct mutations fail with 403. UI explains expiry, retained data, and renewing to edit, while explicitly stating renewal checkout is unavailable.

Suspended and terminated identities cannot enter creator tools; membership fallback shows a bounded unavailable state. Draft/profile history is preserved and available for authorized admin inspection. No owner reassignment, identity re-enable or content deletion.

## L. Admin visibility

`/admin/workspace/course-drafts` provides bounded, paginated draft links. `/admin/workspace/course-drafts/[id]` displays creator identity/status, owner/profile references, dates and private content for read-only inspection. Admin navigation includes Private Course Drafts.

The existing persisted-admin helper guards pages. Inspection additionally locks/rechecks the actor's persisted role inside the transaction before querying content. Demotion with a stale JWT cannot grant access. No admin mutation route, approval/rejection/publication button or workflow.

## M. Security

Authenticated persisted accounts, central read/edit capability, same-origin mutation checks, bounded streamed input, strict field allowlists, owner-qualified SQL, optimistic versions and database composite ownership constraints. All API responses use no-store; bounded failures omit SQL/credentials. Missing schema/database failure returns unavailable, without granting access or dropping entered answers.

Generated content guards prohibit deletes, owner/id/creation-time changes, request-key/hash changes, backwards update time and invalid initial/version transitions. Existing immutable creator/membership/payment protections were not weakened. Actual new triggers and real transaction isolation are not verified until authorized Phase 1.6V execution.

## N. Privacy/analytics

No new creator-content behavioral events. Creator shell and admin surfaces use `ph-no-capture`. The privacy sanitizer recognizes static creator paths and converts dynamic owner/admin draft paths into fixed `[id]` placeholders. Query strings/fragments and private content fields are removed; autocapture is suppressed. Sanitized page events preserve existing device-only identity policy without user/draft IDs, price, bio, professional URL or draft contents. Unsupported draft content events are dropped.

No live PostHog or other telemetry calls were made. Analytics evidence consists of sanitizer regression tests; this is not a live-provider smoke test.

## O. Legacy isolation

No writes to existing LMS courses, authors, learner purchases, enrollments, certificates or content-builder/storefront tables. Draft/profile writes are confined to the two new private Workspace content tables. Existing account role, eligibility decisions, immutable identity/membership history, manual applications and approval-email workflow remain intact. Full regression suite passes.

## P. Public/payment isolation

No anonymous creator content, public creator page/course slug, SEO draft page, sitemap integration, catalog record or paid course entitlement. Existing public Workspace membership payment UI remains disabled (“Payment activation coming next”). No Razorpay changes/calls, refunds, renewals, course checkout, payouts or revenue share. Existing provider configuration and financial runtime were not modified or contacted.

## Q. Migration

Generated: `drizzle/0014_outgoing_freak.sql`, new Drizzle snapshot and one appended journal entry. SHA-256: `286e94347d50db660ce6bcae06c1e1b6eb0baed316b2f3d9d8aedd9af04d6598`. Adds exactly two tables, four foreign keys, four indexes, category/content checks and two content guard triggers sharing one new function. Composite target ownership index already exists in reviewed 0013.

All existing 0000–0013 migration hashes are unchanged, verified by fixed baseline hash regressions. Snapshot checks verify every existing table/enum unchanged and 0014 linked to 0013. Second `pnpm db:generate`: **No schema changes, nothing to migrate**.

**NOT APPLIED.** No `pnpm db:migrate`, schema push, database inspection, new synthetic DB fixtures or migration authorization in `.env`. A newly authorized Phase 1.6V task must establish its exact safe target and apply the reviewed migration through the guarded workflow.

## R. Tests/validation

Completed successfully against scrubbed credentials/dummy unreachable database configuration:

| Check | Result |
| --- | --- |
| Full `pnpm validate` | PASS |
| Node test runner | 5/5 test-file subtests passed |
| Vitest | 573/573 tests, 46/46 files passed |
| Added Phase 1.6 coverage | 94 tests across eight new test files |
| TypeScript `tsc --noEmit` | PASS |
| Next lint | PASS, no ESLint warnings/errors |
| Isolated production build, existing cached-font approach | PASS; compiled, type/lint checks, 59/59 static pages generated; private routes dynamic |
| Second `pnpm db:generate` | PASS, no schema drift |
| `git diff --check` and staged diff check | PASS |
| Static synthetic browser visual review | Dashboard, draft editor and expired retained-draft state inspected; no API/DB calls |

Ownership/security coverage includes create replay and changed-payload conflict, cross-owner list/read/update, forged command ownership/status, anonymous direct APIs/pages, SQL owner/version predicates, persisted admin demotion, capability states, expiry sampled after transaction entry, retained read-only data, profile deliberate/versioned saves, payload/field/URL/money bounds, private telemetry and legacy/public isolation. Concurrent saves from v5 yield one v6 winner and one controlled conflict in the serialized in-memory service harness. Profile initial-save race similarly yields one saved row.

These are unit/mocked route/repository/rendering tests, not real PostgreSQL two-connection tests or authenticated live application saves. The browser preview is static synthetic SSR using built CSS/local fonts, not a hydrated save smoke. Its temporary tab/server were closed/stopped. No runtime database results are claimed.

Earlier validation attempts surfaced old-phase destination/latest-journal expectations, two test harness assumptions (worker subprocess restriction/nonexistent sitemap file), and a test timestamp type. Those test issues were corrected before the successful full validation/build. No dependencies or lockfile changes.

## S. Files changed

44 implementation/test/migration files in `2cea76d`, plus this report (45 total). Every file is listed below; paths are relative to the repository root.

- `app/(admin)/admin/workspace/course-drafts/[id]/page.tsx`
- `app/(admin)/admin/workspace/course-drafts/page.tsx`
- `app/(user)/workspace/(creator)/courses/[id]/page.tsx`
- `app/(user)/workspace/(creator)/courses/new/page.tsx`
- `app/(user)/workspace/(creator)/courses/page.tsx`
- `app/(user)/workspace/(creator)/dashboard/page.tsx`
- `app/(user)/workspace/(creator)/error.tsx`
- `app/(user)/workspace/(creator)/layout.tsx`
- `app/(user)/workspace/(creator)/profile/page.tsx`
- `app/(user)/workspace/eligibility-result/page.tsx`
- `app/(user)/workspace/member/page.tsx`
- `app/api/workspace/course-drafts/[id]/route.ts`
- `app/api/workspace/course-drafts/route.ts`
- `app/api/workspace/profile-details/route.ts`
- `components/Header.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/workspace/creator/Content.tsx`
- `components/workspace/creator/DraftEditor.tsx`
- `components/workspace/creator/Fields.tsx`
- `components/workspace/creator/Navigation.tsx`
- `components/workspace/creator/ProfileEditor.tsx`
- `drizzle/0014_outgoing_freak.sql`
- `drizzle/meta/0014_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/activation/repository.ts`
- `lib/workspace/analytics-privacy.ts`
- `lib/workspace/creator/http.ts`
- `lib/workspace/creator/model.ts`
- `lib/workspace/creator/pages.ts`
- `lib/workspace/creator/repository.ts`
- `lib/workspace/creator/service.ts`
- `lib/workspace/eligibility/service.ts`
- `tests/routes/workspace-activation-boundaries.test.ts`
- `tests/routes/workspace-creator-access-pages.test.ts`
- `tests/routes/workspace-creator-boundaries.test.ts`
- `tests/routes/workspace-creator-fixtures.ts`
- `tests/routes/workspace-creator-model.test.ts`
- `tests/routes/workspace-creator-pages.test.ts`
- `tests/routes/workspace-creator-privacy.test.ts`
- `tests/routes/workspace-creator-repository.test.ts`
- `tests/routes/workspace-creator-routes.test.ts`
- `tests/routes/workspace-creator-service.test.ts`
- `tests/routes/workspace-eligibility-service.test.ts`
- `WORKSPACE_PHASE16_IMPLEMENTATION.md`

## T. Known limitations

New migration is not applied, so new creator-content screens cannot load/save their tables in an unmigrated environment. Safe unavailable states are provided. No real PostgreSQL schema/trigger/ownership/concurrency smoke, authenticated live saving, membership-expiry DB retention test or live analytics smoke was authorized or run in this phase. Those are required Phase 1.6V checks, not production-readiness claims.

Current grants continue to honor the verified development/test-only, test noncommercial membership policy; production test memberships remain denied. No archive, full revisions, image upload, rich text, autosave, renewal checkout, public profiles, publication or monetization. Lists are paginated at 20 with a 500-page bound. Real browser hydrated save/error/conflict and responsive/device checks should be included in Phase 1.6V.

## U. Deferred course-approval/full-builder work

Separate AirBharath course submission/review/approval/rejection/publication, selling/storefront integration, course checkout/coupons, video/HLS/resources, quizzes/assessments, AI course tools, learner enrollment, certificates, payouts/revenue share, refunds and renewals. Membership/creator eligibility never implies course or regulatory/airline approval. No such functionality was implemented.

## V. Recommendation

**Proceed to Phase 1.6V real database verification**, under new explicit authorization for an exact local development/test database target. Verify runtime/migration identity and ledger; review/apply only pending 0014 through guarded migrations; rerun no-op; inspect real new tables/foreign keys/guards; test retained history, forged ownership/deletion/version transitions; execute two-connection idempotent create/draft/profile save races; run authenticated own/cross-user/admin/demotion/expiry/error smokes and public/storefront isolation; rerun validation/build. Preserve synthetic data without weakening retention guards.

This recommendation authorizes no database execution, production deployment, private-service contact or later product phase by itself. Stop after this Phase 1.6 implementation/report.
