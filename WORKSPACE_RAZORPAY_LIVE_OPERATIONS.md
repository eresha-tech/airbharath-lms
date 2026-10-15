# Workspace Razorpay Live operations

This is a runbook for a separately authorized future operations gate. Blocker C did not contact Razorpay, query any database, configure a Dashboard/Vercel project, deploy or activate charging. Configuration readiness is local/static validation, not proof that credentials work or belong to the intended merchant. Phase 1.9 remains frozen.

## A. Architecture

Workspace has its own credential namespace and financial domain. An authenticated eligible owner accepts current Creator Terms V2 and Refund Policy V1; PostgreSQL freezes integer-paise economics before provider order creation. A browser callback authenticates identifiers but never supplies paidAt. Signed raw-body webhook intake commits minimized evidence/hash/event identity to the durable inbox. Separate scoped GET reconciliation establishes capture/full-refund facts; normal fulfillment derives membership/profile/access. Live capture time uses only `razorpay_payment_captured_event_v1`; Test-authoritative synthetic time cannot fulfill a Live membership.

## B. Environment matrix

| Environment | Credentials/database | Authorization/capabilities |
| --- | --- | --- |
| Local development/test | Explicit Workspace Test pair, Test webhook secret and local/test DB | Test authorization explicit; Live authorization off. Enable only needed Test capabilities temporarily. |
| Vercel Preview/custom environment | No Live secrets, no production DB; preferably no provider secrets | All financial capabilities off. Production-built Test preview is currently refused; supporting it later requires separate scoped work. |
| Vercel Production, pre-launch | Owner may later insert Production-scoped Live configuration | Live mutation authorization, charging and refund initiation off. Webhook/reconciliation may independently be authorized later. |
| Vercel Production, authorized launch | Verified Production-only Live pair, distinct webhook secret and intended production DB | Mutation authorization and each approved capability enabled only after release gate. |

