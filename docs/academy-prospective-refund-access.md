# Prospective Academy purchase access

Local implementation only; public launch remains NO-GO. This document is engineering guidance, not published Creator or learner Terms.

## Effective boundary

New Academy quotes receive `purchaseEvidence.academyEntitlementPolicy = { version: 'academy-prospective-refund-v1', effectiveAt }` only when protected server configuration has `ACADEMY_ENTITLEMENT_POLICY_ENABLED=true`, a canonical UTC ISO timestamp in `ACADEMY_ENTITLEMENT_POLICY_EFFECTIVE_AT`, and quote time is at or after that instant. Invalid enabled configuration fails closed. Default configuration is off. No production effective date has been selected or activated.

The frozen marker and original order creation time define applicability, not eventual capture time, order status, a matching enrollment or presence of payment history. Existing pending orders resumed after activation keep their original evidence and exemption. Creator Workspace course purchases and memberships are outside this policy.

## Access and evidence

Verified capture creates one immutable purchase source in the same transaction as the existing payment/enrollment effects. Source order, user, course, provider account/mode, payment, amount and original duration are bound and guarded. Access is the union of independently valid purchase/grant intervals, including the existing parent-bundle access rules. Reconciliation never starts a fresh term. Independent Admin grants use a stable request identity and persisted Admin authorization.

Only authoritatively fetched, successfully processed refunds count. The worker fetches one bounded page of ten refunds, persists its cursor and deduplicates refund identities. Revocation requires exact payment/order/currency and cumulative processed amount equal to the original paid amount, confirmed by the fetched payment total. Pending, failed, partial, unavailable and uncertain evidence retain access. A webhook alone does not prove completion.

A fetched definitively lost full dispute invalidates only its purchase source. Open, under-review, action-required, ambiguous closed and partial losses do not automatically revoke. An authoritatively won dispute restores only that dispute's contribution, within the original term. A full refund is sticky: stale evidence or a decreased later refund total cannot restore it. No unsupported completed-refund reversal or generic restoration endpoint is introduced. Any provider-confirmed exceptional refund correction needs a separately approved append-only workflow.

Progress, enrollment IDs/history, reviews, financial records and issued certificates remain. Dashboard, course, lesson, progress and protected media decisions share effective access. Persisted Admin access and emergency Creator-course suspension retain their existing semantics. Zero commission, fees, Creator ledger, payout and membership rules are unchanged.

## Legacy compatibility and migration

Migration 0045 adds immutable `academy_entitlement_sources`, `academy_entitlement_events` and a bounded refund pagination cursor. It does not backfill, update or revoke historical enrollment rows. Migration SQL and snapshots through 0044 remain unchanged. Database preflight pins advance to the reviewed 46 migrations and 94 schema/snapshot inputs; ledger inspection reads one beyond the expected count to detect extra migrations.

A source may claim ownership of an aggregate enrollment only when both were created atomically in the same transaction. An older unknown aggregate retains its old independent status/dates and is never silently claimed. Prospective purchases do not extend its raw expiry. This distinction prevents a refunded new source from re-granting itself through the raw aggregate. If an actually captured exempt old pending purchase encounters an aggregate already owned by a new source, an explicit `legacy-capture-exempt-v1` record preserves its independent old-policy access. This is actual new capture evidence, not inferred historical backfill.

Original historical records require read-only classification first. Matching orders, latest orders, absent payments and raw active flags cannot establish purchase ownership. A later remediation needs proven provenance, separate policy/legal review and founder authorization.

## Future rollout and pause

No migration or activation is authorized by this guide. Before a separately approved rollout: review migration 0045, back up and rehearse through the guarded migration workflow, select the legal policy/copy and effective date, and coordinate all checkout/access/worker instances. Migration must precede new code queries. Mixed old access resolvers must not serve managed sources: they would trust the retained raw enrollment and bypass source revocation.

Turning the flag off pauses new cohort stamping; it does not erase or stop enforcing existing source evidence. Keep the source-aware resolver, reconciliation and managed Admin grant paths deployed. Do not roll back to an old binary once managed sources exist. No destructive rollback/backfill is supplied.

## Founder local acceptance

Use only the owned synthetic database and provider transport, with unrelated external requests blocked. Never reuse ambient DATABASE_URL or live financial keys.

1. Review separate webhook and policy commits and their source manifests; the original protected checkout must remain unchanged.
2. Review the frozen marker on a new synthetic order, then verified checkout/capture. Duplicate callback/worker delivery must leave one purchase source.
3. Visit a paid lesson, save progress and issue a synthetic certificate. Pending/partial/failed refunds retain lesson access. After fetched successful cumulative full refund, that purchase alone loses lesson/progress/media access; progress and certificate history remain.
4. Add an independent Admin grant or bundle. Access must remain/restored even though the refunded source stays revoked. Replay the grant command and refund events without duplicates.
5. Review lost/open/won dispute tests, multiple-source tests and legacy unknown-enrollment examples. No original legacy learner is backfilled or revoked.
6. Review desktop/mobile screenshots and limitations. The existing Admin shell has narrow-screen overflow; functional grant/access-state checks do not establish full mobile layout readiness.
7. Run the focused suites and `pnpm validate`, ordinary production build, and guarded PostgreSQL script on an isolated clone. `tests/postgres/academy-entitlements.cjs` requires explicit `ACADEMY_ISOLATED_VERIFY=true`, `DATABASE_ENV=test`, `ALLOW_DESTRUCTIVE_DB_OPERATION=true` and `ACADEMY_TEST_FIXTURE` naming a verified owned synthetic fixture; it rejects ambient DATABASE_URL.

Legal/commercial decisions still required: publishable learner-facing full/partial refund and dispute-access wording; approved effective date and checkout disclosure; treatment of issued credentials if policy ever changes; procedure for exceptional provider-confirmed corrections; any separately authorized historical review. Canonical Terms were not modified.

## Provider contracts

The adapter reuses the same merchant's read-only payment/refund/dispute APIs and existing durable worker. Only processed refunds are successful evidence; provider dispute states must be interpreted explicitly. See official [payment entity](https://razorpay.com/docs/api/payments/entity/), [refund entity](https://razorpay.com/docs/api/refunds/entity/) and [dispute entity](https://razorpay.com/docs/api/disputes/entity/) contracts. Live permissions, delivery, service timing, hosted media/AWS and production job reliability remain external acceptance gates.
