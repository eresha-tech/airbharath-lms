# Workspace Major Launch Phase E — implementation

Date: 13 October 2026. Branch: `codex/workspace-1.8-launch`.
Starting HEAD: `b0bfa08`; correction: `d5e4c8c`; implementation: `3887136`.

**INFLUENCER COUPON IMPLEMENTATION READY FOR REAL DB VERIFICATION**

This is implementation evidence. No PostgreSQL connection/query/migration, genuine Razorpay call, checkout, deployment, production access or email delivery occurred. Public payment enablement and `.env` were not changed. Phase 1.9 remains frozen; its branch was not modified. The local migration head of 0022 is supplied by the brief, not freshly queried here.

## A. Existing coupon architecture audit

Inspected `lib/db/schema.ts`, membership model/service/HTTP/analytics, payment service/repository/provider integration, activation and refund paths, admin coupon routes/page/components, activation preview, prior migration guards and membership/payment/refund/security tests.

Existing functionality reused:

- Separate `workspace_coupons` and plan applicability; unique uppercase scoped codes, safe 3–32 character normalization, fixed paise/percentage basis-point discounts, validity windows, nullable paid-use caps, campaign/source labels.
- Definitions/applicability immutable from creation; versioned active/paused/archived transitions with transactional actor/request-key audit evidence. Archive is terminal. Economic edits and cap reductions require a new code rather than changing old obligations.
- Integer-paise pricing with BigInt half-up calculations, positive paid base and GST before final total; the server derives pricing and binds quote hashes to plan/coupon/eligibility/settings/policy context.
- Orders freeze plan base, coupon economics/source labels, discount, taxable base, GST, payable total, agreements, provider account/mode and launch/start rules.
- Financial transactions lock persisted user → coupon → order. Durable provider-create intent precedes HTTP; HTTP runs outside locks. Ambiguous creation recovers by receipt without another blind POST.
- Reservation ledger distinguishes reserved/redeemed/released; specific `(coupon_id,user_id)` uniqueness applies to reserved/redeemed history. Coupon capacity counts both states, without a TTL-based release. Only never-submitted closure or hashed definitive pre-provider rejection can release.
- Duplicate reconciliation converges on one winning payment and one order redemption. Refund completions are immutable and uniquely associated with the original order; refunds never restore coupon capacity.
- Existing activation page already supports Apply/Remove, responsive plan selection, discounted base/GST/total, server feedback, aborting stale requests, plan-switch revalidation and current Terms/Refund acknowledgements.

Gaps corrected: source labels lacked stable influencer identity; preview did not check consumed/reserved capacity or prior use; admin reporting exposed counts rather than authoritative revenue/refund metrics; reconciliation prematurely marked held/unverified captures as redeemed.

Existing initial-membership/unresolved-order protection remains. This phase does not implement renewal checkout. Different coupons have independent user/coupon keys and can be previewed independently; that does not authorize overlapping memberships.

## B. Reused components

Membership quote/calculation, admin coupon creation/status commands, applicability, immutable order snapshots, reservation capacity/uniqueness, Razorpay durable intent/recovery, capture-time reconciliation, membership fulfillment and authoritative full-refund completion are retained. Legacy LMS coupon/payment code is untouched. No dependencies or lockfile changes.

## C. Influencer/campaign model

New `workspace_influencers`: stable UUID, display name, optional internal description, active/inactive status, created/updated actors/timestamps and optimistic version. No contact details, login or role is introduced. `workspace_influencer_history` stores immutable version snapshots appended by a database trigger.

Coupons gain nullable `influencer_id` with restrictive FK. New influencer coupons require a selected active identity. Historical coupons remain nullable and are displayed as historical/unattributed; no identities are guessed or backfilled. The existing whole-row immutable definition guard includes the new link automatically. Reassignment is prohibited, even before payment. Display-name edits do not move historical attribution; frozen order source labels remain intact.

## D. Admin management

Existing `/admin/workspace/coupons` now includes an influencer directory/create/edit form and an active influencer selector when creating an influencer coupon. Existing fixed/percentage, plans, date, cap and pause/reactivate/archive controls remain.

New `/api/admin/workspace/influencers` GET/POST/PATCH use persisted admin authorization, bounded JSON, same-origin mutations, no-store responses and strict identifiers/version validation. Services additionally lock/recheck the persisted admin role. Create UUIDs support replay of the same creation payload; edit versions reject stale writes. Directory returns the most recent 500 records; coupon list retains 20-row pagination. Larger directory pagination is a future usability extension, not financial correctness behavior.

Coupon economics/applicability/attribution cannot be edited in place. Influence status/display-name/description can be edited prospectively with history; pause/expiry never reprice a legitimately accepted order.

## E. Coupon input/plan UX

Reused activation Apply/Remove, positive discount preview and complete GST/total display. New understandable capacity/previous-use feedback and inactive influencer refusal. Preview stays advisory/read-only, never reserves or fulfills. Changing plans invalidates the old quote and revalidates applicability. Failed coupon validation prevents Checkout. Existing agreement receipt gates remain.

