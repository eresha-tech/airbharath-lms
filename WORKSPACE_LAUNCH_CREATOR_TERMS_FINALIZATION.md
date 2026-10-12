# Workspace Launch Blocker A.1 — Creator Terms content finalization

Recorded 12 October 2026 on `codex/workspace-1.8-launch`, based on `2bfbaf0` / technical implementation `bdabdf4`. Content implementation commit: `2f5330a`. The previous implementation report's factual-information blockers are superseded by the owner's confirmations below; its V1 implementation history remains preserved.

## A. Owner-confirmed facts

The owner explicitly confirmed the contracting entity as **Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand**; legal/business address **West Patel Nagar, New Delhi 110008, India**; jurisdiction **New Delhi, India**; effective date **12 October 2026**, immediately upon this source finalization; contractual/support contact **academy@airbharath.in**; and creator ownership of original content with only limited necessary Workspace-service permissions.

These facts are no longer reported as missing or as merely unverified contact information. No building number, CIN, GSTIN, registered-office certificate, additional legal email, arbitration scheme or exclusive-forum mechanism was invented. These are owner confirmations, not independent statutory registration verification or legal-counsel approval.

## B. V1 preserved state

Historical draft version `workspace_creator_terms_2026_01` retains:

- Effective timestamp `2026-10-12T00:00:00.000Z`.
- Canonical SHA-256 `7263f236cc1b27df8f95ef69a2dcc706981ec2060d58758f788bfe40f6808bac`.
- All original contractual text, including its original draft/legal placeholders.

The complete previous `lib/workspace/terms/document.ts` was archived byte-for-byte as `lib/workspace/terms/v1.ts`. Archive-file SHA-256: `d9aa70389bcdcba3969e8c4cf1eedcb4faad98f249ead70872d5bb65d2685c16`. Regression coverage pins both its file bytes and canonical contractual hash.

`/workspace/creator-terms?version=workspace_creator_terms_2026_01` renders that exact original document with an explicit historical-draft banner. It does not redirect or substitute V2. No V1 acceptance/order evidence is backfilled, rewritten or removed.

## C. V2 version

Final source-defined current version: **`workspace_creator_terms_2026_02`**.

Both `/workspace/creator-terms` and `/workspace/creator-terms?version=workspace_creator_terms_2026_02` render exactly V2. Unknown versions, empty version identifiers and prototype-property identifiers return not found. No current V2 draft/proposed/placeholder banner or unresolved company-information clause remains.

## D. Exact effective timestamp

**`2026-10-12T06:51:32.000Z`**, equivalent to **12 October 2026, 12:21:32 PM Asia/Kolkata**.

Chosen once from the UTC clock observed at the start of this finalization, after the required `2026-10-12T06:46:00.000Z` lower bound. It is a fixed source-controlled document timestamp, not dynamically calculated at runtime. The page displays **Effective: 12 October 2026**, derived from that metadata in Asia/Kolkata. This effective/current selection does not enable charging.

## E. V2 SHA-256

**`8e0c57baad0ebffb9223635c35f4ec9d490dbe9a3c3d1ee9100c70baa042fca8`**.

Hash input remains UTF-8 `JSON.stringify` of the ordered contractual document: version, effectiveAt, title, ordered sections/titles/paragraphs. Formatting and CSS are outside the contractual hash. V1 and V2 have independently pinned hash regressions; source validation and the existing PostgreSQL catalogue check detect drift. The 0019 seed contains V2's exact canonical text/hash/effective metadata. Any later contractual change requires a new version.

## F. Contracting entity/address/contact

V2 states that AirBharath is a brand operated by Eresha Technology Innovators Pvt. Ltd. The agreement is between the eligible Workspace creator/user and **Eresha Technology Innovators Pvt. Ltd., operating the AirBharath brand**, at **West Patel Nagar, New Delhi 110008, India**.

The final legal section expressly identifies that as the agreement's legal/business address and **academy@airbharath.in** as Workspace contractual/support contact. It no longer labels those particulars as unresolved or only a contact-address inference.

## G. Jurisdiction wording

