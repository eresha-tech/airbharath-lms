# Final local Creator payment UAT preparation

## Current decision

**Registration READY. LOCAL CREATOR PAYMENT UAT BLOCKED at payment-only worker isolation.**

The owner’s “Unblock final local Creator payment UAT” instructions expressly require reporting a blocker if payment fulfillment cannot be isolated from refund processing using existing configuration. The registration blockers are resolved; the complete payment UAT cannot honestly be marked ready under the current no-refund-reconciliation requirement. No financial implementation was changed to work around this boundary.

Starting branch `codex/workspace-1.8-launch`, HEAD `37c8eb3`, clean worktree. Changes: the existing development OTP allowlist, its two regression test files, and this report. No new harness, migration, provider launcher, financial behavior or UI redesign was added.

## Founder registration

Open `http://localhost:3000/login?callbackUrl=%2Fworkspace%2Fapply` on this computer.

| Purpose | Local demo mobile | Local test OTP |
|---|---|---|
| Primary Creator | 9876543222 | 1234 |
| Second Creator | 9000900009 | 1234 |
| Student / negative checks | 9696969696 | 1234 |

Press **Send OTP** first, then enter `1234`. The existing cooldown, one-use code, expiry, attempt limits and normal student account/session issuance remain enforced. These credentials work only in the guarded local UAT process; no master-code fallback exists. No paid membership, eligibility approval or legal acceptance is pre-created.

Real local HTTP Send OTP returned **200** for all three numbers. Successful verification/registration was deliberately left to the founder, so these requests created **no user accounts**. The production route tests exercise valid fixed-code verification, normal account creation and signed student-session issuance for each approved number using mocked persistence. Real local send/verify with `1234` returned **503** for an unlisted fourth number and all three former demo numbers; invalid Indian mobile validation returned **400**. Former accounts and histories were preserved; only their inclusion in the local mock changed.

## Running application and database

Only the verified repository Next.js port-3000 server and its own parent dev process were stopped. The existing `pnpm dev:uat` launcher restarted the app successfully on port 3000 in its default **external-providers-disabled** mode. The user’s tunnel was not created, changed, stopped or probed.

Confirmed runtime:

- `NODE_ENV=development`, `DATABASE_ENV=development`.
- Explicit local UAT OTP and eligibility-limiter flags enabled, after the launcher’s live database identity check.
- Redis credentials blanked; real SMS fallback unavailable in mock mode; development analytics disabled.
- Checkout, Test payment authorization, Live authorization, webhook intake, reconciliation, refund execution, email verification delivery and refund-notice delivery all explicitly **false**.
- No financial worker was started. No `.env` or persistent public payment switch was changed.

Fresh read-only checks before/after preparation confirmed:

- Authorized `localhost:5433/airbharath_lms`; TCP and `/tmp` socket reach the same server.
- Database OID `16384`, system identifier `7680462735222304705`.
- Exactly **32 applied migrations, 0000–0031**; every applied SQL hash and journal timestamp matches source. No migration command was run.
- Installed contact/order function matches 0031; five other migration 0027 functions unchanged.
- Quarterly **₹5,899**, half-yearly **₹9,999**, yearly **₹17,699**, inclusive of GST, unchanged.
- All three new demo accounts remained absent after Send OTP smoke. Existing demo order/membership counts were unchanged. No database insert, account edit, reset, seed or historical deletion was performed by preparation.

## Readiness checklist

