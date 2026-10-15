# Workspace Phase 1.4 — membership plans, pricing and advisory coupons

Date: 6 October 2026. Baseline: Phase 1.3V report commit `fa5fc32`. Implementation commit: `a58c119`. References: `WORKSPACE_PHASE12_ARCHITECTURE.md`, `WORKSPACE_PHASE13_IMPLEMENTATION.md`, `WORKSPACE_PHASE13V_VERIFICATION.md`, `WORKSPACE_COUPON_AUDIT.md`.

**Phase 1.4 implementation is complete. Migration generated, not applied.** Local PostgreSQL integration of the new migration remains unverified. This phase does not introduce payment, membership activation, creator profiles, paid entitlement or coupon reservation/redemption. Phase 1.5 was not started.

## A. Scope

Implemented three versioned prepaid plan definitions, exclusive-GST integer pricing, isolated Workspace coupon definitions/applicability, persisted-eligibility quote generation, `/workspace/activate`, read-only admin plans and coupon management, central returning-user routing and privacy-safe behavioral events. Existing LMS coupons/course checkout, manual Workspace applications and approval email remain separate.

## B. Plan model

`workspace_membership_plans` stores UUID, stable code, version, display name, duration months, integer base paise, tax basis points, INR, current/available flags, publication time and optional publisher. The additive migration deterministically seeds exactly these v1 plans, with fixed IDs and no real campaign coupons:

| Code | Term | Base paise | GST paise | Total paise | Display total |
| --- | --- | --- | --- | --- | --- |
| quarterly | 3 calendar months | 499900 | 89982 | 589882 | ₹5,898.82 |
| half_yearly | 6 calendar months | 899900 | 161982 | 1061882 | ₹10,618.82 |
| yearly | 12 calendar months | 1699900 | 305982 | 2005882 | ₹20,058.82 |

Only these three stable codes and their approved durations are accepted. Prices are bounded to 1–100,000,000 paise, GST is 1800 bps and currency is INR. This is not an arbitrary subscription builder.

## C. Pricing/GST rules

All monetary computation uses bounded integer paise with BigInt intermediate multiplication. For a nonnegative integer amount and basis-point rate, round half-up as `(amount × bps + 5000) / 10000` using integer division. Percent discounts and GST are each rounded once to the nearest paise.

Order: base − rounded coupon discount = taxable amount; taxable × 18% = rounded GST; taxable + GST = total. No inclusive-tax LMS invoice calculation is reused. Zero/negative/noninteger/nonfinite/out-of-bound base/discount definitions are rejected. Percentage must be 1–9999 bps. Discounts at or above base, including percentages that round to a free base, are rejected rather than clamped.

A ₹1,100 fixed discount on quarterly produces ₹3,899 taxable, ₹701.82 GST, ₹4,600.82 total. A ₹1,099 discount produces ₹3,900 taxable, ₹702 GST, ₹4,602 total. These are test cases, not seeded promotional offers.

## D. Plan versioning

Unique `(code, version)` and a partial unique current index per code preserve catalog identity. SQL rejects plan deletes and protected-content updates; only the current pointer may transition. Availability is part of the immutable definition in this conservative MVP, so changing it also requires a successor version. Admins cannot publish/edit arbitrary plans from the UI. A future reviewed publisher must switch the pointer, create the successor and audit that operation atomically. Future purchases must snapshot the chosen version; no purchase exists here.

## E. Workspace coupon model

`workspace_coupons` is separate from the legacy `coupons` table. Scope is database-constrained to `workspace_membership`. Fields include normalized code, active/paused/archived status, fixed/percentage integer discount value, optional exact start/expiry instants, optional positive integer usage limit, campaign/source metadata, creator, creation/update times and optimistic version.

