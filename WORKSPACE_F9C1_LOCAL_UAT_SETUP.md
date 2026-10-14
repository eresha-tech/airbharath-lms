# F.9C.1 — Founder local UAT setup

**F.9C.1 LOCAL UAT PREPARED. Full E2E and founder acceptance remain pending.**

Starting branch: `codex/workspace-1.8-launch`; HEAD: `248c63c`. This phase prepares the existing Phase 1.8 application. It does not authorize external transactions, production access, migration or deployment.

## Local environment and processes

The owner authorized restarting this repository's dev server. One payment-disabled app is running on port 3000 with the phone mock enabled. Open [local UAT login](http://localhost:3000/login?callbackUrl=%2Fworkspace%2Fapply). Use the same hostname throughout the journey so session cookies remain consistent.

Use the existing secure, ignored local database configuration. Read-only inspection verified database `airbharath_lms`, port 5433, OID `16384`, system identifier `7680462735222304705`, and 31 ledger entries through `0030`; every ledger hash/timestamp matches the migration source and journal. No migration command was run.

To start again, stop the current repository dev server first; do not kill unrelated Node processes. From the repository root, with the existing local configuration available:

```sh
NODE_ENV=development DATABASE_ENV=development \
WORKSPACE_LOCAL_UAT_OTP_ENABLED=true \
WORKSPACE_PAYMENT_ENABLED=false \
WORKSPACE_RAZORPAY_TEST_AUTHORIZED=false \
WORKSPACE_RAZORPAY_LIVE_AUTHORIZED=false \
WORKSPACE_REFUND_ENABLED=false \
WORKSPACE_RAZORPAY_WEBHOOK_ENABLED=false \
WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED=false \
WORKSPACE_NOTICE_DELIVERY_ENABLED=false \
WORKSPACE_EMAIL_VERIFICATION_ENABLED=false \
WORKSPACE_EMAIL_SENDER_VERIFIED=false \
NEXT_PUBLIC_POSTHOG_ENABLE_DEV=false \
UPSTASH_REDIS_REST_URL='' UPSTASH_REDIS_REST_TOKEN='' \
pnpm dev --hostname 127.0.0.1 --port 3000
```

Flags are process-only; none were added to `.env` or `.env.local`. Stop with Ctrl+C in the launching terminal; for the agent-owned server, ask the agent to stop that specific process. To disable the mock, stop and restart with `WORKSPACE_LOCAL_UAT_OTP_ENABLED=false`, keeping provider/payment switches off. Normal phone login then needs separately authorized genuine OTP and Redis configuration; it has no fixed-code fallback. No tunnel or scheduler was started in this phase.

The mock is default-off and requires a development database classification, development/test Node runtime, exact local target and actual matching server identity on every operation. It refuses production/staging, Neon, deployed Vercel environments, non-loopback/tunneled requests and privileged users. Only the following three identities are allowed. Other numbers fail closed while mock mode is on and do not fall through to MSG91.

| Demo | Mobile | Local OTP | Intended scenario |
|---|---|---|---|
| Creator 1 | 9876543211 | 1234 | Eligible applicant, then genuine Test payment |
| Creator 2 | 9000090000 | 1234 | Second creator, coupon and isolation tests |
| Student | 9123456780 | 1234 | Ineligible applicant and access denial |

The originally proposed Creator 1 number already belonged to an Admin. The owner approved unused `9876543211`; the existing Admin was preserved and excluded from fixed OTP. All three demos were registered through normal send/verify/profile routes, with HttpOnly signed sessions and persisted `student` roles. They have no eligibility attempts, memberships, Creator Profiles, Workspace/LMS orders, LMS enrollments, access grants or Workspace agreement acceptances. Their reserved `example.invalid` profile emails are placeholders: replace them with founder-controlled inboxes before genuine email verification.

Request an OTP first, then enter `1234`. It expires after ten minutes and is consumed once. Existing policy remains: 30-second resend cooldown, five sends/hour and ten verification attempts/ten minutes. Mock counters/challenges are process-local and reset on restart; this is not distributed rate-limit or SMS-delivery proof. The existing phone UI has four slots; genuine verification still delegates OTP format to MSG91 unchanged (existing six-digit provider regression passes). Confirm actual MSG91 template/code length separately. Workspace email verification remains independent and six-digit.

## A. Available now, without external providers

| Entry point / actor | Action | Expected result |
|---|---|---|
| `/login?callbackUrl=%2Fworkspace%2Fapply`, each demo | Send OTP, enter local code, inspect profile | Normal existing-account session; no SMS. New-account creation already smoke-tested once; retained demos now log in normally. |
| `/login` | Enter invalid Indian mobile `1234567890` | Rejected by normal validation; API send/verify return 400. |
| Auth API, fourth number `9123456781` | Attempt local code | Send and verify denied with 503; no session or real SMS. Existing Admin number is also denied in mock mode. |
| `/workspace/apply`, demo | Inspect eligibility form | Current persisted criteria/declarations load. **Do not submit yet:** the unchanged eligibility abuse limiter requires authorized test Redis. |
| `/workspace/creator-terms`, `/workspace/refund-policy` | Read | Separate versioned documents; reading does not accept either agreement. |
| `/workspace/activate`, unassessed demo | Open | Normal eligibility/activation guard; no enabled payment CTA. |
| `/workspace/dashboard`, unpaid demo | Open | Redirect to `/workspace/member`; no Creator editing access. Draft API returns 403; anonymous request returns 401. |
| `/courses`, `/courses/ai-skills`, `/dashboard/courses` | Inspect catalog and learner area | Existing LMS routes load; demo has no purchased enrollment. Certificate and enrolled-content checks require an authorized existing learner session. |