| Check | Result | Evidence / limit |
|---|---|---|
| Local login and Workspace | PASS | `/login` and `/workspace` return 200; public Workspace retains payment-disabled copy |
| Anonymous private routes | PASS | `/workspace/activate`, `/workspace/dashboard`, `/workspace/billing` redirect to normal sign-in |
| Contact form / no mandatory email OTP | PASS, regression evidence | Phone-only activation component and contact route tests; no UI source changed. Prior real PostgreSQL and hydrated browser evidence at `aff000b`/`dc837b0` remains applicable |
| OTP isolation | PASS | New allowlist only; real local send/negative smoke; production/staging, target mismatch, privileged-account, expiry, replay and rate-limit regressions |
| Normal founder registration | READY / NOT YET PERFORMED | Founder performs successful verification and onboarding personally |
| Eligibility and independent legal receipts | PRESERVED | No pre-approval or consent insertion; no policy change |
| Current prices | PASS | Actual local catalog totals above; primary UAT must select Quarterly, INR, no coupon |
| Test credential shape | PASS, offline only | Existing local secret configuration reports Test key/mode, account and distinct webhook secret configured; no actual Razorpay account authentication was attempted |
| Payment-only full capability set | BLOCKED | Shared reconciliation capability and existing worker behavior described below |
| Supplied tunnel / genuine webhook | NOT YET TESTED | Existing HTTPS target/path retained; no tunnel probe, signed event or provider call |
| Genuine payment / fulfillment / dashboard | NOT YET TESTED | Checkout remains disabled; no provider order/payment or entitlement fabricated |
| Founder acceptance | NOT GIVEN | Registration readiness is not payment UAT acceptance or release authorization |

## Exact payment-only isolation blocker

The individual Test checkout and webhook-intake switches exist. They could be enabled independently after separate authorization, but intake alone does not process the durable event or fulfill membership. Enabling them now would expose an incomplete journey, so they remain OFF.

Normal browser payment confirmation and activation recovery require `reconciliation`. That same capability also provisions the refund runtime (`lib/workspace/refunds/runtime.ts`) and authorizes refund recovery. `WORKSPACE_REFUND_ENABLED=false` prevents refund mutations; it does **not** independently disable refund GET/reconciliation work.

Both existing worker entry points are unsuitable for the requested isolation:

- `lib/workspace/payments/worker.ts` always drains `payments`, **refunds**, and `activation`; it explicitly invokes `refunds.recoverPrepared`.
- `scripts/workspace-local-uat-worker.cjs` wires a refund-event processor and selects pending events without restricting them to payment event types. It also contains notice-delivery orchestration. The broad `--providers` launcher enables refunds/email/notices and was **not used**.

Therefore the required set—capture confirmation, genuine payment-event processing and normal fulfillment, with **refund reconciliation OFF**—cannot be guaranteed by an existing runtime flag combination. No broad worker or scheduled job was enabled. Minimal follow-up for separate approval: introduce an independently enforced refund-reconciliation capability and a payment-only worker path that excludes refund events/recovery and mail/notice delivery, with regression coverage. This preparation task does not authorize changing those financial paths.

Outstanding webhook setup before eventual payment UAT: independently authorize Test operations; confirm the currently configured Test account and payment event subscriptions; probe the existing owner-supplied tunnel only after approval; verify actual HMAC-protected delivery through normal processing. No new tunnel is required. The prior refund HTTP 400 and genuine refund-webhook verification remain separate unresolved release gates; no refund was retried.

## Validation and changes

**99 focused tests across nine files passed**, including OTP/store/routes, local eligibility limiter, contact, phone-only UI, payment routes/inbox/readiness and financial-worker regressions. **TypeScript, lint and `git diff --check` passed.** Per this task’s focused-only instruction, the full suite and production build were not repeated; no financial/UI/schema code changed.

Changed files:

1. `lib/local-uat-otp.ts` — replace the three owner-approved local demo numbers; preserve every environment, request, database, privilege and OTP guard.
2. `tests/routes/local-uat-otp.test.ts` — assert the exact new allowlist and deny all former demos.
3. `tests/routes/local-uat-otp-routes.test.ts` — exercise normal registration/session and negative guards using the new primary number.
4. `AIRBHARATH_FINAL_LOCAL_CREATOR_PAYMENT_UAT.md` — update current preparation evidence and precise remaining blocker.

No genuine Razorpay, MSG91, Mailercloud, production NeonDB, refund, deployment or public-payment operation occurred. The founder may begin local registration and eligibility now; stop at the disabled payment state. Do not start another phase or genuine payment operations under this preparation authorization.
