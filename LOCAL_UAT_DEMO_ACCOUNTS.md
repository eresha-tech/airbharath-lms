# Fresh local UAT demo accounts

Prepared 15 October 2026 on `codex/workspace-1.8-launch`, starting HEAD `8ac03f2`.

Four additional demo identities, ending **3223, 3224, 3225 and 3226**, are ready. Full local login details are provided directly to the owner in chat. Open `http://localhost:3000/login`, select Send OTP and use the guarded local mock code. Sign out before switching accounts.

All four were created through normal local mock-OTP/session routes as empty **student** accounts. Registration details remain unfinished, so login still presents registration. No eligibility decision, legal acceptance, order, membership, Creator Profile, grant, course or LMS entitlement was pre-created. Existing demos/accounts were preserved.

Complete registration, the normal eligibility check (minimum 12 completed months), contact email and independent legal agreements, then use normal Razorpay **Test Mode** checkout. Each new approval lasts 24 elapsed hours. Use a different fresh demo for each registration-to-payment run; completed financial history is retained rather than reset.

## Current runtime

After explicit owner approval, only this repository's local app was restarted with `pnpm dev:uat --payments-only`:

- Development DB: `localhost:5433/airbharath_lms`, OID `16384`, system identifier `7680462735222304705`; TCP/socket identity agrees. Ledger: 32 applied migrations, 0000–0031, matching source hashes/timestamps.
- Local allowlisted OTP and eligibility limiter enabled; no SMS or Redis calls.
- Test checkout, signed payment-webhook intake, payment reconciliation and exactly one scoped fulfillment worker enabled. The worker uses the existing demo allowlist and matching Test account; older demos had zero unresolved orders before enablement.
- Refund execution/reconciliation, notices, email delivery and Live authorization remain OFF. Flags are process-only; no `.env` change, migration, deployment or production access occurred.
- Existing owner-managed port-3000 tunnel preserved and reachable. Unsigned webhook: **403 signature**; anonymous order creation: **401**; unsigned internal worker access: **401**. Reachability is not genuine signed payment verification. No agent payment/refund/provider API call occurred; the founder performs Checkout manually.

Stop the running UAT process when finished. Starting ordinary `pnpm dev:uat` disables external providers again. Do not use the broad `--providers` mode for this payment-only test.

## Verification and changes

All four normal OTP logins/session issuances passed and still require registration. An adjacent unlisted number was rejected; invalid Indian mobile syntax was rejected. Read-only checks confirm empty student-only state and preservation of all **7,768 original rows across 62 tables**.

**35 focused tests passed. Full `pnpm validate`: 1,360 Vitest tests, 43 Node checks, TypeScript and lint passed.** `git diff --check` passed. No dependency changes or additional production build were needed for this narrow allowlist update.

Changed files: `lib/local-uat-otp.ts`, `scripts/workspace-local-uat-worker.cjs` (accurate startup wording only), `tests/routes/local-uat-otp.test.ts`, `tests/routes/local-uat-otp-routes.test.ts`, and this document. The final scoped commit and clean-worktree result are returned to the owner.
