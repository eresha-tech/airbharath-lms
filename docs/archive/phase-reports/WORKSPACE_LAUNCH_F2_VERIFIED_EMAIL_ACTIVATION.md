# Workspace launch F.2 — verified creator email and activation

Verification completed against the authorized local development database on 13 October 2026. **WORKSPACE F.2 VERIFIED EMAIL + ACTIVATION LOCAL PASS.** This is a local implementation/verification result; genuine Mailercloud delivery and public charging are not authorized or verified by this phase.

## A. Starting branch/HEAD

Branch: `codex/workspace-1.8-launch`. Starting HEAD: `fc8d8e8`. The initial working tree was clean. Scope is F.2 only; the F.1 reports and release catalog remain unchanged. Implementation commits and the complete file inventory are in section T. The final report commit is returned with the completion response.

## B. Existing email/auth architecture

Phone/MSG91 remains the primary login identity. The mutable `users.email` contact field, existing profile edits and historical addresses did not contain authoritative email ownership evidence. They are not treated as verified. JWT email claims do not establish ownership. Existing durable, versioned Creator Terms and Refund Policy acceptance services are reused.

The existing transactional Mailercloud request builder is reused. Its provider acceptance receipt is distinct from recipient ownership and from actual inbox delivery. Refund notice history and its existing delivery state machine are retained.

## C. Verified-email data model

Migration 0027 adds four tables: account-bound challenges, verified ownership proofs, hashed fixed-window rate counters and immutable refund-notice recipient bindings. No historical contact or notice is backfilled.

A challenge binds its user, normalized address and random identifier to a keyed SHA-256 HMAC of a cryptographically generated six-digit code. The code itself is not stored. A proof requires a consumed matching challenge and the current persisted contact. Partial unique indexes allow only one active proof per account and one per normalized address. Normalization trims/lowercases without collapsing plus aliases or dots.

Challenge/proof history cannot be deleted or rewritten. A proof can only be revoked once. Contact changes revoke proofs and supersede open challenges through a database trigger. New order inserts require a current proof; existing rows are unaffected. Notice bindings are created once with a proof ID, or with NULL when no proof exists. Evidence tables also have statement-level truncate guards.

## D. Migration 0027 status/hash/ledger/no-op

**Applied**, using the guarded `pnpm db:migrate` workflow with process-only `DATABASE_ENV=development` and `ALLOW_DATABASE_MIGRATION=true`. Only the reviewed pending 0027 was applied. No push, reset, migration-ledger manipulation or other migration occurred. Authorization was not added to `.env`.

| Evidence | Result |
| --- | --- |
| TCP and `/tmp` socket target | Same local PostgreSQL server and `airbharath_lms` database, port 5433 |
| Database OID | `16384` |
| Server system identifier | `7680462735222304705` |
| Ledger before | 27 entries, 0000–0026; all source hashes/journal timestamps matched |
| Applied SQL | `drizzle/0027_workspace_verified_creator_email.sql` |
| SQL SHA-256 | `6d187548a5c33a1a11d7b5a15506ed5c606b439a9f58850480a5c059d3fbbf59` |
| Ledger after | 28 entries, 0000–0027; all source hashes/journal timestamps matched |
| 0027 journal/ledger timestamp | `1791889784066` |
| Second guarded migration execution | Successful no-op; remained 28 entries |
| Final schema generation check | No changes detected; no additional migration |

Snapshot review confirmed the preceding table definitions were unchanged and only the four intended tables were added. The applied migration hash remained unchanged after the application correction in section T. Expected PostgreSQL long-constraint-name truncation notices were observed. The existing local collation-version warning (database 2.39, host 2.43) was not repaired by this phase.

## E. OTP security and abuse controls

Expiry is ten minutes; resend cooldown is sixty seconds; each accepted challenge permits at most five wrong attempts. Resend supersedes the preceding challenge. A wrong account, expired code, superseded code or exhausted challenge cannot verify. A consumed correct challenge is idempotent only while its current proof still matches. Concurrent confirmations serialize on the persisted owner lock.

