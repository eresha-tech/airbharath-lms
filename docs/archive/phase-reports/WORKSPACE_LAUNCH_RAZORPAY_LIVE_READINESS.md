# Workspace Launch Blocker C — Razorpay Live readiness

## A. Scope

**RAZORPAY LIVE READINESS IMPLEMENTATION READY FOR CONTROLLED PRODUCTION CONFIG VERIFICATION.** This is source/runtime readiness, not permission to deploy, migrate production, configure credentials or charge customers. Starting branch `codex/workspace-1.8-launch`, HEAD `facbd2c`, clean worktree. Phase 1.9 frozen at `codex/workspace-phase19-wip@a9ea151`.

No Razorpay request, Test or Live financial transaction, Dashboard/Vercel change, database query, migration application, deployment, main merge, influencer coupon change or historical evidence mutation occurred in C. All provider implementation tests use fakes; global test HTTP blocks network. Existing B.2 genuine full-refund evidence remains valid, with the unresolved genuine refund webhook gap carried forward.

## B. Starting architecture

Dedicated Workspace key/account/secret configuration supported only Test mode. `WORKSPACE_PAYMENT_ENABLED` plus Test authorization gated runtime construction for order creation, callback, webhook and reconciliation. Thus stopping new sales also prevented financial intake/recovery. Checkout received only a server-projected public key ID. Existing provider adapter enforced integer amounts, bounded responses, timeout and conservative ambiguity handling; callbacks used signature plus provider fetch.

Webhook raw HMAC/account checks preceded JSON parsing and minimized durable inbox receipt. Business processing was separate from intake. Payment inbox had persisted leases, retry time, attempt count, hash-conflict handling and context-scoped recovery. `runWorkspaceReconciliation`, `runWorkspaceRefundReconciliation` and `runWorkspaceActivationRecovery` were server functions without a scheduled/internal operational entry point.

Refund workflow already used persisted-admin decisions, a durable prepared/uncertain intent before outside-transaction HTTP, one full amount, stable idempotency and independent aggregate proof. Notice templates and immutable outbox facts existed without a sender/delivery receipt. Fulfillment, access resolution, schema checks and membership guard admitted only noncommercial Test evidence. No Vercel cron configuration existed.

## C. Identified operational gaps

Resolved: coupled charging/intake/recovery gates; absent Live classification/credentials handling; Test-only order/payment/event/refund schema checks and membership/access guard; no bounded authenticated scheduled recovery boundary; uncertain-refund scan fairness; external observations without attempts requiring repeated manual reconciliation; no safe reusable readiness command.

Explicitly remaining: reliable notice delivery/claim receipts, actual production credential ownership/configuration verification, representative real PostgreSQL verification of generated 0021/worker behavior, deployment/scheduling and genuine refund webhook evidence. These are release/operations gates; noticesReady deliberately remains false.

## D. Runtime classification

