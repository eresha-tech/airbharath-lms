# Workspace Phase 1.5AV-Razorpay verification

Date: 2026-10-07. Scope: authorized Test Mode only, local `localhost:5433/airbharath_lms`. Credential-strategy clarification permits the shared LMS Test API pair through the separate Workspace namespace. No production/staging access, migration, public checkout or Phase 1.5B implementation.

## A. Authorization and Test Mode proof

Workspace key prefix was checked without printing its value: test, not live. Mode=test; verification NODE_ENV and DATABASE_ENV=development. Normal permanent payment flags absent. Verification process removed other environment credentials, including LMS credentials, and loaded only the authorized Workspace Test API configuration and local DB connection. Browser displayed Test Mode. Synthetic transactions only.

## B. Credential/account safety

Configured account ID passed format validation; never invented. Workspace-specific configuration uses the approved shared Test API pair. No Workspace webhook secret is configured; the LMS webhook secret was not reused. Direct adapter API tests do not require a webhook secret and did not bypass the normal application's runtime configuration gate. Account identity is configured, not independently proven by a genuine webhook. Credentials remain in ignored local .env; no values appear in this report.

## C. Real order creation

Actual eligibility, membership quoting and financial acceptance services created three identifiable WS15AVR synthetic student fixtures. Quarterly accepted total: 589882 integer paise INR. First provider order: `order_TkxnF54igDHObr`, created HTTP 200, attached by the normal service. Receipt length 35; direct fetch returned exact receipt/amount/currency. Actual adapter sends partial_payment=false and notes={}; no eligibility/profile metadata. The lost-result and second Checkout scenarios used separately accepted orders. No new migrations. Read-only TCP/socket identity reconfirmed the same server (system identifier 7680462735222304705, database OID 16384). Ledger before and after is identical: 13 entries, 0000–0012, all current SQL hashes/journal timestamps match.

## D. Receipt behavior

Real GET orders?receipt=...&count=100&skip=0 returned HTTP 200 but zero exact matches. First order tested with three bounded retries separated by two seconds and again after Checkout work. Direct fetch by known order ID succeeded. Receipt lookup is NOT verified as an effective recovery mechanism; zero does not establish absence.

## E. Ambiguous-create recovery

A temporary wrapper allowed exactly one real create POST to succeed, then threw an ambiguous failure before local attachment. Actual service retained recovery_required/unpaid, provider_request_count=1. Receipt recovery did not attach because lookup returned zero. No replacement provider order was created. No coupon was used in these fixtures; real coupon-reservation retention was not exercised in this sandbox run. Prior DB verification remains separate evidence.

## F. Safe rejection behavior

Fresh receipt, amount=1 paise: HTTP 400, BAD_REQUEST_ERROR, source=order, step=NA, reason=NA, description="Order amount less than minimum amount allowed". Actual adapter classified ambiguous, retaining its narrow classifier. Lookup zero is not reliable proof of non-existence. Do not broaden safe-release classification. Separate duplicate receipt scenario: both POSTs returned HTTP 200 and created distinct provider orders; receipt lookup afterward still returned zero. Automatic recovery assumptions are BLOCKED by observed duplicate behavior. Multiple-match service safety was not exercised with genuine lookup matches.

## G. Successful Test Mode Checkout

Authenticated loopback-only temporary harness served the official Standard Checkout SDK, synthetic email and phone, and already accepted provider order. No application test endpoint/backdoor was committed. Session authentication plus session-bound CSRF protected temporary confirmation. Genuine callback IDs/signature were received, signature verified against stored order ID, and provider fetched by the actual service. Signature was neither persisted nor printed. First successful provider payment: `pay_TkxvljFFfPBIFh`.

## H. Failed Test Mode Checkout

NOT VERIFIED. The second synthetic order intended for failure also auto-completed captured when the test netbanking bank was selected. The documented mock Success/Failure page was not exposed in this observed browser/account flow. Do not interpret this as a failed-payment test. No personal payment data, account capture settings changes or replacement order for either captured order.

## I. Provider payment fetch evidence

Actual adapter fetched both captured payments and order-payment collections. Exact amount 589882 INR and order identities matched. Provider status=captured, captured=true, amount_refunded=0. Payment created_at is creation time, not capture time. Minimized payment evidence contains provider IDs, amount/currency/state/creation time/refund amount, with capture time/source null. Raw provider email/contact/card/bank/VPA/notes were not retained. Payment ID/API credentials are not mixed with browser signature storage.

## J. Capture mode observed