Send budgets are five/hour per user, five/hour per address and twenty/hour per trusted IP. Verification budgets are thirty/ten minutes per user and one hundred/ten minutes per trusted IP. Persistent rate keys are HMACs, not addresses or raw IPs. Counters are consumed in deterministic key order inside a savepoint: a denial rolls back all counter writes for that request.

The final real-PostgreSQL regression first reproduced one extra counter row from a denied request, then passed after the savepoint correction: five allowed fake sends, zero blocked fake sends and zero counter growth on denial. Wrong-code attempts still consume their bounded attempt budget normally.

Local development uses a shared loopback bucket and ignores spoofed forwarding headers. The production path only accepts a single valid IP from the explicitly trusted Vercel runtime; missing/untrusted metadata fails closed. This trust boundary follows Vercel's documented platform header handling: [Vercel request headers](https://vercel.com/docs/headers/request-headers).

Email POST routes enforce authentication, same-origin requests, JSON/content limits and strict command fields. GET/status responses are private/no-store. Errors are generic, throttling provides Retry-After, and no response exposes a code or HMAC. A separate OTP secret of at least 32 characters is required. Neither session cookies nor OTP/provider secrets were committed.

## F. Provider adapter and delivery limits

The production adapter uses the existing Mailercloud transactional payload/endpoint, a bounded eight-second request, redirect refusal and bounded response size. Only the explicit expected success code is accepted. Ambiguous transport or provider responses remain unavailable/uncertain. Provider calls occur outside the owner transaction; provider acceptance alone never creates a proof. See the provider's [Email API documentation](https://help.mailercloud.com/en/collections/19-email-api).

Delivery requires explicit verification and sender-verification configuration plus valid provider credentials. `.env.example` contains empty/disabled setup entries; the actual `.env` was not edited. The committed runtime has no fake adapter, test OTP endpoint or verification shortcut.

Every exercised adapter was injected privately into a local harness or an isolated development app copy. No genuine Mailercloud, MSG91 or Razorpay operation occurred. Actual sender/domain approval, first controlled delivery, bounce behavior and inbox arrival remain separate release checks.

## G. Email-change invalidation

Real database changes to contact revoked the old active proof and superseded open challenges. New checkout was rejected until normal challenge/reverification completed. A previously generated quote was rejected after verification/contact changes; a fresh quote succeeded. Current database contact/proof is checked under the financial owner lock, independently of browser state or JWT claims.

The widget supports Change email, resend/countdown, errors and reverification. Verified status survives reload, while the OTP field/code is cleared. A supplemental hydrated mobile check confirmed the cooldown survives completed verification and reload and that an immediate repeat request is still rejected with HTTP 429.

## H. New-checkout server enforcement

New order acceptance requires a current verified address plus the existing eligibility and two durable current legal acceptance receipts. Missing or merely stored email produces `email_required`. The financial context hash includes proof identity; quote identity includes persisted normalized contact/proof. The database insert trigger provides an additional gate.

The existing same-command historical retry is resolved before the prospective verification requirement, so a pending accepted order does not become invalid. Prices and integer calculations are unchanged:

| Plan | Before GST, paise | GST, paise | Inclusive total |
| --- | ---: | ---: | ---: |
| Quarterly | 499915 | 89985 | ₹5,899.00 |
| Half-yearly | 847373 | 152527 | ₹9,999.00 |
| Annual | 1499915 | 269985 | ₹17,699.00 |

A real new synthetic local order accepted at 589900 paise after verification. Hydrated coupon Apply/Remove preserved the existing fixed-discount result (₹5,309.00 for the exercised coupon) and restored the standard ₹5,899.00 quote. No public Checkout was launched.

## I. Historical account compatibility

Two new tagged synthetic PAID/PENDING fixtures were prepared before applying the prospective gate. Actual tests proved the pending exact retry retained its original order/snapshots, and an existing paid membership retained entitlement after a contact change. No old membership or financial evidence was rewritten to meet the new rule.

The original 4,478-row baseline was captured before these fixtures. All originals remained byte-equivalent by fingerprint; this is additional preservation evidence, independent of the synthetic compatibility checks. Failed/partial synthetic fixtures were retained.

## J. Refund-notice recipient integration

