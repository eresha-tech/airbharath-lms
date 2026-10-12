# Workspace Launch Blocker A — Creator Terms implementation

Recorded 12 October 2026. Implementation commit: `bdabdf4`. This is an implementation report, not legal approval, real-database verification or launch authorization.

## A. Scope

Workspace-specific Creator Terms, public versioned document, explicit agreement control, durable acceptance repository, prospective new-order prerequisite and immutable order snapshot. No Refund Policy, live payment configuration, coupon change, deployment, database connection, migration application or Phase 1.9 work.

The new brief supersedes the pre-registration-only release direction. Full verified Workspace through Phase 1.8 is the application base; this task implements only Creator Terms.

## B. Branch/base

Created `codex/workspace-1.8-launch` directly from verified Phase 1.8V commit `f47b69520bf1592eb6aa895c7cd766912bccf1fd`. No pre-existing launch branch was found. Initial working tree was clean at `feat/workspace-registration@4166b30`; its pre-registration inventory remains on that branch.

Frozen `codex/workspace-phase19-wip@a9ea151` was neither merged nor modified. No proposed asset table or media adapter is present in this launch branch. Verified corrections, harnesses and migrations through 0017 remain intact.

## C. Existing legal-information audit

### Legal/business details reused from existing repository

| Detail | Actual repository source | Treatment |
| --- | --- | --- |
| AirBharath product/brand | Site/header/footer and Workspace pages | Distinguish brand from the named entity. |
| Eresha Technology Innovators Pvt. Ltd. | `components/Footer.tsx` contact/copyright; `app/(user)/about/page.tsx` developer statement | Reuse exact repository name; do not claim independent registration verification. |
| `academy@airbharath.in` | Footer, contact references and existing Terms/Privacy pages | Reuse as published support/legal contact. No provider contact/send occurred. |
| West Patel Nagar, New Delhi 110008 | Footer contact address | Reuse only as site contact address, explicitly not as a confirmed registered office. |
| Laws of India | `app/(user)/terms/page.tsx`, section 11 | Preserve governing-law wording; do not invent an exclusive court. |
| Existing IP statement | Learner terms section 4: AirBharath or its licensors | Distinguish creator-owned private submissions from learner course-access restrictions; no ownership transfer. Owner/legal review must confirm the relationship between the agreements. |
| Existing Workspace adult/legal-capacity declaration | Eligibility policy/model and privacy explanation | Preserve 18+ self-declaration, no DOB or professional verification claim. |
| Privacy/retention contact framework | `app/(user)/privacy/page.tsx` | Link existing policy; minimize new agreement evidence. No new marketing consent. |

