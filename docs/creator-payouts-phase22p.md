# Phase 2.2P — automated Creator bank payouts

Status: local integration, synthetic verification and founder acceptance only. Public activation requires separate founder approval. No production migration, deployment or real transfer was performed during this phase. Phase 2.3 is outside scope.

## What changed

New monthly payout approvals use RazorpayX. Existing manual payouts retain their historical audit and recovery rules. No new manual-transfer execution path is offered for new approvals, and Razorpay Route is not implemented alongside RazorpayX.

The Creator submits bank details in **Workspace → Settings → Payout account**, following recent phone verification. Details are encrypted, masked on subsequent views and saved as an immutable version. An independent persisted Admin verifies account ownership and legal name. Creation of a RazorpayX contact or fund account is not itself verification of beneficiary ownership.

The Admin reviews reconciled previous-calendar-month proceeds and approves an exact amount against the verified bank version. This reserves the balance and creates a durable payout job and UUID idempotency key in the same transaction. A **second Admin**, distinct from the Creator and first approver, authorizes automatic execution. The worker then creates/reuses the version-bound contact and fund account, rechecks their active status and exact bank details, saves the encrypted payout request, records the submission attempt, and calls RazorpayX. Neither Admin makes a separate bank transfer.

A payout POST response can bind a provider ID but cannot mark Paid. An independent authenticated payout GET must match the approved amount, immutable reference, transfer mode and fund account before projecting status. Signed webhooks save a durable notification that expedites that GET. Polling also recovers without a webhook or browser return. Processed payouts continue to be checked daily and upon webhook notification for later reversal.

## Financial behavior