Future notice creation binds the current verified proof, including an explicit NULL binding for an unverified recipient. Resolution and dispatch recheck ownership, active status, persisted current address and the immutable recipient hash. Dispatch locks the recipient identity while validating the binding. A changed contact blocks dispatch as `recipient_changed`; it is never silently retargeted.

Real local tests proved: an unverified bound notice did not send before or after later verification; a verified notice resolved correctly; changing its contact blocked dispatch. A separate positive fake-provider probe accepted exactly one delivery and a second claim produced no duplicate send.

That positive probe initially omitted the provider's required success metadata (`providerCode: 1000`). The existing SQL guard correctly refused that incomplete fake receipt. The normal finish method then recorded the corrected outcome on the same submitted fake attempt without another send. This was harness metadata correction, not a product bypass.

Historical unbound or blocked notices stay blocked. Verification does not reopen or automatically send them. Recovery requires a separately approved operational strategy retaining recipient/evidence history; this phase did not reset delivery state or backfill bindings. The configuration diagnostic now recognizes available verification evidence, but does not assert genuine delivery readiness or scheduler readiness.

## K. Agreement checkbox auto-save

Creator Terms and Refund Policy remain separate, version-linked agreements. Checking one submits immediately with the canonical If-Match hash and explicit acknowledgement. Its checkbox becomes checked only after a valid durable server receipt. Saving…, linked error/status feedback and an explicit retry handle pending/failure states; there is no separate save button.

Unchecking removes the current UI confirmation while preserving immutable acceptance history. Reload never automatically checks either box, even when a prior durable receipt exists. Terms and policy text, versions, hashes and effective dates are unchanged. Existing backend receipt requirements remain enforced.

Hydrated tests covered an injected persistence failure, unchecked failure state, successful retry, independent policy save, uncheck/recheck and idempotence. Static regressions covered exact-version rendering and no automatic consent.

## L. Activation UX and loaders

Activation presents five clear steps for eligibility, email, term selection, an optional coupon, and agreements/payment. Eligibility/plans/email loading has an accessible route skeleton; route errors provide a generic retry. Email requests, OTP verification, coupon quotation and legal acceptance display bounded pending/error states. The final CTA depends on verified email and both saved confirmations and still respects payment enablement.

Inputs have visible labels; status/error text is linked to controls with live feedback. Agreement hit targets are at least 48 pixels with focus indication; retry targets are at least 44 pixels. Email/consent regions are marked sensitive/no-capture. Route loader/error components were reviewed and compiled; hydrated browser verification exercised the actual request/save/error/retry states. This is not a claim of a full assistive-technology audit.

## M. Membership/Billing & Support UX

The membership page emphasizes creator access, plan and preparation. Billing & Support is a secondary link to an authenticated, noindex page with payment/refund navigation, policy/support links and the actual 72-hour deadline explanation. Refund rights remain directly accessible without being the primary creator action.

A paid synthetic member retained the original ₹5,899.00 amount and Early Access status. The hydrated path membership → Billing & Support → existing refund requests passed, including a mobile no-overflow check. Existing refund endpoints, eligibility window and access suspension rules were not changed.

## N. Early Access launch messaging

The catalog supports the October 14 release sequence while retaining the existing paid-term boundary: **9 November 2026 at 00:00 Asia/Kolkata** (`2026-11-08T18:30:00.000Z`). Preparation/Early Access is distinguished from paid-term start. The refund period remains exactly 72 elapsed hours from authoritative paidAt, never from launch or an email/checkbox action.

## O. Real PostgreSQL results

The initial complete run recorded 21 checkpoints, including prospective gates, wrong/cross-account code rejection, two waiting PostgreSQL connections converging on one proof, idempotence, contact change/reverification, exact new-order amount, same-address conflict, five-attempt exhaustion, expiry, cooldown, supersession, user/address/IP send limits, historical compatibility and notice binding/dispatch checks.

After the final savepoint correction, the independent ownership/rate/order subset ran again with 19 successful checkpoints. It also executed five rejected synthetic-history mutation probes: challenge hash rewrite, challenge deletion, proof address rewrite, proof deletion and revoked-proof reactivation. Each actual PostgreSQL transaction failed with SQLSTATE 23514 and rolled back. Historical fixture/notice results from the complete run were preserved rather than replaying already-completed refund transitions.

