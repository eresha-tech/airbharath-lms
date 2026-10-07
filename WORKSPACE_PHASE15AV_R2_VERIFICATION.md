# Workspace Phase 1.5AV-R2 verification

Date: 7 October 2026. **Phase 1.5B BLOCKED.** Test Mode only; synthetic development fixtures retained. No migrations, production/staging access, deployment, public payment, or Phase 1.5B implementation.

## A. Provider baseline

Read the Phase 1.5A, 1.5AV-DB and first Razorpay verification reports. Prior observed receipt misses, duplicate receipts and auto-capture remain authoritative observations. Dedicated Workspace namespace uses the approved shared Test API pair. Verification wrapper checks test-key prefix, mode=test, localhost:5433/airbharath_lms and absent permanent enablement, excludes other private service credentials, and sets development runtime. Read-only TCP/socket identity matched system 7680462735222304705/database OID 16384. All 13 migration entries 0000–0012 match reviewed hashes. No secrets printed or committed.

## B. Bounded enumeration recovery method

Temporary harness used actual local acceptance/eligibility/quote services and actual Razorpay adapter. A synthetic admin created a fixed-discount Workspace coupon with capacity five; three synthetic students/orders consumed three reservations. Before provider calls, normal service committed create intent/count=1. Each scan used GET /v1/orders with from/to/count/skip, without receipt filtering. Time window began floor(intent Unix seconds)-30 and ended min(ceil(local response-observation time), floor(intent)+30). This is a narrow attempt-specific interval, not merchant-history enumeration. Page size one deliberately permits observing pagination if populated; hard cap 50 pages fails closed. It checks receipt, amount, INR and provider creation window locally. Account/mode are scoped through the configured authenticated adapter, not independently proven by a webhook.

The known failure-scenario order's provider creation time was 480 ms before local intent. The 30-second lookback comfortably covers this observed truncation/skew; it is not a guarantee of every provider clock.

| Scenario | from (Unix seconds) | to (Unix seconds) | Page size | Pages read | Orders inspected | Exact matches |
|---|---|---|---|---|---|---|
| 1 | 1791366342 | 1791366374 | 1 | 1 | 0 | 0 |
| 2 | 1791366343 | 1791366375 | 1 | 1 | 0 | 0 |

Both responses were HTTP 200 with empty items. Delayed retries used the identical windows and again returned one empty page, zero inspected, zero matches. An empty terminal page exhausts the returned set, but cannot prove provider inventory completeness when known created orders are missing. Populated multi-page traversal was NOT verified. No unrelated merchant/order details retained or reported.

## C. Lost-response recovery result

One real Test Mode create POST succeeded; its ID was deliberately discarded before attachment and wrapper threw ambiguous failure. Actual local order stayed recovery_required/unpaid with count=1. Bounded enumeration found zero, so no attachment occurred. Coupon remained reserved. No replacement POST or release. Exact-one direct re-fetch/attachment could not be exercised because enumeration yielded no candidate.

## D. Duplicate-receipt ambiguity result

Separate controlled synthetic fixture deliberately made two approved Test Mode create calls with the same receipt, then discarded results and left local recovery_required. Both POSTs returned 200. Bounded and delayed scans returned zero candidates, so genuine multiple-match detection is NOT proven. Normal application did not issue replacements; the two calls exist only in the explicitly authorized duplicate fixture. Reservation remains reserved; no arbitrary attachment, deletion or creator access.

## E. Recovery implementation changes if any

None. R2 explicitly conditions implementation on real evidence proving the bounded approach reliable. That condition failed. Do not add an automatic enumeration fallback or claim that receipt-filter results establish an exhaustive candidate set. Existing one-create intent and conservative ambiguity controls remain unchanged. Positive bounded enumeration, complete pagination, exactly-one direct revalidation and real duplicate refusal still require evidence.

## F. Genuine failed-payment result

PARTIALLY VERIFIED. Used the official documented declined-card simulation in Test Mode, only published test card data, random synthetic CVV/future expiry, example.invalid email and synthetic contact. Card saving unchecked and tokenization prompt declined. Checkout stalled at Sending OTP; no mock failure selector/OTP input appeared. Initial direct fetch reported payment pay_TkyTYG31pZ6Jzu as created/uncaptured. Later direct fetch reported the SAME payment failed/uncaptured with amount=589764 INR and amount_refunded=0. Actual error categories: BAD_REQUEST_ERROR / payment_cancelled / customer / payment_authentication. This establishes a genuine cancellation failure, not the intended documented card_declined simulation. Genuine provider failed-state evidence therefore exists; no signed request was corrupted and no provider event fabricated.

Final collection also revealed a SEPARATE captured payment pay_TkyX75LUvIIo88 against the SAME order order_TkyQoPEZSlRsJl. Creation timestamps: failed attempt 1791366531; captured attempt 1791366732. The agent did not intentionally complete a retry or observe its UI; do not infer its cause. The failed-only local interval was not independently observed before captured evidence became available. Complete actual provider reconciliation correctly records both observations, one captured winner and captured-held final state. These observations do not justify claiming every failed-only acceptance criterion passed.

## G. Retry-on-same-order observation

