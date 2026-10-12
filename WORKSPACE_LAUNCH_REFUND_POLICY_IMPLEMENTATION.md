# Workspace Launch Blocker B — Refund Policy and refund workflow

Technical: **REFUND SYSTEM TECHNICAL GATE READY FOR REAL DB/RAZORPAY TEST VERIFICATION**.

Content: **REFUND POLICY CONTENT READY FOR FINAL OWNER/LEGAL REVIEW**.

## A. Scope

Implemented on `codex/workspace-1.8-launch`, starting at Creator Terms verification report `583aa3f`. Implementation commit: `a1f5bc6`.

This phase generated migration 0020 but did **not access or mutate PostgreSQL**, apply migrations, make genuine Razorpay requests/refunds, send real email, deploy, enable public payments or resume Phase 1.9. Provider and database tests use fakes. Official public documentation was read. The previously verified local ledger was 0000–0019; it was not queried again in this implementation phase.

Phase 1.9 remains frozen at `codex/workspace-phase19-wip@a9ea151`. Existing LMS payment code and coupon business logic were not changed. No dependencies, lockfile or environment files changed.

## B. Frozen business rules

V1 offers a full refund of the captured order total actually paid, including discounted pricing and GST, without deducting merchant or administration charges. No partial/custom refunds, credits or alternate payouts are implemented. Refunds use the original payment through Razorpay.

A timely request remains reviewable after its deadline. Request, approval, initiation, processing, uncertainty and rejection do not themselves revoke paid access. Only authoritative full-refund completion does so. An independent account restriction remains effective, but a profile flag or suspension is not an automatic refund rejection.

## C. Refund Policy version/hash/effective date

| Identity | Value |
| --- | --- |
| Version | `workspace_refund_policy_2026_01` |
| Fixed effective timestamp | `2026-10-12T12:00:00.000Z` |
| Display | Effective: 12 October 2026 |
| Canonical SHA-256 | `fe79d0c69ecc7bf38c8c7ca714818c9a3b083454ed3f6e1de32bd2dd0e14b7dc` |
| Public route | `/workspace/refund-policy` |
| Exact route | `/workspace/refund-policy?version=workspace_refund_policy_2026_01` |

Canonical UTF-8 content is `JSON.stringify(REFUND_POLICY_DOCUMENT)`. Source validation recomputes the hash and verifies document identity. A catalogue supports exact registered versions; unknown/prototype versions fail safely without substitution. Future contractual changes require a separate registered document/version and additive publication, preserving V1.

## D. Policy content

The policy states the 72-hour request window, later review of timely requests, deliberate approval/rejection with a reason, the distinction between initiation and completion, full original-method refunds, no customer fee deduction, retained creator work, ended paid entitlement after confirmed completion, variable provider/bank credit time and consumed coupon capacity.

Entity/contact details are the owner-confirmed Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand; West Patel Nagar, New Delhi 110008, India; `academy@airbharath.in`. Indian law/New Delhi context is consistent with Creator Terms. No additional corporate/statutory details or external legal approval are claimed.

Creator Terms V1/V2 contractual content and hashes are untouched. Its page receives only a separate navigation link to the Refund Policy.

## E. Policy acceptance

Independent `workspace_refund_policy_versions` and `workspace_refund_policy_acceptances` follow the proven Creator Terms architecture. Evidence has only ID, persisted owner, policy version/hash, acceptedAt and createdAt. Same-user/same-version retries converge. Catalogue content and acceptance history are append-only; only the version-selection pointer can change.

The authenticated, same-origin acceptance endpoint is `/api/workspace/refund-policy/accept`. Strict explicit acknowledgement and an exact hash precondition reject injected identity and stale tabs. Owner/catalogue locks serialize acceptance with prospective purchase selection. Reload projects a minimized current receipt; the checkbox remains initially unchecked. Checking alone makes no durable acceptance.

Activation now presents two independent agreement controls, each linking its exact document and requiring an explicit server save. Both must be recorded for the existing authorized Checkout CTA; ordinary payment-disabled UI remains unchanged.

