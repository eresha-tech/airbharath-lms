# AirBharath Phase 2.1 — implementation and verification

Phase scope: shared learner feedback, organic discovery, the existing catalog and Creator course checkout. Founder local acceptance remains required. No production migration, payment, deployment, push, merge, revenue sharing or payout was performed.

## Shared learner feedback

Admin LMS courses and published Creator courses use the same `course_reviews` domain and `/courses/<slug-or-id>` section. Existing Creator content-approval reviews remain separate.

A student must have a persisted phone identity, active direct or bundle entitlement for at least 24 hours, and saved completion of at least 20% of non-preview, non-retired lessons, with a minimum of two where available. Completion must follow enrollment; unreleased recorded lessons and future live sessions cannot satisfy eligibility. Admins and course owners cannot submit reviews. The label describes enrollment and saved completion evidence, not an independently verified opinion or measured video watch time.

The database permits one retained review per course/student, including after deletion; a learner resubmits the same row rather than creating another rating. New submissions and edits enter `pending`; only an independent persisted Admin can publish or hide them. An edit immediately removes the previous published rating until approved. Hidden reviews cannot be resubmitted by their author; the author can still remove them from public view. Version checks reject stale edits and moderation. Database guards enforce ownership, permitted transitions, independent moderation, immutable audit history and one event per version. Private audit snapshots retain the text/rating associated with every decision.

The default public identity is **Private learner**. First-name display is explicit opt-in. Public responses exclude user IDs, email and phone. Content is rendered as plain React text. Reviews require 20–3000 characters, disallow links/control characters and permit five writes per day with a 60-second cooldown. Authenticated reports require a reason, are unique per reporter/review and are limited to ten per day. Reports do not automatically suppress criticism. Admin sees reports and durable moderation reasons; Creators see only published reviews of courses they own and cannot change ratings or moderation.

Expired, refunded, chargeback, suspended and revoked entitlement states block new reviews/edits. A recorded refund/chargeback order also blocks new feedback until a later paid purchase exists. Previously earned reviews remain eligible for independent moderation and public display: access loss must not be used to erase legitimate criticism. Authors can delete their own feedback after access loss. Course suspension or withdrawal removes public discovery/review access; the existing LMS suspension gate still controls actual delivery. Private audit retention is distinct from public removal.

## Organic discovery

`lib/discovery/model.ts` contains version **organic-2026-11-v1**. Configuration is versioned in source; there is no sponsored score or hidden paid boost.

| Signal | Weight | Definition |
| --- | ---: | --- |
| Search relevance | .24 | Title match and indexed simple-language full-text match |
| Learner interests | .04 | Category of a currently active enrollment, when signed in |
| Rating | .23 | Bayesian prior: eight reviews at 4/5 |
| Popularity | .12 | Log-scaled distinct verified enrolled learners, capped at 1,000 |
| Engagement | .10 | Learners with saved completion, prior 2/5 |
| Completion | .08 | Full curriculum completion, prior 1/5 |
| Completeness | .09 | Description, artwork and curriculum/bundle evidence |
| Freshness | .04 | Publication-age decay over 90 days |
| New-course exposure | .06 | 45-day decay, decreasing with observed learner count |

New courses receive a nonzero prior, engagement/completion priors and an exposure boost. Exposure is a scoring boost, not a guaranteed first-page allocation. Anonymous users and users without enrollment signals use the same organic fallback without inferred interests. Existing Admin publication dates fall back to course creation; Creator dates use their first retained release.

Persisted `course_discovery_stats` summaries are maintained transactionally on affected course, curriculum, progress, enrollment, bundle, review, identity and publication changes. Catalog requests join summaries rather than scanning all progress/reviews or fetching every curriculum. Refresh work is scoped to the affected course on writes; very large courses may warrant an asynchronous refresh worker in a later performance phase. Built-in PostgreSQL full-text search uses a GIN index; category/difficulty, enrollment and completion lookups have supporting indexes. Only published, authorized, live courses enter discovery. All sorts have a stable course-ID tie-breaker and 12-item server pagination. Live catalog changes can move rows between pages, as with ordinary offset pagination.

The existing `/courses` page and card are extended with search, actual category/difficulty fields, relevance/rating/popularity/newest sorts, honest rating counts, Creator attribution, and empty/loading/retry states. Existing Admin create/edit screens manage category and difficulty. Creator category comes from the approved proposal; unspecified difficulty remains `all_levels`. The landing-page cards use the same feedback summaries and visibility rules. Creator attribution uses the published public author snapshot, rather than exposing the account name. Learner dashboard and lesson routes remain the existing LMS.

## Creator commerce