The separate denied-counter-growth regression passed on the corrected code. Tagged fixtures and immutable history remain in the local database. No trigger or constraint was weakened.

## P. Hydrated desktop/mobile results

A real Chrome/Playwright browser exercised the normal server routes against the local database, with a private fake email adapter only in the isolated development copy. Sixteen recorded checkpoints across resumed harness runs covered authenticated/origin boundaries, no-email/stored-unverified states, verification, wrong-code errors, cooldown, reload privacy, separate autosave/retry, coupon quotation, mobile layout, email change/reverification and paid-member billing/refund navigation.

The final aggregate recorded zero Checkout requests, zero analytics requests, zero page errors and zero material console errors. Expected negative HTTP responses were checked intentionally. External image requests were blocked, so image delivery was not verified. The browser harness's earlier checkbox helper and client-navigation wait failures were corrected and affected checks rerun; they were not treated as product successes.

Private screenshots (not committed): `/tmp/wsf2-browser-artifacts/activation-desktop.png`, `activation-mobile.png` and `billing-refund-mobile.png`. Mobile width was 390 pixels; no horizontal overflow was detected. The mobile activation screenshot was also visually inspected. The supplemental cooldown check passed separately.

## Q. Privacy/security checks

No full real phone number, OTP, session cookie, auth token, provider secret or genuine recipient payload is included in this report or committed fixtures. Synthetic addresses use reserved/non-deliverable test domains. Codes existed only in private fake-provider memory or a mode-0600 temporary capture file. Private code/session/secret files and the payment-disabled test app copies were removed after use.

No public fake endpoint, manual verified-email grant, financial shortcut or automatic historical verification was introduced. The actual environment file, LMS login/payment code and private service configuration were not changed. No genuine email/payment/analytics request occurred during the browser run. Runtime payment authorizations were not persisted.

## R. Historical preservation

Fresh pre-F.2 baseline: 55 public tables, 4,478 original rows, read-only repeatable-read capture. Baseline file SHA-256:

`8f812ecf9f4f292fa63e723bceec5f7e1f5bc8c2f122ae7e83e838ebef700a56`

Final comparison: **all 4,478 original row fingerprints remain present with their original multiplicities**. Legacy non-Workspace tables match exactly. Only tagged synthetic identities/Workspace records and the intended new evidence were added. No exception, rebaseline or unrelated concurrent original-row change was needed. Original orders, refunds, legal history, coupons, course/review/builder records and legacy LMS data were preserved.

## S. Tests/build

| Completed check | Result |
| --- | --- |
| Full `pnpm validate` after application correction | PASS |
| Vitest | 82 files, 1,004 tests passed |
| Pure Node checks in validate | 5 passed |
| TypeScript `tsc --noEmit` | PASS |
| Next lint | PASS, no lint warnings/errors |
| Payment-disabled production build | PASS |
| `pnpm db:generate` final drift check | No changes detected |
| Three new CJS harness syntax checks | PASS |
| `git diff --check` | PASS |
| Final actual TCP/socket identity, ledger and original-data comparison | PASS |

Build ran in an isolated copy with an unreachable synthetic database address, cached font responses, no genuine provider credentials and payment/test authorization false. It compiled/prerendered successfully; it does not claim a production-database or real-provider smoke. Next lint's existing command deprecation notice is separate from the successful lint result. No dependencies or lockfile were changed.

Local verification artifacts include `/tmp/wsf2-db-before-rate-correction.json`, `/tmp/wsf2-db.json`, `/tmp/wsf2-db-rerun.log`, `/tmp/wsf2-rate-storage.json`, `/tmp/wsf2-positive-notice.json`, `/tmp/wsf2-browser.json`, `/tmp/wsf2-cooldown-browser.json`, `/tmp/wsf2-preservation-result.json`, `/tmp/wsf2-validate-final.log` and `/tmp/wsf2-build-final.log`. These contain summarized evidence rather than raw codes/provider secrets. They are temporary evidence paths, not production infrastructure.

The opt-in PostgreSQL harness requires `WORKSPACE_EMAIL_PG_VERIFY=true` and asserts the exact authorized local target. Historical compatibility additionally requires the private pre-migration fixture input via `WORKSPACE_EMAIL_LEGACY_FIXTURES`; it is deliberately omitted when rerunning completed immutable transitions. The browser harness requires an isolated fake adapter and private synthetic session/fixture inputs; it is not a public test API.