## F. New-order snapshot/gate

New orders require active eligibility, valid quote/plan, current Creator Terms and current Refund Policy. Missing/stale/mismatched Refund Policy evidence returns `refund_policy_required` before order creation, coupon reservation or provider calls. Creator Terms alone and Refund Policy alone are insufficient.

Orders snapshot `refundPolicyAcceptanceId`, `refundPolicyVersion`, `refundPolicyContentHash` and `refundPolicyAcceptedAt`. Current catalogue SHARE locks persist through order commit. Composite ownership/document/time FK, prospective insert trigger and existing immutable accepted-order guard protect the snapshot. Historical rows retain nullable snapshots without backfill. Existing request recovery remains recovery of that original order, not a newly governed purchase.

## G. Refund request model

`workspace_refund_requests` stores one canonical case per order, owner, request key/payload hash, bounded reason/note, durable request time, deadline/amount/currency snapshots and attributed decision. Stable reason enum: mistake, unsuitable, technical, changed_mind, other. Additional details are optional and bounded to 2000 characters; no payout fields exist.

Owner/order/winning captured-payment evidence must match. Unpaid, held capture, unverified paidAt/deadline, already-completed refund, incomplete economics and late requests fail closed. A previously created case is returned on retry, including after expiry or terminal rejection; reused identity with changed content conflicts. No new self-service case is allowed after rejection.

Decision states: `requested`, `approved`, `rejected`. Provider execution is a separate entity. Neither request nor decision mutates membership or creator data.

## H. 72-hour boundary semantics

The existing successful-payment architecture remains authoritative:

`refundEligibleUntil = paidAt + 259200000 milliseconds`.

Timeliness is inclusive: **`requestedAt <= refundEligibleUntil`**. It is not measured from order creation, browser callback, launch or membership start.

Service time is sampled with PostgreSQL `clock_timestamp()` after locks. The request INSERT guard itself assigns `requested_at` and `created_at` using database time, ignoring caller-supplied/backdated timestamps, then enforces the stored deadline. Thus time spent waiting or crossing the boundary before durable insertion cannot backdate eligibility. Admin decisions do not recheck the current refund deadline for an already timely case.

Unit boundaries cover deadline minus 1 ms, exact deadline and plus 1 ms; a timely case remains reviewable one day afterward. Actual PostgreSQL precision/transaction boundary tests belong to the next verification phase.

## I. Creator UX

`/workspace/refunds` is linked from Membership status and Creator navigation. It displays the affected order/plan, amount paid, authoritative successful-payment time, deadline, approximate remaining hours and server-authoritative eligibility notice. The lightweight form chooses a reason and optional details, with no banking fields.

Expired windows show “Refund request window ended” and the deadline. Ineligible/unverified payments show a factual unavailable state. Existing cases show requested/under review, rejected with reason, approved/processing, processing requires review or completed. Support contact does not promise an exception. Network/storage failures retain input and advise reloading the existing case before retrying.

## J. Admin workflow

`/admin/workspace-refunds` lists pending cases first, then other decisions. It displays persisted creator contact where available, order/plan, amount, coupon attribution, payment/deadline/request times, membership state, reason and execution status. Separate external partial/mismatched observations are visible for review even without a local request.

The route, shared HTTP handler and locked transaction each enforce persisted admin authorization. Demoted/stale admin sessions cannot decide. Rejection requires explicit confirmation and a bounded reason. One terminal decision is immutable.

“Approve & initiate refund” commits approval and a prepared attempt together before provider interaction. Approval without an intent is rejected by a deferred DB constraint. Runtime provider authorization must be available for approval; absent authorization fails closed without committing an approval. Rejection remains possible without provider credentials.

Definitively rejected initiation may be retried through the same durable attempt/idempotency identity after preflight reconciliation. Uncertain outcomes and provider-failed refunds require reconciliation/review; there is no Force refund or Mark refunded action. Admin payloads cannot inject amounts, provider IDs or completion/revocation times.