Normalized codes trim and uppercase, then match `^[A-Z0-9][A-Z0-9_-]{2,31}$` (3–32 characters). A unique scope/code index prevents duplicate normalized codes, including concurrent creation. Source types are controlled: influencer, partner, institution, founder, organic_campaign, internal, other. Campaign/source names are required bounded text. No creator coupon generator or course-purchase scope is implemented.

Definitions, code, economic meaning, attribution, dates, limits and applicability are immutable from creation, even before financial use. Change an offer by pausing/archiving it and creating a new code. No hard-delete or economic-edit endpoint exists. Archive is terminal; paused coupons can reactivate. Only versioned status/update-time transitions are permitted, with transactionally appended audit evidence.

## F. Coupon applicability

`workspace_coupon_plans` normalizes one coupon to one or more stable approved plan codes, with a compound primary key. Selecting all three means all current Workspace plans; no free-text applicability or course IDs are used. Initial creation checks that every selected current plan exists and the offer leaves each paid base positive. A deferred SQL constraint trigger repeats the paid-only/applicability check at commit. Applicability cannot be changed after the creation audit is present.

## G. Campaign attribution

Campaign name, source type and source name stay on the immutable coupon definition. They do not enter public quote properties or behavioral analytics. Phase 1.5 must snapshot them into accepted financial/redemption records; PostHog is not the financial attribution source. No real influencer coupon was seeded.

## H. Quote service

`getWorkspaceMembershipQuote` is the authoritative service. The authenticated account ID is supplied by server session lookup; client input accepts only stable plan code, plan-version UUID and optional normalized code. The service also validates this identifiers-only boundary, so direct callers cannot bypass route validation.

A read-only repeatable-read transaction checks the persisted user, latest owned eligibility through the existing central resolver, current selected plan/version, availability, validated current settings/policy, scoped coupon status, applicability and exact time window (`startsAt <= now < expiresAt`, nullable bounds). Server time is sampled after reads. Unknown/inapplicable coupons produce explicit errors, never a silent full-price quote.

The bounded result contains plan/version/name/term/currency, base/discount/taxable/GST/total integers, applied normalized code, generated/expiry instants, start-rule copy, advisory/unreserved flags and a server SHA-256 hash. Expiry is the earliest of ten minutes, eligibility validity or coupon expiry. Nothing is persisted by preview.

The hash binds economics, plan version, coupon ID/version, pricing/start-rule version, current configuration/policy hashes, accepted eligibility policy and owned attempt/deadline. Generated time and preview expiry are excluded so identical economics can retain a stable review hash. Changed offers, prices, versions, launch/start context or applicable policy change it. It is not an accepted order, signed payment authorization or reservation token. Phase 1.5 must recompute and validate the accepted economics transactionally.

## I. Activation UX

Eligible users see three responsive radio plan cards, approved base prices, `+ 18% GST`, calendar-month terms and total without coupons. An optional protected coupon input requests a server quote; the breakdown shows base, discount, taxable, GST and total. Applying a coupon is explicitly advisory and unreserved. An invalid code hides the quote and remains a failure across plan changes; only explicit removal restores standard pricing. Aborted/stale responses cannot overwrite a newer selection. Expired previews require refresh. Network failures preserve input.

Launch/start copy reads the current settings instant and formats it in IST. Before the approved launch it shows early-access-after-successful-activation and paid-term start on 9 November 2026. At/after launch it describes successful-payment start. Cross-launch copy explains both payment-timing cases. There are no created membership dates or entitlements.

The payment CTA is disabled and labeled **“Payment activation coming next”**. No action can create a charge or creator access. Existing brand typography, palette and components are retained, with semantic plan controls, visible focus, live status/errors and protected page wrappers.

## J. Admin plans/coupons

`/admin/workspace/settings` now includes a read-only plan version/base/GST/total/term/availability summary alongside existing eligibility settings. `/admin/workspace/coupons` supports bounded code-prefix search, status filtering, pagination, creation, definition inspection, pause/reactivation and permanent archive. Exact date/time inputs are explicitly IST and converted to UTC instants independent of browser timezone. Usage limits are shown as definitions; paid-redemption statistics say they are not available until payment activation launches. No fake used count is displayed.

