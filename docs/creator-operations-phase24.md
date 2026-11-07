# Phase 2.4 — Creator support and launch operations

This phase prepares local functionality for founder review. It does not authorize production migration, deployment, public activation or live financial operations. Phase 2.3 was separately committed as `fb7e1ac`; Phase 2.2P remains the financial foundation.

## Available locally

- **Workspace → Support & Help:** account/membership, course publication, media, learner access, finance, moderation/appeals and technical questions. Private requests have status, replies, clear action-needed guidance and history. Support remains available to retained/expired Creators and signed-in onboarding applicants.
- **Creator course → Report this course:** signed-in learners can submit a private case for human review. A report alone never establishes a violation or suspends a course. Reports use the same support system.
- **Admin Workspace → Creator support:** New, Awaiting support, Awaiting requester, Urgent and Resolved history queues, with assignment, priority, private staff notes, requester-visible responses and recorded resolutions. Conversations paginate 25 messages; lists paginate 20 requests. Replies reopen resolved conversations; closed conversations require a new request or a recorded staff status decision.
- **Workspace → Notifications:** one view over existing saved publication notices, support actions, ledger sales, bank decisions, monthly payouts, independent provider observations and terminal media state. Read receipts are idempotent and owned. It contains no private staff notes, full bank data, raw provider payloads or secret values. The view contains recent events, with at most 100 per source; full history remains in the related domain pages.
- **Admin Workspace → Launch operations:** focused run-health, course-payment, bank-payout, media, moderation/appeal and refund-email queues. Existing financial recovery/approval tools remain authoritative. Run health distinguishes missing, recent, running, failed, stale and interrupted evidence.

The existing lavender UI, membership layout, Admin shell, course moderation, immutable publication history, shared review system, private S3/MediaConvert/HLS interfaces, original-video fallback, refunds, accounting and RazorpayX payout mechanisms are reused. No additional payment, queue or email platform is introduced.

## Moderation and expiry

Creators still create, price and publish technically ready courses independently. Trusted status does not unlock another publication route. Existing versioned guideline acknowledgement remains required. The current acknowledgement explicitly says detailed guidelines are forthcoming; **the founder must supply and approve the final text/version before launch**.

Moderation actions retain their recorded reason, restriction and immutable event history. Reference the related support case/evidence in the reason. Flag/corrections, unpublishing and emergency suspension have different consequences: unpublishing stops new sales; genuine suspension also blocks delivery. Creator appeals/correction explanations remain available with retained read access after membership expiry, while course edits/uploads/publication stay restricted.

A staff resolution records the appeal outcome. An independent Admin may then restore **only the unchanged existing publication immediately after that resolution**. This changes visibility, not content, pricing, acknowledgement, learner mappings or historical releases. The database independently verifies this condition. It cannot publish a new draft or bypass an unresolved restriction.

Previously verified video work may finish after membership expiry; this grants no new upload/attachment/publication permission. Published sales, existing learner access, financial history, verified payee management and legitimate settlement obligations remain governed by the existing approved rules. No new expiry payout hold is introduced.

## Operational ownership and recovery

Assign named human owners before launch:

| Work | Primary owner | When action is needed | Recovery |
| --- | --- | --- | --- |
| Support | Support lead | Open/waiting and urgent cases | Assign, reply, request details, record resolution. Keep internal notes private. |
| Moderation/appeals | Independent content moderator | Active restrictions, corrections or appeals | Review evidence in the existing course view; resolve, then restore only when appropriate. |
| Media | Media operations lead | Failed/expired uploads, uncertain dispatch, or processing age over 30 minutes | Keep source/attachments. Recheck an existing queued or identified submitted job. An uncertain CreateJob without ID needs its authenticated callback/investigation, never blind redispatch. A failed source uses an explicit fresh replacement upload. |
| Course money | Finance operations lead | Inbox backlog, missing evidence, repeated errors, stale disputed payments | Existing course reconciliation and settlement exceptions. No manual entitlement/earnings patch. |
| RazorpayX | Two independent financial Admins | Funding shortfall, provider approval delay, unknown submission, failed/returned transfer, stale tracking | Existing verified payee, monthly reservation, independent approval and provider GET/trace controls. Never initiate a second transfer to resolve uncertainty. |
| Monthly obligations | Finance lead | Monthly settlement review or an unsettled prior-period balance | Review every Creator balance through existing payout approvals. Membership expiry does not erase or indefinitely freeze owed funds. Legal deadlines and the final disclosed settlement policy still require founder/legal review. |
| Refund email | Support/finance operations | Blocked, uncertain, expired lease or repeated delivery errors | Existing refund-notice diagnostics/recovery, verified email binding and Mailercloud configuration. |
| Scheduler/application | Hosting owner | Never-observed/stale/interrupted runs or failed external availability checks | Verify enabled schedules, authentication, runtime settings and application/database health. Source cron configuration is not execution evidence. |

