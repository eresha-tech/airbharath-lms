# Workspace F.4 — Admin restructuring, pagination and access grants

**WORKSPACE F.4 VERIFICATION BLOCKED**

First blocker: the new deferred `workspace_grant_complete` trigger in applied migration 0028 selects between `NEW.id` and `NEW.grant_id` in one SQL expression. PostgreSQL resolves the record fields before evaluating that selection and rejects a grants-table record with **42703: record "new" has no field "grant_id"**. The grant transaction rolls back completely. This is a defect introduced in the F.4 trigger, not a provider or account configuration failure.

A minimal, versioned 0029 correction has been prepared but **not applied**. It selects the table-specific field in separate PL/pgSQL branches and preserves every completion check. The owner's authorization permits applying **only reviewed 0028** locally; it does not permit editing applied SQL, ledger manipulation or applying 0029. Do not run another migration command under the 0028-only authorization: the journal now contains the pending proposal.

## A. Starting source/worktree

- Branch: `codex/workspace-1.8-launch`.
- Starting HEAD: `dd4e2403c70b03dfe7830c582fc61ddc6da62ce3`; clean worktree confirmed before F.4 changes.
- Starting baseline: 1,021 Vitest tests and five pure Node checks; F.3 evidence retained.
- This is an incomplete F.4 implementation/verification checkpoint. No subsequent phase was started.

## B. Existing Admin route audit

The persisted Admin layout/session check precedes Admin pages. Existing service mutations additionally recheck persisted roles inside their transactions. Legacy LMS navigation and payment domains are separate.

| Existing destination | Before F.4 | Actual data/service |
| --- | --- | --- |
| `/admin/workspace-applications`, `/[id]` | 25-row manual applications list; review detail | Workspace application API, consent/contact/manual review records |
| `/admin/workspace/eligibility`, `/[attemptId]` | 20 + 1 attempts; status/page; no shared search or size control | Immutable evaluator attempts/settings/policy |
| `/admin/workspace/creators` | Last 100 paid memberships; no independent directory/grants | Canonical profiles + membership/order projection |
| `/admin/workspace/orders` | Default 25 orders without useful list pagination UI | Financial orders, attempts, event inbox |
| `/admin/workspace-refunds` | Up to 100 requests and 100 external-review cases | Requests, execution, completion, external observations; existing safe actions |
| `/admin/workspace/course-reviews`, `/[id]` | 20 + 1 queue, review states, immutable detail | Existing normal review service/history |
| `/admin/workspace/course-drafts`, `/[id]` | 20 + 1 read-only proposals | Owner-scoped private drafts |
| `/admin/workspace/course-builds`, `/[id]` | 20 + 1 read-only builds | Approved projects/modules/lessons |
| `/admin/workspace/coupons` | Existing 20 + 1 interactive campaigns; embedded influencers | Workspace-only campaigns, plan applicability and financial usage reports |
| `/admin/workspace/settings` | Eligibility settings and versioned plans | Existing guarded configuration services |
| `/admin/coupons` | Existing legacy LMS coupon administration | Legacy LMS coupon tables and economics |

There was no dedicated Workspace overview, grant persistence, standalone influencer destination, membership list, general financial report, notice/inbox view or audit view. Notification/worker services and persisted evidence existed without those Admin destinations.

## C. New Admin navigation design

The dedicated shell groups real destinations into Overview; People & Creators; Courses; Memberships & Finance; Promotions; Operations. The legacy LMS sidebar now links to Workspace administration and explicitly labels LMS Course Coupons. Returning to LMS administration remains available.

Desktop navigation, active links, breadcrumbs and a Radix Sheet mobile drawer are implemented. The drawer uses the existing focus-managed dialog primitive. **Hydrated desktop/mobile verification has not been performed; no accessibility certification is claimed.**

## D. Admin page/data structure

A shared authorized list page and a fixed-projection read module provide consistent filters, tables, counts, empty states and retry links. New detail pages expose grant history, Creator profiles, orders/refund requests and safe operational fields. Existing course review/build detail services are retained. Duplicate `main` landmarks inside the Workspace shell were removed.

The overview/report reads persisted aggregates: gross captured, completed full refunds, net captured, paid memberships, separate complimentary grants, pending reviews/refund requests, held orders and notification exceptions. Live is the default financial mode; Test is explicitly labelled noncommercial. There are no manual Make Paid, refund completion or publish controls.

## E. Existing and new pagination coverage