Exact V2 wording: “This agreement is governed by the laws of India. Disputes are subject to courts of competent jurisdiction in New Delhi, India.”

No compulsory arbitration, invented tribunal, mediation process or exclusive-jurisdiction wording was added.

## H. Creator-IP wording

Exact ownership principle: “Creators retain ownership of original content they create and have the right to submit.” Uploading third-party material does not create ownership or transfer it to AirBharath.

AirBharath receives limited permission reasonably necessary to host, store, process, privately display, review, technically deliver and operate content within the applicable Workspace agreement, including private course-building infrastructure. There is no ownership transfer, automatic authorization of public publication/sale or perpetual commercial publishing licence. Delivery to learners after separate future publication approval must be governed by then-current applicable terms; additional/updated publication or selling terms may be required.

Creator rights/permission responsibility explicitly covers images, text, manuals, diagrams, employer materials, trademarks and copyrighted/confidential/proprietary information. Unauthorized disclosure of airline internal manuals, defence information, employer confidential information and operational/security-sensitive materials is prohibited without treating all aviation knowledge as confidential.

## I. Other substantive content changes

V2 explicitly states that eligibility is not identity verification, DGCA/regulatory/airline/government approval. It names Changes Requested/Resubmission and approved private building among current Phase 1.8 capabilities. Video/resource/assessment/publication/public-sales/learner access remains future functionality. AirBharath Course Review Approved continues to mean private-builder progression, not publication or regulatory approval.

Existing 18+ legal-capacity self-declaration, truthful information, own-audience expectations, no learners/revenue/employment/placement guarantees, prepaid 3/6/12-calendar-month plans, manual renewal, frozen November launch/Early Access distinction, successful-payment term rules, displayed taxes, Refund Policy reference only, proportionate restrictions and independent refund rights remain intact. No DOB, detailed Refund Policy or Refund Policy acknowledgement was added.

## J. Current-version selection

`lib/workspace/terms/document.ts` defines V2/current metadata and a source catalogue containing V1 and V2. `creatorTermsDocument` validates the selected entry's canonical hash and version/effective metadata. The default page uses `currentCreatorTerms`; an exact historical link selects its own immutable entry. No arbitrary client version can change server-current acceptance.

The existing agreement control automatically shows and links V2 through the central current constant. It remains initially unchecked. Its authenticated acceptance command still contains only the explicit acknowledgement; its HTTP review precondition rejects an old V1 hash. Source/database current-selection disagreement fails closed until the separately authorized migration workflow establishes the matching catalogue state.

## K. Purchase enforcement behavior

Acceptance persistence, service/repository locking, current-document checks and immutable order snapshots are unchanged. A historical V1 acceptance cannot satisfy a NEW V2 order, with or without a coupon. Matching V2 acceptance can proceed to normal order creation. An old V1 browser precondition rejects before acceptance is recorded.

Existing accepted orders recover their original evidence; existing memberships are not revoked by this version change. Source finalization neither enables public payments nor changes Razorpay configuration, capture timing, paidAt, refund deadline, coupons, membership arithmetic, creator/profile/draft/review/builder behavior or privacy controls.

## L. Migration 0019

Generated **`drizzle/0019_workspace_creator_terms_v2.sql`** using the repository's `pnpm db:generate --custom --name workspace_creator_terms_v2` workflow. This is a catalogue-data migration; there is no table/schema change. Generated `0019_snapshot.json` has the same schema tables/enums as 0018, with the next lineage identity; the journal appends only entry 19.

The SQL first requires the expected current immutable V1 record. It inserts the exact V2 record as non-current, makes V1 non-current and makes V2 current. Only the two catalogue `is_current` flags are updated. Existing document triggers protect contractual text; acceptance/order tables and FKs are untouched. The guarded migration workflow must execute this publication transaction atomically; no standalone manual statements should be used to publish it.

**0018 and 0019 remain UNAPPLIED.** No local/production/staging database was accessed, queried or migrated. No ledger manipulation, schema push, seed/reset, private provider call or real email occurred. No dependency, lockfile or `.env` change occurred.

## M. Proof 0018 unchanged

