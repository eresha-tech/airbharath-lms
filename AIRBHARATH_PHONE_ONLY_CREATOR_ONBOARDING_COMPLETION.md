# Phone-only Creator onboarding — local completion

## Scope and result

Starting branch `codex/workspace-1.8-launch`, HEAD `0eaa30e` (the approved dark-mode-only hero correction after the brief’s expected HEAD). Starting worktree was clean. Scope: remove mandatory Creator email OTP across UI, services and database, retaining valid contact email and all independent authorization, legal and financial safeguards.

Implementation commit: `aff000b`. Final report commit is returned separately; the worktree is checked clean after committing this report.

## UI and server changes

Activation now shows eligibility, plan selection, optional coupon and independent Creator Terms/Refund Policy controls. The mandatory email verification Step 2, challenge entry and resend controls are absent. A separate contact-email form supports normalized syntax validation, correction, pending/saved/error states, retry and persistence. Unsaved contact edits disable checkout; saved changes refresh the bound quote. Phone OTP and normal session issuance are unchanged.

The private, same-origin contact endpoint changes only the authenticated persisted user’s email, refreshes the session and rejects owner overrides, malformed/oversized input and anonymous requests. Responses are no-store; errors do not disclose database details. Contact updates use the same user-row lock as order acceptance and preserve the existing proof-revocation trigger.

Quotes remain bound to normalized contact, pricing, eligibility and policy versions. Email-proof existence no longer affects quoting/order acceptance. New orders require valid contact syntax, current eligibility and two independent durable legal receipts. Contact correction invalidates stale quotes. Idempotent recovery of previously accepted orders remains possible without rewriting their frozen snapshots. No email proof is fabricated. Payment capture, refunds, grants, creator access, coupons, GST and LMS entitlements were not changed.

## Additive migration and local application

- Added `0031_workspace_phone_only_onboarding`; generated an unchanged logical-schema snapshot with correct lineage and appended the journal only.
- `0000–0030` SQL and snapshots remain byte-for-byte unchanged.
- Before: `workspace_email_order_required` rejected a new order unless an active current-contact ownership proof existed.
- After: that same INSERT trigger/function requires valid contact syntax, retaining the user-row lock. Only this function is replaced. No trigger disabling, historical rewrite, table/constraint deletion or schema push occurred.
- Inspected other email prerequisites: the five other 0027 functions (proof, challenge, contact-change, notice-binding and immutability behavior) remain identical to the applied source. Sensitive-mail proof requirements remain independent.
- TCP `localhost:5433/airbharath_lms` and `/tmp` socket port 5433 reached the same server/database: OID `16384`, system identifier `7680462735222304705`, matching postmaster start time.
- Before ledger: 31 matching source hashes, `0000–0030`. Guarded `pnpm db:migrate` applied only 0031. After: 32 matching hashes, `0000–0031`. Second execution succeeded with no ledger addition or changed original ledger rows.
- `DATABASE_ENV=development` and `ALLOW_DATABASE_MIGRATION=true` were supplied only to migration execution; no `.env` authorization was added.
- PostgreSQL emitted its previously known local collation-version warning (2.39 versus 2.43). No collation repair was attempted.

## Real local PostgreSQL and browser evidence

The pre-migration synthetic test reproduced SQLSTATE 23514 rejecting an otherwise legal, eligible order without email proof. After migration, normal production services with a fake in-memory payment adapter passed:

- Eligibility submission and independent legal acceptance; current Quarterly quote/order at **589900 paise**, no coupon.
- Contact entry, normalization, correction, invalid/missing input and nonexistent-user rejection.
- Stale-quote denial after contact correction; concurrent duplicate acceptance produces one order.
- Missing Terms and missing Refund Policy independently block acceptance.
- Ineligible/unknown identity, invalid identity and stale plan denial; wrong owner cannot create a provider order.
- Durable local intent precedes simulated provider attachment; repeated provider setup retains one intent/request. Orders remain unpaid with null paidAt and no invented capture.
- Rollback-only direct insert tests exercise the actual database contact trigger against missing/invalid contacts.
- Contact/order actions create no email challenges/proofs, memberships, creator profiles, LMS orders or enrollments for these fixtures.
- Unverified sensitive-notice recipient resolution returns `recipient_unverified`; no provider HTTP was allowed.

The opt-in harness is `tests/postgres/workspace-phone-only-onboarding.cjs`; run only against the explicitly authorized local database with `WORKSPACE_PHONE_ONLY_PG_VERIFY=true`, `DATABASE_ENV=development`, and non-production Node runtime. It validates exact database identity before writing and retains tagged synthetic history.

The guarded local UAT app’s existing allowlisted phone OTP send/verify routes both returned 200, issuing a normal student session without SMS. Fresh-account registration/OTP security remains covered by route regressions; this task’s live phone probe used an already registered demo identity, rather than deleting/recreating it.