Production classification requires NODE_ENV production, DATABASE_ENV production, VERCEL 1, VERCEL_ENV production, and a matching VERCEL_TARGET_ENV when present. An ordinary local production build is unclassified and cannot use Live operations. Deployment metadata is trusted server configuration, not a cryptographic attestation; clients cannot provide it through financial API bodies. [Vercel system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

## C. Vercel Production variables

| Name | Type | Scope/purpose |
| --- | --- | --- |
| WORKSPACE_RAZORPAY_KEY_ID | Config; public Checkout identifier when authorized | Production only, Live identity |
| WORKSPACE_RAZORPAY_KEY_SECRET | Secret | Production only, private API signing/auth |
| WORKSPACE_RAZORPAY_WEBHOOK_SECRET | Secret | Production only, dedicated Live HMAC secret |
| WORKSPACE_RAZORPAY_ACCOUNT_ID | Config; protected merchant metadata | Production only, expected account |
| WORKSPACE_RAZORPAY_MODE | Config | Production Live mode |
| WORKSPACE_RAZORPAY_LIVE_AUTHORIZED | Config | Production financial-mutation authorization |
| WORKSPACE_RAZORPAY_TEST_AUTHORIZED | Config | False in Production; explicit only for local Test work |
| WORKSPACE_PAYMENT_ENABLED | Config | New charging/Checkout switch |
| WORKSPACE_REFUND_ENABLED | Config | Provider refund initiation switch |
| WORKSPACE_RAZORPAY_WEBHOOK_ENABLED | Config | Signed durable event intake switch |
| WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED | Config | Existing-state recovery and worker switch |
| CRON_SECRET | Secret | Strong worker Authorization credential, at least 32 characters |
| DATABASE_URL / DATABASE_ENV | Secret / Config | Separately authorized intended production DB/classification |

Enable Vercel-provided deployment metadata. Do not manually spoof its classification to make a local/Preview environment look like production. No NEXT_PUBLIC Workspace secret or key variable is needed; authorized order responses project only the public key ID and provider order ID. Environment scope must exclude Live secrets from Preview and Development. [Vercel environment scoping](https://vercel.com/docs/environment-variables).

## D. Which values are secret

API secret, webhook secret, database connection credentials and CRON_SECRET must use Vercel Secret storage and never be printed/read back, copied into reports/client bundles or sent to analytics. Current Vercel documentation distinguishes Config values from write-only Secret values; choose the appropriate type in the later owner action. [Vercel Config and Secret variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

## E. Pre-launch disabled configuration

Keep WORKSPACE_PAYMENT_ENABLED false, WORKSPACE_REFUND_ENABLED false and WORKSPACE_RAZORPAY_LIVE_AUTHORIZED false. Merely storing credentials does not authorize a financial mutation. Leave webhook/reconciliation off until their separately authorized operational configuration is verified; then they may be enabled without enabling new sales. Test authorization must remain false in Production. Everything defaults off.

## F. Launch enablement configuration

Before considering mutation flags, verify actual DB identity/ledger and pending migrations, credential ownership, agreement catalogues, worker schedule/timeout/capacity, refund operations, notice delivery, privacy and release smoke. Obtain explicit human launch authorization. Enable new charging and refund initiation separately with Live mutation authorization. Checkout availability is an authorization decision, not proof that workers are deployed: the release gate must verify webhook intake and recurring recovery before enabling sales.

Changing environment variables affects new deployments, not previous ones. Redeploy/refresh the approved runtime, verify the active deployment's capabilities and allow for in-flight old instances; flags are not an instant global switch. [Vercel environment update behavior](https://vercel.com/docs/environment-variables).

## G. Razorpay Live Dashboard setup

Future owner checklist, not executed in C:

1. Explicitly switch to Live Mode and confirm merchant/account identity and access controls/2FA.
2. Generate/locate the intended Live API pair. Verify account ID belongs to that pair; store privately in Production scope. Keep Workspace configuration separate even if the approved underlying merchant pair is shared with LMS.
3. Configure a separate Workspace Live webhook at `https://<production-domain>/api/workspace/payments/razorpay/webhook`.
4. Create a new dedicated Live webhook secret, different from the Test webhook secret, API secret and LMS webhook secret.
5. Select the implemented events below; verify enabled status and URL/account/mode. Preserve Test/LMS webhook configuration.
6. Confirm capture settings produce the captured payments required by this integration; authorization alone never grants membership.
7. Verify configuration and safe disabled-state responses under separate authorization. Do not create a Live payment/refund in a configuration-only gate.

[Official API key modes/setup](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/). Credentials cannot be authenticated by the no-network readiness CLI; ownership/validity verification remains a later authorized action.

## H. Webhook events

Select the exact implemented set:

- payment.authorized
- payment.captured
- payment.failed
- order.paid
- refund.created
- refund.processed
- refund.failed
- refund.speed_changed

Payment events reconcile fetched facts; only a verified captured event's stored timestamp supports paidAt. Refund events trigger scoped full-refund GET reconciliation, not payload-based access revocation. Failed/speed-change events retain processing/review evidence; partial or mismatching state cannot trigger a remainder refund. Unknown event names are safely ignored after durable intake, but need not be selected. [Payment events](https://razorpay.com/docs/webhooks/payments/), [refund events](https://razorpay.com/docs/webhooks/refunds/).

## I. Webhook secret setup/rotation

Raw bytes must pass Workspace HMAC verification before JSON parsing. Expected account, explicitly supplied mode where present, namespace/key mode and later provider fetch all participate in scope validation. Standard Razorpay payloads may omit a mode field; distinct Test/Live secrets and corresponding API credentials are required, rather than inventing a mandatory undocumented payload field.

Do not rotate blindly. Inventory pending deliveries and preserve the existing secret privately until its retry obligations are understood. This implementation has no dual-secret fallback. Drain/reconcile and plan a separately approved cutover; rotating while old automatic retries are pending may leave them rejected and requiring operator/provider-assisted replay. Automatic older retries use the original secret; the separately documented Dashboard Replay flow specifies the current secret. Reconcile those specific mechanisms before rotation, then verify active configuration without weakening HMAC. [Validation/old-secret guidance](https://razorpay.com/docs/webhooks/validate-test/), [Replay behavior](https://razorpay.com/docs/webhooks/replay-events).

## J. Reconciliation workers

`GET /api/internal/workspace/reconcile` requires a strong Authorization Bearer header matching server CRON_SECRET; cookies, URL/query secrets and cron user-agent strings do not authorize it. Vercel automatically sends its CRON_SECRET header when Cron is configured. No actual schedule/vercel.json was provisioned in C. [Cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

The Node route sets maxDuration 60 seconds. Each run visits at most three candidates per scan (including separate refund-attempt and external-observation scans), uses a shared 40-second provider-abort deadline plus per-call 10-second limit, and returns no-store fixed operational status. C.1 adds a dedicated worker pool with 2-second lock, 5-second statement/idle-transaction and 5-second connection timeouts, plus bounded pool cleanup. Shared LMS sessions are unchanged. Configure compatible function limits and verify actual platform/database behavior in the separately authorized deployment gate. The provider deadline is cooperative; database/platform timeout behavior must also be verified on the real runtime.

Payment processing uses persisted inbox states/leases, retry times and transaction locks. Provider order recovery is GET-only; missing/incomplete orders are never recreated blindly. Scan markers prevent old failed recovery candidates repeatedly occupying a batch. Activation separately converges captured/pending membership work through persisted user/order/profile locks and unique history.

Recommendation: assess backlog and begin with an authorized 1–5 minute cadence on a plan supporting it, then measure recovery throughput. No sub-minute or exact timing guarantee. Hobby's documented daily/hour-level scheduling is insufficient for frequent financial recovery; use a suitable paid plan or separately authorized scheduler. [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## K. Refund worker

Approved prepared intents can execute only when refund mutation and mode-specific authorization permit it. Pausing refunds leaves prepared intents untouched; it does not consume them into uncertainty merely because the switch is off. Processing/uncertain attempts use GET reconciliation, persisted last-check ordering and no blind second refund. External observations without an attempt receive a bounded GET-only scan using the existing order recovery marker. Partial observations stay under review; no remainder mutation.

Provider creation uses the original full captured total, stable attempt UUID in X-Refund-Idempotency, identical request body and opaque internal notes. An ambiguous outcome requires fetch/reconciliation, even though the provider documents safe idempotent retries; do not weaken the existing conservative policy. Full completion still requires matching processed refund plus payment full refunded aggregate. [Normal refund idempotency](https://razorpay.com/docs/api/refunds/normal-refunds-idempotent), [payment fetch fields](https://razorpay.com/docs/api/payments/fetch-with-id/), [refund fetch fields](https://razorpay.com/docs/api/refunds/fetch-with-id/).

## L. Notice delivery

Remaining launch blocker: current refund notices are immutable ID/order/kind/time facts with no sent receipt or delivery lease. Templates exist, but no reliable production sender is provisioned. Readiness explicitly returns noticesReady false. Do not add an in-memory sent set or claim a reliable sender is available. A separately reviewed durable delivery/receipt strategy and Mailercloud operational authorization are needed before public launch; financial truth remains independent of delivery failure. No Mailercloud request in C.

## M. Emergency kill switches

1. Disable new charging first through WORKSPACE_PAYMENT_ENABLED; activate/verify a new runtime deployment.
2. Preserve signed webhook intake and GET reconciliation when safe so in-flight capture/refund truth converges.
3. Independently disable WORKSPACE_REFUND_ENABLED if refund initiation is implicated; disable Live mutation authorization to stop both order/refund creation while retaining safe GET/intake.
4. Disable webhook/reconciliation separately only when their own security/operational incident requires it; retain backlog and plan recovery.
5. Do not edit source, disable HMAC/constraints or rewrite financial history to resolve an incident.

## N. Incident recovery

Use readiness CLI and protected existing Workspace financial/admin refund reports to inspect state. Missing/contradictory configuration refuses financial endpoints without crashing LMS. Investigate needs_review/hash-conflict/identity/economic anomalies; terminal review events are not automatically reopened. Workers revisit durable pending/retry/expired-lease events and scoped recovery orders; an operator may invoke safe existing reconciliation with explicit authorization. Never mark paid/refunded, inject paidAt, replace provider IDs or clear a hold without evidence.

After process loss, later invocations resume durable leases/intents. A completion committed before response loss stays authoritative. An uncertain provider mutation is never blindly sent again. Monitor function failures/backlog/last-checked markers and verify customer notices independently; PostHog is not financial evidence.

## O. Production DB migration/deploy sequence

Production source baseline `main@81623e2` reached migration 0006; this does not establish the actual production ledger. Current launch lineage now includes generated, unapplied 0021. This task performed no DB query or migration.

Recommended controlled migrate-first sequence:

1. Under separate explicit production DB authorization, verify exact server/database identity and actual migration ledger/hash order. Stop on missing ledger, schema drift or unknown hashes; do not invent a baseline or manipulate ledger.
2. Identify the actual pending reviewed chain from source, in order; likely 0007 onward only if actual ledger proves the 0000–0006 prefix. Review 0021 constraints/function replacement and compatibility with existing rows.
3. Verify backup/snapshot restoration procedure and operational ownership; rehearse on a separately authorized representative non-production clone.
4. Pause Workspace writes/charging/workers and use a short controlled maintenance/release window. Apply only reviewed pending migrations with guarded pnpm db:migrate, temporary migration authorization and exact production classification, then verify ledger/schema/catalogues. No db:push/reset.
5. Deploy the reviewed candidate with charging/refund initiation/Live mutation authorization off. Smoke legacy LMS and Workspace agreement/read/error paths, then configure independent intake/recovery only under the next authorization gate.

Source audit of 0007–0020 found Workspace additions/guards without DDL changes to legacy users/orders/enrollments/courses; 0021 changes only Workspace financial checks and fulfillment guard. The old baseline app does not consume these new tables, so migrate-first is the recommended source-compatible direction. New Workspace app pages require those tables, so deploy-first against the old schema would leave Workspace unavailable. Constraint validation/locks and unknown real schema/data prevent a zero-downtime claim. Do not alter/roll back immutable history to simplify sequencing.

## P. Launch smoke sequence

Later separately authorized checks: active production classification and secret scope; readiness CLI; Preview Live refusal; ordinary disabled Checkout; actual DB catalogue/ledger including approved 0021; raw HMAC wrong-signature/account/mode refusal and signed-event receipt under an explicitly permitted evidence strategy; recurring worker auth, timeouts, lease expiry, backlog and recovery; agreement gates; read-only creator access; legacy LMS regression; notice delivery; emergency-flag deployment latency. No Live money until final release authorization.

Carry the B.2/B.2R gap accurately: genuine Test payment/full refund and independent completion passed, but genuine refund webhook delivery was never observed and available Dashboard controls lacked replay. C's fake signed/refund events do not close that evidence gap. No new Test refund was created in C.

## Q. Rollback/disable procedure

Disable new sales/refund mutations and mutation authorization, redeploy/verify active flags, preserve safe intake/recovery and all history. Application rollback must be assessed against the migrated schema and in-flight operations. Additive schema need not be destructively reverted with an application rollback. Backup restore, schema reversals, Live account/secret changes and production deployments require their own explicit authorization. Review redeployment latency and overlapping instances in incident planning; do not promise an instantaneous flag cutover.
