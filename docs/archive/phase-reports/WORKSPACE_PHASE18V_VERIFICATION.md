# Workspace Phase 1.8V — Real PostgreSQL Course Builder Verification

Executed 10 October 2026. Verification only, with one minimum Phase 1.8 application correction. **PHASE 1.9 GO** means the private builder is ready for the next explicitly selected development phase. It does not authorize publication, production migration, commercial charging or deployment.

## A. Environment

Authorized target: local `localhost:5433/airbharath_lms`, `DATABASE_ENV=development`. Runtime Unix socket `/tmp`, port 5433, and migration TCP connection matched before migration: database OID `16384`, PostgreSQL system identifier `7680462735222304705`. Both reported database `airbharath_lms` and port `5433`.

Node 22.23.1, repository pnpm 11.15.1, Next.js 15.5.19. Actual PostgreSQL connections were used, including two separately loaded repositories on independent single-connection clients. A third connection held deliberate locks and observed contention. No production/staging/Neon access, direct schema push, resets, trigger disabling or ledger changes.

The existing collation warning remains: database version 2.39, operating-system version 2.43. No collation refresh, reindex or cluster metadata alteration was performed; it did not prevent these checks.

## B. Ledger before

17 entries, `0000`–`0016`. Every complete SHA-256 and journal timestamp matched the actual migration file and `_journal.json`. Hash prefixes below are display abbreviations; comparisons used all 64 characters. Only `0017_marvelous_captain_midlands` was pending.

| Migration | Journal timestamp | SHA-256 prefix |
| --- | --- | --- |
| 0000_regular_silk_fever | 1789124954048 | `244506bff67e` |
| 0001_careful_warhawk | 1790099480260 | `24c2bbabe9a8` |
| 0002_silky_living_tribunal | 1790162267688 | `24033fb008c9` |
| 0003_lowly_justice | 1790183727889 | `5e2ada1b77d9` |
| 0004_dear_shocker | 1790192348972 | `0bf51a3afa92` |
| 0005_sharp_grey_gargoyle | 1790197129493 | `588509617acb` |
| 0006_great_kate_bishop | 1790236152530 | `0d6b625cca0a` |
| 0007_lucky_wild_pack | 1790924690885 | `f0312d81ee36` |
| 0008_eager_energizer | 1790935874838 | `ae6c3b89c043` |
| 0009_normal_baron_zemo | 1791274423029 | `6dc0436b50fa` |
| 0010_illegal_toxin | 1791281066952 | `d806715b9b51` |
| 0011_workspace_coupon_audit_freshness | 1791284353170 | `92d9e796e3b2` |
| 0012_useful_warhawk | 1791286852175 | `4e59a99a1134` |
| 0013_peaceful_spiral | 1791368221505 | `42b4fcf2ae41` |
| 0014_outgoing_freak | 1791436807652 | `286e94347d50` |
| 0015_warm_sprite | 1791527685957 | `06fa5c3d985f` |
| 0016_tired_prowler | 1791632016797 | `fbdad83667fe` |

## C. Migration 0017

Reviewed actual SQL before execution: composite ownership references and prerequisite unique indexes, approved-source guard, immutable project identity, module/lesson versions and parent identities, deferred uniqueness and zero-based contiguous positions.

Applied only `0017_marvelous_captain_midlands.sql` with guarded `pnpm db:migrate`. `ALLOW_DATABASE_MIGRATION=true` was supplied only to that command's environment. It was never added to `.env` or `.env.local`.

Applied SHA-256: `ef7c2ef68287770bc7942fdec9b3b286907aa0e27c6d7d842a596cc0aee740f3`; timestamp `1791649837299`. The applied SQL file was not edited. No schema defect or corrective 0018 was required.

## D. Ledger after/no-op

18 entries, `0000`–`0017`; no pending entries. Existing 17 rows were identical. A second guarded migration command completed successfully without another ledger row or migration application. Final file hashes and timestamps matched all 18 entries.

