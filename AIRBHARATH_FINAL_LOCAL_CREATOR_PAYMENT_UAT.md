# Final local Creator payment UAT

## Current status

**LOCAL RAZORPAY TEST PAYMENT ENABLED — AWAITING FOUNDER PAYMENT AND ACCEPTANCE.**

The founder confirmed registration and eligibility, authorized payment testing, then explicitly approved the minimal payment-only worker/refund-reconciliation isolation correction. This resolves the blocker recorded at `89a8155`. Starting branch `codex/workspace-1.8-launch`, HEAD `89a8155`, clean worktree.

This is temporary local Test enablement, not production/public payment authorization, a completed payment UAT, or founder acceptance of the complete journey.

## Founder next step

Refresh `http://localhost:3000/workspace/activate`. Choose **Quarterly ₹5,899 inclusive of GST, INR, no coupon**, confirm/save contact email, independently accept Creator Terms and Refund Policy, then use normal **Razorpay Test Mode** checkout. Use provider Test payment data only. Do not pay again if payment is awaiting verification; inspect the existing order.

Approved local demos remain 9876543222 (primary Creator), 9000900009 (second Creator), 9696969696 (student). Phone OTP is `1234` after Send OTP in this guarded local process. The founder’s existing signed session survives the app restart. No account, eligibility result, legal receipt, captured payment or paid membership was manually fabricated.

## Isolation correction

- Added independently enforceable `refund_reconciliation` capability and `WORKSPACE_RAZORPAY_REFUND_RECONCILIATION_ENABLED` gate. An explicit `false` blocks refund reconciliation; an invalid supplied value also does not authorize it. When unset, it preserves the previous shared-reconciliation behavior for existing configurations.
- Refund runtime/recovery and refund-event dispatch respect that gate. Provider refund-list GET requests require refund reconciliation or separately authorized refund execution; they are blocked before HTTP in payment-only mode. Refund POSTs remain independently disabled.
- Financial worker can omit refund tasks. Payment batches exclude refund events at the database selection boundary when no refund processor is enabled, so refund receipts stay unclaimed without starving payment events.
- Added `pnpm dev:uat --payments-only` to the existing guarded launcher. It refuses production/staging/remote/deployed targets and requires the exact approved local DB and Razorpay Test configuration. It supplies only runtime flags; no `.env` was edited.
- Local worker scopes processing to the three allowlisted persisted student identities and the configured Test account. Payment-only mode selects payment event types, instantiates no refund processor, and bypasses notice orchestration. It uses existing payment reconciliation and membership fulfillment services, with no paidAt or entitlement shortcut.
- The broad `--providers` launcher was not used. A fresh process-only internal-worker secret prevents reuse of an unrelated scheduler credential. No unrelated scheduled worker was started.

No price, GST, coupon, legal, refund-right, payment evidence, membership term or creator-access rule was changed. No migration or source-pin change was needed.

## Live local configuration and smoke

Only this repository’s verified port-3000 Next.js process was restarted. The existing owner-managed tunnel was preserved; its random hostname is not committed here.

| Capability | Running value |
|---|---|
| Node / DB classification | development / development |
| Local OTP and eligibility limiter | ON |
| Razorpay mode / Key ID class | test / Test key |
| Checkout / Test authorization | ON |
| Signed webhook intake / payment reconciliation | ON |
| Scoped payment/fulfillment worker | Exactly one running |
| Refund execution / refund reconciliation | OFF / OFF |
| Email verification delivery / refund notices | OFF / OFF |
| Live authorization | OFF |
| Redis / real SMS fallback / development analytics | OFF |

The running app and worker environments were checked directly without exposing credentials. Local unsigned webhook POST returns **403, signature**; anonymous order creation returns **401**; unsigned internal-worker access returns **401**. The owner-supplied tunnel first returned **503, disabled** before enablement and then **403, signature** after enablement for the same unsigned empty-body probe. This demonstrates reachability and rejection, **not** genuine signed delivery or provider authentication.

No synthetic signed capture was sent, no agent-created provider order/payment was made, and no refund operation was performed. The worker may perform the authorized normal Test payment reads once the founder creates an order.

## Database and onboarding evidence

Read-only checks confirmed `localhost:5433/airbharath_lms` and `/tmp` socket port 5433 agree: OID `16384`, system identifier `7680462735222304705`. Exactly **32 applied migrations (0000–0031)** match source hashes/timestamps. No migration/reset/seed/delete occurred. Current catalog totals remain **₹5,899 / ₹9,999 / ₹17,699**, inclusive of GST. At the pre-enable snapshot, the primary account was persisted as student with no order/membership; the other two new demo accounts had not been registered.

The founder personally confirmed registration and eligibility. Existing real local OTP Send/negative checks, normal registration/session route regressions, contact form/no mandatory email OTP checks, and independent legal/payment guards remain applicable. Unverified contact does not become ownership proof; sensitive notices remain fail-closed and their immutable bindings/history are unchanged.

## Verification

- Focused isolation/payment/provider/worker checks: **68 passed**.
- Final `pnpm validate`: **1,342 Vitest tests across 112 files, 43 pure Node checks, TypeScript and lint passed**.
- Isolated **payment-disabled production build passed**, with no `.env` or usable DB/provider credentials and original cached fonts.
- `git diff --check` passed.
- The temporary local app was enabled only after validation/build and explicit founder Test authorization. Normal startup without temporary authorization still disables payments; no persistent public-payment setting changed.

Regression coverage demonstrates refund GET/POST rejection before HTTP, permitted payment reads, runtime kill-switch enforcement, unclaimed refund events without payment starvation, optional refund worker omission, and launcher rejection of production/staging/remote/mixed modes. A live smoke expectation was corrected from 401 to the application’s existing 403 signature status; product signature handling was unchanged.

## Pending founder payment evidence

**NOT YET VERIFIED in this task:** genuine Test order/payment association, actual Razorpay account authentication, HMAC-verified payment event, authoritative paidAt, exact paidAt + 72-hour deadline, one fulfilled membership, correct launch-based dates, Creator Profile/Dashboard access, duplicate genuine delivery and final founder acceptance. These must be checked after the founder completes payment. No UAT PASS is claimed now.

The prior refund HTTP 400 and genuine Test refund/signed-refund-webhook verification remain separate mandatory release gates; this purchase enablement does not resolve them. Production NeonDB inspection/migration, deployment and Live charging remain unauthorized.

## Changed files and cleanup

- `lib/workspace/payments/configuration-core.mjs`, `configuration-core.d.mts`, `configuration.ts`
- `lib/workspace/payments/provider.ts`, `repository.ts`, `service.ts`, `worker.ts`
- `lib/workspace/refunds/runtime.ts`
- `scripts/workspace-local-uat.mjs`, `scripts/workspace-local-uat-worker.cjs`
- `tests/routes/workspace-payments-fixtures.ts`, `tests/routes/workspace-payment-only.test.ts`
- `tests/workspace-local-uat-startup.test.mjs`
- This report.

Changes are committed together; the final commit/clean-worktree result is returned to the owner. After the authorized payment UAT, stop this repository’s payment-only process/worker and restart with ordinary `pnpm dev:uat` to return all external providers to OFF. Do not persist the temporary flags, create another tunnel, or enable production payments.
