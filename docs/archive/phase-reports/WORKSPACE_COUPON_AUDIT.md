# Workspace Phase 1.1 — LMS Coupon Audit

Reviewed 2 October 2026. This is a code-level audit, not a production-data or Razorpay-account audit. No coupon, payment, enrollment, billing or membership implementation was changed. Future Workspace commercial terms are context only: ₹5,000 + GST per quarter, campaign offers such as ₹3,900 + GST, and a later sales commission are not implemented.

## Current Coupon Architecture

The [coupon schema](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/db/schema.ts:264) stores `id`, unique `code`, nullable text `discountType`, numeric `discountValue`, optional `expiryDate`, optional `usageLimit`, and `usedCount` defaulting to zero. There is no coupon scope, course applicability relation, campaign metadata, start date, enabled/archive state, user restriction, reservation, or redemption ledger. `discountType` and the monetary/limit fields have no application-specific database check constraints.

The [admin page](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(admin)/admin/coupons/page.tsx:11) loads coupon rows. [CouponsClient](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/admin/CouponsClient.tsx:155) provides creation, search, filters, aggregate counters, details and deletion. Percentage/flat choice and minimum/maximum input values are browser-side restrictions. The [creation API](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/admin/coupons/route.ts:42) uppercases/trims codes, writes request values directly, and parses the usage limit. It does not enforce a strict discount-type enum, positive finite amounts, percentage ≤100, integer positive limits, or a valid expiry policy. Persisted admin-role authorization exists. Raw exception messages are returned by the admin endpoints. Deletion removes the coupon row rather than archiving it. There is no edit endpoint or redemption-history query in this implementation.

The [public validation endpoint](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/coupons/validate/route.ts:5) looks up a normalized code, checks expiry and the current count, and calculates a preview from the client-provided `amount`. It does not require a user, reserve a redemption, persist a validation attempt, or validate an authoritative catalog price. No abuse limiter is present in this handler.

## Exact Current Redemption Behavior

| Requested question | Verified answer |
| --- | --- |
| A. Is `usedCount` incremented? | **No.** Code search found the schema default and readers in validation, order creation and admin views, but no increment/update in the payment/enrollment flow. Both relevant routes only read it. |
| B. Does `usageLimit=100` definitely block customer 101? | **No.** New coupons remain at zero unless an external/manual operation changes them. Even when the count has reached the limit, order creation ignores the discount and continues at full price. |
| C. When is usage consumed? | **Never in the inspected application code:** not at validation, order creation, payment verification or enrollment. |
| D. Is coupon use stored on an order? | **No.** The order schema and insert have no `couponId`, code snapshot, original price, discount amount or redemption ID. Razorpay notes also omit the coupon. |
| E. Can we reliably identify “47 paid users from CAPTARJUN”? | **No, not from transactional records.** Best-effort browser analytics may provide clues but cannot establish an exhaustive or authoritative paid cohort. |
| F. Can entered / checkout / paid / enrolled be distinguished? | **Partially.** No coupon-entry or validation-success event is emitted by the apply handler. Browser enrollment/checkout events include coupon code; server payment/enrollment events do not. Order/payment/enrollment records exist, but are not linked to a coupon or entered-code attempt. |
| G. Two users use the final slot simultaneously? | Both can read the same count and receive discounted orders. There is no reservation or atomic coupon mutation. Currently neither completion consumes the slot at all. |
| H. Invalid coupon silently ignored at checkout? | **Yes.** Unknown, expired and exhausted coupons can continue at full price. A found `ABCOMBO` coupon on the wrong course is an explicit exception returning 400. |
| I. Limits global, per-user or per-course? | Intended as one global counter per coupon, but not actually consumed. There are no per-user or per-course limits. |
| J. Can one user use a coupon repeatedly? | **Yes in code.** No prior-redemption check exists; another order can be created. The existing enrollment can subsequently be updated. |
| K. Can coupons target products/campaigns? | No general one-course, multiple-course, bundle, Workspace-membership or campaign restriction. Only the hardcoded `ABCOMBO`/`combo-pack` rule exists. A code named after an influencer has no modeled campaign semantics. |
| L. Can admin view redemption history? | **No.** The UI displays the coupon's count and limit, not the users, orders, payments or amounts behind each redemption. |