- AirBharath commission remains **0%**. Course tax, refunds, disputes and actual evidenced payment-gateway processing fees retain the existing immutable ledger treatment. Gateway fee tax is counted once.
- The approved bank payout amount is sent unchanged. RazorpayX payout `fees` and `tax` are preserved separately as raw provider evidence against the business funding account. They are not silently added to Creator deductions or to each other. Unknown evidence is shown as unknown. Revisit Creator cost allocation only through a separately approved disclosed policy.
- Payment Gateway collections and merchant settlement are separate from **RazorpayX payout funding**. This integration neither moves the PG balance into RazorpayX nor assumes such automatic funding exists. The funding account must contain the payout amount and applicable provider costs. [Create a bank payout](https://razorpay.com/docs/api/x/payouts/create/bank-account).
- Review candidates use the existing previous-month reconciled balance. Multiple approved payouts cannot reserve the same proceeds. Refund/dispute freshness, current payee verification and sufficient net proceeds are checked again before first dispatch, including database guards.
- Membership expiry continues to block Creator editing, uploads and publication while retaining published purchases, paid learner access, earnings and settlement obligations. It is not a reason to withhold owed funds.
- The provider minimum is ₹1. Smaller balances remain recorded for subsequent settlement review; support must resolve overdue amounts under the disclosed settlement policy. No earnings are erased.
- A provider transfer already accepted remains under reconciliation if a later refund/dispute changes the ledger. Negative balances and future amounts are reviewed through existing adjustments; the system does not pretend an already initiated transfer was cancelled.

## Protected configuration

Use the approved server environment or secret manager. Never put values in chat, source, screenshots, command arguments or committed `.env` files. Browser/public environment variables must never contain payout secrets.

| Variable | Purpose |
| --- | --- |
| `RAZORPAYX_KEY_ID`, `RAZORPAYX_KEY_SECRET` | API credentials permitted for this merchant and mode; no automatic reuse of PG credentials |
| `RAZORPAYX_MERCHANT_ACCOUNT_ID` | Merchant `acc_…`, must match course-collection merchant/mode |
| `RAZORPAYX_FUNDING_ACCOUNT_NUMBER` | Business payout funding account identifier from RazorpayX, **not the Creator bank account**; test/live identifiers can differ |
| `RAZORPAYX_TRANSFER_MODE` | `NEFT` or `IMPS`, approved for this account |
| `RAZORPAYX_WEBHOOK_SECRET` | Separate strong payout-webhook secret, at least 32 characters |
| `CREATOR_PAYEE_ENCRYPTION_KEY` | Existing 32-byte hex AES-GCM finance key; preserve access to historical encrypted versions |
| `CRON_SECRET` | Existing authenticated financial-worker secret, at least 32 characters |
| `CREATOR_BANK_SETTLEMENT_ENABLED` | Existing settlement approval switch |
| `CREATOR_RAZORPAYX_ENABLED` | New automated payout execution switch; default off |
| `RAZORPAYX_TEST_AUTHORIZED` | Explicit authorization to execute test-mode operations |
| `RAZORPAYX_LIVE_PERMISSION_REVIEWED` | Operator attestation after documented live capability checks; a flag is not provider proof |
| `RAZORPAYX_LIVE_EXECUTION_AUTHORIZED` | Separate founder-authorized live execution gate |
| `RAZORPAYX_LIVE_PILOT_PAYOUT_ID`, `RAZORPAYX_LIVE_PILOT_MAX_PAISE` | Restrict the first live operation to one exact approved payout and cap, ₹1–₹100 |
| `RAZORPAYX_LIVE_ROLLOUT_AUTHORIZED` | Separate broad live rollout approval; leave unset during the pilot |

Live credentials are rejected outside production database/runtime configuration and in nonproduction Vercel environments. A funding account fingerprint and merchant/mode scope are fixed on each job. Key rotation for the same account preserves scope. Changing funding accounts does not redirect existing jobs; retain the original funding configuration/worker until those obligations are reconciled.

Run `node scripts/creator-payouts-readiness.cjs` in a protected process environment. It loads no dotenv files, opens no database and makes no network call. It prints only configured booleans and readiness limitations. Its nonzero exit for missing configuration is expected.

For an explicitly authorized operator inspection, set `RAZORPAYX_PERMISSION_INSPECTION_AUTHORIZED=true` in that protected environment and run `node scripts/creator-payouts-readiness.cjs --inspect-read-access`. This performs GETs for contacts, fund accounts and payouts only. It never prints their payloads. Successful reads **do not prove** creation permission, sufficient funds, KYC completion, allowed transfer modes or webhook delivery.

## Account activation and external prerequisites

Dashboard activation is a founder-confirmed fact. The following still need evidence for AirBharath's exact merchant and mode:

1. Complete applicable RazorpayX business KYC, account onboarding and bank/funding activation. Obtain the correct test/live funding identifier from the X Dashboard or provider support.
2. Confirm that the protected API credentials are permitted to create contacts, bank fund accounts and payouts and to fetch/list their results. Obtain a support/account-permissions confirmation before a live pilot. GET permission alone is insufficient. [Payout APIs](https://razorpay.com/docs/api/x/payouts).
3. Configure stable production egress and allowlist its IP for live contact, fund-account and payout calls. A serverless deployment without approved stable egress must not activate execution. Test-mode behavior does not establish live allowlist readiness. [IP allowlisting](https://razorpay.com/docs/x/dashboard/allowlist-ip).
4. Check funding balance, transfer limits, permitted NEFT/IMPS mode and any RazorpayX maker/checker approval workflow. AirBharath's second Admin approval cannot bypass provider approval; provider `pending` is displayed distinctly.
5. Configure a separate X payout webhook at the future approved HTTPS endpoint `/api/payments/razorpayx/webhook`, with the protected payout secret. Subscribe to `payout.pending`, `payout.rejected`, `payout.queued`, `payout.initiated`, `payout.processed`, `payout.updated`, `payout.reversed` and **`payout.failed`**. The failed event subscription is required by Razorpay. [Payout webhook events](https://razorpay.com/docs/webhooks/payouts).
6. Verify signed test delivery and retries at an explicitly approved reachable nonproduction endpoint. Localhost alone cannot receive public Razorpay webhooks. No tunnel or deployment was created here. Razorpay requires a prompt 2xx response and retries failed delivery for 24 hours before disabling it; monitor delivery and disabled subscriptions. [Webhook setup](https://razorpay.com/docs/webhooks/setup-edit-payouts).
7. Run authorized provider test-mode contact/fund-account/payout operations through the app and verify GETs, callbacks and the X Dashboard. Synthetic tests validate local contracts, not account permissions or bank credit.

At implementation time no RazorpayX-specific protected credentials, funding identifier or webhook secret were configured. No authenticated provider-permission verification, authorized provider test payout, live payout, real bank credit or public webhook delivery was completed. An initial disposable browser harness missed its transport substitution and a contact request using synthetic test credentials was denied before any payout submission; the harness now refuses startup unless synthetic transport replacement is installed. These are external activation requirements, not simulated successes.

## Scheduler, reconciliation and recovery

The source scheduler adds `GET /api/internal/creator-payouts/reconcile` every minute, authenticated with the existing `Authorization: Bearer <CRON_SECRET>` mechanism. The runtime supports a 60-second function budget; worker network calls have 6-second timeouts, and its time budget stops new calls before expiry. Verify scheduler frequency, hosting-plan support, egress and execution duration before separately approved deployment. A source cron entry is not a running production scheduler.

Payout authorization and webhook routes also request best-effort work after their response; durable jobs and the scheduler recover if the browser closes or that work is interrupted. Claims expire after two minutes. Processing states poll approximately once a minute, transient failures back off up to one hour, and processed payouts poll daily. Monitor actual queue age, worker failures, pending authorization, provider `pending`, insufficient funding, stale reconciliation, undelivered webhooks and any unsettled amount past the disclosed review target. An uncertain attempt older than 24 hours appears in Admin exceptions.

| Situation | Required behavior / operator action |
| --- | --- |
| `queued`, including `low_balance` | Keep reservation. Fund the separate payout account through its approved method; the existing payout continues. Never create a replacement merely because funds are low. |
| `pending` | Resolve the provider's own approval queue; AirBharath still shows pending. |
| `processing` / `scheduled` | Track the existing payout. No manual Paid action. |
| `processed` | Paid only after matching independent GET evidence; preserve UTR and fee/tax observations. A later reversal remains possible. |
| `reversed`, `failed`, `rejected`, `cancelled` | Independent GET establishes terminal failure; preserve history and release its reservation. A separate fresh approval and second authorization are required for a new transfer. |
| First POST definitively rejected with 400/401/403 | Persist rejection evidence and release the reservation. This exception applies only to the first submission, with no earlier uncertainty/provider ID. Review the rejection before reapproval. |
| Timeout, 409, 429, 5xx, invalid/mismatched response | Keep reservation and original intent/key. Search/list by immutable reference, independently GET matches, then retry the exact original request/key if still absent. No new transfer identity is generated. |
| A rejection after an earlier uncertain submission | Do not infer no transfer occurred. Keep reservation and trace the original operation. |
| Missing provider ID | Automatic paginated reference search. A different Admin may record a provider-support/Dashboard `pout_…` hint using **Trace missing provider payout**. It must match an independent GET before binding; the hint never proves Paid. |
| Inactive/rejected bank account or revoked local verification before dispatch | Block new submission. Cancel the untouched reservation, correct/verify a new bank version and reapprove. An already approved operation is never redirected to new details. |
| New payment/refund/dispute review before dispatch | Financial guards block submission. Reconcile the ledger and cancel/reapprove if the reserved amount is no longer valid. |
| Permission loss / credential or funding configuration change | Stop new execution using `CREATOR_RAZORPAYX_ENABLED=false`; retain configured read reconciliation and investigate existing operations. Never issue a parallel manual transfer while their outcome is unknown. |

The adapter uses standard contact/fund-account endpoints and the required `X-Payout-Idempotency` header. Exact contact identity and exact bank-account identity are reused under the provider's documented duplicate behavior. Immutable reference IDs identify the local payout. [Contacts](https://razorpay.com/docs/api/x/contacts/create), [bank fund accounts](https://razorpay.com/docs/api/x/fund-accounts/create/bank-account), [idempotency](https://razorpay.com/docs/api/x/payout-idempotency/make-request). No undocumented idempotency retention duration is assumed. Escalate long-lived unknown outcomes to provider support; never “solve” uncertainty with a new key or erase owed funds.

## Founder local acceptance

The credential-free local fixture uses synthetic identities, bank accounts and provider HTTP responses. It does not prove real money movement. Current screenshots and results are in `output/audits/workspace-phase22p/REPORT.md`.

1. Creator: open `/workspace/earnings`, inspect 0% commission, ledger adjustments and payout history. Open Settings → Payout account; confirm recent authentication is required, details stay masked and a change creates a new pending version.
2. First Admin: open `/admin/creator-settlements`, review prior-month proceeds, verify the payee and approve a small **synthetic** amount. Confirm it awaits independent approval and that this Admin cannot authorize execution.
3. Second Admin: open that payout and select **Authorize automated payout**. Review the exact amount and masked destination in the confirmation dialog. Confirm automatic initiation; no manual bank action is offered.
4. Inspect queued/low-funding, provider pending, processing and uncertainty. Each retains its reservation. The synthetic browser suite exercises lost-response recovery using the same operation.
5. Inspect Paid after reconciled processed status, and a later Reversed state with original processed date retained. Check UTR, Creator history, Admin provider evidence and the monthly earnings CSV.
6. Verify responsive mobile screens, keyboard-contained dialogs, unchanged bank version binding, membership expiry restrictions and preserved learner access.

To reproduce isolated checks with the declared pnpm and existing dependencies, use the credential-free source-copy workflow in `scripts/phase22p-safe-source.cjs`; do not point any harness at `DATABASE_URL`. `scripts/phase22p-isolated-postgres.cjs` requires `DATABASE_ENV=test`, `PHASE22_ISOLATED_VERIFY=true`, `ALLOW_DATABASE_MIGRATION=true` and `ALLOW_DESTRUCTIVE_DB_OPERATION=true`; it creates a fresh database/cluster, checks its data directory and private Unix socket, migrates the versioned chain and runs the existing financial suite plus `phase22p-payouts.cjs`. `PHASE22_KEEP_FIXTURE=true` retains that synthetic fixture for the localhost server and browser checks. `PHASE22P_AUDIT_ROOT` may select an absolute dedicated `output/audits/workspace-phase22p` directory when the safe source copy runs in `/tmp`.

Prepare the safe `source` copy, then run `PHASE22P_LOCAL_TEST=true node scripts/phase22p-local-test.cjs` from the repository root; it serves `http://127.0.0.1:3024` with a localhost-only PostgreSQL proxy and replaces provider transport only in that disposable copy. Run `PHASE22P_BROWSER=true node tests/postgres/phase22p-browser.cjs`. Stop the disposable server and remove its generated `browser-source` and `build-source` copies after testing; retain reports/screenshots. These nested copies must not be left in the repository when running TypeScript directly at its root. The real app adapter is exercised, but it cannot contact Razorpay. Do not configure live credentials in these fixtures.

## Separately authorized future small live verification — NOT performed

This procedure is a review artifact, not authorization to execute it.

1. Obtain explicit founder authorization naming the exact beneficiary, amount/cap, merchant, funding account, environment and time window. Confirm the intended destination belongs to an authorized test recipient. Complete the external checks above and any necessary separate change/deployment/migration approvals. Do not use the local fixture for this.
2. Confirm actual available **RazorpayX** funds, including provider costs, static egress allowlisting, correct transfer mode, active webhook subscription, independent Admin accounts, ledger reconciliation and access to Dashboard/provider support and the beneficiary bank statement.
3. Keep `RAZORPAYX_LIVE_ROLLOUT_AUTHORIZED` unset. Only after explicit authorization, configure protected live gates and permit the first Admin to reserve the exact authorized amount against the verified payee. Record the resulting payout UUID.
4. Bind `RAZORPAYX_LIVE_PILOT_PAYOUT_ID` to that UUID and `RAZORPAYX_LIVE_PILOT_MAX_PAISE` to the authorized cap (100–10000 paise). Recheck the amount and destination; have the second Admin authorize that single operation. Do not authorize other jobs.
5. Observe the one provider payout ID and idempotency key in protected operational records. Check the X Dashboard, signed webhook delivery and independent GET status. Then obtain separate beneficiary bank-credit/UTR evidence and reconcile the funding debit, provider costs and Creator history. A POST response alone is insufficient.
6. On uncertainty, stop new submissions and trace the same operation. Never send another small transfer “to check.” Record failure/reversal honestly and follow the recovery table.
7. Disable new execution after the pilot while retaining read reconciliation and webhook ingestion. Preserve evidence. Founder approval of the observed bank result and a separate full-rollout authorization are required before public activation.