Support has bounded input, a five-new-request/day limit, a 60-message/hour limit, optimistic versions and per-user serialization. Consequential support and media-recheck commands have immutable replay evidence. Staff authorization is persisted, not inferred from a session role. New mutation endpoints require same-origin JSON.

Worker heartbeat rows use a six-minute lease and sanitized counters. The underlying durable financial leases, provider idempotency and independent verification remain intact. A new invocation cannot overlap an active heartbeat lease; after an interruption, the next scheduled invocation can recover the expired lease. The media worker cooperatively stops starting additional work near its execution budget. Missing provider configuration fails before a queued media intent is claimed.

No new automatic external delivery is added for general notifications/support. Those updates are in-app. Existing refund email delivery retains its separate configuration, authorization, verified-recipient and uncertain-delivery safeguards.

## Hosting and external monitoring requirements

The source schedules are daily membership recovery, five-minute course-payment recovery, minute-by-minute RazorpayX recovery, five-minute media processing and five-minute existing refund-email delivery. They use authenticated GET routes; the existing separately authorized media POST route remains available. Financial routes declare 60-second duration; media reconciliation and Admin media rechecks declare 300 seconds.

Vercel sends cron GET requests and its deployment-scoped `CRON_SECRET` authorization header. Cron execution can be missed or duplicated, can overlap, and failed invocations are not automatically retried. The durable database state, leases and subsequent reconciliation runs handle these cases. See [Vercel cron management](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs).

**Hobby cannot run these schedules**: current Vercel documentation limits Hobby cron jobs to daily execution, while Pro/Enterprise support minute intervals. Confirm the actual account plan and deployment settings; none were accessed here. See [Vercel cron usage and pricing](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing).