Creation/status commands use request keys, payload hashes, optimistic versions and persisted-admin role locks. Definition/applicability/audit creation and each status/audit update share a transaction. Duplicate normalized codes and stale/conflicting commands return controlled conflicts. Status timestamps come from PostgreSQL, rounded to millisecond precision and made monotonic, then reused in audit evidence to avoid app-clock skew or Date/microsecond round-trip differences.

The existing append-only `workspace_audit_events` table gains nullable coupon/old-status/new-status fields and a coupon lookup index. Its typed check preserves mandatory predecessor/successor settings IDs for settings publications, and requires coupon/status evidence only for coupon actions. Existing immutability triggers remain unchanged. Settings retry lookup now rejects coupon commands rather than interpreting them as settings publications.

## K. Journey resolver changes

The state vocabulary stays unchanged. `eligibility_active` now points to `/workspace/activate`; expired, never-attempted or cooldown-finished users point to `/workspace/apply`; active cooldown points to `/workspace/eligibility-result`. Anonymous users keep the fixed eligibility login callback. The eligible result page offers a “Choose a plan” link. Both `hasCreatorAccess` and `hasPaidEntitlement` remain false. No paid or membership-active state was invented.

## L. Security

All new admin APIs use persisted-role authorization for every handler, and mutation services recheck/lock the actor inside the transaction. Quote ownership is derived only from the authenticated persisted account. Expired/cooldown/noneligible users cannot quote. Stale or arbitrary plan IDs, unavailable plans, forged account/eligibility/price/tax/date fields, invalid coupon definitions, archived use, malformed/oversized JSON and cross-site/missing-origin mutations fail closed. JSON responses are private/no-store and errors do not return raw database/provider details.

Database definitions enforce scope, integer bounds, known codes/durations/currency/tax, valid status/source values, positive-or-null usage limit, ordered dates and normalized unique code. Reviewed SQL adds immutable plan/coupon/applicability triggers and a deferred coupon-completeness/audit requirement. Their actual PostgreSQL execution is still pending migration authorization; automated migration inspection is not described as a real trigger test.

## M. Privacy/analytics

New `workspace_plan_selected` events allow only a stable plan code. `workspace_coupon_applied` allows only controlled outcome, hasCoupon and an optional approved discount type; this UI does not send discount type. No typed code, campaign/source/influencer, account/quote ID, exact money or eligibility answers are emitted.

The existing Workspace before-send filter recognizes activation/coupon paths, strips query strings and dynamic IDs, discards autocapture/identify/exception and person updates, uses anonymous-device identity with person profiles disabled, and validates new event properties by value. Unknown plan/coupon event names fail closed even outside activation paths. Existing legacy Workspace telemetry remains covered by its original policy. Both new page trees carry `ph-no-capture`. Blocked/unconfigured telemetry never blocks preview. No live PostHog project or outbound analytics was enabled for this phase.

## N. Migration

Generated through **`pnpm db:generate`** after inspecting the journal's verified source head 0009:

- [drizzle/0010_illegal_toxin.sql](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/0010_illegal_toxin.sql)
- [drizzle/meta/0010_snapshot.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/0010_snapshot.json)
- appended journal entry index 10.

The snapshot parent matches 0009. Only three definition/applicability tables are added; existing table snapshots are unchanged except for the explicit audit extension. Existing 0000–0009 SQL is untouched. Reviewed deterministic plan seeds and custom invariants/triggers were appended to the generated additive migration. A second `pnpm db:generate` reported no schema changes. No dependency or lockfile change was needed.