Both observed payments reached captured without a Capture API call or account-setting change. Authorized-only intermediate state was not observed. This establishes observed automatic capture for these transactions, not an account-wide policy guarantee.

## K. Webhook delivery environment

No approved publicly reachable Workspace test webhook endpoint. The user-configured localhost URL cannot receive remote Razorpay deliveries. No tunnel, request collector, production endpoint or staging DB used. Local temporary harness was not publicly exposed.

## L. Genuine payment.captured evidence

Unavailable. No genuine provider webhook was substituted with synthetic payloads.

## M. Capture-time analysis

No authoritative capture timestamp verified. Candidate top-level created_at of a genuine payment.captured event remains unproven. Payment created_at, callback time and local fetch/receipt time were not used for paidAt. Both captured local orders remain held_for_review; paidAt/refundEligibleUntil=null.

## N. Webhook signature/event-ID behavior

Not exercised against genuine delivery. Current raw-body HMAC/account/event-ID inbox controls remain intact. Provider duplicate/retry ordering and event timestamp stability remain pending.

## O. Callback/webhook convergence

Actual owner-bound confirmation service verified genuine callback signatures, fetched provider evidence, repeated confirmation and reconciled the same orders. Captured state stayed monotonic/idempotent; no invented dates. Temporary harness used synthetic session authentication; normal Next.js confirmation-route session middleware was not browser-smoked here. Webhook convergence remains unverified.

## P. Provider/account isolation

Only configured Workspace Test API credentials contacted api.razorpay.com. No live credentials entered verification processes. All known provider order/payment reads belonged to this run. No genuine webhook account_id evidence, so independent account binding remains pending. Separate Workspace financial tables/services; LMS payment integration source unchanged.

## Q. Data minimization

Retained three clearly identifiable WS15AVR development students and accepted orders; immutable history not deleted/reset. Official simulated netbanking, example.invalid email, synthetic contact only. Temporary evidence retained only selected provider financial fields. Secrets/signatures excluded from report and fixture evidence. No full card, CVV, VPA or bank credentials entered. No broad private merchant history enumeration.

## R. No-creator-access verification

Real local journey state for all three users: hasCreatorAccess=false and hasPaidEntitlement=false; role=student; enrollment count=0. Workspace creator-profile and membership tables absent. Captured state did not grant activation or entitlement. Course ownership was not separately queried in this run; no service implementation path creates it.

## S. Public-gate verification

Normal configuration remains disabled. NODE_ENV=production rejects temporary enablement even with synthetic complete config. Workspace public activation source retains Payment activation coming next. No deployment/public payment enablement. Temporary loopback Checkout server and browser tab stopped; no ephemeral enablement flags remain; no permanent flags added.

## T. Tests/validation

Full pnpm validate passed: 5/5 Node tests, 421/421 Vitest tests in 35 files (including payment tests), TypeScript and lint. Isolated production build passed with cached local fonts and all service credentials cleared; 59/59 static pages generated. Initial build attempts failed due temporary cached-font URL quoting, corrected only in /tmp; no repository font/dependency changes. git diff --check passed. Root .next was preserved.

## U. Defects/corrections

Provider findings recorded before any source change: receipt lookup misses, duplicates accepted, rejection reason=NA. Existing conservative controls already retain ambiguity; no production adapter/service correction or migration made. Do not invent receipt uniqueness, expand release classification, or guess capture timing to obtain GO. Two focused regression tests for observed NA rejection and empty lookup behavior passed and were committed separately as 92c93e0; no implementation correction was needed to preserve conservative holds.

## V. Remaining provider limitations

Receipt visibility and duplicate-safe recovery require resolution; failed-payment/hold scenario remains unverified; no real coupon-capacity sandbox test; no independently verified merchant account ID in genuine payload; no secure test webhook/capture-time/retry/event-order evidence. Current official Orders docs also warn about new orders for failed retries, while Checkout docs describe retry UI: retry contract requires observed evidence, not automatic recreation.

Provider references reviewed: [Create order](https://razorpay.com/docs/api/orders/create/), [Fetch orders/receipt](https://razorpay.com/docs/api/orders/fetch-all/), [Payment entity](https://razorpay.com/docs/api/payments/entity/), [Standard Checkout/test methods](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/), [Webhook validation/testing](https://razorpay.com/docs/webhooks/validate-test/). Documentation is not a substitute for observed behavior.

## W. Recommendation

**Phase 1.5B BLOCKED ON PROVIDER CAPTURE-TIME / WEBHOOK EVIDENCE**, additionally blocked on reliable duplicate-safe receipt recovery and genuine failed-payment verification. No Phase 1.5B implementation.