## K. Refund provider architecture

The existing Workspace Razorpay Test adapter gains full-refund creation and payment-refund enumeration. It uses only Workspace credentials, expected account/Test Mode and existing strict temporary authorization gates. Production refuses those Test gates. No LMS credential or webhook-secret fallback was added.

Each refund POST uses the immutable full captured amount and original winning payment ID, `speed=normal`, stable attempt ID in `X-Refund-Idempotency`, and only opaque request/attempt IDs in notes. Before mutation, payment and refund-list fetches verify context, identity, amount/currency and absence of partial/external processing. Partial history never causes a remaining-amount refund.

Responses are bounded; HTTP times out after 10 seconds. A saturated 100-item refund page fails closed rather than proving absence from truncated history. Timeout/unrecognized errors are ambiguous. Only the existing narrow documented input-rejection category is definitive; its available response hash is retained as an observation.

## L. Durable attempts/events/reconciliation

Attempt states: `prepared`, `processing`, `completed`, `failed`, `uncertain`. A prepared intent is claimed as uncertain before HTTP, so crash recovery cannot blindly send a second mutation. Stable provider idempotency identity/body is retained. HTTP occurs outside DB transactions and locks.

The existing `/api/workspace/payments/razorpay/webhook` remains the single Workspace endpoint and raw-HMAC boundary. It durably stores minimized routing identifiers and the raw payload hash before a worker performs provider reconciliation. Refund routing adds an opaque refund ID; no raw provider contact/notes are persisted in the inbox.

Recognized events: `refund.created`, `refund.processed`, `refund.failed`, `refund.speed_changed`. The scoped processor verifies account/mode, payment/order/refund identity and independently fetched provider facts. Unknown events are safely retained/ignored. Partial or inconsistent evidence enters review. Duplicate event identities use the existing inbox uniqueness/hash-conflict protection; different event IDs with the same financial facts converge on one completion.

`runWorkspaceRefundReconciliation` is a server-only operator/worker boundary. Prepared intents may be executed; processing/uncertain ones are fetched/reconciled. An uncertain case with no conclusive completion stays uncertain for review, rather than automatically becoming retryable solely because a list returned no refund. Worker/scheduler provisioning is a separate operational gate.

## M. Completion and entitlement revocation

The versioned rule is **`razorpay_full_refund_fetch_v1`**. Completion requires a matching scoped original captured payment, exact original order/payment identity, INR and captured total, fetched payment `amount_refunded` equal to that total with refund status full, and one matching exact-full-amount refund whose fetched status is processed. Multiple non-failed/partial composed refunds are not treated as V1 full completion.

A provider 200, processed response alone, admin click or event name is insufficient. Independent fetch must establish full truth. The append-only `workspace_refund_completions` ledger stores scoped identities, amount, minimized provider evidence, hash and database confirmation time. Refund entity `created_at` is not represented as a bank-credit or processing-completion timestamp.

Captured-payment and membership history remain immutable. The order's projected `financialRefundState` becomes `fully_refunded` from this completion ledger, alongside preserved historical capture; owned reads suppress Checkout and expose refunded total/confirmation. The central membership resolver derives `refunded` and removes paid access/editing from that membership. It preserves historical read access where the existing environment/profile rules permit. Profiles, drafts, reviews and builder content are not deleted. A membership insert guard blocks new fulfillment from a fully refunded payment.

The old fallback that suspended an already fulfilled membership on any refund observation is replaced for this flow: a partial/unconfirmed observation preserves its fulfilled access state. Full revocation requires the completion ledger. Independent financial identity conflicts/account restrictions still fail closed. Production continues to refuse historical Test Mode entitlements.

## N. Coupon behavior

No coupon business rules or capacity release paths changed. Refunds preserve order/coupon relationships, frozen base/discount/tax attribution and historical redemption. The captured amount after coupon/GST is refunded in full; redeemed use remains consumed. Refund records do not decrement usage capacity or make that coupon reusable. Fake integration tests assert original financial/coupon state is retained across completion.