Confirm Fluid Compute/runtime limits against the actual project. The documented Fluid limits currently cover 300-second media routes, but project overrides and plan settings still need verification. See [Vercel function duration](https://vercel.com/docs/functions/configuring-functions/duration). Do not increase production duration or introduce infrastructure during local acceptance.

The existing HLS verifier can read up to its existing 2,000-object/4-GiB output ceiling. Large/long lessons must be tested with real authorized representative assets against the actual hosting/network budget before launch. A platform timeout preserves the identified job and surfaces stale/interrupted evidence; it does not prove that the largest supported output can finish verification within a single invocation. This phase does not claim a real-world capacity/load benchmark.

A database-backed page cannot alert you while the whole application/database is unavailable. Configure an independently operated uptime/error/scheduler monitor before launch. Choose and authorize the delivery destination and on-call owner separately; no external messages, monitoring accounts or production settings were created here.

## Local synthetic acceptance

Use Node 22, declared pnpm 11.15.1, installed dependencies, PostgreSQL 16 and Chrome. Do not load real `.env` files, credentials, bank details or a production database URL. The separate Phase 2.4 test port is **3028**; Phase 2.3 remains on 3026.

From the repository root, create a credential-free copy:

```bash
mkdir -p /tmp/airbharath-phase24
git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase24/files.manifest
node scripts/phase24-safe-source.cjs browser-source
```

Stop only a prior identity-checked Phase 2.4 fixture/server before recreating its copy. The fresh runner refuses to replace a running fixture. Preserve its prior synthetic data/history if investigating a failed acceptance attempt.

```bash
env -i PATH="$PATH" HOME="$HOME" \
 PHASE24_ISOLATED_VERIFY=true DATABASE_ENV=test \
 ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true \
 node scripts/phase24-isolated-postgres.cjs

env -i PATH="$PATH" HOME="$HOME" \
 PHASE24_ISOLATED_VERIFY=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true \
 node tests/postgres/phase24-operations.cjs

env -i PATH="$PATH" HOME="$HOME" \
 PHASE24_ISOLATED_VERIFY=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true \
 node tests/postgres/phase24-recovery.cjs
```

Start the guarded server in a separate terminal:

```bash
env -i PATH="$PATH" HOME="$HOME" PHASE24_LOCAL_TEST=true \
 node scripts/phase24-local-test.cjs
```

The launcher enables operations only inside this synthetic server and installs synthetic Razorpay, RazorpayX and media transports **only in its disposable copy**. It uses no live provider credentials. Synthetic media success is not real AWS processing, native browser compression or beneficiary bank-credit verification.

From a desktop terminal, open the lightweight signed-in local acceptance windows. It performs no support or financial mutations:

```bash
env -i PATH="$PATH" HOME="$HOME" \
 DISPLAY="$DISPLAY" XAUTHORITY="$XAUTHORITY" \
 XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$WAYLAND_DISPLAY" \
 PHASE24_OPEN_BROWSER=true node scripts/phase24-open-browser.cjs
```

The automated browser suites are `phase24-browser.cjs`, `phase24-browser-recovery.cjs`, `phase24-browser-accessibility.cjs` and the `phase24-finance-browser.cjs` checkout/payout regression wrapper. They require their explicit Phase24 flags. Do not run all browser suites concurrently or run them while a full production build is consuming resources.

For a repeat validation/build, stop only the Phase 2.4 server first and retain its identity-checked disposable database. Refresh the safe file manifest above, then run:

```bash
node scripts/phase24-safe-source.cjs validation
(cd /tmp/airbharath-phase24/validation && env -i PATH="$PATH" HOME="$HOME" \
 AWS_EC2_METADATA_DISABLED=true NEXT_TELEMETRY_DISABLED=1 pnpm validate)
node scripts/phase24-safe-source.cjs build-source
env -i PATH="$PATH" HOME="$HOME" PHASE24_BUILD=true node scripts/phase24-build.cjs
```

The build helper verifies the local PostgreSQL identity through its private Unix socket. Its production-format connection configuration points at an unavailable local TCP endpoint with TLS verification and read-only mode; it cannot target a production database. Results are written to the Phase 2.4 audit directory. Restart the synthetic server after the build.

Personally review:

1. Creator/new applicant: submit a clear support request, choose an owned reference, return to history and read the status.
2. Staff: assign a request, add a private note, send a visible next step, set urgent priority, resolve with an explanation and inspect the retained action history.
3. Creator: confirm private notes are absent, reply when action is needed, and see the request return to the support queue.
4. Learner: report a published Creator course; confirm the course is still available pending investigation.
5. Moderator: record a reason/evidence reference, suspend appropriately, read an appeal, resolve, and restore the unchanged publication. Verify no routine publish approval or trusted-only route appears.
6. Notifications: inspect saved support, media, publication, bank and payment updates; mark one as read and refresh. Processed payout messages require independent provider observations.
7. Media: inspect failed and stale entries; keep sources, avoid duplicate dispatches, and use the safe existing-job recheck where offered.
8. Finance: inspect existing payee verification, monthly approval and independent authorization; test only simulated queued, processed, failed, uncertain and returned states.
9. Retained Creator: confirm support, analytics, earnings and payee settings remain available while new editing/publication is blocked. Existing learners retain their lawful access.
10. Mobile/tablet/keyboard: open navigation, submit/reply, move between focused queues, inspect visible validation/status feedback and confirm no page-level overflow.

## Remaining coordinated launch gates

- Founder approval of this phase and the final publishing-guidelines text/version.
- Separate authorization for any production migration/deployment/public activation; reviewed migration 0041 has been applied only to disposable databases.
- Hosting plan, actual cron activation, protected secrets, runtime budgets, public endpoint delivery and independently monitored successful runs.
- Real AWS private/versioned storage, IAM, MediaConvert callbacks, representative long-video/HLS capacity and the outstanding **native H.264/AAC browser-compression verification**.
- Razorpay/RazorpayX live API/KYC/contact/fund-account/webhook permissions, payout funding account, actual funding, signed public webhook delivery, and a separately founder-authorized small live verification. Dashboard activation alone proves none of these. Payment Gateway collections and RazorpayX funding are separate.
- Final settlement disclosure, legal/tax review, moderation/evidence/retention rules, and named support/finance/content/hosting owners. No response-time SLA or legal payout deadline is invented here.
- Existing Mailercloud verified-recipient/provider configuration if refund email delivery is activated. New general support updates are in-app.

Actual results, screenshots, changed files, preservation evidence and any limitations are recorded in `output/audits/workspace-phase24/REPORT.md`. This guide is a local acceptance procedure, not a public release approval.