## T. Corrections and commits

| Commit | Scope |
| --- | --- |
| `ff01b68` | Account-bound verified email, additive migration and prospective order/notice integration |
| `fd8a916` | Simplified activation consent, cooldown feedback and secondary billing/support UX |
| `25bdce9` | Savepoint-based atomic rate consumption and retained PostgreSQL/browser verification harnesses |

The final correction was preceded by a real failing regression and followed by the passing regression, ownership/rate/trigger recheck, full validation, production build and original-data preservation. Applied migration 0027 was not edited. The separate report commit records final evidence.

Complete F.2 changed-file inventory (44 files, including this report):

```text
.env.example
WORKSPACE_LAUNCH_F2_VERIFIED_EMAIL_ACTIVATION.md
app/(user)/workspace/activate/error.tsx
app/(user)/workspace/activate/loading.tsx
app/(user)/workspace/activate/page.tsx
app/(user)/workspace/member/billing/page.tsx
app/(user)/workspace/member/page.tsx
app/api/workspace/email/confirm/route.ts
app/api/workspace/email/request/route.ts
app/api/workspace/email/route.ts
components/workspace/ActivationPreview.tsx
components/workspace/CreatorTermsAcceptance.tsx
components/workspace/RefundPolicyAcceptance.tsx
components/workspace/WorkspaceAgreement.tsx
components/workspace/WorkspaceEmailVerification.tsx
drizzle/0027_workspace_verified_creator_email.sql
drizzle/meta/0027_snapshot.json
drizzle/meta/_journal.json
lib/db/schema.ts
lib/workspace/email/crypto.ts
lib/workspace/email/http.ts
lib/workspace/email/model.ts
lib/workspace/email/provider.ts
lib/workspace/email/repository.ts
lib/workspace/email/request.ts
lib/workspace/email/runtime.ts
lib/workspace/email/service.ts
lib/workspace/membership/service.ts
lib/workspace/payments/http.ts
lib/workspace/payments/model.ts
lib/workspace/payments/repository.ts
lib/workspace/payments/service.ts
lib/workspace/refund-notifications/configuration-core.d.mts
lib/workspace/refund-notifications/configuration-core.mjs
lib/workspace/refund-notifications/repository.ts
tests/postgres/workspace-email-browser-verification.cjs
tests/postgres/workspace-email-rate-storage-verification.cjs
tests/postgres/workspace-email-verification.cjs
tests/routes/workspace-creator-terms.test.ts
tests/routes/workspace-email-routes.test.ts
tests/routes/workspace-email.test.ts
tests/routes/workspace-notice-provider.test.ts
tests/routes/workspace-payments-fixtures.ts
tests/routes/workspace-refund-policy.test.ts
```

## U. Remaining October 14 launch gates

- Controlled genuine transactional email delivery, approved sender/domain, mailbox receipt and provider failure/bounce smoke remain unverified. OTP-secret provisioning and explicit delivery enablement require separate release configuration.
- Production migration 0027 and release smoke require exact production authorization. No production/staging database was accessed here.
- Existing Razorpay Live/commercial release gates, genuine refund webhook readiness, worker/scheduler operations and operational documentation remain governed by their preceding reports. F.2 does not close them.
- Historical blocked/unbound notice recovery needs a separately approved strategy; verified contact must not silently reopen or retarget those notices.
- The observed local collation warning needs separate maintenance consideration; no collation maintenance was performed.

Public payments remain disabled. No deploy, genuine provider configuration, production charging or Phase 1.9 work was performed.

## V. Final PASS/BLOCKED recommendation

**WORKSPACE F.2 VERIFIED EMAIL + ACTIVATION LOCAL PASS**

Current ownership, prospective checkout enforcement, email-change invalidation, safe notice recipient binding, separate durable agreement autosave, preserved prices/coupons, hydrated mobile/member flow, original-data preservation and validation/build passed locally. Actual Mailercloud delivery is pending a separate authorized verification; this local PASS does not enable public payments. Stop at F.2.