| Projection | Pagination | Read-only PostgreSQL result (Test filter where supported) |
| --- | --- | --- |
| Creator directory | Offset 25/50 | 192 total, first 25 |
| Existing-user selection | Offset 25/50 | 702 total, first 25 |
| Eligibility | Offset 25/50 | 596 total, first 25 |
| Pre-registrations | Offset 25/50 | 2 total, 2 returned |
| Course reviews | Offset 25/50 | 98 total, first 25 |
| Private proposals | Offset 25/50 | 171 total, first 25 |
| Private builds | Offset 25/50 | 24 total, 24 returned |
| Paid memberships | Offset 25/50 | 192 total, first 25 |
| Financial orders | Creation-boundary cursor 25/50 | 391 total, first/second 25 without duplicates |
| Refund requests | Creation-boundary cursor 25/50 | 83 total, first 25 |
| Access Grants | Offset 25/50 | Zero committed grants because of the blocker |
| Influencers | Offset 25/50 read API; directory editor 25 | 28 total, first 25 |
| Workspace coupons | Offset 25/50 projection; existing editor 20 | 76 total, first 25 in projection |
| Refund notifications | Creation-boundary cursor 25/50 | 99 total, first 25 |
| Financial worker inbox | Creation-boundary cursor 25/50 | 46 total, first 25 |
| Audit activity | Creation-boundary cursor 25/50 | 111 total, first/second 25 without duplicates |

All 16 fixed projections executed successfully against real local PostgreSQL and returned at most 25 rows. Initial measured transactions were approximately 4–39 ms; this is a local smoke measurement, not a production performance benchmark. Creator-side pagination is unchanged.

Real tagged synthetic proposal search returned 26 rows: page 1 = 25, page 2 = 1, accurate totals/has-more and 26 distinct IDs. Combined approved-status search returned three records. Creator, eligible unpaid and demoted-Admin accounts were denied before rows/counts were returned. Four malformed/oversized parameter cases were rejected.

**Remaining pagination work:** hydrated control/reload checks; insert-during-cursor verification; multi-page grants once creation works; completing consistent URL restore, larger-size and sorting controls for the existing coupon/influencer mutation editors. The read projections passing does not certify those interactions. The previous external refund exception destination must also be restored as a paged visible queue; existing services/actions remain, but that complete presentation is not verified here.

## F. Search/filter/sort behavior

Shared requests strictly parse scalar query values, search length, supported status/sort/mode, sizes 25/50 and pages 1–500. Searches are parameterized and escape literal LIKE wildcards. Data is filtered before paging. Ordering uses timestamp plus unique ID, or normalized name plus ID. Cursor timestamps use millisecond normalization consistently with Node Date serialization; context includes kind/filter/sort/size/mode, preventing cursor reuse across different views. Mutable financial/audit streams use an initial creation watermark and honest has-more. Total and page queries share a repeatable-read transaction and a locked persisted Admin check.

## G. LMS versus Workspace coupon navigation

Promotions contains explicit Workspace Membership Coupons, Influencers and LMS Course Coupons destinations. Coupon creation, pricing, cap-15 enforcement, shared Test/Live capacity and refund-aware reporting were not merged or changed. The influencer query was changed from an arbitrary 500-row fetch to bounded search/paging. Existing campaign economic/mutation services remain authoritative.

## H. Grant business rules

Separate `admin_complimentary` / `creator_workspace` authorization evidence records owner, canonical profile, eligibility attempt, runtime environment, start, mandatory expiry, reason, persisted actor, idempotency hash/key, Creator Terms identity and closure information. Presets are 3/6/12 IST calendar months; custom expiry is limited to 12 months and scheduled starts to 30 days. Repeated creation must return the original grant or refuse duplicate/open grants, never extend silently. Revocation requires a reason and explicit confirmation.

No order, payment, coupon redemption, paid membership or fictitious Refund Policy purchase receipt is created by the grant service. A missing current Creator Terms acceptance leaves access pending. Normal approval-before-builder rules remain enforced.

## I. Grant schema/migration/hash/ledger