Provider evidence shows a failed and a captured attempt sharing the original provider order, which demonstrates multiple attempts on that context in this observed sandbox run. A deliberate retry UI/action was not observed, so the controlled retry contract remains unresolved. Original provider ID and provider_request_count=1 remain unchanged; no automatic replacement provider order.

Before final capture reconciliation, all three coupon reservations were verified reserved. After actual complete reconciliation, the two ambiguous orders still retain reserved capacity; the genuine captured order redeems exactly once. One winner only. Failure itself does not release capacity or grant access; an isolated failed-only local state before later capture was not measured.

## H. Test webhook environment

No approved dedicated publicly reachable HTTPS Workspace Test webhook exists. Workspace webhook secret remains absent; LMS webhook/secret untouched. No tunnel, request collector, staging target or production infrastructure provisioned or accessed. Webhook sections remain blocked under the explicit brief.

## I. Genuine payment.captured evidence

Unavailable. No synthetic event passed off as genuine provider delivery.

## J. Capture timestamp comparison

Unavailable without actual event. Payment created_at remains creation metadata. No local callback/fetch/receipt time adopted as capture time.

## K. Proposed paidAt evidence rule

Candidate only: genuine, HMAC-verified payment.captured top-level created_at, correct account/order/payment/amount/currency, durable evidence, secondary captured-state fetch, versioned source razorpay_payment_captured_event_v1. NOT approved or implemented without real webhook evidence.

## L. 72-hour deadline verification

No authoritative paidAt, so no deadline derived. Two ambiguous R2 orders are unpaid with null dates. The third is genuinely captured/held_for_review, also paidAt=null and refundEligibleUntil=null. Prior captured orders remain held with null dates; implementation unchanged. Prior deterministic/real-DB timing checks are not genuine provider capture-time evidence.

## M. Callback-before-webhook result

No genuine callback completed in R2. Actual provider reconciliation fetched the successful second payment and correctly recorded captured-held state without dates or creator access. Prior phase verified genuine callback/fetch captured-held behavior. A genuine later-webhook transition remains unavailable, not simulated into approval.

## N. Webhook-before-callback result

Not exercised: no approved receiver/genuine webhook.

## O. order.paid observations

No genuine event received; no timestamp fallback or arrival-order assumption.

## P. Webhook duplicate/order behavior

Not exercised against genuine provider resend/retries. Existing inbox/monotonic controls unchanged.

## Q. Account binding

Configured merchant account format validated; authenticated Test API namespace used. Genuine webhook account_id comparison still pending. No guessed identity or relaxed account validation.

## R. No-creator-access verification

Actual local journey for all three synthetic students: hasCreatorAccess=false, hasPaidEntitlement=false; roles student, enrollments zero. Creator-profile/membership tables absent. No creator access, Basic entitlement, course drafts or membership created. Course-author schema has no user ownership link and no R2 implementation introduces ownership.

## S. Public-gate verification

Normal payment configuration disabled; production NODE_ENV rejects temporary enablement. Activation source still shows Payment activation coming next. Harness is temporary, loopback-only and synthetic-session authenticated with session-bound CSRF for financial operations. No hidden route or testing backdoor committed. No permanent enablement flags or new credentials written in R2. Temporary loopback server and browser tab stopped; no ephemeral enablement flags remain.

## T. Tests/validation

Full pnpm validate completed successfully: 5 Node tests, 421 Vitest tests in 35 files (including provider/payment regression coverage), TypeScript and lint. No implementation/test-source changes required. Isolated cached-font production build passed, including 59/59 static pages; service credentials cleared, unreachable synthetic build database, no deployment. git diff --check passed.

## U. Corrections/commits

No recovery/provider implementation correction: evidence gate not met. Only this report changes in the repository. Temporary verification harnesses reside under /tmp, contain no embedded credentials and are not deployed/committed. Synthetic audit/eligibility/financial fixtures retained, not reset/deleted.

## V. Remaining blockers

1. Provider bounded collection visibility: known-created orders absent in immediate and delayed narrow scans. Need a supported, observed complete candidate enumeration with pagination and positive/duplicate cases. Keep operational review and reservations until resolved; no blind second create POST.
2. Controlled failed-payment lifecycle: genuine failed/uncaptured evidence now exists, but an additional captured attempt appeared on the same order without a guided retry observation. Need a controlled failed-only interval and supported retry-flow explanation/verification.
3. Dedicated approved HTTPS Test webhook and separate secret: genuine HMAC/event-ID/account/capture-event timestamp evidence, duplicate/order convergence and secondary provider confirmation missing.

Provider contracts used: [Fetch All Orders](https://razorpay.com/docs/api/orders/fetch-all/), [Checkout test methods](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [Test card details/error simulation](https://razorpay.com/docs/payments/payments/test-card-details), [Webhook validation/testing](https://razorpay.com/docs/webhooks/validate-test/). Current docs describe receipt uniqueness and supported filters; observed sandbox duplicates and missing receipt/bounded collections contradict relying on those claims. The documentation's card mock controls were also not reached in this run. Retain observed-state uncertainty.

## W. Recommendation

**Phase 1.5B BLOCKED** on the three provider evidence gaps above. Safe V1 invariant frozen: escaped/ambiguous intent never authorizes blind replacement, release, second checkout or creator access; unresolved cases remain recovery_required with operational review and occupied capacity. No Phase 1.5B implementation.