## E. Real schema

Actual catalog inspection found 29 columns, 16 constraints, 5 application triggers across `workspace_course_projects`, `workspace_course_modules`, `workspace_course_lessons`. Captured `pg_get_constraintdef`, index definitions, trigger definitions and all three `workspace_build_*` function definitions in local evidence.

Both position uniqueness constraints and the two position constraint triggers are DEFERRABLE INITIALLY DEFERRED. Ownership FKs restrict module→project→user and lesson→module→project→user. Project source links include approved submission, user, creator profile and draft.

## F. Project approved-source invariant

Normal approved sources were created through eligibility, synthetic-provider financial services, normal fulfillment, draft submission and real admin review services. No direct eligibility approval, paidAt injection or creator/membership insert was used.

Submitted, under-review and changes-requested sources were rejected by the service. A rollback-only transaction tentatively moved a real under-review source to approved without an approval audit event: project insertion failed `P0001`; the source remained under review after rollback. Cross-owner project insertion failed `P0001`, duplicate source/project mapping `23505`.

## G. Project bootstrap/idempotency

Concurrent starts converged on one project: both requests succeeded, exactly one reported creation. Original outline order produced one module and no invented lesson. A one-character approved outline became `Module 1: X` only in mutable builder content; its immutable source stayed `X`. Empty approved outline created zero modules. Browser Start, refresh and Continue used the same project without duplicate bootstrap.

## H. Bootstrap rollback

Injected an actual PostgreSQL `SELECT 1/0` after module insertion within the repository transaction. SQLSTATE `22012`; no project or partial bootstrap modules committed. A normal retry succeeded.

## I. Module CRUD

Created, edited, moved and deleted modules through real services and hydrated browser controls. Empty-module deletion reindexed survivors; nonempty deletion was refused by the service and by the real FK (`23503`). Boundary moves were no-ops. Normalized text, title/description bounds and the 50-module cap passed. Direct immutable-field/version/backward-time changes failed `P0001`.

## J. Module ordering/deferred constraints

A transaction temporarily colliding positions then completing a swap committed successfully. Duplicate final positions reached COMMIT and failed `23505`. Gaps, nonzero minimum and incorrect maximum reached COMMIT and failed `P0001`. None left a broken structure.

## K. Module concurrency

Each race below observed two PostgreSQL Lock waiters while a separate connection held the persisted owner row, before releasing both competing operations. This was forced overlap on actual independent connections, not a sequential Promise mock.

| Race | Observed waiters | Outcomes |
| --- | --- | --- |
| two_connection_same_source_bootstrap | 2 | saved, saved |
| concurrent_module_create | 2 | saved, saved |
| concurrent_same_module_update | 2 | saved, conflict |
| concurrent_module_reorder | 2 | saved, conflict |
| concurrent_lesson_create | 2 | saved, saved |
| concurrent_same_lesson_update | 2 | saved, conflict |
| concurrent_independent_lesson_updates | 2 | saved, saved |
| concurrent_lesson_reorder | 2 | saved, conflict |

Module creates both committed at different contiguous positions. Competing edits/reorders yielded one save and one stale-version conflict.

## L. Lesson CRUD

Created, updated, moved, deleted and reloaded private lesson content. NFC and CRLF/trim normalization persisted `Café\nBody`. Empty plain-text content is allowed; 20,001 characters were refused. Real API content readback and hydrated reload matched the saved text. Module and project ownership could not be reassigned; parent/id/createdAt/version/backward-time changes failed `P0001`.

Efficient legitimate repository writes populated 100 lessons/module and 500/project. Service attempts beyond either limit were refused without relaxing constraints.

## M. Lesson ordering/deferred constraints

Valid intermediate-position collision followed by a completed swap committed. Final duplicate positions failed `23505` at COMMIT; gaps, wrong minimum and wrong maximum failed `P0001` at COMMIT. Deletion reindexed remaining lessons from zero.

## N. Lesson concurrency

