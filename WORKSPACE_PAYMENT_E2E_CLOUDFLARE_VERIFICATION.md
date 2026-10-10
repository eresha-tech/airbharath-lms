# Workspace payment E2E — Cloudflare verification

Status on 10 October 2026: **WORKSPACE TEST E2E BLOCKED — authenticated browser dashboard confirmation pending.**

A genuine Razorpay Test Checkout payment of ₹5,898.82 passed through the authenticated callback, genuine signed Cloudflare webhook, authoritative provider capture-event time, exact 72-hour refund deadline, normal membership fulfillment, enabled Creator Profile and server-side Early Access entitlement. Actual browser dashboard/profile/draft verification is still awaiting the user's response; server capability checks alone are not reported as a full E2E PASS. Public payments remain disabled. No Phase 1.8 implementation.

## A. Environment

Only authorized development database `localhost:5433/airbharath_lms`, with runtime `DATABASE_ENV=development`. Socket `/tmp`:5433 and TCP identities matched before migration: database `airbharath_lms`, port 5433, OID 16384, PostgreSQL system identifier 7680462735222304705. No production/staging access, Live Mode, deployment, reset, schema push or migration-ledger manipulation.

Migration ledger before: 16 rows, 0000–0015, ending at timestamp 1791527685957. Every applied source SHA-256 matched the actual ledger. Applied only reviewed additive `0016_tired_prowler.sql`, using guarded `pnpm db:migrate` with command-local `ALLOW_DATABASE_MIGRATION=true`. Ledger after: 17 rows, ending at timestamp 1791632016797. The original 16 ledger rows were unchanged. Second guarded run succeeded as a no-op, with 17 rows. Applied migration source files were not edited.

## B. Phone/account reset

Used the final user-selected identity masked as `*******0035`. Inspected actual schema columns, foreign keys and triggers; scanned every public text/varchar/JSON/array column before mutation. One literal occurrence: nullable, unique `users.phone`. The old owner had one eligibility attempt, one Workspace financial order and one payment attempt, so deletion was inappropriate.

Transactionally cleared only the old mutable phone field. Preserved its user ID, all other fields and protected history. No deletion, trigger disablement, forced cascade or ownership rewrite. The phone was reusable and was subsequently used successfully for a fresh normal authentication identity. It is now attached to that fresh paid Test account; it must not be reset again merely for cleanup. No immutable literal occurrence required rewriting.

A post-detachment baseline covered 38 public tables. Final original-ID row fingerprints matched across all 38 after payment and fulfillment, preserving original LMS and retained Workspace/provider/review history. Full phone, OTP, cookie, signature and credential values are excluded from committed evidence.

## C. Test payment configuration

Workspace namespace only: key ID/secret/webhook secret/account ID configured, `WORKSPACE_RAZORPAY_MODE=test`, key ID prefix `rzp_test_`. Workspace webhook secret differs from the LMS secret. No LMS configuration/code changes or Live API calls.

Enabled payment only in a temporary isolated local development process, with both runtime authorization flags. No `.env` mutation or persisted authorization. Preserved the existing JWT configuration in process memory for the user's normal session. No OTP-provider calls initiated by verification code and no OTP/session credential requested or extracted.

## D. Cloudflare webhook configuration

Inspected the existing cloudflared process: forwarding target `http://127.0.0.1:3000`. Used the user's existing temporary HTTPS webhook; random hostname omitted from durable evidence. User confirmed Test Mode events payment.captured, payment.failed and order.paid. No new tunnel, software installation, DNS or LMS webhook change.

Before Checkout, unsigned requests to both local and tunnel receivers returned 403 signature errors, with the same temporary receiver marker. This established the actual forwarding path without writing payment evidence. The marker and minimal verified-event instrumentation existed only in the isolated temporary copy, not product source.

## E. Fresh eligibility flow