Static React rendering and fake route/service checks passed. No hydrated browser, mobile screenshot or real-database UI verification is claimed. Admin additions use existing typography, border/color tokens, responsive grids, labelled fields, disabled pending actions and live feedback.

## F. Discount/GST calculation

Quarterly 499900 + 89982 = 589882; half-yearly 899900 + 161982 = 1061882; yearly 1699900 + 305982 = 2005882 paise, INR. Prices, durations, launch/start rules unchanged.

10% Quarterly: discount 49990; taxable 449910; GST 80984; payable 530894. Fixed ₹500 Quarterly: discount 50000; taxable 449900; GST 80982; payable 530882. Discounts precede GST; integer half-up only. Zero-rounded actual discounts are now refused, alongside negative/overflow/free economics. The client cannot supply final money or multiple discount identities.

## G. Reservation and capacity handling

Reused locked acceptance and DB uniqueness/capacity checks. Outstanding reservations consume capacity across Test and Live modes. Browser closure, timeout, local expiry and ambiguous provider state never release capacity. Safe release retains its historical row and evidence hash. Final-slot and same-user duplicate scenarios run against a serialized deterministic fake store; they are not real PostgreSQL race proof.

## H. Same-coupon once-per-paid-user

Existing ledger pair uniqueness remains authoritative. Preview now rejects an existing reserved or redeemed pair. Released unpaid reservations do not consume a successful paid use. Other coupon identities remain independent; no global once-ever coupon rule exists. Refunds do not delete/redact/release the redeemed pair.

## I. Paid redemption

Correction `d5e4c8c`: captured money held for unverified timing, expired eligibility or refund review stays reserved. Only authoritative accepted capture without business/reservation conflict transitions to redeemed. Monetary evidence is retained even while held. Later authoritative reconciliation can convert the same reserved row, once.

New migration adds a future-transition guard requiring captured order, non-null paidAt, non-held activation and exact captured winning payment timing/amount/currency. Historical rows are not rewritten. Reporting independently excludes held/unverified history even where an earlier implementation marked it redeemed. Historical consumed capacity remains conserved.

Membership creation still follows the normal separate fulfillment path. A confirmed paid order is distinct from a fulfilled membership conversion.

## J. Refund behavior

Original redemption, influencer link, pricing, capture and membership evidence remain. Reporting joins immutable `workspace_refund_completions`; only confirmed full refunds reduce net captured revenue. Requests/approvals/processing observations do not count as completed refunds. Original GST/discount/gross remain displayed, with refunds separately shown. Duplicate completion keeps one completion and one consumed redemption. Fake regression confirms same-code reuse and additional capacity remain denied after full refund.

## K. Influencer attribution

Authoritative relationship: redemption → immutable order coupon ID → immutable coupon influencer ID. No public client influencer ID is accepted at order acceptance. Admin-created labels are descriptive; the persisted FK supplies identity. Renaming an influencer changes its current display name only; pausing either identity or coupon prevents prospective reservations, not later reconciliation of frozen orders.

## L. Admin conversion reporting

Existing protected coupon financial endpoint now returns one read-consistent authoritative aggregate report per coupon, with its influencer identity/name. UI defaults to Live commercial revenue; Test evidence is explicitly selectable and never merged with Live revenue. Capacity spans both modes for safety.

Definitions:

| Metric | Definition |
| --- | --- |
| Reserved capacity | All still-reserved ledger rows, including held/uncertain outcomes |
| Consumed paid capacity | All immutable redeemed rows, including retained historical held rows; not asserted to equal confirmed conversions |
| Safely available slots | max(0, cap − reserved − redeemed); null means unlimited |
| Released reservations | Proven safe pre-provider releases; not paid conversions |
| Held captures | Captured/held orders in selected provider mode; excluded from confirmed sales |
| Confirmed paid orders | Redeemed reservation, captured order, paidAt matching exact captured winner; no held ambiguity, except an independently completed full refund |
| Paid membership conversions | Confirmed paid orders with their unique fulfilled membership |
| Fully refunded conversions | Confirmed paid orders with authoritative full-refund completion equal to original total |
| Net retained memberships | Fulfilled paid conversions without full-refund completion |
| Original attributable base | Sum frozen pre-discount order base |
| Discounts | Sum frozen actual discount paise |
| Original GST | Sum frozen GST on the original attributable sales, before refunds |
| Gross captured | Sum frozen exact paid total |
| Confirmed refunded | Sum authoritative full-refund completions |
| Net captured | Gross captured minus confirmed refunds; explicitly not profit |

SQL aggregates use immutable order/payment/refund/member evidence and scoped joins, not current discounts or PostHog. Aggregate money/counts are decimal strings; money formatting uses BigInt, preventing sum precision loss. No customer contacts or provider/payment/refund identifiers are selected into the response. SQL compilation/structure and fake service/route checks pass; actual query execution/fixture totals must be verified in the next authorized real-DB phase.

## M. Concurrency/idempotency

