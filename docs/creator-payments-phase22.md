# Phase 2.2 — founder local acceptance

Creator course sales use the existing Razorpay checkout. AirBharath commission is **0%**. Deduct actual evidenced gateway fees, including the fee's GST component once. Course tax comes from the existing frozen tax-inclusive checkout quote; it is separate from gateway tax.

The initial settlement method is **manual monthly bank payout with independent Admin approval and bank evidence**. The application does not initiate a bank transfer or claim a direct Razorpay-to-Creator settlement. Creator membership expiry blocks editing, uploads and new publishing; it does not block published course purchases, retained learning access, earnings history, bank-detail corrections or valid settlement obligations.

## Finance UI/UX completion — local acceptance

The redesigned acceptance server uses [http://127.0.0.1:3023](http://127.0.0.1:3023). Port 3022 was the earlier interface. This is a synthetic local environment, not a deployed preview.

- Creator: **Earnings & Payouts → Overview / Transactions / Payouts**.
- Creator bank details: **Settings → Payout account**.
- Admin: **Creator Settlements → Overview / Payout approvals / Bank transfers / Payee verification / Exceptions & reconciliation / Completed & audit**.

The Overview uses complete database aggregates. Reserved transfers and confirmed paid amounts are separate. Unknown gateway fees stay unknown, and unreconciled proceeds are not displayed as available. Transaction and payout pages have independent pagination and URL filters. Purchase records expand into immutable monetary ledger entries. CSV export applies the complete server-side filter, protects formula cells and contains no private bank/audit evidence. Exports above 10,000 purchases require a narrower range and fail explicitly rather than truncating.

### Start the test server and windows

Run from the repository. Reuse the running isolated fixture when available. To recreate it, the first command creates and migrates a fresh PostgreSQL cluster only; it does not read an ambient database URL. Stop an existing synthetic server before replacing its fixture or source copy.

```bash
env -i PATH="$PATH" HOME="$HOME" DATABASE_ENV=test PHASE22_ISOLATED_VERIFY=true PHASE22_KEEP_FIXTURE=true ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true node scripts/phase22-isolated-postgres.cjs

mkdir -p /tmp/airbharath-phase22-finance-ux
git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase22-finance-ux/files.manifest
node scripts/phase22-finance-safe-source.cjs source

env -i PATH="$PATH" HOME="$HOME" PHASE22_LOCAL_TEST=true PHASE22_FINANCE_UX=true node scripts/phase22-local-test.cjs
```

Keep the server running. In another terminal:

```bash
env -i PATH="$PATH" HOME="$HOME" DISPLAY="${DISPLAY:-:0}" XAUTHORITY="${XAUTHORITY:-$HOME/.Xauthority}" PHASE22_OPEN_BROWSER=true PHASE22_FINANCE_UX=true node scripts/phase22-open-browser.cjs
```

This opens separate synthetic Creator, Admin approver, second Admin and learner windows. Bank changes require OTP authentication within 10 minutes; the isolated launcher supplies a synthetic fresh-authentication claim. Reopen the Creator test window to renew that synthetic claim. In the actual application, follow **Verify phone again** to the existing OTP login and return to Settings. Profile edits and session renewal do not count as fresh authentication.

The source copy installs a synthetic Razorpay adapter only at server startup. Browser traffic is restricted to the local server. No real provider payment or bank transfer is made. Do not refresh the disposable source copy while the server is running.

### Founder review sequence

1. Creator → **Overview**: confirm the four metrics, separate lifetime recorded net, monthly review explanation, current bank status and recent activity. There is no bank editing form here.
2. **Transactions**: search a course/order, apply dates/status/activity filters, move between pages and use browser Back. Expand original ledger records. Export filtered CSV; it must match the filter rather than just the displayed page. A fee includes its GST component once. Recorded net remains provisional when fees are unknown.
3. **Settings → Payout account**: choose Add/Change account, enter matching account numbers and an IFSC, accept the policy, then review the masked destination before confirming. The new version must show Pending verification. Full bank details are never prefilled. Previously approved payouts retain their original destination.
4. Admin → **Payee verification**: select the Creator's current bank account. Review legal-name/ownership evidence, choose Verify bank account, enter a synthetic reference, and use the confirmation dialog. Full bank reveal requires an audited purpose and hides after 60 seconds.
5. In the verified payee detail, approve a small synthetic payout from available previous-month proceeds. Confirm the exact amount and masked beneficiary. This reserves money; it does not execute a transfer.
6. In the second Admin window → **Bank transfers**, open the payout and record an external bank transfer with a unique synthetic UTR. The approver cannot record their own initiation. Initiated remains different from Paid.
7. Mark a transfer uncertain. The reservation remains while it is traced. The first Admin can independently confirm bank receipt against evidence, or confirm a verified failure/reversal. Failed transfers release the reservation; a new transfer must use a fresh UTR. Terminal actions and duplicate references must be rejected.
8. Creator → **Payouts**: inspect readable statuses, destination, settlement month, separate approval/initiation/confirmed dates and UTR. Download the monthly earnings statement. It covers that month's purchases and adjustments; individual purchases are not allocated to this manual payout.
9. Admin → **Exceptions & reconciliation**: inspect missing/stale evidence and structured correction proposals. One Admin proposes an exact signed adjustment; another approves it. Completed proposals remain complete even when their ledger entry is outside the visible transaction page. Changed evidence requires a new proposal.
10. Test at desktop, tablet and mobile widths. Use Tab/Shift+Tab, Enter and Escape. Review dialogs must keep focus inside, allow edits before confirmation and return focus afterward. Account mismatch errors must receive focus.
11. Membership expiry restricts editing, uploads and publication. Historical earnings, published purchases, retained learners, payout-account corrections and valid settlement obligations continue. The isolated foundation checks exercise real expiry guards; the additional expiry browser test advances the existing Creator service clock only in the disposable source copy, then restores it.

Synthetic checkout still uses the existing learner course and **Enroll Now**. The earlier no-return recovery workflow remains available on port 3022 with the earlier launcher mode; the automated foundation checks continue to cover durable recovery, refunds and exactly-once ledger/entitlement effects.

### Verification evidence

The UI completion evidence lives in `output/audits/workspace-phase22-finance-ux/`: final validation/build logs, PostgreSQL and browser reports, before/after desktop/mobile screenshots, tablet and financial-confirmation screenshots, changed-file hashes and the completion report. The prior Phase 2.2 evidence remains in its original directory.

## Settlement policy and provider limits

- Monthly available proceeds use reconciled orders placed before the current calendar month in India. Current-month positive proceeds remain for the following cycle; negative order balances reduce availability immediately. Proposed bank settlement is by the 10th, after evidence and payee checks. Founder approval of this disclosure is still required.
- Membership expiry never creates a payout hold. Unknown fees, provider failures and unresolved overlapping adjustments remain visible for review. A specific dispute reserves its evidenced amount. Earned amounts are not deleted. Admin must trace uncertain transfers and resolve overdue items; uncertainty is not permission to retain money indefinitely.
- No evidence was available that AirBharath's merchant account has Razorpay Route enabled. No private merchant account was accessed to determine activation. Route onboarding/transfers and RazorpayX payouts are not implemented or called. [Razorpay Route documentation](https://razorpay.com/docs/payments/route/) describes the linked-account settlement product.
- Bank ownership verification and final beneficiary credit are independently recorded human attestations against external bank evidence. There is no automatic bank-statement verification, penny-drop service or transfer API. Do not describe these payouts as provider-confirmed direct Creator transfers.
- The existing checkout uses an 18% inclusive course-tax calculation. The ledger records exactly that quote, actual provider payment/fee facts and proportional original-quote refund-tax allocations. A refund allocation is not proof of a statutory tax credit. Tax registration, seller-of-record treatment and any statutory withholding require the founder's accountant-approved treatment; no new guessed tax deductions are calculated. Exact statement corrections can be proposed and independently approved against evidence.
- Razorpay's [payment entity](https://razorpay.com/docs/api/payments/entity/) defines `fee` as including GST and `tax` as its tax component. Missing values remain unknown until re-fetched. Later canonical fee changes append adjustments. [Webhook guidance](https://razorpay.com/docs/webhooks/validate-test/) documents signatures and duplicate events; the inbox persists signed event identity before acknowledging it.
- The worker retries durable inbox failures with capped backoff. Each invocation handles up to 20 inbox events, 25 due orders and 100 disputes. Completed dispute pages persist a cursor; full sweeps recover missed dispute webhooks. Crashed order/inbox claims become retryable after five minutes. Failed counts return HTTP 503 for scheduler monitoring.
- The hourly cron configuration is source configuration only. Before live use, arrange a compatible scheduler for `/api/internal/course-payments/reconcile`, supply `Authorization: Bearer <CRON_SECRET>` and monitor failures, backlog, stale reconciliation and overdue bank reviews. No schedule was deployed.
- Course merchant identity is configured with `COURSE_RAZORPAY_ACCOUNT_ID`, the existing `RAZORPAY_KEY_ID` / matching `NEXT_PUBLIC_RAZORPAY_KEY_ID`, and `RAZORPAY_KEY_SECRET`. Signed course webhooks use a separate `COURSE_RAZORPAY_WEBHOOK_SECRET` of at least 32 characters and the new `/api/payments/razorpay/webhook` endpoint. The existing membership webhook is untouched. Scope uses merchant ID plus test/live mode, so key rotation alone does not split balances. Live keys fail closed outside `DATABASE_ENV=production`.
- Payee encryption requires a separately managed, backed-up 32-byte key in `CREATOR_PAYEE_ENCRYPTION_KEY` (64 hex characters). It is not the JWT secret. Bank approval/initiation remains disabled unless `CREATOR_BANK_SETTLEMENT_ENABLED=true`. The synthetic verification key is test-only. No environment files were changed.
- Historical pending, paid, refunded and chargeback orders enter a new recovery table without rewriting the old order. Legacy scope is bound only after an authenticated provider lookup matches frozen order/payment/amount evidence. Ambiguous, restricted or missing historical evidence requires review; it is not fabricated.

## Local sign-off

Review the verification report and changed-file manifest in `output/audits/workspace-phase22/`. Approve the application behavior and settlement disclosure locally before a coordinated Creator Workspace launch. This phase performs no production migration, live transfer, deployment, push or merge. Storage allowances, billing top-ups and resource pricing remain deferred.
