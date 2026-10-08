# Workspace local Test Mode checkout — 8 October 2026

User explicitly requested enabling the payment button for local flow testing and deferring genuine webhook verification. This change adds no course submission/publication or production payment enablement.

## Behavior

The activation page passes a boolean derived from the existing complete Test Mode configuration guard. With normal flags absent, the original disabled preview remains. With authorized development/test process flags and valid Workspace Test credentials, it renders Pay in Test Mode and loads Razorpay Standard Checkout.

The authenticated same-origin order API returns checkout metadata only for a ready, unpaid, attached provider order: public test key, provider order ID, server-accepted total and currency. Secret keys and webhook secrets remain server-only. Orders continue to recompute prices/eligibility/coupon capacity and enforce idempotency in the existing service.

The client retains its request key and original quote identifiers for setup retries, reopens only the same accepted checkout after dismissal, rejects non-test public keys, and confirms the callback through the existing signature-verified API. A callback never reopens checkout, including after confirmation failure. Confirmation failure requires review rather than offering a second payment. No browser callback grants membership/creator access. Unverified capture timing still leaves captured orders held for review.

Accepted order context is held in memory, not durable across page reload. The existing server duplicate-purchase protections remain authoritative after reload; an existing-order conflict requires recovering/reviewing the original order. The UI explains that changing the advisory preview does not change an already accepted order.

## Local configuration

The existing local database identity was reconfirmed: airbharath_lms, port 5433, OID 16384, system identifier 7680462735222304705. All 15 ledger hashes/timestamps matched. No migration occurred.

The localhost:3000 dev app was restarted with temporary process-only WORKSPACE_PAYMENT_ENABLED=true and WORKSPACE_RAZORPAY_TEST_AUTHORIZED=true, DATABASE_ENV=development, NODE_ENV=development and validated existing Test Mode credentials. `.env` was not changed; migration permission was not added. Production remains blocked by the existing NODE_ENV guard even when development flags are supplied. A normal future `pnpm dev` without the temporary flags restores the disabled preview.

## Verification

- Full pnpm validate passed: 5 pure tests and 574 Vitest tests across 46 files, TypeScript, lint.
- New order-route regression verifies accepted server economics/public key only and no checkout metadata for captured or recovery-required orders. Existing default/production configuration and authentication/signature tests remain passing.
- Isolated credential-scrubbed production build with cached fonts passed.
- Actual authenticated local app/real-DB smoke using an existing synthetic eligibility fixture returned HTTP 200 and rendered Pay in Test Mode instead of the disabled message.
- Actual unsigned local webhook returned 403/signature, proving the Test Mode runtime was active without weakening signature validation.
- No order, provider payment or financial mutation was created by this implementation smoke. Hydrated Checkout/payment completion is for the user's requested manual flow test; it is not claimed verified here.
- git diff --check passed. No dependencies, lockfile, migrations or environment file edited.

Genuine Razorpay webhook delivery, capture-time provenance, paidAt/refund timing approval, and commercial/public-payment launch remain unverified/gated as documented in WORKSPACE_WEBHOOK_VERIFICATION.md. No worker or creator activation was enabled.

## Changed files

| File | Change |
| --- | --- |
| app/(user)/workspace/activate/page.tsx | Server-derived Test Mode UI gate |
| app/api/workspace/membership/orders/route.ts | Safe ready/unpaid checkout metadata |
| components/workspace/ActivationPreview.tsx | Conditional Test Mode checkout |
| components/workspace/TestCheckout.tsx | Checkout loading, same-request retry, callback confirmation and bounded failure messages |
| tests/routes/workspace-payments-routes.test.ts | Checkout metadata/security regression |
| WORKSPACE_TEST_CHECKOUT.md | Scope, runtime configuration, evidence and limitations |

## Post-payment navigation correction

A successful server-side confirmation now navigates to `/workspace/member` and refreshes the persisted membership state. The Test Mode checkout also provides a permanent View payment and membership status link, so an existing payment can be inspected without another checkout. Confirmation failures do not automatically navigate or grant access. Held/unfulfilled payments still show their real review/pending status; no creator-access bypass or synthetic paidAt was introduced.

Validation: full pnpm validate passed again (5 pure + 574 Vitest tests, TypeScript, lint); actual authenticated local HTML rendered the new membership-status link; unsigned local webhook remained 403/signature. No new payment/order was created by the smoke check. Callback navigation is connected in the success handler; a fresh real payment callback was not executed by the agent. The isolated cached-font production build was rerun successfully. Changed files for this correction: components/workspace/TestCheckout.tsx and this report.
