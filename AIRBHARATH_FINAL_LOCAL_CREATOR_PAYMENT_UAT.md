# Final local Creator payment UAT

## Current checkpoint

**LOCAL CREATOR PAYMENT UAT BLOCKED — demo configuration needs resolution.**

Branch `codex/workspace-1.8-launch`, starting HEAD `dc837b0`; clean before this report. No subsequent commits or product changes were found. This is preparation evidence, not founder acceptance or payment verification.

## A. Automated preflight

| Step | Status | Actual result / evidence | Expected result / route |
|---|---|---|---|
| Local database identity | PASS | Read-only verification: `airbharath_lms`, port 5433, OID `16384`, system identifier `7680462735222304705`; TCP and `/tmp` socket agree | Authorized development database only |
| Migration ledger | PASS | 32 applied entries, `0000–0031`; every applied hash and timestamp matches source | No migration, reset or seed |
| Contact/order prerequisite | PASS | Installed function exactly matches 0031; five other 0027 email/proof/notice functions unchanged | No ownership-proof prerequisite for new orders |
| Catalog | PASS | Quarterly 589900, half-yearly 999900, yearly 1769900 paise, inclusive of GST | Choose Quarterly ₹5,899, INR, no coupon |
| Requested demo accounts | BLOCKED | Requested numbers ending 3222 / 0009 / 9696 are absent and not allowlisted | Fresh account through normal phone registration |
| Existing demo accounts | PASS, unsuitable primary history noted | Configured numbers end 3211 / 0000 / 6780. The first has one order/membership; other two have none. All have student role | Preserve existing histories; no account resets |
| Running local app configuration | BLOCKED | Port-3000 repository listener is a development server without inherited local-UAT OTP/payment flags. No OTP request was attempted | Restart with reviewed runtime-only local-UAT configuration |
| Local anonymous route smoke | PASS | `/login` and `/workspace` returned 200; activation, dashboard and billing redirected to sign-in. Workspace public page shows payment-disabled copy | `/login`, `/workspace`, private-route sign-in redirects |
| Offline Test credential configuration | PASS, limited | Existing secret configuration classifies as Razorpay Test key/mode with account and distinct webhook secret configured; proposed payment-only readiness has no financial configuration errors | No Live mode; actual provider/account authentication is not yet checked |
| Temporary webhook | NOT YET TESTED | Owner supplied a new HTTPS tunnel forwarding to port 3000 with the same Workspace secret. URL not persisted here; network probe held at approval checkpoint | `/api/workspace/payments/razorpay/webhook` |
| Test worker configuration | BLOCKED | Existing `--providers` convenience mode also enables refunds, email and notices; do not use it for this purchase-only scope | Checkout/webhook/reconciliation only; refunds/SMS/email/notice delivery OFF |

An explicit choice is pending: replace the local-only allowlist with the three new brief numbers, or retain the existing demos. No allowlist change, server restart or provider enablement has occurred.

The application’s existing independent capability gates support this proposed runtime-only configuration after approval: development database/runtime, Razorpay Test credentials and authorization, checkout/webhook/reconciliation ON; Live authorization, refunds, email verification delivery, notice delivery, Redis and development analytics OFF. The standard/public configuration remains unchanged. The existing worker must be restricted to the chosen UAT identities and must not process old refund attempts or deliver notices. No new tunnel is to be created.

Safe local starting URL: `http://localhost:3000/login?callbackUrl=%2Fworkspace%2Fapply`. Do not use fixed OTP with the newly requested numbers until their allowlist/startup configuration is resolved. No global OTP fallback exists.

## B. Founder browser checklist

All steps below are **NOT YET TESTED by the founder in this task**:

1. Send phone OTP and register/login normally; complete valid eligibility.
2. At `/workspace/activate`, confirm no mandatory email OTP Step 2; save/correct contact email.
3. Independently accept Creator Terms and Refund Policy.
4. Select Quarterly ₹5,899 inclusive of GST, INR, no coupon; confirm intended fresh account and no duplicate pending order.
5. After separate explicit Test-provider authorization, complete official Razorpay Test Checkout using provider test data only.
6. Wait for genuine signed webhook and normal fulfillment; never pay twice or manually force paid/member state.
7. Confirm `/workspace/dashboard`, Creator Profile, membership dates and `/workspace/billing`. Qualifying pre-launch term starts 9 November 2026, 00:00 IST; Early Access follows verified capture/fulfillment.
8. Confirm proposal/review/private-builder navigation follows existing permissions. No uploads, publication or sales.

## C. Genuine Test payment / fulfillment

**NOT YET TESTED.** No external Razorpay call, provider order, payment, refund, tunnel probe or Test worker was started by this task. Account authentication at Razorpay, current webhook-event configuration, HMAC delivery, authoritative paidAt, exact 72-hour refund deadline, duplicate delivery, one membership and dashboard access require the separately approved founder journey. Refund HTTP 400 and genuine refund-webhook verification remain separate unresolved release gates; no refund retry is authorized here.

## D. Focused negative/security evidence

**PASS:** 124 focused tests across seven files: local OTP guards/routes, contact route, phone-only UI, payment routes/service and activation. These cover mock isolation, auth/session checks, missing/invalid contact, legal prerequisites, stale quotes, order ownership/idempotency and activation safety. These are automated/mocked regressions; they are not genuine webhook evidence or founder acceptance.

Prior unchanged-source evidence at `aff000b`/`dc837b0` is reused: real PostgreSQL contact/eligibility/legal/idempotency tests, unverified sensitive-notice denial, desktop/mobile activation checks, 1,337 Vitest tests plus 42 Node checks, TypeScript/lint and payment-disabled build. No product source change in this preparation, so the broad suite/build were not repeated.

Unverified contact must continue to fail closed for sensitive financial/refund mail. Authenticated Billing & Support remains the status destination. Existing ownership-proof and immutable notice-binding safeguards are unchanged.

## Safety and next checkpoint

No database mutation, migration, account reset, genuine MSG91/Mailercloud call, production Neon connection, financial rule change, refund operation, deployment or public charging occurred. The sole repository change is this report. An automatic permission-review timeout delayed one read-only preflight attempt; the smaller retry succeeded. Restricted-sandbox process enumeration was inconclusive; the successful host runtime inspection is the evidence used above.

Resolve demo/startup configuration first. Then return **LOCAL CREATOR PAYMENT UAT READY — AWAITING FOUNDER TEST AUTHORIZATION**, presenting the exact reviewed payment-only configuration. The brief requires explicit founder approval before enabling checkout or making genuine provider calls. Founder acceptance remains **NOT GIVEN**; even a future purchase UAT PASS is not production authorization.