User completed normal authentication and eligibility. Actual pre-payment DB readback: one fresh identity, role=student, result=eligible, zero financial orders and zero memberships. No eligibility approval inserted. Original user/history remained unchanged after detaching the mutable phone.

## F. Price/order creation

Actual order: Quarterly, 3 calendar months, INR. Frozen integers: base 499900, discount 0, taxable 499900, GST 89982, total 589882 paise. Authenticated order POST returned 201. Normal service persisted the local order/intention before provider HTTP and attached one Razorpay Test provider order. No direct order/payment insertion or LMS order creation.

## G. Razorpay Test Checkout

User opened the official Checkout UI and completed a successful payment, reporting “paid”. Test QR scanning was unsuccessful; user was directed to Razorpay's official Test card flow. No real card/UPI/bank information requested. Provider Fetch Payment subsequently confirmed exact captured payment, order ID, ₹5,898.82 and INR under the Workspace Test credentials. No API-based simulated capture used.

## H. Browser callback

Actual authenticated confirmation POST returned 200. Existing route verified owner, callback signature and provider order/payment identity, then fetched provider evidence. Payment attempt first observed at `2026-10-10T11:31:20.512Z`. Before processing the durable capture event: financial=captured, activation=held_for_review, reason=capture_time_unverified, paidAt=null, refundEligibleUntil=null, memberships=0. Callback/fetch alone did not grant access or establish time.

## I. Genuine webhook delivery

Actual Cloudflare deliveries: order.paid and payment.captured, each accepted with 202 into the durable inbox. payment.captured received at `2026-10-10T11:31:07.744Z`; order.paid at `2026-10-10T11:31:07.697Z`. Both were later processed successfully by the normal scoped service. These were genuine provider deliveries following the user's Checkout, not signed synthetic probes.

## J. Webhook authentication

Raw bounded bytes were read before parsing and HMAC verified with the Workspace webhook secret. Required Razorpay event ID and expected account matched. Durable event identity and SHA-256 body hash were stored. Verified observations showed payment status=captured, captured=true, amount=589882 and currency=INR. Event order/payment IDs matched the local order and fetched payment; full IDs and signatures are omitted here. Tunnel origin was not used as authentication.

## K. Capture timestamp evidence

Actual payment.captured evidence:

| Observation | UTC time |
| --- | --- |
| Payment entity created_at / subsequent Fetch Payment creation time | 2026-10-10T11:31:02.000Z |
| Top-level capture-event created_at | 2026-10-10T11:31:06.000Z |
| Local webhook receipt | 2026-10-10T11:31:07.744Z |
| First callback/provider-fetch payment observation | 2026-10-10T11:31:20.512Z |

The verified capture event carries a later timestamp than payment creation and precedes local delivery/callback. Razorpay documents payment.captured as triggered when capture succeeds, and webhook payloads as event-time snapshots: [official Payments webhook documentation](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md). Together with the genuine captured snapshot and independent provider fetch, this supports adopting the provider capture-event timestamp under the versioned rule below. This is an evidence-policy inference; entity creation and local observation times were not substituted for capture time.

## L. paidAt rule

Real verification exposed the expected implementation gap: the existing fetch adapter deliberately supplied no authoritative capture time, the reconciler ignored authenticated event time, and application/database fulfillment guards allowed only legacy test_authoritative evidence. The failing service regression reproduced the capture_time_unverified hold.

Minimum correction: `razorpay_payment_captured_event_v1` uses only a non-anomalous authenticated durable payment.captured event matching account/mode/order/payment, independently fetched captured status, exact amount and INR. Event time must be valid, no later than receipt/current time and no earlier than payment/local-order creation. Clear only capture_time_unverified after valid timing; preserve other operational holds. Provider fetch remains conservative and never uses entity created_at as paidAt.