Existing and new deterministic fake tests cover last slot, same-user simultaneous keys, duplicate accepted request, provider-create response loss, receipt recovery, expired local hold with uncertainty, safely released unpaid order, browser-independent reconciliation, pause after acceptance, refunded capacity, different coupon independence, same-coupon denial, duplicate capture/completion, stale quote/plan/applicability and invalid money. Existing service/unique constraints are reused, not replaced by client state. New SQL guard takes user then coupon locks; provider HTTP remains outside SQL transactions.

## N. Security/privacy

Persisted role checks deny anonymous/creator/missing/demoted admin. Version/input/origin/body bounds fail closed. Database influencer actor/version/origin/history and new reservation/paid-transition guards add enforcement. Coupon/status audit guards remain. Admin screens remain `ph-no-capture`, APIs private/no-store. Analytics continues bounded outcome/plan enums without code, influencer identity, personal data, provider identifiers or notes. No secrets or environment values copied into source/report. No new influencer-facing/public reporting, accounts, commission or payouts.

## O. Migration

`drizzle/0023_chubby_jimmy_woo.sql` generated with repository `pnpm db:generate`, with reviewed trigger additions. New snapshot `drizzle/meta/0023_snapshot.json` and journal entry. **Unapplied**: no migration command or database connection occurred. No edits to SQL migrations 0000–0022. Source-only second generation: “No schema changes, nothing to migrate.” Trigger behavior requires separate real-DB verification; generation does not execute PL/pgSQL.

## P. Historical compatibility

No data rewritten/deleted or guessed backfill. New nullable linkage preserves old coupon reads. Existing held redeemed history stays consumed and is excluded from confirmed attribution by authoritative reporting predicates. No order snapshot format change; existing snapshot equality guards remain compatible. Source relationships never reassigned. No financial, notice/email, membership/profile/course or legacy LMS infrastructure changed beyond the stated coupon correction/integration. No genuine provider calls.

## Q. Tests/build

Completed successfully on final implementation:

- `pnpm validate`: 5 pure test files; 77 Vitest files / 963 tests; TypeScript and lint.
- This includes coupon/model/preview, financial order/provider/webhook/recovery, eligibility, both agreements, refund lifecycle, activation, creator/profile, course review/builder, persisted admin/security and relevant legacy LMS tests.
- Payment-disabled production `pnpm build`: successful isolated source copy, no `.env`, fake unreachable DB target, no provider credentials, cached font responses; temporary build copies removed.
- Source-only `pnpm db:generate` no drift; `git diff --check` clean.

Expected mocked error-path console messages do not indicate real private-service calls. New financial/admin tests are fake-based. Real SQL triggers, report sums, two independent PostgreSQL session races and hydrated UI remain unexecuted by design.

## R. Files changed
- `app/(admin)/admin/workspace/coupons/page.tsx`
- `app/api/admin/workspace/coupons/[id]/financial/route.ts`
- `app/api/admin/workspace/influencers/route.ts`
- `components/workspace/WorkspaceCoupons.tsx`
- `components/workspace/WorkspaceInfluencers.tsx`
- `drizzle/0023_chubby_jimmy_woo.sql`
- `drizzle/meta/0023_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/membership/influencers.ts`
- `lib/workspace/membership/model.ts`
- `lib/workspace/membership/reporting.ts`
- `lib/workspace/membership/service.ts`
- `lib/workspace/payments/service.ts`
- `tests/admin-route-authorization-policy.test.mjs`
- `tests/routes/workspace-influencer-admin.test.ts`
- `tests/routes/workspace-influencer-coupons.test.ts`
- `tests/routes/workspace-influencer-routes.test.ts`
- `tests/routes/workspace-membership-service.test.ts`
- `tests/routes/workspace-membership-ui.test.ts`
- `tests/routes/workspace-payments-fixtures.ts`
- `tests/routes/workspace-payments-inbox.test.ts`
- `tests/routes/workspace-payments-routes.test.ts`
- `tests/routes/workspace-payments-service.test.ts`
- `WORKSPACE_LAUNCH_INFLUENCER_COUPONS_IMPLEMENTATION.md`

## S. Remaining blockers

Next separately authorized phase must apply/replay migration 0023 through guarded migration workflow, execute new triggers including malformed direct SQL, verify historical compatibility and true two-session capacity/pause/admin races, run aggregate reporting against paid/held/refunded/unattributed fixtures in both modes, and exercise the hydrated admin/activation UI. No public charging approval follows from this implementation result. Existing verified-email/real notice-delivery and other launch gates remain separate and unchanged. Renewal checkout, commissions, influencer accounts, pre-registration and Phase 1.9 are outside scope.

## T. Recommendation

**INFLUENCER COUPON IMPLEMENTATION READY FOR REAL DB VERIFICATION**.

Source implementation, deterministic regression validation and payment-disabled build pass. This is not a real-DB or public-launch PASS. Commits: `d5e4c8c` correction; `3887136` implementation; this report is committed separately. Stop after Phase E; do not apply migration or enable payments.