The existing Razorpay order/verify routes now use `lib/commerce/service.ts`; membership payments and their webhook are untouched. Checkout rereads the live publication and independently approved price under publication/course locks after provider order creation. A price/availability change rejects the stale checkout before returning an order to the browser. A provider order created just before such a rejection can remain unused at the provider; it grants no entitlement and is not returned for payment.

New orders freeze integer-paise list/discount/collected amounts, inclusive GST split at the existing 18% convention, coupon evidence, purchased access duration, course title, Creator, project and approved price version. Database guards validate Creator attribution/approved-price scope and retain this evidence against later edits. Historical orders remain nullable and are not backfilled with invented evidence. Invoice totals use frozen tax evidence for new orders and retain the legacy calculation for old orders. Courses with new purchase/review evidence cannot be destructively deleted through the old Admin editor; unpublishing retains history.

A valid checkout signature is necessary. The service also fetches provider evidence and requires exact payment/order identity, INR, matching amount, captured status and no refunded amount. Signature verification and capture are separate checks, consistent with the [Razorpay Node integration flow](https://razorpay.com/docs/payments/server-integration/nodejs/integration-steps). Uncertain, failed or merely authorized responses grant no access and leave the order safe to retry. Under actor/order locks, the paid transition and entitlement write commit together. Duplicate captures/retries cannot repeat enrollment effects or assign one payment to another order. Existing later/lifetime access is not shortened, and progress is untouched. A quote issued before withdrawal is honored after capture; suspension still blocks delivery. Restricted enrollment requires manual review instead of being silently reactivated.

Invoice/analytics effects run after entitlement commit and cannot turn a successful payment into an apparent enrollment failure. They are not a new financial settlement/outbox system. The learner can retry confirmation without another charge. Pending orders are reused across reloads; the authenticated recovery endpoint checks server-fetched captured evidence for that owned order and uses the same atomic settlement. No client-supplied payment state is trusted. No new LMS webhook or background reconciliation worker is introduced. Membership reconciliation remains separate.

## Persistence and local safety

Only additive migration `0036_course_reviews_discovery_commerce.sql`, its schema snapshot and the appended journal entry follow 0035. Historical migrations/snapshots are preserved. Read-only source pins and guarded local setup/migration tools recognize the 37-entry chain. Existing founder data was not migrated by this task.

See `WORKSPACE_PHASE21_LOCAL_ACCEPTANCE.md` for isolated startup, acceptance and verification commands. Verification status and the complete changed-file manifest are recorded below after final checks complete.

## Remaining acceptance boundaries

- Founder acceptance is pending; the complete Creator Workspace is still a single future coordinated release.
- Browser payments use a synthetic provider in a credential-free temporary source copy. No Razorpay account, live financial settlement, membership provider, AWS or private production service is contacted for Phase 2.1 verification.
- Existing media processing/playback is not broadly re-audited. Synthetic Creator artwork has no configured storage provider in isolated tests; that deliberate fixture limitation is not a production media regression.
- Native browser H.264/AAC compressed output remains **NOT VERIFIED** on a capable device. Earlier original-MP4 fallback evidence does not establish native compression support.
- Phone uniqueness, enrollment age, completion evidence, cooldowns and independent moderation reduce manipulation; they do not establish one physical person per account or prove attentive viewing.

## Final verification results

| Check actually completed | Result | Evidence |
| --- | --- | --- |
| `pnpm validate` | **PASSED**: 1,711 Vitest tests across 138 files; 55 Node tests; strict TypeScript and lint | `output/audits/workspace-phase21/validate.log` |
| Production `pnpm build` | **PASSED**, final process exit 0; optimized compilation, type/lint checks and page generation | `output/audits/workspace-phase21/build.log` |
| Drizzle source/snapshot consistency | **PASSED**, no schema changes to generate | `output/audits/workspace-phase21/schema.log` |
| Isolated PostgreSQL 16 | **PASSED**, 18 checks: additive/repeat migrations, historical users/orders/enrollments/progress, real publication, review eligibility/uniqueness/privacy/moderation, ownership, discovery, public attribution, synthetic capture/recovery and transactional rollback | `output/audits/workspace-phase21/postgres.json` |
| Actual Chrome workflows | **PASSED**, eight workflows covering reviews, Admin decisions, reporting, Creator permissions, desktop/mobile discovery/pagination, synthetic purchase/progress, lost-confirmation retry/reload recovery, edits and deletion | `output/audits/workspace-phase21/browser.json` |
| Final attribution/responsive Chrome smoke | **PASSED**, public published author identity and desktop/mobile catalog | `output/audits/workspace-phase21/browser-final-smoke.json` |
| Preservation | **PASSED**, all six pre-existing modified files and 72 historical SQL/snapshot artifacts match the initial hashes | `output/audits/workspace-phase21/preservation.json` |
| Final source agreement | **PASSED**, all 38 changed shipping application files match the credential-free validation/build copies | Local byte comparison |
| Diff whitespace / standalone helper syntax | **PASSED**, `git diff --check` and `node --check` for the new verification/startup helpers | Local checks |
| Native browser H.264/AAC compression | **NOT VERIFIED**, retained earlier capable-device limitation | No native compression claim |
| Founder acceptance | **PENDING** | Follow `WORKSPACE_PHASE21_LOCAL_ACCEPTANCE.md` |

Validation and build use credential-free copies. The production build used `NODE_ENV=production`, `DATABASE_ENV=production`, an unreachable synthetic loopback PostgreSQL target on port 1 with verified TLS configuration, and a synthetic build-only JWT value. Private provider credentials were absent. A temporary-storage quota interrupted one build-cache write; removing only this task's generated `.next` output and retrying produced the final successful build. Initial browser harness corrections added an explicit render wait after pagination and respected the real review cooldown; the application guards were not weakened.

The isolated server remains on `http://127.0.0.1:3021` while its local test process is running. Browser screenshots were visually inspected. The synthetic payment adapter and disabled invoice-delivery adapter exist only in `/tmp/airbharath-phase21/source`; they are absent from shipping source and the production-build copy. No new dependency or lockfile change was made.

## Changed files in this phase

The six pre-existing modified files and pre-existing Phase 2.0/UX audit folders were preserved. The complete Phase 2.1 source manifest is:

- `WORKSPACE_PHASE21_IMPLEMENTATION.md`
- `WORKSPACE_PHASE21_LOCAL_ACCEPTANCE.md`
- `app/(admin)/admin/courses/[id]/page.tsx`
- `app/(admin)/admin/courses/new/page.tsx`
- `app/(admin)/admin/learner-reviews/[reviewId]/page.tsx`
- `app/(admin)/admin/learner-reviews/page.tsx`
- `app/(user)/courses/[slugOrId]/page.tsx`
- `app/(user)/courses/page.tsx`
- `app/(workspace)/workspace/(creator)/reviews/page.tsx`
- `app/api/admin/courses/route.ts`
- `app/api/admin/learner-reviews/[reviewId]/route.ts`
- `app/api/courses/[courseId]/reviews/route.ts`
- `app/api/payments/razorpay/order/route.ts`
- `app/api/payments/razorpay/recover/route.ts`
- `app/api/payments/razorpay/verify/route.ts`
- `app/api/reviews/[reviewId]/report/route.ts`
- `components/CourseCard.tsx`
- `components/EnrollButton.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/CourseEditor.tsx`
- `components/courses/CourseCatalogClient.tsx`
- `components/landing/CoursesSection.tsx`
- `components/reviews/ModerateReview.tsx`
- `components/reviews/ReviewPanel.tsx`
- `components/reviews/ReviewSection.tsx`
- `components/workspace/creator/Navigation.tsx`
- `drizzle/0036_course_reviews_discovery_commerce.sql`
- `drizzle/meta/0036_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/commerce/effects.ts`
- `lib/commerce/http.ts`
- `lib/commerce/model.ts`
- `lib/commerce/service.ts`
- `lib/db/schema.ts`
- `lib/discovery/model.ts`
- `lib/discovery/repository.ts`
- `lib/invoice-generator.ts`
- `lib/public/catalog-model.ts`
- `lib/public/catalog.ts`
- `lib/reviews/http.ts`
- `lib/reviews/model.ts`
- `lib/reviews/repository.ts`
- `lib/workspace/publishing/repository.ts`
- `scripts/database-readonly-preflight-core.mjs`
- `scripts/phase21-isolated-postgres.cjs`
- `scripts/phase21-local-test.cjs`
- `scripts/phase21-open-browser.cjs`
- `scripts/phase21-safe-source.cjs`
- `scripts/workspace-media-local-migrate.cjs`
- `scripts/workspace-media-local-setup.cjs`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/postgres/phase21-browser.cjs`
- `tests/postgres/phase21-discovery-smoke.cjs`
- `tests/postgres/phase21-verification.cjs`
- `tests/routes/database-readonly-preflight.test.ts`
- `tests/routes/phase21-http.test.ts`
- `tests/routes/phase21-model.test.ts`
- `tests/routes/phase21-recovery.test.ts`
- `tests/routes/razorpay-verify.test.ts`

Generated verification artifacts are listed in `output/audits/workspace-phase21/files.json`.