**Not applied.** The preceding database authorization explicitly said “Continue Workspace Phase 1.3V only” and authorized that verification execution. This brief permits automatic application only if standing authorization covers this phase's execution. `AGENTS.md` requires **“Database operations require explicit task authorization.”** Accordingly, no Phase 1.4 database access/migration occurred and no acknowledgement was persisted. The last real ledger verified in Phase 1.3V was 0000–0009/10 rows; that is historical evidence, not a freshly queried Phase 1.4 ledger. Ledger-before/application/ledger-after/no-op execution for 0010 remain pending a separately authorized guarded development execution. No schema push, reset, production/staging access or ledger manipulation occurred.

## O. Tests/validation

Completed successfully with private-service configuration cleared and network blocked in tests:

- **`pnpm validate`**: five Node policy/security test files; **29 Vitest files / 337 tests**; TypeScript; lint with no warnings/errors. This includes 90 additional tests over Phase 1.3V's 247 and all legacy eligibility/manual/email/coupon coverage.
- Exact approved totals, fixed/percentage discounts, half-up edges, pre-GST application, paid-only and numeric bounds, canonical definitions, normalization, null/positive limits, all/specific-plan applicability, inclusive start/exclusive expiry and explicit failures.
- Quote account ownership, read-only snapshot boundary, active/expired/cooldown gates, unavailable/stale plans, removing coupons, bounded expiry and hash changes under offer/price/version/policy/launch changes.
- Admin creation/status validation, persisted-role demotion, transactional audit rollback, duplicate-code conflict mapping, immutable economics, stale/terminal status commands and idempotent status retry. Mock transaction tests are not real PostgreSQL concurrency tests.
- Anonymous activation/fixed callback, returning-user redirects, expiry during quote generation, safe dependency errors, no-store/bounded JSON, forged financial fields and cross-site mutations.
- Privacy allowlists, unknown event rejection, typed/campaign/quote/account/money stripping, nested/dynamic/query path handling, person/autocapture suppression and telemetry independence.
- Migration snapshot scope, original table/enum preservation, deterministic plan seed values and reviewed constraint/trigger text.
- Production **`pnpm build`** passed on an isolated source copy with existing dependencies, disabled private-service credentials and intentionally unreachable local database target: Next.js 15.5.19, **55 generated static pages**. Root development `.next` was left untouched. An initial permission-review timeout was resolved by retrying only the build command; no approval rejection was bypassed.
- Synthetic browser fixture using the real UI components and mocked quotes: desktop and 390px mobile layouts reviewed; activation/admin form had no horizontal overflow; invalid coupon persisted across plan changes, explicit removal restored full price, and valid synthetic discount displayed ₹4,600.82 correctly. This was a component/UI check, not authenticated real-database application smoke. Temporary server/tab were closed and viewport reset.
- **`git diff --check`** passed; scope/diff reviewed before milestone commits.

Real migration execution, PostgreSQL trigger/concurrency verification, authenticated new-schema database smoke and live provider/analytics behavior remain unverified. No payment behavior is claimed.

## P. Files changed

Full repository-relative inventory (all paths are under `/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms`):