## O. Email/communications

Prepared a durable deduplicated notice outbox for received, rejected, initiated and completed milestones, plus truthful templates and a best-effort sender boundary. A DB insert guard ties each notice to the corresponding workflow fact; completed notices require a completion record.

Initiated language explicitly does not claim completion or bank receipt. Completed language is used only after authoritative full refund. Email failure does not alter financial state. No Mailercloud request was made. Delivery-worker integration/provisioning remains operational work; this phase prepares notices as permitted by the brief rather than claiming live delivery.

## P. Security/privacy

Persisted owner/admin checks, same-origin mutation protection, strict opaque selection, closed command schemas, payload bounds, idempotency, lock order and DB relationship/transition/history guards fail closed. Refund transactions lock persisted users in deterministic order, then order, case, attempt and payment evidence; database time is sampled afterward. Deadlock/serialization retries are bounded.

Private creator/admin screens are noindex, no-capture and sensitive; private receipts are no-store and omit raw gateway errors/credentials. The public policy is anonymously reachable through the middleware exemption. Acceptance evidence contains no copied contact/browser identifiers. Free-text reasons are not telemetry or provider notes. Refund financial telemetry is suppressed; the admin hyphen route is explicitly sanitized to anonymous device identity with no contact, reason or financial identifiers.

No public payment flags were persisted, no live keys added, and no production access/deployment occurred. All implementation tests and the isolated build excluded real environment credentials and used fakes/unreachable synthetic DB configuration.

## Q. Razorpay documentation audit

Official public documentation was inspected during this task; no authenticated provider endpoint was called.