- Authorized target only: `localhost:5433/airbharath_lms`, `DATABASE_ENV=development`.
- TCP and `/tmp` Unix socket on 5433 matched database name/OID/port/system identity: OID `16384`; system identifier `7680462735222304705`.
- Ledger before: `0000–0027`, 28 entries, every source hash/journal timestamp matched.
- Drizzle generated 0028. Snapshot comparison preserved every existing table definition and added only grants/events. The Creator profile-completion function extends only its identity branch; paid order/membership checks remain unchanged.
- Initial guarded attempts rolled back with 42830 because the generated composite foreign key preceded its new unique index. That ordering was corrected **before any successful application**; the ledger and all original rows remained unchanged on recheck.
- Successfully applied only `0028_workspace_creator_access_grants` through guarded `pnpm db:migrate`, process-only `ALLOW_DATABASE_MIGRATION=true`.
- Applied 0028 SHA256: `3442d66cf351d68a71ec466234ddf57da3d0e45ba8db567fef55a2d128263400`.
- Ledger after: `0000–0028`, 29 entries, all hashes/timestamps verified.
- Second execution after successful application was a no-op: ledger remained 29 with the same source hashes.
- Proposed, unapplied `0029_workspace_grant_completion_record_fix` SHA256: `1bf64230f790c4ed99906b25416766ad7f6d3789e0e6bd0760aad205e6051a91`. Generated through Drizzle's custom migration workflow; it changes only record selection in one completion function.
- Source journal has 30 entries including the **unapplied proposal**; local DB has 29. This is a known pending correction, not schema drift or a manipulated ledger.
- `pnpm db:generate`: no schema changes / nothing to migrate. No schema push, reset, deletion or production/staging migration occurred. No migration authorization was persisted in `.env`.

## J. Authorization and immutable audit

Grant mutation APIs use same-origin and bounded JSON checks plus persisted Admin authorization. Transactions lock persisted actor/owner rows in deterministic order and recheck role; identity and eligibility are not taken from a client flag or JWT role alone. The migration defines immutable events, restricted foreign keys, unique actor/request and open-owner constraints, row guards, TRUNCATE guards and deferred grant/audit completeness.

Real direct service attempts by ordinary/student/Creator and demoted-Admin fixtures were rejected before the failing creation stage. Ineligible target creation was rejected. **Positive grants and real UPDATE/DELETE/TRUNCATE audit tests were not reached.** SQL inspection and unit tests do not replace those real database proofs.

## K. Paid versus complimentary access resolution

The existing `creatorCapabilities` resolver now combines independently resolved paid and complimentary evidence. Paid entitlement remains paid-only. Revoked/expired grants cannot grant editing; eligible legal history can retain read access. Suspended/terminated profiles and incompatible environments fail closed. A distinct grant never changes financial truth or resolves an uncertain payment.

Creator, review and builder services consume this same resolver while holding the existing owner locks. Membership/Dashboard messaging distinguishes complimentary from purchased access, shows grant dates and provides normal Creator Terms acceptance without a fictitious refund receipt. F.3 layout is retained. Regression verification caught and corrected a grant-state precedence error that initially replaced valid paid journey states with `none`; all original paid journey regressions now pass.

## L. Grant/revoke/expiry tests

The real synthetic harness first passed local identity/hash checks, ordinary ineligible/unpaid/Admin access denial, paid course summary/pagination, cross-owner proposal/review/builder reads, submission edit lock, normal review/builder flow and full fake-provider refund retaining read-only access.

Grant creation then failed with 42703 at deferred commit. A minimized normal-service reproduction confirmed the same missing-field diagnostic. The failed transaction committed **zero grants**, zero grant events and no new pending-legal Creator identity. No manual insert, trigger weakening, profile/payment injection or forced next state was used.

The retained opt-in harness contains planned normal-service checks for successful grant-only profile/proposal/review/builder, legal boundary, idempotency, two-connection grant race, paid coexistence, independent grant after refund, revocation, real-clock expiry, UPDATE/DELETE/TRUNCATE guards, multi-page synthetic grant evidence and stable pagination under insertion. **Those post-blocker checks are not verified.**

Unit/structural regressions cover strict inputs, expiry/legal/eligibility/profile/environment decisions, no paid entitlement from grants, bounded pagination/cursor context, additive snapshot integrity and the proposed field-selection correction.

## M. Admin browser

Not run. There is no F.4 hydrated desktop/mobile PASS or screenshot evidence. No isolated payment-enabled app or authenticated synthetic browser session was started. Navigation, grant forms, drawer focus/Escape, coupon/refund interactions and 390px/narrower behavior remain required after correction.

## N. Creator browser with grants

Not run. Complimentary, both-source, revoked, expired, refunded and legal-pending hydrated states remain required. F.3 browser results are historical evidence and are not reused as F.4 grant verification.

## O. Financial and legacy compatibility

Existing full pricing/coupon/payment/refund/email/legal/worker/LMS regression suites pass. Local real paid tests use normal financial acceptance/reconciliation/fulfillment with an in-memory fake provider and normal course review/creation APIs. The normal refund test retains immutable local evidence. Financial aggregate identity `net = gross captured − completed full refunds` passed read-only. There are zero grant rows, so real nonzero-grant exclusion still needs verification. No genuine provider call or commercial revenue claim was made.