Real concurrent creates both succeeded at distinct positions. Two updates or reorders of the same version produced one save and one conflict. Independent lesson edits both succeeded, confirming that lesson edits do not share a project-global optimistic version. See K for observed two-connection contention.

## O. Optimistic stale-save protection

Both service races and two hydrated browser tabs rejected stale saves. The winning module description and lesson text were retained. The stale tab showed recovery guidance and retained its typed textarea content, editable and copyable; it did not silently overwrite the winner.

## P. Ownership/cross-user protection

Actual authenticated HTTP requests rejected cross-owner tree/lesson access and wrong lesson parent (`404`), anonymous access (`401`), and a creator at the admin API (`403`). Six real cross-owner module/lesson update, move and delete requests returned `404`. Cross-origin PATCH returned `403`.

Composite-FK insertion probes, with valid initial version/times, rejected a foreign module owner and foreign lesson project with `23503`. Stored owner IDs were not reassigned.

## Q. Exact expiry/read-only behavior

Creator C retained a real saved project and lesson before clock advancement. At `now = membership.endsAt`, tree and lesson content remained readable, `canEdit=false`, Start denied. All eight create/update/move/delete module/lesson commands returned forbidden. Full readback stayed identical after refusals.

## R. Suspension/termination

Creators D/E were suspended/terminated only after real builder content existed. Reads and starts failed closed; all eight mutation commands were refused. Admin inspection retained each project's modules, lesson content and original owner, and correctly showed the creator status. No protected history was removed.

## S. Authenticated creator desktop flow

Real Next.js development app on isolated local port 4048, existing Chrome and cached browser automation runtime, actual PostgreSQL, synthetic sessions signed by the existing `createSessionToken` function. A newly generated temporary session secret was used only by this isolated app; no OTP/provider calls or authentication route/backdoor was added.

Hydrated Start/Continue, structure selection, module/lesson creation/editing/reordering/deletion, explicit Save, private content GET, refresh persistence and approved reference panel passed. Browser runtime errors: zero. No dependency installed or lockfile regenerated.

## T. Authenticated creator mobile flow

At 390×844, selected and edited an actual lesson, scrolled to Save, saved, reloaded and verified persisted content. Document width 390, viewport width 390: no horizontal overflow. At 800×900, structure selection/editor/Save were usable; document width 800 matched viewport width 800. The actual mobile screenshot was visually inspected and kept outside Git at `/tmp/ws18v-mobile.png`.

## U. Conflict/navigation UX

Both module and lesson two-tab conflicts retained unsaved text and rendered the safe recovery message. Three actual dialogs were observed/dismissed: switch item, Course overview link, native beforeunload during page navigation. Dismissal kept the current page and unsaved content. No custom modal was required.

## V. Admin inspection/authorization

Hydrated admin list/detail showed private build context and current content. Lesson fields were read-only; there was no Save button. Persisted admin demotion, retaining an admin-role JWT, denied list/detail pages by the existing redirect to the student dashboard and denied the API with `403`. The synthetic admin role was restored afterward. Persisted repository checks independently denied demoted admins and creators.

## W. Approved-source immutability

Original approved submission hashes and review-event fingerprints remained unchanged. Builder mutations wrote only mutable builder tables. Approved outline/title/description/outcomes/tentative price stayed a read-only reference, with no approved selling-price or publication implication.

## X. Privacy/noindex

Actual rendered builder `robots` was `noindex, nofollow`; private content had a `ph-no-capture` ancestor. Both actual authenticated admin list/detail responses were HTTP 200 and rendered `noindex, nofollow` metadata. Local sanitation probes canonicalized creator/admin build URLs, discarded query IDs, user/project/draft/lesson IDs, private title/body and tentative price; device-only identity disabled person profiles. Autocapture was dropped.

No live PostHog request was made. All non-local browser requests were blocked; 39 such requests were blocked in the successful browser suite, including existing public assets. Private-service credentials were absent from isolated apps.