- Normal refunds use `POST /v1/payments/:id/refund`; captured payments can be refunded, and the entire amount represents a full refund. [Refund APIs](https://razorpay.com/docs/api/refunds/)
- Basic Auth uses the API key pair. Normal refund idempotency uses `X-Refund-Idempotency`; retries must retain the same key and body. The implementation uses a UUID attempt key. [Idempotent normal refunds](https://razorpay.com/docs/api/refunds/normal-refunds-idempotent)
- Refund entities include refund/payment IDs, amount/currency and pending/processed/failed status. Their created timestamp identifies creation, not guaranteed customer bank credit. [Refund entity](https://razorpay.com/docs/api/refunds/entity)
- Payment entities expose `amount_refunded`, null/partial/full refund status and may have status refunded. The parser preserves historical captured truth only when a refunded entity reports full aggregate refund. [Payment entity](https://razorpay.com/docs/api/payments/entity/)
- Payment refund enumeration supports count/skip, with count up to 100; saturated results require review rather than a truncated absence assumption. [Fetch payment refunds](https://razorpay.com/docs/api/refunds/fetch-multiple-refund-payment)
- Refund events include created, processed, failed and speed_changed; raw-body signature verification remains mandatory. Event delivery triggers durable reconciliation, not unconditional completion. [Refund webhooks](https://razorpay.com/docs/webhooks/refunds)

The local predicates combine these documented facts conservatively. Actual account event availability, credential scope, normal-refund idempotency and aggregate-state convergence still require the separately authorized genuine Test verification. No fixed bank-credit promise is adopted from documentation examples.

## R. Migration

Generated **`drizzle/0020_gigantic_mordo.sql`**, snapshot `drizzle/meta/0020_snapshot.json` and the next journal entry. SQL SHA-256: `3a29dd84134a0ebbd588bd41074652e413ce6f62813a3ba6e348afcc518392e8`.

Adds policy catalogue/acceptances, four nullable order snapshot fields, refund requests/attempts/completions/observations/notices, FKs, uniqueness and checks. Reviewed additional SQL publishes the fixed V1 catalogue and adds immutability, prospective acceptance/order, timely request, attributed decision, approved intent, authoritative completion, notice and fulfillment guards. Schema-level order snapshots remain nullable historically, while prospective insert enforcement requires them.

**0020 remains unapplied.** No migration runner, schema push, reset, seed or database query was executed. SQL files 0000–0019 and the existing 20-entry journal prefix were byte/structure compared to `583aa3f` and preserved. No Creator Terms content/hash or applied migration was rewritten. Repeated `pnpm db:generate` reported no schema changes/nothing to migrate; generation is not migration execution. Actual SQL trigger/atomicity behavior has not yet been proved against PostgreSQL.

## S. Tests/build

Completed on final behavioral source:

| Check | Result |
| --- | --- |
| Full `pnpm validate` | Passed |
| Vitest | 839 tests across 65 files |
| Pure tests | Five passed |
| Refund-specific suites | 106 tests: policy 18, service 56, provider/events 19, policy repository 3, refund repository 4, routes/privacy 6 |
| TypeScript | Passed |
| Lint | Passed; no ESLint warnings/errors; existing Next lint deprecation notice |
| Production build | Passed with public payments disabled, real environment excluded and cached font mocks |
| Migration no-drift generation | No schema changes/nothing to migrate |
| Old migration/journal integrity | 0000–0019 and prefix preserved |
| Final `git diff --check`, including base comparison | Passed |

Regression coverage includes existing payment/order, Creator Terms, coupons, membership/activation, creator/profile, draft, review, builder and privacy/security suites. New tests cover both agreements, exact policy routes, stale/cross-user evidence, request boundaries/idempotency, late admin review, persisted roles, decisions/execution races, outside-transaction HTTP, full/partial/external refunds, uncertain/definitive failures, ordering/duplicates, retained access/data/coupons and truthful notices. Concurrency tests here are serialized fake-store/unit tests; they are not represented as genuine PostgreSQL session tests.

Initial regression failures were corrected: the new public policy needed a middleware exemption; route fixtures needed the independent agreement read; policy tests needed a fixed clock after the effective date; the static admin-route inventory gained the new explicitly authorized handler; and the earlier refund-observation access expectation was updated to the frozen full-confirmation rule. A fake global lock flag was replaced with caller-specific async context so another concurrent transaction was not mistaken for HTTP inside the caller's own transaction.

A temporary build hit disk quota after multiple isolated builds. Only task-owned generated build copies were removed, then the final build succeeded. A trailing blank-line whitespace issue caught during staged review was cleaned in the report follow-up. No dependency installation or user-data cleanup was used.

Local transient logs: `/tmp/wsb-validate-last.log`, `/tmp/wsb-build-last.log`, `/tmp/wsb-drift-final.log`, with earlier focused logs under `/tmp/wsb-*`. No hydrated real-database or genuine-provider smoke is claimed in this implementation phase.

## T. Files changed

All 64 task files relative to `583aa3f` (including this report):

1. `app/(admin)/admin/workspace-refunds/page.tsx`
2. `app/(admin)/admin/workspace/orders/page.tsx`
3. `app/(user)/workspace/(creator)/dashboard/page.tsx`
4. `app/(user)/workspace/(creator)/layout.tsx`
5. `app/(user)/workspace/activate/page.tsx`
6. `app/(user)/workspace/creator-terms/page.tsx`
7. `app/(user)/workspace/member/page.tsx`
8. `app/(user)/workspace/refund-policy/page.tsx`
9. `app/(user)/workspace/refunds/page.tsx`
10. `app/api/admin/workspace-refunds/[id]/route.ts`
11. `app/api/workspace/membership/orders/[id]/route.ts`
12. `app/api/workspace/refund-policy/accept/route.ts`
13. `app/api/workspace/refunds/[id]/route.ts`
14. `components/admin/AdminSidebar.tsx`
15. `components/workspace/ActivationPreview.tsx`
16. `components/workspace/RefundActions.tsx`
17. `components/workspace/RefundPolicyAcceptance.tsx`
18. `components/workspace/creator/Navigation.tsx`
19. `drizzle/0020_gigantic_mordo.sql`
20. `drizzle/meta/0020_snapshot.json`
21. `drizzle/meta/_journal.json`
22. `lib/db/schema.ts`
23. `lib/workspace/activation/model.ts`
24. `lib/workspace/activation/repository.ts`
25. `lib/workspace/activation/service.ts`
26. `lib/workspace/analytics-privacy.ts`
27. `lib/workspace/builder/repository.ts`
28. `lib/workspace/creator/model.ts`
29. `lib/workspace/creator/repository.ts`
30. `lib/workspace/eligibility/service.ts`
31. `lib/workspace/payments/http.ts`
32. `lib/workspace/payments/model.ts`
33. `lib/workspace/payments/provider.ts`
34. `lib/workspace/payments/repository.ts`
35. `lib/workspace/payments/runtime.ts`
36. `lib/workspace/payments/service.ts`
37. `lib/workspace/refund-policy/document.ts`
38. `lib/workspace/refund-policy/model.ts`
39. `lib/workspace/refund-policy/repository.ts`
40. `lib/workspace/refund-policy/service.ts`
41. `lib/workspace/refunds/events.ts`
42. `lib/workspace/refunds/http.ts`
43. `lib/workspace/refunds/model.ts`
44. `lib/workspace/refunds/notices.ts`
45. `lib/workspace/refunds/provider.ts`
46. `lib/workspace/refunds/reasons.ts`
47. `lib/workspace/refunds/repository.ts`
48. `lib/workspace/refunds/runtime.ts`
49. `lib/workspace/refunds/service.ts`
50. `lib/workspace/refunds/store.ts`
51. `middleware.ts`
52. `tests/admin-route-authorization-policy.test.mjs`
53. `tests/routes/workspace-activation.test.ts`
54. `tests/routes/workspace-membership-routing.test.ts`
55. `tests/routes/workspace-payments-fixtures.ts`
56. `tests/routes/workspace-payments-routes.test.ts`
57. `tests/routes/workspace-refund-policy-repository.test.ts`
58. `tests/routes/workspace-refund-policy.test.ts`
59. `tests/routes/workspace-refund-provider.test.ts`
60. `tests/routes/workspace-refund-repository.test.ts`
61. `tests/routes/workspace-refund-routes.test.ts`
62. `tests/routes/workspace-refunds-fixtures.ts`
63. `tests/routes/workspace-refunds.test.ts`
64. `WORKSPACE_LAUNCH_REFUND_POLICY_IMPLEMENTATION.md`

## U. Remaining blockers

The next separately authorized verification must establish exact database identity, inspect ledger, apply only reviewed pending 0020, verify no-op/atomicity/real constraints, execute genuine two-session races and exercise migrated authenticated creator/admin screens. Use a deliberately controlled new Razorpay Test payment/refund, not the protected previous genuine E2E record, to prove provider initiation, signed refund delivery, independent fetch completion, exact amount and entitlement revocation.

Until 0020 is applied, these newly integrated reads depend on absent tables and fail closed; this implementation commit is not an instruction to run/deploy against the old schema. No new database readiness or historical-row mutation result is claimed here.

Final owner/legal approval, genuine Razorpay Test behavior, production configuration/migration authorization, legal/commercial launch gates, scheduler/worker and email-delivery provisioning, operational uncertain/partial-refund handling and final release smoke remain separate. V1 deliberately holds uncertain/no-proof, failed-provider and composed-partial scenarios for review; it provides no forced completion or remainder-refund shortcut. Public charging is not authorized by this technical status.

## V. Recommendation

**REFUND SYSTEM TECHNICAL GATE READY FOR REAL DB/RAZORPAY TEST VERIFICATION**.

**REFUND POLICY CONTENT READY FOR FINAL OWNER/LEGAL REVIEW**.

Implementation commit: `a1f5bc6`. The report/whitespace follow-up commit is available in Git history and the completion response; the report cannot embed its own hash.

Stop at Launch Blocker B implementation. Do not apply 0020, make a genuine Test/Live refund, enable public payments, deploy, change influencer coupons or resume Phase 1.9 in this task.