## P. Security/privacy

Private Admin groups and alias routes retain persisted authorization and noindex; APIs use no-store. Owner checks remain in Creator services. Grant forms send no self-supplied actor identity. New list projections omit contact information, auth secrets and provider IDs. Capture-protected shells and existing Workspace telemetry sanitization are retained. The newly added exact `/admin/workspace` overview path was added to private analytics classification; four regressions verify root/grant/creator/inbox IDs, contact search and grant/financial values are masked and autocapture rejected.

No new Creator role, OTP flow, provider call, public payment switch or financial success shortcut was introduced. `.env` financial enablement flags were checked as off/unset without printing credentials. Test and build processes explicitly disable financial flags and exclude secrets; the build uses an unreachable synthetic DB and cached fonts.

## Q. Data preservation

Fresh original baseline: **59 public tables, 5,493 original rows**. Baseline SHA256: `e0616868d7f28288b067797a48f3f81d58890497114d365c3a0bf76e9e6a494c`.

Every original row fingerprint/multiplicity remained present and unchanged on the final comparison; legacy tables remained exact. The original baseline was retained, not replaced after failures. Fourteen newly tagged synthetic identities and their normal eligibility/legal/paid/course/refund histories are retained as development evidence. Only the newly created demotion fixture's mutable role was changed for the stale-Admin test. No original user/financial/review/legal record was edited or deleted. No database cleanup was performed.

## R. Validation/build

- Full `pnpm validate`: passed.
- Final Vitest count: 1,069 passed across 86 files, including all 1,021 baseline cases and added F.4 cases.
- Pure Node checks: five passed.
- TypeScript: passed.
- Lint: passed, no warnings or errors.
- Isolated payment-disabled production build: passed after type corrections and the final private-root analytics fix. No genuine DB/provider credentials were present.
- Migration generation no-drift: passed, with the explicitly pending custom 0029 proposal noted above.
- `git diff --check`: passed.
- Real PG original preservation: passed; grant verification **failed** at the reported trigger; read-only list/pagination tests passed.
- Hydrated Admin/Creator browsers: not run / unverified.

Earlier validation exposed stale list test seams, new App Router argument typing, an overbroad paid-journey grant override and the new root-path analytics classification gap. Tests now follow the shared authorized read seam and preserve negative authorization assertions. GET search forms are allowed without introducing mutation controls into read-only inspection. Initial production build failed type checking before those source/type corrections; the final result above is the relevant build.

## S. Commits and changed files

Implementation/proposal checkpoint commit: `233c3866e95846d64d3594c67984cc99545699e0`.
The final report commit is recorded in Git history and returned to the owner; a report cannot contain its own commit hash. No push/deploy occurred. Files below are the complete F.4 manifest relative to starting HEAD, including this report:

- `WORKSPACE_LAUNCH_F4_ADMIN_WORKSPACE_ACCESS_GRANTS.md`
- `app/(admin)/admin/workspace-applications/layout.tsx`
- `app/(admin)/admin/workspace-applications/page.tsx`
- `app/(admin)/admin/workspace-refunds/[id]/page.tsx`
- `app/(admin)/admin/workspace-refunds/layout.tsx`
- `app/(admin)/admin/workspace-refunds/page.tsx`
- `app/(admin)/admin/workspace/access-grants/[id]/page.tsx`
- `app/(admin)/admin/workspace/access-grants/page.tsx`
- `app/(admin)/admin/workspace/audit/page.tsx`
- `app/(admin)/admin/workspace/course-builds/[id]/page.tsx`
- `app/(admin)/admin/workspace/course-builds/page.tsx`
- `app/(admin)/admin/workspace/course-drafts/[id]/page.tsx`
- `app/(admin)/admin/workspace/course-drafts/page.tsx`
- `app/(admin)/admin/workspace/course-reviews/[id]/page.tsx`
- `app/(admin)/admin/workspace/course-reviews/page.tsx`
- `app/(admin)/admin/workspace/creators/[id]/page.tsx`
- `app/(admin)/admin/workspace/creators/page.tsx`
- `app/(admin)/admin/workspace/eligibility/page.tsx`
- `app/(admin)/admin/workspace/error.tsx`
- `app/(admin)/admin/workspace/events/[id]/page.tsx`
- `app/(admin)/admin/workspace/events/page.tsx`
- `app/(admin)/admin/workspace/influencers/page.tsx`
- `app/(admin)/admin/workspace/layout.tsx`
- `app/(admin)/admin/workspace/loading.tsx`
- `app/(admin)/admin/workspace/memberships/page.tsx`
- `app/(admin)/admin/workspace/notices/[id]/page.tsx`
- `app/(admin)/admin/workspace/notices/page.tsx`
- `app/(admin)/admin/workspace/orders/[id]/page.tsx`
- `app/(admin)/admin/workspace/orders/page.tsx`
- `app/(admin)/admin/workspace/page.tsx`
- `app/(admin)/admin/workspace/reports/page.tsx`
- `app/(workspace)/workspace/(creator)/dashboard/page.tsx`
- `app/(workspace)/workspace/(membership)/member/page.tsx`
- `app/api/admin/workspace/access-grants/[id]/route.ts`
- `app/api/admin/workspace/access-grants/route.ts`
- `app/api/admin/workspace/influencers/route.ts`
- `app/api/admin/workspace/lists/[kind]/route.ts`
- `components/admin/AdminLayoutWrapper.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/GrantActions.tsx`
- `components/admin/InfluencerDirectory.tsx`
- `components/admin/WorkspaceList.tsx`
- `components/admin/WorkspaceShell.tsx`
- `components/workspace/GrantTerms.tsx`
- `components/workspace/WorkspaceCoupons.tsx`
- `components/workspace/WorkspaceInfluencers.tsx`
- `drizzle/0028_workspace_creator_access_grants.sql`
- `drizzle/0029_workspace_grant_completion_record_fix.sql`
- `drizzle/meta/0028_snapshot.json`
- `drizzle/meta/0029_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/access/http.ts`
- `lib/workspace/access/model.ts`
- `lib/workspace/access/repository.ts`
- `lib/workspace/admin/details.ts`
- `lib/workspace/admin/lists.ts`
- `lib/workspace/admin/pagination.ts`
- `lib/workspace/analytics-privacy.ts`
- `lib/workspace/builder/repository.ts`
- `lib/workspace/builder/service.ts`
- `lib/workspace/creator/model.ts`
- `lib/workspace/creator/repository.ts`
- `lib/workspace/creator/service.ts`
- `lib/workspace/eligibility/service.ts`
- `lib/workspace/membership/influencers.ts`
- `lib/workspace/review/service.ts`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/postgres/workspace-admin-grants-verification.cjs`
- `tests/routes/workspace-access-grants.test.ts`
- `tests/routes/workspace-activation-boundaries.test.ts`
- `tests/routes/workspace-activation-pages.test.ts`
- `tests/routes/workspace-admin-list-fixtures.ts`
- `tests/routes/workspace-builder-pages.test.ts`
- `tests/routes/workspace-builder-repository.test.ts`
- `tests/routes/workspace-creator-boundaries.test.ts`
- `tests/routes/workspace-creator-pages.test.ts`
- `tests/routes/workspace-eligibility-service.test.ts`
- `tests/routes/workspace-grant-migration.test.ts`
- `tests/routes/workspace-influencer-routes.test.ts`
- `tests/routes/workspace-payments-migration.test.ts`
- `tests/routes/workspace-review-boundaries.test.ts`
- `tests/routes/workspace-review-pages.test.ts`

## T. Remaining required owner improvements

All 13 agreed improvements remain mandatory **before** the paid Phase 1.8 launch. Admin restructuring/pagination is not approved post-launch work and F.4 is not yet verified. Workspace-wide UI consistency, landing-page improvements and database auditing remain separate mandatory pre-launch work; none was started automatically. Frozen Phase 1.9/media, publishing, course sales and later phases remain excluded.

Within F.4, finish the authorized correction and positive real grant lifecycle/concurrency/immutability tests; remaining list/editor interactions and external refund exception presentation; hydrated Admin/Creator desktop/mobile/security checks; then preservation and final validations. The current source is an incomplete checkpoint, not a release recommendation.

## U. Production launch blockers

F.4 blocker and missing grant/browser proofs; remaining mandatory owner improvements; unresolved genuine refund webhook/provider evidence from prior phases; separately authorized production configuration/migrations; worker/scheduler and durable notification deployment/readiness; operational documentation and final release smoke. Earlier reports remain authoritative for their own unresolved gates. No new legal text, price, refund window or production operation was approved by this task.

## V. PASS/BLOCKED recommendation

**WORKSPACE F.4 VERIFICATION BLOCKED.**

First failing stage: real PostgreSQL complimentary grant creation, deferred `workspace_grant_complete`, SQLSTATE 42703. The proposed 0029 fix is reviewable and unapplied. Explicit owner authorization for **only this correction on the same local development DB** is needed before migration and dependent grant/browser verification can resume. Applied 0028 and every prior migration remain unchanged; immutable history is retained. Public payments remain off. STOP at this checkpoint.