Public statutory background was checked against the [Indian Contract Act on India Code](https://www.indiacode.nic.in/handle/123456789/2187?col=123456789%2F1362): contract capacity is a separate requirement, not proven merely by collecting an age declaration. No enforceability opinion or legal approval is claimed.

### Missing details requiring owner/legal confirmation

Complete registered/business address; confirmation of the contracting entity and published contact details; court/forum jurisdiction if applicable; proposed effective date and final contractual approval; any required registration or grievance-officer disclosures. The repository does not establish those missing particulars. No CIN, registered-office status, court or statutory role was fabricated.

## D. Creator Terms content

Route: `/workspace/creator-terms`, with exact-version link `/workspace/creator-terms?version=workspace_creator_terms_2026_01`. Unknown versions return not found, never silently substitute current text. The current page is publicly accessible without login/payment and identifies the draft and legal placeholders prominently.

The draft covers membership nature/current tools; adult capacity and truthful applicant information; self-reported eligibility distinct from course/regulatory approval; creators' own audiences and no customer/revenue/employment guarantees; AirBharath Course Review Approved as private builder access rather than publication; no false regulator/airline/defence claims; educational/professional responsibility; creator ownership and narrowly limited private-service permission; rights/confidentiality warranties; prepaid 3/6/12-calendar-month plans and manual renewal; launch on 9 November 2026 at 00:00 Asia/Kolkata; Early Access separate from paid duration; post-launch successful-payment term rules; taxes as displayed; separate future Refund Policy; proportionate restrictions; account security; prospective version changes and preservation of purchased duration/pricing.

No video/resource/assessment/public selling/publication availability is promised. No detailed refund rules or refund forfeiture are introduced. The existing 18% checkout calculation and calendar-month logic are untouched.

## E. Terms version/hash

- Version: `workspace_creator_terms_2026_01`.
- Proposed effective timestamp: `2026-10-12T00:00:00.000Z`.
- SHA-256: `7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac`.
- Central document/metadata: `lib/workspace/terms/document.ts`.

Canonical input is UTF-8 `JSON.stringify` of the explicitly ordered document object: version, effectiveAt, title, then sections with ordered titles/paragraphs. Formatting/CSS outside contractual content is not part of that input. Runtime recomputation refuses a content/hash mismatch. A pinned V1 hash regression and exact migration seed comparison detect silent contractual drift. PostgreSQL's check independently hashes stored canonical text; its document trigger cross-checks version/effective metadata and prevents content updates/deletes.

Contractual edits, including legal-placeholder resolution, require a new version/hash. Retain old canonical documents, acceptance evidence and governing order snapshots; do not rewrite a reviewed/applied migration or reuse V1 for new wording. Future version introduction must retain old source renderers for exact-version links and add the new source-controlled catalogue version/current selection in a reviewed migration. There is no Terms CMS.

## F. Acceptance model

`workspace_creator_terms_versions` stores canonical version/hash/text, effective timestamp, current selection and creation time. It permits only current-selection updates; content/history cannot be edited/deleted/truncated. A partial unique index permits at most one current version; absence of a current version fails closed.

`workspace_creator_terms_acceptances` records ID, persisted user ID, terms version/hash, acceptedAt and createdAt. It has a restrictive user FK and composite document FK, unique `(userId, termsVersion)`, immutable update/delete/truncate triggers and server/effective-time checks. No IP, user agent, fingerprint, email, phone or marketing data is added.

Same-user/same-document retries converge on the first acceptance and timestamp. A different version creates another row. No request key is necessary: the exact agreement identity defines idempotency. Extra or changed command fields are rejected instead of recorded as new evidence.

## G. Order snapshot

New nullable order columns: `creatorTermsAcceptanceId`, `creatorTermsVersion`, `creatorTermsContentHash`, `creatorTermsAcceptedAt`.

A composite FK binds all four values plus the order owner to the exact acceptance row. The snapshot must be either completely absent for historical compatibility or complete with acceptance no later than order creation. A prospective BEFORE INSERT guard requires the current effective version/hash; the existing order immutability trigger already protects these additional columns through its full-row comparison. Existing guard code was not replaced or weakened.

## H. Purchase gate

`acceptOrder` retains existing persisted-owner transaction locking, unresolved-order handling, eligible quote validation and economics. Before any new order or coupon reservation is inserted, it reads current terms acceptance in that transaction and checks owner, version, hash and timestamps. Missing/stale acceptance yields controlled `terms_required` / HTTP 409. Coupon/no-coupon paths use the same gate.

Both agreement recording and new-order acceptance first lock the persisted user. The current document is share-locked until transaction commit; source metadata must match the current database catalogue. Concurrent source/database version rollout disagreement fails closed. The SQL insert guard independently checks current version and the ownership FK binds the snapshot. Timestamp plausibility uses `clock_timestamp()`, allowing server timestamps sampled after transaction start rather than incorrectly comparing them to transaction-start `CURRENT_TIMESTAMP`.

No new provider call is introduced in agreement recording. Order acceptance still commits local intent before existing provider setup. Pricing, coupon logic, provider mode/gates, capture time, paidAt, refund deadline and fulfillment are unchanged.

## I. Version-change behavior

V1 evidence cannot satisfy a new V2 order. Source and database current selection must change coherently; disagreeing application nodes reject new acceptance/order creation. Current-row locks prevent publication from racing a committed insertion. Earlier acceptances remain historical. Existing membership access is not gated on current terms and is not revoked merely by a later version.

Current implementation still supports only initial purchases; no renewal/reactivation implementation was added. Future purchase paths must reuse this prospective gate rather than add a separate bypass.

## J. Existing-order compatibility

No backfill or UPDATE of historical orders exists. All four added columns remain null on pre-feature rows. Existing order reading/recovery/confirmation/reconciliation/fulfillment remains available after applying the additive migration. Repeating an already accepted request returns its original scoped order before consulting current terms; it does not create a new purchase. Historic null-snapshot recovery is covered in tests.

No retained payment fixture, paidAt, membership, creator profile, review/builder record or real database row was touched. Old PostgreSQL fixture harnesses that create NEW orders will need current acceptance fixtures in the later verification task; they must not bypass the new insert guard or rewrite historical evidence.

## K. UI

Activation shows an initially unchecked “I agree to the AirBharath Workspace Creator Terms” control with an exact-version link opening a new tab. “Save Creator Terms agreement” explicitly records it; checking alone is insufficient. Save is bounded by a 15-second request timeout, prevents concurrent clicks and shows recoverable errors/status. The Test Checkout button additionally waits for a matching server receipt; server order creation remains authoritative even if client state is forged.

The mutation body accepts only `{ acknowledged: true }`. HTTP `If-Match` is a review precondition against the displayed hash, not a client-selected stored version/hash. The server chooses current identity and time. A stale or missing precondition rejects before writing, preventing old tabs from acknowledging changed text silently. No fake Refund Policy checkbox exists. Ordinary UI still displays “Payments not yet enabled” and the existing launch-verification explanation.

## L. Security/privacy

Authenticated persisted identity; strict same-origin mutation helper; 512-byte streamed JSON limit; unknown fields rejected; no client user/version/hash/timestamp selection in the command; no acceptance from browser storage or JWT claims. Response includes version/hash/timestamp only, not user or acceptance IDs. No acceptance telemetry, raw terms telemetry, provider call or PII logging was added. Existing no-capture classes and Workspace analytics sanitizer apply to the page/control; payment pages retain existing privacy rules.

Public access was added only for exact `/workspace/creator-terms`. No broader private Workspace route bypass was introduced. No admin editing/publishing or manual grant route exists.

## M. Migration

Generated `drizzle/0018_ambiguous_khan.sql` from the verified 0017 snapshot/lineage. Added two agreement tables, four nullable order fields, composite constraints, deterministic draft catalogue seed and custom guards. Journal and generated `0018_snapshot.json` match that schema.

**UNAPPLIED.** No DB connection/query, migration run, schema push, seed/reset or ledger change occurred. `pnpm db:generate` is local generation only; the process used a scrubbed environment with an unreachable synthetic DB URL. Second generation completed with **“No schema changes, nothing to migrate.”** Earlier migration SQL files 0000–0017 are unchanged. Phase 1.9 generated no migration here and remains frozen; its eventual reconciliation with new migration numbering is outside this task.

## N. Tests/validation

Completed:

- Focused terms/control/endpoint plus payment-service/membership UI run: 54 passing tests in four files.
- Focused terms repository and migration-lineage compatibility run: 19 passing tests in two files.
- Final full `pnpm validate`: **727 passing tests across 59 Vitest files; five passing pure tests; TypeScript and lint passed**. This includes payment/order, membership/creator and review/builder regressions. Lint reports no warnings/errors; Next prints its existing lint-command deprecation notice.
- Production `pnpm build`: passed with payments explicitly disabled, private credentials absent, no application `.env` copied, unreachable synthetic DB configuration and cached-font mocks to avoid Google Fonts network access. Final build includes both terms routes. This is compilation evidence, not provider/production/real-browser readiness.
- Second migration generation: no schema drift.
- Staged and working `git diff --check`: passed.

Coverage includes pinned deterministic content/hash and migration seed; exact public version rendering/unknown-version refusal; unchecked agreement; auth/origin/bounded-command/stale-review checks; persistence adapter write/owner-then-current lock contract; convergent concurrent acceptance/retry; changed-command rejection; retained V1 plus V2 simulation; stale/no-acceptance coupon/no-coupon denial; governing order snapshot; unchanged next provider stage using mocks; historical order recovery; queued acceptance/order race; current-version transition simulation; and safe storage failures.

Initial full validation exposed an existing builder-boundary test's assumption that 0017 was the final journal entry. Only its assertion was made append-compatible by checking preserved entries 16/17; no builder product implementation changed. One new historical-fixture test initially held an obsolete object reference after a simulated rollback; that test was corrected to inspect retained store state. Final runs pass.

**Not performed:** real PostgreSQL persistence/trigger/two-connection execution, authenticated browser journey against real DB, migration application or private-provider smoke. Concurrency checks here are deterministic service harness simulations; they are not represented as real PostgreSQL races. Those checks belong to the separately authorized verification task.

## O. Files changed

Implementation commit `bdabdf4` changes these 22 files:

1. `app/(user)/workspace/creator-terms/page.tsx`
2. `app/api/workspace/creator-terms/accept/route.ts`
3. `components/workspace/ActivationPreview.tsx`
4. `components/workspace/CreatorTermsAcceptance.tsx`
5. `drizzle/0018_ambiguous_khan.sql`
6. `drizzle/meta/0018_snapshot.json`
7. `drizzle/meta/_journal.json`
8. `lib/db/schema.ts`
9. `lib/workspace/payments/http.ts`
10. `lib/workspace/payments/model.ts`
11. `lib/workspace/payments/repository.ts`
12. `lib/workspace/payments/service.ts`
13. `lib/workspace/terms/document.ts`
14. `lib/workspace/terms/model.ts`
15. `lib/workspace/terms/repository.ts`
16. `lib/workspace/terms/service.ts`
17. `middleware.ts`
18. `tests/routes/workspace-builder-boundaries.test.ts`
19. `tests/routes/workspace-creator-terms-repository.test.ts`
20. `tests/routes/workspace-creator-terms-routes.test.ts`
21. `tests/routes/workspace-creator-terms.test.ts`
22. `tests/routes/workspace-payments-fixtures.ts`

This implementation report is the additional documentation file. Payment test fixtures now provide explicit synthetic agreement evidence and a clock after the proposed effective date; no permanent personal phone fixture or real history change occurred. No package, lockfile or `.env` changes.

## P. Legal/business details requiring confirmation

**CREATOR TERMS CONTENT APPROVAL BLOCKED.** The draft's final legal section explicitly marks the complete registered/business address and applicable court/forum jurisdiction as unresolved. Owner/legal must confirm the contracting entity, legal contact/address disclosures, effective date, IP/learner-terms relationship and final wording. A footer contact address is not proof of registered office. Missing statutory identifiers/roles must be assessed by the owner/legal team; none are invented here.

No acceptance mechanism can itself establish legal adequacy. The seeded draft remains identifiable as a draft. Any contractual corrections require a new version; do not silently edit accepted V1 text/hash.

## Q. Known limitations

Migration is intentionally unapplied. Database triggers, catalogue/acceptance persistence and real concurrent publication/order behavior await Phase A verification. The application should not be deployed against a schema lacking 0018. Future version publication is source-controlled, has no CMS and must preserve old exact-version document rendering. True renewal support remains outside this task.

Separate Refund Policy acknowledgement, later payment/commercial gates, legal approval and operational readiness remain outstanding. This implementation does not imply public charging readiness, and does not relax any payment authorization flag.

## R. Recommendation

Technical: **CREATOR TERMS TECHNICAL GATE READY FOR VERIFICATION**.

Content: **CREATOR TERMS CONTENT BLOCKED — INFORMATION REQUIRED**.

Proceed next only with separately authorized real PostgreSQL Phase A verification and owner/legal confirmation. Do not deploy, enable Live payments, implement the Refund Policy/coupon changes or resume Phase 1.9 in this task. Stop here.