Hydrated Chrome checks passed on final source: anonymous redirect/contact 401, ineligible activation denial, eligible plan page, no mandatory email OTP controls, public payments disabled, no Razorpay script, origin/input/owner-override denials, simulated contact-save failure then successful retry, persisted correction after reload without proof, independent legal controls, and no overflow at 1440, 390 and 320 pixels. No uncaught/hydration errors. External browser requests were blocked. Desktop/light and mobile/dark screenshots were inspected locally and were not committed. The approved lavender theme and static Masterclass hero are unchanged.

A fresh pre-mutation hash baseline covered **7,702 original rows across 62 tables** (public tables plus migration ledger). An intermediate comparison matched every original row. The final check found **one changed original user row**, account ending **0000**; database mutations were stopped and the owner explicitly confirmed editing that account during testing. Read-only comparison shows the other **7,701 original rows unchanged**, including all **82 email proofs**, **25 notice bindings**, financial/legal history and original ledger entries. The owner’s current account and the original baseline were both preserved; no baseline replacement or restoration occurred. Nine clearly tagged synthetic development identities and their normal eligibility/legal/order histories were retained; no reset or historical cleanup occurred.

## Notification privacy and launch implications

Saving contact does not verify ownership. Durable refund-notice bindings and delivery history are untouched. Existing delivery resolution still requires valid ownership proof; an unverified recipient remains blocked. Authenticated Billing & Support/refund-status routes remain available. No sensitive financial, refund, invoice or account message was sent by this task.

Before public launch, approve an operational/legal notice-delivery path for phone-authenticated members whose contact email is unverified. Later optional verification cannot retroactively rebind an old immutable notice obligation. Existing separate manual/LMS mail paths using stored contact addresses require their own privacy review; this change does not route Workspace purchases into them or authorize broader delivery.

Genuine Razorpay Test refund and signed refund-webhook verification remain mandatory and separate. No genuine Razorpay, MSG91 or Mailercloud calls, production Neon connection, deployment or public payment enablement occurred.

## Reviewed production-preflight update

The exact source pins were explicitly updated for **32 SQL migrations and 66 source/schema files**, with source-tamper regressions. New migration manifest SHA256: `e9494753700c4df15ce57261e7431ba8d0451c1e41d46db485a7d55886f6eaf8`; complete source-file manifest SHA256: `2fed961b801f528b8c92c2f200d312e4abb9d95a22e1cffa40a27b289d6b9ba9`.

The inspector retains exact pin/lineage validation, separate production authorization, read-only role, direct Neon target, certificate-verified TLS, bounded queries and fail-closed ledger matching. Altered old/new SQL, snapshots and journal metadata are rejected offline. Its ledger bound/provisional suffix now reflect 0031. Production’s owner-reported `0000–0006` prefix remains **unverified**: provisional pending chain is **0007–0031, 25 migrations**. No production inspection was executed. Separately authorized read-only inspection, complete prerequisite review, isolated Neon branch/restore rehearsal of the final chain, founder’s explicit local UAT acceptance, and separate production migration/deployment authorization remain required.

## Validation and changed files

Final `pnpm validate` passed: **1,337 Vitest tests across 111 files, 42 pure Node checks, TypeScript and lint**. The isolated payment-disabled production build passed using original cached fonts, no `.env` and no usable database/provider credentials. Focused PostgreSQL/OTP/browser checks above passed; the 47-test preflight suite includes altered-source rejection. Journal/source/snapshot append-only checks and `git diff --check` passed. Initial validation findings (the old 31-entry assertion and an accidental activation-copy edit) were corrected before the final complete run. Native child-process checks required execution outside the restricted sandbox; the successful final run retained sanitized fake database/provider configuration.

All changed implementation/test files:

- `app/(user)/workspace/activate/page.tsx`
- `app/api/workspace/contact/route.ts`
- `components/workspace/ActivationPreview.tsx`
- `components/workspace/WorkspaceContactEmail.tsx`
- `components/workspace/WorkspaceLanding.tsx`
- `lib/workspace/email/contact.ts`
- `lib/workspace/membership/service.ts`
- `lib/workspace/payments/service.ts`
- `lib/workspace/payments/repository.ts`
- `lib/workspace/payments/http.ts`
- `drizzle/0031_workspace_phone_only_onboarding.sql`
- `drizzle/meta/0031_snapshot.json`
- `drizzle/meta/_journal.json`
- `scripts/database-readonly-preflight-core.mjs`
- `tests/routes/database-readonly-preflight.test.ts`
- `tests/routes/workspace-contact.test.ts`
- `tests/routes/workspace-email.test.ts`
- `tests/routes/workspace-payments-fixtures.ts`
- `tests/routes/workspace-phone-only-ui.test.ts`
- `tests/routes/workspace-retained-history-truncate-migration.test.ts`
- `tests/postgres/workspace-phone-only-onboarding.cjs`
- This completion report.

## Recommendation

**AIRBHARATH PHONE-ONLY CREATOR ONBOARDING VERIFIED LOCALLY**

The owner-confirmed concurrent account edit is the sole original-row preservation exception documented above. Public payments remain OFF; genuine provider refund/webhook verification, notice-delivery readiness and production inspection/rehearsal/UAT acceptance remain separate launch gates. No subsequent phase is authorized by this report.