Exact counter checks are [validation lines 43–52](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/coupons/validate/route.ts:43) and [order creation lines 38–50](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/payments/razorpay/order/route.ts:38). The payment verifier imports `orders`, `enrollments` and `courses`, not coupons. Its mutations transition an order to paid and create/update enrollment; it has no coupon write.

## Does Usage Limit Actually Work?

It is a read-only eligibility check against a counter that this application never advances. A manually supplied count can make validation reject the coupon, but checkout still accepts the course purchase at full price. It is not a cap on successful paid redemptions and cannot support a 100-creator offer safely.

`usageLimit=0` is treated as unlimited because both handlers use a truthiness test. A negative stored limit is truthy and can reject every validation, while checkout silently falls back to the full price. The admin API lacks strict server-side validation to prevent such values. Blank/null limits are intended to mean unlimited.

Expiry checks use `expiryDate < now`. There is no start date or explicit expiry timezone/end-of-day policy; an HTML date input is converted to a timestamp by the API. The exact expiry timestamp is still eligible at equality. Expiry is checked when validating/creating an order, not when payment succeeds, so an already-created discounted order can remain payable afterward.

## Discount, Course and Bundle Behavior

Percentage, `flat` and legacy `fixed` values are recognized by both public handlers. Unknown types can validate successfully with no discount. Negative or oversized values are not rejected server-side: negative values can increase a checkout price; values over 100% or a flat discount over price are clamped to zero. Preview and order creation round separately and discard paise precision. For example, ₹99.01 at 50% produces a ₹49 validation preview but a ₹50 order because one path rounds the discount before subtracting and the other rounds the discounted total.

The validator trusts `amount`; checkout correctly recalculates from `course.price`. Thus a manipulated preview is not authoritative pricing, but the user can see inconsistent values. Neither handler uses a shared immutable quote.

`ABCOMBO` checks the course slug `combo-pack`, rather than the general `isBundle`/bundle-items model. Validation also accepts an amount ≥₹2,000 when no course ID is provided; actual order creation still requires the correct slug. Other coupons apply to any course, including bundle course records. [Bundle entitlement](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/course-access.ts:84) derives access from the purchased parent course and bundle-item relationships, not coupon applicability.

Zero-price and 100%-discount purchases still enter the Razorpay order path with `amount: 0`; there is no distinct zero-price enrollment path here. The button can say “Enroll Free,” but does not implement free checkout. Razorpay's [Orders documentation](https://d6xcmfyh68wv8.cloudfront.net/docs/api/orders/) documents a minimum INR order amount, so this path is not a working free-purchase design. No live order was created during this audit.

## Can Influencer Attribution Work Today?

Not reliably. [EnrollButton](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/EnrollButton.tsx:131) captures `enrollment_started` and `checkout_started` with `coupon_code`; the latter includes the Razorpay order ID. [Server payment events](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/payments/razorpay/verify/route.ts:145) include internal/provider order IDs and amount, so a complete analytics dataset could be joined to infer some conversions. Browser blocking, missing events, abandoned checkout and lack of coupon snapshots mean it is not an accounting ledger. The apply handler does not record code-entry counts. Membership activation and renewal do not exist.

Campaign metadata should initially live directly on the coupon: `campaignName`, controlled `sourceType`, and `sourceName`. For `CAPTARJUN`, these can be Captain Arjun Launch / influencer / Captain Arjun. Keep a separate campaign entity for a later requirement involving multiple codes per campaign, shared budgets or independently managed campaign lifecycles. Archive coupon definitions to preserve attribution; do not hard-delete used coupons.