## Y. LMS/storefront isolation

Original-ID fingerprints were captured before synthetic fixture creation and rechecked after database tests and the complete browser/HTTP journey. No original row changed. Catalog, search, sitemap and public project-ID course/API/checkout probes did not expose the private draft ID or lesson content. A separate final total-row count check also confirmed zero new rows in all seven legacy LMS tables, so the original-ID fingerprints could not conceal added rows. No LMS course, enrollment, authorship, ownership, progress, certificate or legacy coupon was created by builder work.

| Original table | Baseline rows | Final original-ID fingerprint |
| --- | --- | --- |
| `users` | 291 | Unchanged |
| `courses` | 6 | Unchanged |
| `course_authors` | 2 | Unchanged |
| `enrollments` | 8 | Unchanged |
| `orders` | 1 | Unchanged |
| `coupons` | 2 | Unchanged |
| `progress` | 2 | Unchanged |
| `certificates` | 0 | Unchanged |
| `workspace_creator_profiles` | 64 | Unchanged |
| `workspace_memberships` | 64 | Unchanged |
| `workspace_membership_orders` | 197 | Unchanged |
| `workspace_course_drafts` | 73 | Unchanged |
| `workspace_creator_profile_details` | 24 | Unchanged |
| `workspace_eligibility_attempts` | 228 | Unchanged |
| `workspace_payment_events` | 28 | Unchanged |
| `workspace_payment_attempts` | 134 | Unchanged |
| `workspace_coupons` | 48 | Unchanged |
| `workspace_coupon_redemptions` | 68 | Unchanged |
| `workspace_course_submissions` | 62 | Unchanged |
| `workspace_course_review_events` | 102 | Unchanged |

Fingerprint comparisons used complete aggregated original rows, not merely counts. Synthetic new rows were deliberately excluded from original-ID comparisons. The successful genuine payment E2E account was included in these original user/profile/membership/order fingerprints and was not used for mutation tests.

## Z. Review/payment isolation

Workspace payment code, commercial rules, fulfillment code and review state machine were not changed. Synthetic creator setup used normal services with an in-memory provider; no Razorpay network call occurred. Approval remained separate from builder authorization. Actual uncaptured pending-order and captured `pending_activation` fixtures lacked membership/profile and could not start or read the builder. Production classification denied noncommercial Test entitlements through the unchanged creator-access policy.

## AA. Retained Razorpay fixture safety

All six retained WS15AVR fixture orders were hash-identical. The three captured held fixtures still had `activation_state=held_for_review`, `paidAt=null`, `refundEligibleUntil=null`, zero memberships/profiles, and no builder access. No reconciliation, cleanup or rewriting of those provider fixtures occurred.

## AB. Failure/rollback paths

Actual `22012` after project bootstrap module insertion rolled back the entire bootstrap. Actual `22012` after module deletion/reindex restored the structure and versions. Actual `22012` after lesson deletion/reindex restored lesson row/content, positions and versions; a normal retry committed once. No trigger/constraint was weakened for any fault test.

## AC. Unavailable-database behavior

Separate isolated app on port 4049 used a deliberately unreachable synthetic `127.0.0.1:1` database, with no authorized real DB connection. A valid synthetic session could not authorize from claims alone. API returned safe `503`; page rendered bounded unavailable/error recovery and no false Start Building state. Combined cold-route compilation, API and page check completed in 15,537 ms. API response did not reveal SQL, URL, host, credential or low-level connection error.

This measures a refused local connection, not a network-blackhole timeout or production outage SLA.

## AD. Tests/validation

