# Final local Creator payment UAT

## Current status

**GENUINE LOCAL TEST PURCHASE AND FULL REFUND VERIFIED — PAID EDITING REVOKED.**

The founder confirmed registration and eligibility, authorized payment testing, then explicitly approved the minimal payment-only worker/refund-reconciliation isolation correction. This resolves the blocker recorded at `89a8155`. Starting branch `codex/workspace-1.8-launch`, HEAD `89a8155`, clean worktree.

This is temporary local Test enablement, not production/public payment authorization or founder acceptance of the complete journey. The actual discounted purchase is verified below; the planned no-coupon pricing scenario remains untested.

## Founder next step

Refresh `http://localhost:3000/workspace/dashboard` for the primary demo ending 3222. The completed refund removes paid editing access; saved Workspace history remains read-only. Creating a new course or saving profile changes is denied. No second refund or payment is needed to verify this result. The original Quarterly ₹5,899 no-coupon scenario is still untested and requires a separately planned fresh purchase.

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

At payment enablement, no synthetic signed capture or agent-created provider order/payment was made. After the founder completed checkout and separately authorized the exact ₹4,247 Test refund, the bounded normal-service refund verification described below was performed. The running app and worker remain payment-only; refund authorization was confined to short-lived operator processes.

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

## Actual founder payment evidence

These are the pre-refund purchase observations; the following section records the later completed refund.

The founder reported a successful payment. Read-only verification against the exact authorized local DB confirmed:

- Primary demo ending 3222 remains `role=student`; Test account matches configured Workspace account.
- Quarterly plan, INR, base **499915 paise**, coupon discount **140000 paise**, taxable **359915 paise**, GST **64785 paise**, actual paid total **424700 paise (₹4,247.00)**.
- This is **not** the planned ₹5,899 no-coupon scenario. No amount, coupon, receipt or payment evidence was changed to match the plan.
- Financial state **captured**, activation **fulfilled**. Genuine `payment.captured` and `order.paid` events are processed. Normal webhook intake verifies HMAC before persistence; the matching captured event supplies the stored versioned capture-time evidence.
- Capture source: `razorpay_payment_captured_event_v1`; `paidAt=2026-10-15T07:00:31.000Z` (15 October, 12:30:31 IST).
- `refundEligibleUntil=2026-10-18T07:00:31.000Z` (18 October, 12:30:31 IST), exactly **259200000 milliseconds / 72 hours** after paidAt. The request window was open at inspection.
- Exactly **one** winning captured payment, **one** membership and **one** enabled Creator Profile; provider amount remains unrefunded.
- Paid term: **9 November 2026, 00:00 IST → 9 February 2027, 00:00 IST**. Current resolver state **early_access**, `hasCreatorAccess=true`, `hasPaidEntitlement=true`, `canEditWorkspace=true`; source **paid**, independent grant state **none**.
- Application logs show browser confirmation **200** and authenticated `/workspace/dashboard` **200** after normal worker fulfillment. This supports actual dashboard access but is not a substitute for explicit founder acceptance.
- No LMS order or enrollment was created for this identity. No refund request or completed refund exists for this new order at inspection.

## Authorized genuine Test refund and access verification

The founder explicitly authorized the full **₹4,247** refund of this purchase, then confirmed both refund webhook event subscriptions were enabled. The target was the exact local Test account, winning payment and frozen order amount; no other refund was authorized or processed.

- Used the unchanged normal owner refund-request service, persisted Admin approval service, provider adapter and reconciliation services. No refund/payment state, completion timestamp or entitlement was manually inserted. The existing synthetic persisted Admin identity was reused without changing any account role.
- Exactly **one** provider refund POST returned **HTTP 200**, for **424700 paise, INR**. The initial uncertain/review state did **not** remove access. Independent provider GET observations subsequently confirmed the exact refund as **processed**, payment **refunded**, `amount_refunded=424700` and refund status **full**.
- Normal reconciliation stored exactly **one** immutable completion using `razorpay_full_refund_fetch_v1`, at `2026-10-15T07:11:51.269Z` (15 October, 12:41:51.269 IST). This is the local authoritative verification time, not a claim about provider event time.
- Genuine **refund.created** and **refund.processed** deliveries arrived through the existing owner tunnel and normal HMAC-verifying webhook route. Both have durable payload hashes, matching Test account/payment evidence and no anomaly. Each was processed through the normal refund event service, including provider payment fetch. Since the completion already existed, both terminal states are correctly **ignored / refund_completed**, rather than additional completions or processing failures. No locally fabricated signed refund event was used.
- Repeating normal reconciliation after completion performed **zero HTTP calls**, created no additional refund and preserved the same completion timestamp. Final counts: **one request, one attempt, one completion**. Business notices `received`, `initiated` and `completed` each occur once; no notice was dispatched and no email/SMS provider was called.
- Final server resolver: `state=refunded`, `hasCreatorAccess=false`, `hasPaidEntitlement=false`, `canEditWorkspace=false`, `canViewCreatorWorkspace=true`, `accessSource=retained`, independent grant state **none**. Paid editing is revoked only after confirmed completion; historical read access intentionally remains. Independent grants continue to be evaluated separately by the unchanged resolver.