Additive migration 0016 permits this versioned source, requires matching durable capture-event evidence when adopting its time and rechecks it for membership fulfillment. Existing identity/time/history guards remain. No manual paidAt injection, Mark Paid, Fake Capture or Grant Creator route/button. Provider timing logic is independent of public-payment enablement; existing charging and development fulfillment restrictions remain in place.

## M. 72-hour refund deadline

Stored paidAt: `2026-10-10T11:31:06.000Z`.
Stored refundEligibleUntil: `2026-10-13T11:31:06.000Z`.
Actual difference: **259,200,000 milliseconds / 259,200 seconds**, exactly 72 elapsed hours. No date rounding.

## N. Financial reconciliation

Ran the existing normal service only for this fresh order's genuine events; no global batch and no reconciliation of prior retained held fixtures. After verified timing: captured/pending_activation, reason=null. After normal fulfillment: captured/fulfilled. One winning payment retained. No coupon used. No captured-history deletion or manual state forcing.

## O. Membership fulfillment

Existing normal fulfillment service created exactly one enabled Creator Profile and one Workspace Membership, then fulfilled the originating order. Two concurrent subsequent fulfillment attempts returned already_fulfilled and left one membership/profile. Role remains student.

Actual rollback-only PostgreSQL negative checks passed: capturedAt cannot be rewritten, immutable membership end cannot be changed, and a payment claiming the new source without a matching durable capture event is rejected with SQLSTATE 23514. No invalid fixture committed or constraint weakened to clean up history.

## P. Early Access

Server-side resolution: state=early_access, hasCreatorAccess=true, hasPaidEntitlement=true.
Quarterly start: `2026-11-08T18:30:00.000Z` (9 November 2026, 00:00 IST).
Quarterly end: `2027-02-08T18:30:00.000Z` (9 February 2027, 00:00 IST).
The paid term starts at official launch, not the Test payment date.

## Q. Creator dashboard access

Normal Creator service overview passed against the fresh paid account with creator capability enabled. User was asked to refresh/open `/workspace/dashboard` and confirm Early Access Active and the 9 November 2026 start date. **Actual authenticated browser dashboard result is pending.** No browser containing the user's session is available to the agent; no synthetic session/cookie was generated to substitute for the manual journey.

## R. Creator draft flow

Fresh paid-account profile save and private draft create/edit/reload were requested from the user; results pending. At server verification time, draft count was zero. Do not reuse prior Phase 1.7V results as this journey's proof.

## S. Course-review E2E if exercised

Not exercised in this payment journey. Optional and outside the mandatory payment PASS criteria. No publication or LMS course conversion.

## T. Callback/webhook ordering

Observed **webhook-first delivery but callback-first financial reconciliation**: genuine inbox receipts preceded the callback observation; because the worker was not yet run, callback/fetch produced the held/null-time state. Targeted capture-event processing then established time and normal fulfillment. This proves release of the callback-created hold without duplicated effects.

Regression tests separately cover webhook-first reconciliation without callback and callback-first reconciliation. A second genuine Checkout with absent/delayed browser confirmation was not performed; do not describe unit coverage as a second real provider E2E run.

## U. Duplicate webhook behavior

Two concurrent normal inbox receives using the already authenticated genuine event's exact stored identity/hash/evidence returned the same event without anomaly. Actual counts remained one event identity, one winner, one Creator Profile and one membership. This is an application/database duplicate-processing check; an external Razorpay resend/retry was **not observed** in this run.

## V. Failed-payment behavior if exercised

No genuine failed-payment event or failed-then-successful same-order scenario exercised. The unsuccessful QR scan is not classified as a failed provider payment. Existing failed/retry regressions passed; no replacement order was created for this successful journey.

## W. LMS isolation

All original-ID fingerprints across 38 baseline tables remained unchanged after phone detachment. No new rows in 20 legacy domain tables, including orders, enrollments, invoices, coupons, courses, authors, certificates and progress. Fresh identity and Workspace records are separate. No LMS Razorpay/code changes or prior WS15AVR-history promotion/cleanup.