Actual checks: three normal registrations/profile saves/session issuances passed; repeat Creator 1 login passed. Eligibility-form, activation and LMS routes returned 200; these route responses are not proof of completing eligibility/checkout. Journey, eligibility-current and email-status APIs returned 200 with `no-store`. Unpaid dashboard redirect, draft API denial and student Admin redirect to `/dashboard` passed. The in-app browser hydrated the login screen. No complete Creator/Admin browser journey was executed.

## B. Separately authorized Test-provider journey

Before enabling any integration, confirm its exact safe target and operation with the owner. Presence of credentials is not authorization or successful delivery. Preserve this local DB and dedicated identities; retain resulting immutable history.

| Integration | Current evidence / prerequisites |
|---|---|
| Eligibility Redis | Existing Upstash limiter retained; URL/token cleared in this process to prevent private service calls. Provide a confirmed non-production target via `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` and authorize rate-limit writes before eligibility submission. No limiter bypass was added. |
| Razorpay | Workspace key ID/secret/account/webhook secret are present; configured mode is `test`. No provider call was made. Verify Test key/account, distinct Workspace webhook secret, then authorize process-only `WORKSPACE_RAZORPAY_TEST_AUTHORIZED`, `WORKSPACE_PAYMENT_ENABLED`, `WORKSPACE_RAZORPAY_WEBHOOK_ENABLED` and `WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED`. Keep Live authorization false. |
| Email verification | Mailercloud API credential is present; sender/domain readiness and delivery are unverified. `WORKSPACE_EMAIL_OTP_SECRET` is missing. Supply it securely, verify `MAILERCLOUD_SENDER_EMAIL`, and authorize `WORKSPACE_EMAIL_VERIFICATION_ENABLED` / `WORKSPACE_EMAIL_SENDER_VERIFIED` for owned test inboxes only. |
| Refund notices | Verify Mailercloud sender and `WORKSPACE_NOTICE_SENDER_VERIFIED`, a dedicated `WORKSPACE_NOTICE_PROVIDER_SCOPE`, safe local `NEXT_PUBLIC_BASE_URL`, and authorize `WORKSPACE_NOTICE_DELIVERY_ENABLED`. Delivery is untested. |
| Genuine phone OTP | MSG91 key/template are present only. With mock off, separately authorize the exact test recipients, provider endpoint/template and test Redis. Verify send/resend/expiry/attempt behavior and actual code length. |
| HTTPS callbacks | No current tunnel was verified or reused. After explicit authorization, configure the temporary Test Workspace webhook at `/api/workspace/payments/razorpay/webhook`; include `payment.captured`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`. HMAC/account validation, not tunnel origin, authenticates events. |
| Workers | `CRON_SECRET` is missing; supply securely (at least 32 characters). Existing authenticated GET workers: `/api/internal/workspace/reconcile` and `/api/internal/workspace/refund-notices`; notice diagnostics use `?view=status`. Only invoke after relevant provider authorization. Existing financial runner uses serial bounded batches, a 40-second cooperative deadline and closes its worker pool. No scheduler is configured by this task. |

Once authorized, follow this sequence. Capture UI status, time and masked local record reference for failures; never capture OTPs, cookies, signatures, raw provider bodies or credentials.

1. **Eligibility:** Creator 1/2 submit `/workspace/apply` with valid synthetic aviation category, age declaration, at least 24 months' experience, HTTPS professional profile, course idea and required declarations. Student uses a deliberately ineligible experience value. Inspect `/workspace/eligibility-result`; only the server evaluator decides. Eligibility alone grants no Creator access.
2. **Verified email and agreements:** On `/workspace/activate`, enter owned inboxes, receive and confirm the separate six-digit email code. Founder independently accepts current Creator Terms and Refund Policy. Inspect persisted version evidence; no auto-consent.
3. **Pricing/coupon:** Verify totals ₹5,899 / ₹9,999 / ₹17,699. Quarterly without coupon: base 499915 paise + GST 89985 = 589900 paise. Use a dedicated owner-approved test coupon for Creator 2; verify server quote, attribution, expiry/capacity and one redemption. Preserve old accepted prices and legacy coupons.
4. **Payment:** Founder completes official Razorpay Test Checkout using provider test data, no real card/UPI. The normal order service freezes the quote and creates one provider order. Callback signature and Fetch Payment prove captured state; callback alone cannot establish authoritative `paidAt`. Missing capture-time evidence must remain held without access.
5. **Webhook/activation:** Receive genuine signed Test `payment.captured`, verify account/order/payment/amount/currency and durable event identity, then inspect authoritative capture-event `paidAt`, exact 259200-second refund window and normal fulfillment. Retry/duplicate event must not duplicate profile/membership/redemption. Dashboard `/workspace/dashboard` must permit Early Access; prelaunch paid term starts 9 November 2026, with dates derived from the chosen plan. Role remains student; no LMS enrollment is created by Workspace payment.
6. **Creator workflow:** `/workspace/profile`: save/reload. `/workspace/courses/new`: create proposal; course detail: submit and lock. Existing Admin reviews via `/admin/workspace/course-reviews`: requests changes, creator edits/resubmits, Admin approves. Follow the approved course's link to `/workspace/courses/[id]/build`; save modules/text lessons and reload. No media, publication or course sales.
7. **Billing/refund/notices:** `/workspace/member` and `/workspace/member/billing`: verify original amount and membership dates. `/workspace/refunds`: request within the exact window. Admin `/admin/workspace-refunds` handles the normal decision/execution after explicit Test refund authorization (`WORKSPACE_REFUND_ENABLED`). Verify genuine refund webhooks/provider evidence, one completion, appropriate editing-access revocation and permitted historical read access. Drain authorized notice worker; verify owned-inbox acceptance/delivery and durable attempts without duplicate sends.
8. **Cleanup:** Disable the temporary Test webhook before stopping its authorized receiver/tunnel. Stop the provider-enabled process, then restart the payment-disabled command above. Do not delete retained financial/legal/review history.

## C. Admin and negative-security acceptance

Use a valid existing local Admin session. Fixed OTP never signs into Admin and does not elevate demos. Genuine Admin login needs separately authorized normal OTP with mock off. Tests below are planned, except the denials explicitly recorded in A and mocked regression tests.

| Entry point / actor | Action / expected result | Provider needed |
|---|---|---|
| `/admin/workspace`, student/anonymous | Denied; persisted Admin role required even for forged/stale UI/session claims | No |
| `/admin/workspace/access-grants`, Admin | Issue a dedicated development grant normally, inspect independent access source, revoke, then test genuine expiry without SQL timestamp rewrites. No fabricated payment or membership | No; valid Admin session needed |
| Another creator's course detail/build/API | Read/edit/submit attempts denied; no private title/content leak | No; two authorized creators needed |
| `/workspace/activate` | Expired/wrong email code, changed email and missing independent consent deny checkout | Authorized test email |
| Checkout/webhook/order | Failed/cancelled/held payment grants no access; genuine successful retry against the same provider order yields one winner; invalid signature, wrong account/amount/currency and duplicate events fail safely | Authorized Razorpay Test |
| Refund/Billing | Late request, duplicate execution, partial/uncertain refund and changed/unverified recipient obey existing rules; one notice effect and no unrelated entitlement revocation | Authorized Test refund/email |
| `/dashboard/courses`, `/dashboard/certificates`, `/admin/courses` | Existing owner-approved learner/Admin verifies current enrollment, coupon, private content and certificates; no entitlement changes during preparation | Only if genuine LMS purchase explicitly authorized |

## Verification, preservation and completion

Focused verification passed: **72 Vitest tests** (43 phone/local mock/rate-limit tests and 29 email, Creator access and terms regressions), TypeScript and lint on every changed source/test file. Production/staging/deployment refusal, target mismatch, privileged-user refusal including a role-change race, expiry, replay and rate-limit regressions passed with mocked HTTP. No real MSG91/Mailercloud/Razorpay/Redis calls occurred. `git diff --check` passed. The full audit/production build was not repeated, as requested for this preparation phase.

Only three newly created demo identities/profile contacts were written through normal auth flows. Read-only final inspection confirms their zero financial/entitlement/consent counts, retained Admin role, unchanged 31-entry ledger and matching source hashes. No deletion, reset, schema/ledger edit or migration occurred. An all-table original-row fingerprint comparison was not performed; do not infer one from these scoped checks.

Changed files: `app/(auth)/login/page.tsx`; `app/api/auth/send-otp/route.ts`; `app/api/auth/verify-otp/route.ts`; `lib/auth.ts`; `lib/otp-rate-limit.ts`; new `lib/phone-number.ts`, `lib/local-uat-otp.ts`, `lib/local-uat-otp-provider.ts`; new `tests/routes/local-uat-otp.test.ts`, `tests/routes/local-uat-otp-routes.test.ts`; this guide. Dependencies, migration sources, financial/legal/email business rules and `.env` files were not modified.

Remaining gates: authorize safe test Redis and provider operations; supply missing email/worker secrets and verify sender settings; establish a current authorized callback URL; complete genuine Test payment/refund and founder-led Creator/Admin/LMS journey; then obtain explicit **local UAT accepted** from the founder. This preparation is not UAT acceptance or permission for production migration/deployment. Stop after F.9C.1.