### Authenticated local HTTP checks

Issued a normal session through the allowlisted local mock phone OTP, keeping cookies in memory and sending no SMS. With the refunded owner session:

| Route/action | Result |
|---|---|
| Course list GET | 200; `canEditWorkspace=false` |
| Profile details GET | 200; `canEditWorkspace=false` |
| Workspace dashboard | 200; **Saved work · read only** |
| New course page | Redirect to course list (Next.js streamed redirect) |
| Valid course creation POST | **403 restricted**; no draft created |
| Valid profile update PUT | **403 restricted**; no profile changed |

The temporary HTTP harness initially assumed every redirect changes the transport URL. It was corrected to recognize Next.js streamed redirects; no product correction was required. This account has no private course draft, so an existing builder URL was not exercised in this live check. Creator boundary/access regressions cover the underlying authorization; no course or approval was fabricated to extend this test.

### Preservation, validation and boundaries

Read-only fingerprints taken before refund initiation and compared after refund processing and HTTP checks confirm all **10 protected groups** unchanged: unrelated refund requests/attempts/completions/notices/observations, and this purchase's order, membership, Creator Profile, course drafts and coupon redemption history. One historical membership and Creator Profile remain, zero drafts were created, and the user remains **student**. No LMS enrollment/order was created by this journey. The paidAt, 72-hour deadline and original November–February membership term remain historical facts; no record was deleted or rewritten to revoke access.

Fresh focused verification: **149 tests passed across 7 files**, covering refund service/provider/routes/repository, activation, Creator boundaries and payment-only isolation. No product code changed in this refund verification; the existing **1,342-test / 43-Node-check full validation and payment-disabled production build** from the isolation change were reused rather than rerun. `git diff --check` passed.

Refund execution/reconciliation flags were enabled only inside bounded temporary operator processes that have exited. The port-3000 app and scoped worker were rechecked: refund execution/reconciliation, notices, email and Live authorization remain **OFF**. Payment-only Test authorization remains temporarily active for the founder's local session; it is not persisted in `.env` and does not enable ordinary/public production payments. No broad refund worker, migration, production access or deployment occurred. The existing owner-managed tunnel was preserved.

The earlier HTTP 400 fixture is untouched: this fresh request returned 200 and does not establish the old failure's cause. **The genuine ₹4,247 refund and paid editing revocation are verified locally.** Explicit founder acceptance of the overall journey, the original ₹5,899 no-coupon scenario and separate production/commercial release gates remain outstanding.

## Changed files and cleanup

- `lib/workspace/payments/configuration-core.mjs`, `configuration-core.d.mts`, `configuration.ts`
- `lib/workspace/payments/provider.ts`, `repository.ts`, `service.ts`, `worker.ts`
- `lib/workspace/refunds/runtime.ts`
- `scripts/workspace-local-uat.mjs`, `scripts/workspace-local-uat-worker.cjs`
- `tests/routes/workspace-payments-fixtures.ts`, `tests/routes/workspace-payment-only.test.ts`
- `tests/workspace-local-uat-startup.test.mjs`
- This report.

The isolation implementation was committed in `cb0c119`; purchase evidence in `371e48c`. This refund verification changes only this report; its scoped commit/clean-worktree result is returned to the owner. After the authorized payment UAT, stop this repository’s payment-only process/worker and restart with ordinary `pnpm dev:uat` to return all external providers to OFF. Do not persist the temporary flags, create another tunnel, or enable production payments.