- Real local PostgreSQL harness: 55 named checks passed, including 8 forced two-connection races.
- Real authenticated local HTTP harness passed all recorded authorization, constraints, expiry, rollback, privacy, pending-order and final fingerprint checks.
- Hydrated browser harness: 12 named checks passed; desktop/mobile/narrow desktop, two tabs, navigation and admin; zero page runtime errors.
- Focused qualified-query regression: 8 repository tests passed.
- Full `pnpm validate` passed: 5 pure tests; 708 Vitest tests across 56 files; TypeScript; lint with no warnings/errors. Repeated after adding verification harnesses.
- Payment-disabled isolated production `pnpm build` passed with cached local Google-font responses, no `.env` copying and an unreachable synthetic database.
- All four new CJS harness files passed `node --check`; `git diff --check` passed.

All automated route/unit tests include the existing creator, review, payment, fulfillment and access regressions. No check above is described as a genuine provider payment/webhook test.

## AE. Defects/corrections

Real PostgreSQL bootstrap initially rejected an approved submission despite a matching approval event. Generated single-table Drizzle SQL flattened interpolated column qualifiers inside a correlated subquery: `submission_id=id` resolved `id` to the event row rather than the outer submission. The same pattern affected project summary count subqueries.

Minimum correction: explicit table/identifier pairs preserve correlation for approval source ID/version/time and module/lesson project counts. Added a regression that compiles the actual flattened single-table SQL using `drizzle.mock()` and checks the full qualifications. Real bootstrap/count checks passed afterward. No schema change or security relaxation.

Corrective commit: `51e9c86` (repository query + regression). Verification harness commit: `8f569a7`; final report/check follow-up is the completion commit.

Harness-only issues were corrected during execution: expected custom-trigger SQLSTATE, Fetch status accessor, async lesson readiness, populated textarea label matching, extra Next route announcer and heading capitalization. These did not justify product changes. Failed-run synthetic immutable history was retained.

Changed files for this phase:

1. `lib/workspace/builder/repository.ts`
2. `tests/routes/workspace-builder-repository.test.ts`
3. `tests/postgres/workspace-builder-ledger-verification.cjs`
4. `tests/postgres/workspace-builder-verification.cjs`
5. `tests/postgres/workspace-builder-http-verification.cjs`
6. `tests/postgres/workspace-builder-browser-verification.cjs`
7. `WORKSPACE_PHASE18V_VERIFICATION.md`

## AF. Remaining limitations

Collation maintenance remains outside this phase. This local verification does not authorize or establish production readiness, provider availability, media/assessments/publication support, deployment or real commercial charging. No live analytics smoke was performed because no safe non-production analytics configuration was needed/present in the isolated apps.

Clearly identified `WS18V` synthetic fixture groups, including failed verification attempts, are retained under normal immutability rules. The successful PostgreSQL fixture run marker was `e48c6bfc-e614-44de-865b-4f939be72f20`. No reset or immutable-history deletion occurred.

Both isolated verification apps were stopped and temporary synthetic JWT secret/session files removed. Runtime migration authorization did not persist. No Workspace payment enablement flag was supplied at any point; ordinary local payment UI was verified disabled. The user's original local app/tunnel was not changed.

Evidence remains locally in `/tmp/ws18v-ledger-before.json`, `/tmp/ws18v-ledger-after.json`, `/tmp/ws18v-results.json`, `/tmp/ws18v-browser-results.json`, `/tmp/ws18v-http-results.json`, `/tmp/ws18v-unavailable-results.json`, `/tmp/ws18v-legacy-final.json`, validation/build logs and the synthetic mobile screenshot. No secrets, real phone numbers, cookies or credentials are committed in this report or test source.

Opt-in harnesses require their respective `WORKSPACE_BUILDER_*_VERIFY=true` guards. PostgreSQL/HTTP harnesses assert the exact local URL classification. Browser tests require a pre-existing runtime/executable, a private temporary session file and the isolated app; they install nothing. Recreating those temporary sessions must continue using a synthetic app secret and the existing signing function.

## AG. Recommendation

**PHASE 1.9 GO.** All critical private course-builder verification criteria passed after the minimum qualified-query correction. Phase 1.9 was not implemented. Its scope must be chosen explicitly before further product development. Public payments remain disabled; nothing was published or deployed.