## Race/Concurrency Risks

Current check-then-create allows all callers that read the final available count to create discounted orders. Updating a counter only after payment would not solve the full problem: customer 101 may already have been charged before an atomic update rejects fulfillment.

For a strict maximum of 100 successful **paid** redemptions, use temporary checkout reservations and a durable redemption ledger. Validation alone must not consume inventory. In a short database transaction, lock the coupon row or atomically claim a slot only when `successfulCount + activeReservations < usageLimit`. Record the pending reservation against a unique checkout/order identifier, then create the provider order outside the database transaction. Reconcile provider creation failures without blindly discarding an ambiguous order outcome. PostgreSQL [row-level locking](https://www.postgresql.org/docs/17/explicit-locking.html) provides the necessary serialization when used consistently by every admission/completion path.

On an authenticated, provider-confirmed captured payment, transactionally mark the order paid, turn its reservation into one successful redemption, increment the count once, and create the entitlement. Use uniqueness on provider payment/order references and successful redemption order IDs so webhook retries cannot consume another slot. Fulfillment side effects such as email/PDF generation belong after commit and need recovery/idempotency.

Do not release a reservation solely because a local timer expired while its discounted provider order can still be paid. Otherwise the released slot can be sold again and a late payment can exceed the cap. Choose a provider-verified terminal/closure policy, or a manual-capture flow that secures inventory before capture, with explicit late-payment reconciliation. Razorpay documents [late authorization and webhook behavior](https://github.com/razorpay/markdown-docs/blob/master/webhooks.md). If an unexpected captured payment arrives without an eligible slot, quarantine/refund through an approved operational process; do not quietly activate membership or treat a post-charge rejection as prevention of the 101st payment.

Permanent successful-redemption counts remain separate from reservations. Define refund behavior explicitly: recommended default is to retain historical successful-redemption counts and report refunds separately rather than automatically reopening campaign inventory. A free redemption must not count as a successful **paid** redemption; if free offers are needed, specify a separate policy.

## Payment/Order Relationship

[Orders](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/db/schema.ts:204) store user/course references, a unique Razorpay order ID, payment ID, one amount, status and creation time. [Order creation](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/api/payments/razorpay/order/route.ts:66) creates the provider order before inserting the local pending order. A local insert failure can leave a provider order without its local record.

The verifier validates HMAC input/configuration, checks order ownership, detects conflicting/replayed payment IDs and atomically transitions `pending` to `paid`. Those are useful protections. It does not fetch the provider's captured state/amount/currency or implement a Razorpay payment webhook. Only the video-transcoding webhook exists in the inspected API tree. Provider [captured-payment events](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md) represent completion separately from signature verification; live dashboard capture settings were not inspected.

Paid order transition and enrollment creation are separate writes. If enrollment fails after the transition, a retry can return “already verified” before repairing enrollment. Two different orders for one user/course can race on the enrollment uniqueness constraint. Coupon counts and immutable financial attribution are absent throughout. Invoice generation is best effort after these operations, not an atomic part of fulfillment.

[Invoice generation](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/invoice-generator.ts:19) treats the stored order amount as GST-inclusive and backs out a fixed 18% tax. It lacks original price, discount, coupon and tax-policy snapshots. Future “₹5,000 + GST” membership pricing must not silently reuse that assumption. Record base/discount/tax/total separately with an approved tax treatment.

## Required Changes Before Workspace Activation

1. Strict server-side coupon and monetary validation; reject invalid, expired, inapplicable or exhausted codes at order creation rather than silently charging full price.
2. Separate `course_purchase` and `workspace_membership` scopes and make every checkout enforce them. Keep product targeting as a separate relation/field; do not overload scope with values such as `specific_course`.
3. Immutable coupon/price/tax snapshots on orders and a durable, uniquely keyed redemption/reservation ledger.
4. Atomic capacity admission and captured-payment reconciliation, including duplicate webhooks, late payments, expiry, abandoned orders and refunds.
5. Transactional entitlement creation with recoverable invoice/email side effects and an explicit zero-price policy.
6. Campaign metadata, successful-redemption reports and distinct validation/checkout/paid/activation/renewal instrumentation.

None of these coupon/payment changes were implemented in Phase 1.1. Existing defects are recorded for a separately authorized checkout-hardening phase.

## Recommended Future Coupon/Redemption Model

Keep `coupons` and extend it with controlled `scope`, controlled `discountType`, nonnegative paise/basis-point discount representation, nullable positive `usageLimit`, `startsAt`, `expiresAt`, enabled/archive state, campaign/source metadata and creation attribution. `usedCount` can be a transactionally maintained cache of successful redemptions, never the sole history. Add product applicability only as needed: one course FK for strictly single-course offers, or a small coupon-products relation if multiple-course offers are required. Bundle offers target the parent course. Workspace membership offers target a membership plan/term, never an LMS course.

Use `coupon_redemptions` for reservation and completion states rather than adding a second inventory-history table immediately. Suggested fields: ID, coupon ID, purchasing principal ID, purchase scope, internal order ID, unique checkout/idempotency key, reservation state and deadline, original base amount, discount amount, tax amount, final amount, currency, redeemed/captured timestamps, and immutable code/campaign snapshots. A pending reservation may exist before its provider order ID is known. Keep the last recorded error category for operational reconciliation without raw provider bodies.

Reuse a common purchaser/user reference if the eventual Workspace model uses existing users. Introduce a creator-specific FK only when that authorized phase defines it; Phase 1.1 applications are not creator accounts. Add uniqueness per order/redemption and provider payment ID, not a global per-user uniqueness rule unless the commercial policy expressly limits one use per creator. Do not create two nullable purchaser fields without a check ensuring exactly one valid owner.

For membership activation and renewal, the future payment must reference a durable membership term and original acquisition attribution. Initial acquisition and renewal redemption are separate reporting concepts; do not overwrite the acquiring campaign when a creator later renews without a coupon.

## Recommended Admin Report

| Coupon | Scope | Campaign / source | Discount | Successful paid redemptions | Active reservations | Limit | Gross billed | Discount given | Tax | Net collected | Refunds | Paid activations | Renewals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAPTARJUN | workspace_membership | Captain Arjun Launch / influencer | ₹1,100 off base | ledger-derived | pending only | 100 | before discount, tax stated separately | sum of snapshots | sum of snapshots | captured receipts, refund policy explicit | separate | completed term activations | acquisition cohort renewals |

Define financial labels explicitly: list value is the original pre-discount quote; gross receipts are captured payments before refunds/fees, with GST reported separately; net collected subtracts refunds, and processor fees should be a distinct metric when available. Do not label the undiscounted list value as money actually collected. Provide a drill-down to individual orders/redemptions with dates and amounts. Code entered/validated, checkout started and captured payment are separate measures; browser event counts remain estimates, while financial counts come from the database. For durable entered-code counts, add a bounded attempt event/record with a checkout/anonymous session identifier and normalized coupon reference, not unrestricted raw text or applicant PII. Define unique people versus attempts clearly.

## Recommended Implementation Sequence

First approve pricing, GST treatment, scope, one-use/refund/free-offer rules and late-payment handling. Next harden the existing course coupon API and persist quotes/order snapshots. Then implement reservations, verified payment reconciliation and transactional fulfillment, tested with simultaneous final-slot requests. Add campaign metadata and ledger-based reporting. Only afterward, in an explicitly authorized Workspace activation phase, add membership terms, activation, renewal and related coupon scope. Test abandoned orders, duplicate/late webhooks, provider timeouts, final-slot concurrency, zero totals, refunds and attribution continuity before launch.