- [WORKSPACE_PHASE14_IMPLEMENTATION.md](WORKSPACE_PHASE14_IMPLEMENTATION.md)
- [app/(admin)/admin/workspace/coupons/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(admin)/admin/workspace/coupons/page.tsx)
- [app/(admin)/admin/workspace/settings/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(admin)/admin/workspace/settings/page.tsx)
- [app/(user)/workspace/activate/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/activate/page.tsx)
- [app/(user)/workspace/eligibility-result/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/eligibility-result/page.tsx)
- [app/api/admin/workspace/coupons/[id]/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace/coupons/[id]/route.ts)
- [app/api/admin/workspace/coupons/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace/coupons/route.ts)
- [app/api/admin/workspace/plans/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/workspace/plans/route.ts)
- [app/api/workspace/membership/quote/route.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/workspace/membership/quote/route.ts)
- [components/admin/AdminSidebar.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/admin/AdminSidebar.tsx)
- [components/workspace/ActivationPreview.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/ActivationPreview.tsx)
- [components/workspace/WorkspaceCoupons.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspaceCoupons.tsx)
- [components/workspace/WorkspacePlanSummary.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspacePlanSummary.tsx)
- [drizzle/0010_illegal_toxin.sql](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/0010_illegal_toxin.sql)
- [drizzle/meta/0010_snapshot.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/0010_snapshot.json)
- [drizzle/meta/_journal.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/drizzle/meta/_journal.json)
- [lib/db/schema.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/db/schema.ts)
- [lib/workspace/analytics-privacy.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/analytics-privacy.ts)
- [lib/workspace/eligibility/model.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/eligibility/model.ts)
- [lib/workspace/eligibility/service.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/eligibility/service.ts)
- [lib/workspace/membership/analytics.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/membership/analytics.ts)
- [lib/workspace/membership/http.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/membership/http.ts)
- [lib/workspace/membership/model.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/membership/model.ts)
- [lib/workspace/membership/service.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/membership/service.ts)
- [tests/admin-route-authorization-policy.test.mjs](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/admin-route-authorization-policy.test.mjs)
- [tests/routes/workspace-eligibility-migration.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-eligibility-migration.test.ts)
- [tests/routes/workspace-eligibility-model.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-eligibility-model.test.ts)
- [tests/routes/workspace-eligibility-service.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-eligibility-service.test.ts)
- [tests/routes/workspace-membership-fixtures.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-fixtures.ts)
- [tests/routes/workspace-membership-migration.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-migration.test.ts)
- [tests/routes/workspace-membership-model.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-model.test.ts)
- [tests/routes/workspace-membership-privacy.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-privacy.test.ts)
- [tests/routes/workspace-membership-routes.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-routes.test.ts)
- [tests/routes/workspace-membership-routing.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-routing.test.ts)
- [tests/routes/workspace-membership-service.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-service.test.ts)
- [tests/routes/workspace-membership-ui.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-ui.test.ts)

Only these Phase 1.4 changes and their regression/report artifacts are included. No `.env`, dependency, lockfile, course coupon/checkout, payment or entitlement implementation file changed.

## Q. Known limitations

0010 must be reviewed/applied through guarded migrations to an explicitly authorized environment before database-backed plan/coupon screens can work. Until then, catalog/coupon failure states are intentional; current real PostgreSQL eligibility data from Phase 1.3V is untouched. New SQL invariants and audit timestamp behavior require real PostgreSQL integration verification after application. The quote is transient/advisory, and catalog/coupon changes can invalidate it before future checkout. Admin plan publishing, economic edits and redemption statistics are deliberately absent. Live analytics and external delivery/payment systems were not contacted.

## R. Deferred Phase 1.5 items

Accepted orders/economic and attribution snapshots, checkout quote acceptance/revalidation, capacity reservation, successful one-user/one-coupon enforcement, final-slot concurrency, redemption finalization, Razorpay/provider coordination, payment capture/webhooks/reconciliation, financial outbox/invoices/refunds, creator profiles, membership issuance and paid entitlements all remain deferred. No corresponding tables, services or fake flows were created. Course drafts/Basic Workspace dashboard are also absent.

## S. Deviations from Phase 1.2 architecture

The overall architecture is preserved. Two conservative MVP refinements are explicit: coupon economic/attribution/applicability/limit definitions freeze immediately rather than only after the first provider-backed hold; plan availability is immutable per version rather than mutable in place. Both avoid historical rewrites and require a new definition/version for material changes. The Phase 1.3 settings-specific audit table is extended with typed coupon evidence instead of creating a second audit system or implementing the full future generic audit model. No financial Phase 1.5 structures were pulled forward.

Implementation and report commits are returned in the completion message. No push/deploy occurred. **Stop at Phase 1.4.**