`drizzle/0018_ambiguous_khan.sql` is byte-for-byte equal to its committed `2bfbaf0` / `bdabdf4` version. Full-file SHA-256:

**`f96d3fba6b4234717d40f7325e4d1dea0e4c530175278dd7bfe27979c491ec53`**.

The regression pins this exact file hash and its exact V1 seed content. Its existing snapshot is unchanged. No earlier migration SQL was edited. Frozen Phase 1.9 still points to `codex/workspace-phase19-wip@a9ea151`; no assets/media code or schema was imported.

## N. Tests/validation

Completed successfully:

- Focused Creator Terms content/service/endpoint/repository suite: **22 tests across three files**.
- Full `pnpm validate`: **730 Vitest tests across 59 files; five pure tests; TypeScript and lint passed**. Existing payment/order, coupons, membership/activation, creator/draft, review/builder and privacy/security regressions are included. No tests were weakened or skipped.
- Payment-disabled production `pnpm build`: **passed** in an isolated source copy without application `.env` files or private credentials, using an unreachable synthetic database configuration and cached-font mocks to avoid provider/font calls. No real database connection was established. This is build evidence, not runtime database or legal approval.
- Migration no-drift `pnpm db:generate`: **No schema changes, nothing to migrate**.
- Working/staged `git diff --check`: **passed**.
- Preservation checks: exact 0018 equality, V1 file/canonical hashes, identical 0018/0019 schema tables/enums and absence of Phase 1.9 asset schema.

New/updated regressions cover normal/exact V2 rendering, historical exact V1 rendering, unknown version refusal, owner-confirmed identity/address/contact/jurisdiction, visible effective date, original ownership/limited rights, absence of V2 draft placeholders, V2 current selection, V1 denial/V2 acceptance for coupon/no-coupon orders, stale V1 browser rejection, V1/V2 pinning and additive 0019 consistency. Existing unchecked-checkbox and sensitive capture boundaries remain covered. Endpoint tests now use a fixed synthetic clock after the effective timestamp rather than depending on wall time.

No real PostgreSQL acceptance/trigger/two-connection test or authenticated real-DB browser flow was performed: those belong to the separately authorized verification task. Readability review used rendered component markup and preserved responsive layout/line-height/wrapping; no new real-browser screenshot smoke is claimed.

Files changed in implementation commit `2f5330a`:

1. `app/(user)/workspace/creator-terms/page.tsx`
2. `drizzle/0019_workspace_creator_terms_v2.sql`
3. `drizzle/meta/0019_snapshot.json`
4. `drizzle/meta/_journal.json`
5. `lib/workspace/terms/document.ts`
6. `lib/workspace/terms/model.ts`
7. `lib/workspace/terms/v1.ts`
8. `tests/routes/workspace-creator-terms-routes.test.ts`
9. `tests/routes/workspace-creator-terms.test.ts`

This report is the additional documentation file. The previous technical implementation report and original V1 migration remain historical evidence and are not rewritten.

## O. Remaining legal-review items

No missing-information blocker remains for the business facts supplied in this brief. Final owner/legal review should assess the complete agreement, applicability/enforceability of the jurisdiction clause, limited-service permission and future-publication boundary, relationship with existing learner Terms/Privacy Policy, proportionate access restrictions and any applicable statutory/commercial disclosure obligations. This does not presume missing CIN/GSTIN/grievance disclosures must be added without counsel determining applicability.

Content is **ready for final owner/legal review**; no external authorized legal reviewer approval is asserted. The separate Refund Policy/acknowledgement and other commercial/payment launch gates remain future tasks, not silently implemented here.

## P. Recommendation

**CREATOR TERMS FINALIZED — READY FOR REAL DB VERIFICATION**.

**FINAL LEGAL REVIEW RECOMMENDED BEFORE PUBLIC CHARGING**.

Implementation commit: `2f5330a`; this report is committed separately. Public payments remain disabled. Do not apply 0018/0019, deploy, enable Live payments, change coupons, implement the Refund Policy or resume Phase 1.9 in this task. Stop after source/content finalization.