Production requires server NODE_ENV production, DATABASE_ENV production, VERCEL 1, VERCEL_ENV production and consistent VERCEL_TARGET_ENV when supplied. Local production build, development, Preview and custom environment cannot authorize Live operations. Server environment is trusted deployment configuration, not client request data or cryptographic proof of DB identity. The next authorized gate must verify the actual DB target separately. [Vercel system environment metadata](https://vercel.com/docs/environment-variables/system-environment-variables).

## E. Live/Test isolation

Mode must match exact Test/Live key prefix and valid account syntax, with sufficiently long dedicated API and webhook secrets. Test requires explicit Test authorization and a nonproduction local development/test classification. Production Test, Preview/local Live, mixed mode/key and contradictory Test/Live authorization fail closed. API and LMS webhook secret reuse for Workspace signing is rejected when detectable. No legacy key/secret fallback.

Live mutation authorization is distinct from coherent Live configuration. Live authorization false disables both new provider orders and refunds; separately enabled signed intake and GET reconciliation can remain available. Credential shape/ownership coherence checks are offline and do not authenticate credentials with Razorpay.

## F. Capability switches

| Capability | Switch and requirements |
| --- | --- |
| Checkout/new order | WORKSPACE_PAYMENT_ENABLED + coherent mode/runtime + mode-specific mutation authorization |
| Refund initiation | WORKSPACE_REFUND_ENABLED + coherent mode/runtime + mode-specific mutation authorization + normal persisted-admin workflow |
| Webhook | WORKSPACE_RAZORPAY_WEBHOOK_ENABLED + coherent scoped configuration; independent of charging/Live mutation flag |
| Reconciliation/worker | WORKSPACE_RAZORPAY_RECONCILIATION_ENABLED + coherent scoped configuration; independent of charging/Live mutation flag |
| Notices | No delivery capability claimed; immutable outbox lacks durable sender receipts/leases |

Defaults off. `.env.example` has names/empty placeholders and false flags only; actual `.env` untouched. Prepared approvals remain prepared while refund mutation is paused; processing/uncertain states can reconcile read-only. The release gate must independently establish deployed intake/worker readiness before enabling sales, rather than equating a capability flag with a deployed scheduler.

## G. Configuration validator

Server-only private `configuration.ts` wraps a shared pure safe-readiness core. It returns checkoutReady, refundMutationReady, webhookReady, reconciliationReady, noticesReady, liveModeSafe/testModeSafe, classification/key-type/account-configured booleans and fixed reason codes; no secret/account/key values. The CLI shares that core, avoiding duplicated validation rules. Empty/unconfigured Workspace remains controlled/unavailable rather than crashing LMS.

## H. Checkout safety

Actual order route checks checkout capability before auth/DB/provider work. Only key ID/provider order ID are projected to the client; no NEXT_PUBLIC Workspace credential was added. Existing recovered order Checkout projection requires matching current account/mode and no full refund. Existing Checkout accepts server-projected Test/Live public IDs, shows Test/no-real-money text only for Test and keeps real callback validation. All agreements, frozen economics, money rounding, coupon reservation and original-order recovery behavior retained.

## I. Webhook independence

Actual webhook route requests webhook capability, uses current scoped account/mode/secret, verifies raw bytes before parsing and commits durable minimized evidence before any business recovery. It does not require checkout authorization. Callback requests existing-state reconciliation capability, preserving callback authenticity/fetch while new sales are disabled. Standard webhook mode is optional when omitted by provider; explicit mismatching mode is refused, and distinct environment secrets/keys plus scoped fetch protect the mode boundary.

Regression: coherent synthetic Production Live configuration with charging disabled accepted a correctly HMAC-signed/scoped event into the actual route's fake durable store, while actual new-order route refused before financial writes/provider calls. Separate scoped Live inbox service test established capture time only through verified capture-event evidence. No genuine delivery claimed.

## J. Refund safety

Provider factory validates operation authorization before every GET/order/refund HTTP call, including injected HTTP fakes. Test compatibility factory retains explicit runtime gates and cannot accept Live mode. Refund mutation guard is also consulted before approval/retry/claim, so disabling refunds cannot accidentally consume a prepared intent or send HTTP. Reconciliation avoids illegal no-op prepared-state transitions under existing SQL guards.

Live mode retains full-only amount, persisted-admin role, frozen economics, stable X-Refund-Idempotency, opaque notes, outside-lock HTTP, ambiguity/reconciliation and authoritative full completion before access revocation. Live activation refuses Test-authoritative capture sources and admits only the existing captured-event rule. Test historical membership cannot become paid production entitlement.

## K. Reconciliation

Durable payment inbox states/leases/retries and existing recovery marker reused. Refund processing/uncertain attempts get a persisted last-check marker before provider fetch and fair bounded ordering. Prepared work is excluded from ordinary read-only attempt recovery when mutation is paused. External observed refunds without a local attempt use a context-scoped, no-completion/no-attempt scan and existing order recovery marker, then GET-only convergence; no remainder refunds or manual paid/refunded overrides.

Membership fulfillment remains a separate idempotent transaction using persisted user/order/profile locking, unique origin membership, authoritative paidAt/refund deadline and canonical prelaunch/calendar-month terms. Live production context is required; disabled charging does not revoke a legitimate existing Live membership.

## L. Workers/scheduling

Added authenticated Node `GET /api/internal/workspace/reconcile`: CRON_SECRET at least 32 characters, exact Bearer header constant-time comparison, no cookie/query/user-agent authorization, no-store safe summary, no raw errors. No actual schedule configured. [Vercel cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Bounded scans at most three candidates each (refund attempts and external observations are separate scans), provider abort deadline 40 seconds, individual HTTP timeout 10 seconds, route maxDuration 60. Persistent DB claim/idempotency enables later invocations after crash/response loss; provider HTTP outside DB locks. Platform/database timeout behavior, schedule and throughput must be verified in controlled operations. Recommended plan-compatible 1–5 minute cadence, never sub-minute/exact timing promised; documented Hobby scheduling cannot provide frequent financial recovery. [Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Needs_review/hash-conflict incidents remain deliberate protected operator review, not blindly reopened. Pending/retry/expired lease/recoverable order/processing refund work remains repeatable independent of browser activity.

## M. Admin/CLI diagnostics

Chose smallest CLI boundary instead of a new admin UI: `pnpm workspace:payments:readiness`, optional `--matrix`. Default reads explicit process env, does not auto-load .env, query DB or call provider. Matrix uses clearly synthetic shaped placeholders. Output contains safe readiness booleans/enums/reasons, with noticesReady false. Existing persisted-admin financial/refund reports remain the protected DB inspection surface; no public diagnostic endpoint or provider IDs/PII added.

## N. Vercel configuration plan

Production-only Live credentials/DB and strong cron secret; Preview/local must not receive production secrets. Pre-launch charging, refund initiation and Live mutation authorization off. Independent webhook/reconciliation enabled only in a later authorized operational gate. Config changes require approved redeployment and verification of the active runtime; not an instantaneous emergency stop. [Vercel scoping/redeployment](https://vercel.com/docs/environment-variables), [Config versus Secret storage](https://vercel.com/docs/environment-variables/sensitive-environment-variables).

## O. Razorpay Live setup plan

Runbook provides owner-only future steps for Live API pair/account verification, distinct Live Workspace webhook secret, production HTTPS endpoint, exact events, capture behavior and access controls/2FA. Implemented documented event set: payment.authorized, payment.captured, payment.failed, order.paid, refund.created, refund.processed, refund.failed, refund.speed_changed. Every refund type routes to independent scoped GET/full-state proof or safe review/ignore; not automatic payload-based membership mutation.

Official documentation reviewed: [API keys](https://razorpay.com/docs/payments/dashboard/account-settings/api-keys/), [payment events](https://razorpay.com/docs/webhooks/payments/), [refund events](https://razorpay.com/docs/webhooks/refunds/), [raw HMAC](https://razorpay.com/docs/webhooks/validate-test/), [normal idempotent refund](https://razorpay.com/docs/api/refunds/normal-refunds-idempotent), [payment fetch](https://razorpay.com/docs/api/payments/fetch-with-id/), [refund fetch](https://razorpay.com/docs/api/refunds/fetch-with-id/). No credential insertion, Dashboard action or provider request.

## P. Production migration/deploy compatibility

Actual production ledger unknown: source baseline main@81623e2 through 0006 is not proof of applied DB history. Source inspection of pending Workspace lineage found additions/Workspace guards without DDL changes to legacy users/orders/enrollments/courses. New app depends on the added tables/columns; deploy-first against old schema leaves Workspace unavailable. Controlled migrate-first with Workspace writes/workers/charging paused, backup/recovery and a short release/maintenance window is recommended; no zero-downtime claim.

Runbook requires authorized actual DB identity/ledger/hash verification, exact reviewed pending sequence, stop on drift/missing ledger, guarded migration, post-ledger/schema/catalogue checks and payments-disabled candidate smoke. Missing ledger is not repaired through manipulation. Nothing executed here.

## Q. Security/privacy/logging

Private credentials accessed server-side only; Checkout projects allowed public identifiers. Runtime/provider/internal failures are fixed codes/messages, no raw provider payload/log dump. Body signature/account/mode/hash-conflict controls retained. No callback signature/session/OTP/contact/free-text financial fields added to logs/PostHog. Existing privacy suites pass. Default flags off and production-built Test/Preview Live refusal verified with fakes; default readiness CLI emits no secrets. Legacy LMS Razorpay code unchanged.

## R. Tests

Node 22.23.1, repository pnpm 11.15.1. Final full `pnpm validate` passed: 69 route test files / 885 tests; all five pure test files; TypeScript; lint. Focused configuration/mode/capability/webhook/refund/worker/provider tests exercised strict no-HTTP-before-authorization, kill switches, wrong scope, secret boundary, concurrent processing, lease-expiry crash recovery, post-GET/pre-DB failure, committed-completion response loss, notice timeout independence, external observation recovery and concurrent scoped Live fulfillment.

Worker concurrency tests use in-memory repository fakes that model transaction serialization/leases; they are not represented as new real PostgreSQL verification. Earlier real DB guarantees remain prior evidence; generated 0021 and new worker queries need separately authorized representative real DB verification before production release.

Final isolated `pnpm build` passed with public payments disabled, fake unreachable database, no real provider secrets, cached fonts and no external provider operations. `git diff --check` passed. Initial test/source-location assertions and test type annotations were corrected without weakening operational gates. A quota-limited build retry succeeded after deleting only task-owned temporary build copies. No dependencies/lockfile changes.

Implementation commit: `5fc7053` (`feat(workspace): separate Live financial capabilities and durable recovery`). The two requested documents are committed separately; their final commit is reported at delivery.

## S. Files changed

Changed files:

- `.env.example`
- `WORKSPACE_LAUNCH_RAZORPAY_LIVE_READINESS.md`
- `WORKSPACE_RAZORPAY_LIVE_OPERATIONS.md`
- `app/(user)/workspace/activate/page.tsx`
- `app/(user)/workspace/member/page.tsx`
- `app/api/internal/workspace/reconcile/route.ts`
- `app/api/workspace/membership/orders/[id]/route.ts`
- `app/api/workspace/payments/razorpay/confirm/route.ts`
- `app/api/workspace/payments/razorpay/webhook/route.ts`
- `components/workspace/MembershipCheckout.tsx`
- `drizzle/0021_workspace_live_financial_modes.sql`
- `drizzle/meta/0021_snapshot.json`
- `drizzle/meta/_journal.json`
- `lib/db/schema.ts`
- `lib/workspace/activation/model.ts`
- `lib/workspace/activation/repository.ts`
- `lib/workspace/activation/runtime.ts`
- `lib/workspace/activation/service.ts`
- `lib/workspace/creator/model.ts`
- `lib/workspace/eligibility/service.ts`
- `lib/workspace/payments/classification.ts`
- `lib/workspace/payments/configuration-core.d.mts`
- `lib/workspace/payments/configuration-core.mjs`
- `lib/workspace/payments/configuration.ts`
- `lib/workspace/payments/model.ts`
- `lib/workspace/payments/provider.ts`
- `lib/workspace/payments/runtime.ts`
- `lib/workspace/payments/service.ts`
- `lib/workspace/payments/worker-auth.ts`
- `lib/workspace/payments/worker.ts`
- `lib/workspace/refunds/repository.ts`
- `lib/workspace/refunds/runtime.ts`
- `lib/workspace/refunds/service.ts`
- `lib/workspace/refunds/store.ts`
- `package.json`
- `scripts/workspace-payments-readiness.mjs`
- `tests/routes/workspace-activation-boundaries.test.ts`
- `tests/routes/workspace-activation.test.ts`
- `tests/routes/workspace-financial-worker.test.ts`
- `tests/routes/workspace-live-fixtures.ts`
- `tests/routes/workspace-live-readiness.test.ts`
- `tests/routes/workspace-live-webhook.test.ts`
- `tests/routes/workspace-payments-model.test.ts`
- `tests/routes/workspace-refund-provider.test.ts`
- `tests/routes/workspace-review-boundaries.test.ts`
- `tests/routes/workspace-worker-route.test.ts`
- `tests/setup.ts`
 Changes are confined to Workspace financial configuration/mode/access/recovery, minimal existing Checkout mode wording, generated migration metadata, safe CLI, regression tests and two requested documents. Actual env, LMS financial code, influencer coupon implementation and Phase 1.9 unchanged.

## T. Migration, if any

Generated `0021_workspace_live_financial_modes.sql` and Drizzle snapshot/journal, not applied anywhere. Existing 0000–0020 SQL bytes and journal entries verified identical to facbd2c. Required because five financial mode CHECKs and membership fulfillment trigger rejected all Live evidence. Additive constraint/function replacement admits mode-specific commercial policy pair, preserves Test history and requires durable captured-event timing for Live membership; no row rewrite, trigger disable or history deletion. No notice delivery schema invented in this task.

## U. Remaining manual/production actions

1. Separately authorize actual production configuration/DB identity/ledger verification and later reviewed migration/deployment. Apply no migration without that authorization.
2. Review/rehearse unapplied 0021 against representative PostgreSQL; verify new worker queries/claims/platform and DB timeouts, scheduling cadence/throughput and protected operational diagnostics.
3. Owner adds Production-only credentials, verifies merchant/account/capture settings, distinct Live webhook secret/URL/event configuration and strong cron auth under C.2 authorization, while charging/refund mutation remain off.
4. Provision reliable durable notice delivery/receipts and authorized Mailercloud handling before public launch; noticesReady remains false.
5. Close genuine refund webhook operational evidence gap under separate explicit authorization; no new Test refund in C and no false B.2R PASS.
6. Final commercial/operations/release smoke and human authorization before any public Live charging. Influencer coupon hardening and Phase 1.9 remain separate.

## V. Recommendation

**RAZORPAY LIVE READINESS IMPLEMENTATION READY FOR CONTROLLED PRODUCTION CONFIG VERIFICATION.** The source supports safe independent capabilities and bounded durable recovery; tests/build pass. This does not mean public launch ready, credentials verified, migrations applied, notice sender provisioned or genuine refund webhook gap resolved. No C.2, Live configuration, production access, deployment or new financial transaction executed.