## X. Public-payment gate after cleanup

Stopped the temporary payment-enabled app and restarted the ordinary repository development app on port 3000 with DATABASE_ENV=development and neither authorization flag. No flags persisted to `.env`; webhook observation/receiver-marker instrumentation was never added to repository source. Existing tunnel left for the user to stop/disable as desired.

Default UI: **Payments not yet enabled** / **Workspace payments are awaiting launch verification.** After restart, both the actual local and existing-tunnel webhook returned **503 disabled**. Process-environment inspection confirmed both flags absent; a final DB integrity check again preserved all original baseline rows. Production build with supplied Test flags and synthetic credentials still returned 503 disabled for order creation, confirmation and webhook before DB/provider access. Production probe was stopped. No public production charging enabled.

## Y. Corrections/commits

- `cd97dc3`: runtime-gated real Test Checkout UI/owner recovery wiring and accurate launch wording.
- `a33f009`: initial preparation/blocker report, superseded by this report update.
- `5ea07c4`: verified capture-event time ingestion, narrowly scoped timing-hold release, activation source support, additive migration/metadata and regression coverage. Applied old migrations unchanged.
- This updated report is committed separately.

No .env/dependency/pnpm-lock.yaml change, deployment or Phase 1.8. Automatic approval review initially rejected a combined migration-preparation command because it interpreted a read of migration 0013 as rewriting it. The operations were separated; source integrity was proven before guarded migration approval. No applied-source edit or authorization bypass.

Correction files (8):

- `lib/db/schema.ts`
- `lib/workspace/activation/model.ts`
- `lib/workspace/payments/model.ts`
- `lib/workspace/payments/service.ts`
- `drizzle/0016_tired_prowler.sql`
- `drizzle/meta/0016_snapshot.json`
- `drizzle/meta/_journal.json`
- `tests/routes/workspace-capture-event.test.ts`

This report is the ninth file in the correction/report continuation. Earlier Checkout files are listed in commit cd97dc3.

## Z. Validation

- New capture-event regression before correction: 3 failures / 11 passes, reproducing the timing hold; after correction all 14 passed.
- Focused capture/payment/fulfillment suite: **92 passed**.
- Full `pnpm validate`: **5 pure tests; 650 Vitest tests across 52 files; TypeScript and lint**, all completed successfully.
- Payment-disabled isolated production build: passed with existing dependencies/cached fonts and no .env/private service configuration.
- Actual production refusal checks with Test flags supplied: order/confirm/webhook all 503 disabled.
- Real local DB identity, reviewed migration chain/no-op, genuine callback/webhook, provider fetch, refund arithmetic, normal fulfillment/idempotency, negative triggers, original-history integrity and LMS-isolation checks passed.
- `git diff --check` passed; secret/full-phone/tunnel-literal exclusion checked on task-added changes.
- Browser dashboard and profile/draft persistence remain pending. Optional second real payment, provider resend, failed-payment and course-review journeys not exercised.

## AA. Remaining launch blockers

Immediate E2E completion blocker: actual authenticated browser dashboard confirmation. Profile/draft/review and additional provider orderings/resend/failure scenarios are marked separately above.

Public-launch gates remain separate: final Creator Terms, Refund Policy, production credentials/configuration, production migration authorization, worker/scheduler readiness, operational handling/documentation and final release smoke. Local targeted operator execution does not provision a production scheduler. A Test E2E PASS would not enable public charging.

## AB. Recommendation

**WORKSPACE TEST E2E BLOCKED — dashboard UI verification pending.** Payment → genuine authenticated capture webhook → authoritative paidAt → exact refund deadline → normal membership/Profile → server Early Access entitlement passed. Resume only the same user's dashboard/profile/private-draft confirmation; do not reset the phone or repeat/erase this completed financial history. Public payments stay disabled; no Phase 1.8.
