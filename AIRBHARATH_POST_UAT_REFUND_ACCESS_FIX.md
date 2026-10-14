# Post-UAT refund and course-access investigation

**Result: POST-UAT REFUND & ACCESS BLOCKED.** Three independently reproduced LMS access defects are corrected locally. The founder's specific completed-refund incident is not established by the available records; refund processing/policy blockers remain below. No post-UAT UI/onboarding phase was started.

Branch: `codex/workspace-1.8-launch`; starting clean HEAD: `4dab323`.

## Reproduced issues and corrections

The reproductions use actual route/page functions with synthetic, mocked storage; no PostgreSQL payment/refund state was manually set.

| Issue / root cause | Before | After |
|---|---|---|
| Private lesson URL authorized the URL course without checking the lesson's module/course relationship | A learner with course A could request A's URL containing a private lesson from inaccessible course B and receive B's page content | Persisted lesson ownership must match the resolved URL course before entitlement checks/rendering; mismatches redirect. Resources are fetched only after authorization. |
| Progress POST lacked a course-access guard and trusted client `courseId` for certificate calculations | An unenrolled learner could update private lesson completion (HTTP 200); a different course could be supplied | Resolve the lesson's actual course, reject mismatched input (400), and require existing course access (403) before progress reads/writes. Existing free-preview, persisted-Admin and schedule rules remain. Eligibility uses the actual course. |
| Dashboard selected an ended direct enrollment before an independent active bundle | UI marked the accessible course expired and selected the old direct order while the access resolver allowed the bundle | Select direct enrollment only when present in the current access summary; otherwise use the active bundle's dates, label and original order. No entitlement/order is rewritten. |

The first two regressions initially produced 12 failures/5 passes; the dashboard regression separately failed with the incorrect expiry/order. All are green after the scoped corrections. These establish access defects, **not** a proven financial root cause for the founder's reported refund.

## LMS versus Workspace findings

**Legacy LMS:** actual local schema has no LMS refund tables or stored full/partial refund evidence. `orders` contains one paid row, no refund-marked rows; eight enrollments are active. The implemented payment flow is `/api/payments/razorpay/order` → signed callback `/verify` → paid order/enrollment/invoice. No LMS refund initiation, refund webhook or refund reconciliation path was found. LMS access uses active direct/bundle enrollment, not Workspace membership or refund tables. Existing invoice downloads remain owner-authorized/private; certificate claims check course access and retain existing credential history.

The current `/terms` describes refund eligibility and processing time, but does not explicitly define access after full/partial refunds, independent grants/repurchases or certificate treatment. Published/accepted terms and financial behavior remain unchanged. The owner's subsequent approval establishes the future policy direction below, not authorization to implement it or apply it to existing purchases. Enrollment has no originating-order field; inferring ownership from the latest order could damage free/manual/bundle access. No migration was generated/applied.

**Workspace:** read-only inspection evaluated 236 membership owners through the actual access/grant repositories and resolver. All 25 selected refunded memberships have local Test completion records; none granted editing from the refunded paid membership without an active independent grant. The founder's demo case remains approved/uncertain, `provider_refund_http_400`, with no completion and no active grant. Continued access is therefore expected. This task made no Razorpay call to refresh that historical diagnostic.

Workspace policy explicitly retains historical profile/proposal/private-build reads after confirmed full refund, while removing paid editing; valid complimentary grants remain independent. Existing service/event tests cover full confirmation, pending/failed/uncertain/partial evidence, duplicate events, ownership and grants. No Workspace product code or retained evidence was changed. No completed-refund editing bypass, premature revocation or wrong-order revocation was reproduced. The affected URL/account, completed refund evidence and exact remaining action were requested; they remain unavailable.

## Owner-approved future LMS policy direction

Recorded after investigation commit `4102d8d`. This is a proposed future policy; it does not amend current accepted commercial terms.

- Authoritatively confirmed successful **full** refund: revoke only the entitlement attributable to that purchase. Refunding an All-in-One Masterclass bundle removes that bundle purchase's access; separately purchased courses and other valid independent entitlements remain evaluated independently.
- **Partial** refund: retain access. Ambiguous partial refunds go to Admin review; no automatic item-specific revocation without a future explicit policy approval.
- Requested, internally approved, provider-pending, failed or uncertain refund: no refund-based revocation. A request/approval/webhook receipt alone is insufficient confirmation.
- Retain orders, enrollments, invoices, financial records and refund history. Revoke the relevant entitlement rather than deleting its historical records. This approval does not establish automatic certificate revocation.
- **No retrospective application to existing purchases** without separate legal/commercial review and explicit owner approval. No existing customer entitlement may be inferred into the new policy merely by backfilling data.

Implementation requirements for a separately authorized task:

1. Finalize the legal text, effective purchase cohort and versioned policy applicability. Preserve existing purchases under their accepted rules until separately reviewed/approved.
2. Design purchase-level entitlement provenance, including bundle-to-course effects and independent paid/free/manual/granted sources. Existing aggregated enrollment rows cannot safely establish which order granted access; ambiguous legacy mapping needs review, not guessed backfills.
3. Propose a reviewed migration for durable LMS refund intents, provider evidence/completion, and source-specific entitlement state. Preserve existing financial/history rows; rehearse compatibility before any separately authorized application. No schema push/reset is part of the proposal.
4. Add LMS-scoped authenticated Admin operations, verified provider intake and reconciliation. Match account/mode/payment/order/amount/currency; persist evidence; require authoritative completed full-refund proof before a source-specific revocation. Keep partial/uncertain cases on hold for access changes and route ambiguity to review. Do not reuse Workspace membership records as LMS evidence.
5. Make duplicate/reordered events idempotent, preserve unrelated entitlements, and verify dashboard, lesson/progress/playback APIs, certificate eligibility and owner-authorized invoice/history behavior against the same access decision. Add real local PostgreSQL tests and separately authorized genuine Test-provider verification before release.

These are requirements/proposals only. This documentation follow-up changes no schema, financial logic, terms page, customer entitlement or environment. Only this report changed; `git diff --check` passed. The prior implementation validation remains historical; no tests/build or DB/provider operations were repeated for this report-only update.

## Real local verification and preservation

- Verified `localhost:5433/airbharath_lms`, development, OID `16384`, system identifier `7680462735222304705`.
- Provider-disabled local UAT replaced the prior provider-enabled process and stopped its Test worker. Local mock login remains available on port 3000; no flags were persisted. No genuine Razorpay, MSG91, Mailercloud or Redis operation was initiated by this investigation.
- Normal authenticated demo-student HTTP checks: private progress denied **403**, unenrolled certificate claim denied **400**, private lesson response redirects to the public course (including Next.js's streamed redirect). This is local HTTP evidence, not a hydrated browser/refund E2E.
- All eight real LMS enrollment cases produced consistent course-access and dashboard-summary decisions in read-only resolver checks.
- Original-row counts/fingerprints across all **61 public tables** matched before/after the successful local checks; agent database writes: **0**. No reset, deletion, migration, schema push, production access or Live call occurred.

## Tests and build

- Focused payment/refund/enrollment/access/certificate/invoice/Creator/builder/grant regressions: **321 passed**.
- Full `pnpm validate`: **1,303 Vitest tests + 42 pure Node checks passed**, TypeScript passed, lint passed. Executed once after these source fixes stabilized, using synthetic/unreachable DB settings and mocked providers.
- Payment-disabled production build: **passed**. Isolated source snapshot excludes `.env` files and real credentials, uses only a synthetic unreachable loopback DB target with production/TLS classification, and preserves the running UAT app.
- `git diff --check`: passed. No dependency/lockfile change.

## Files changed

- `app/(dashboard)/dashboard/courses/[courseId]/lessons/[lessonId]/page.tsx`
- `app/(dashboard)/dashboard/courses/page.tsx`
- `app/api/progress/route.ts`
- `tests/routes/lms-lesson-course-binding.test.ts`
- `tests/routes/lms-progress-access.test.ts`
- `tests/routes/lms-dashboard-entitlement.test.ts`
- `tests/routes/lms-entitlement-consistency.test.ts`
- `tests/routes/lms-certificate-access.test.ts`
- `AIRBHARATH_POST_UAT_REFUND_ACCESS_FIX.md`

## Remaining blockers and next evidence

1. **Legacy LMS:** future full/partial access policy direction is owner-approved above. Legal/commercial finalization, applicability to future purchases, durable refund/purchase provenance and a separately reviewed/authorized implementation/migration remain pending. Existing purchases are excluded absent separate review and explicit approval. No completed LMS refund could be reproduced locally because the evidence/workflow is absent; do not claim full-refund E2E coverage.
2. **Workspace:** resolve the existing provider refund rejection, then separately authorize genuine Test refund/webhook verification and prove the founder's actual confirmed-refund editing denials. No successful refund or genuine refund webhook is claimed here.
3. Supply the affected course/account, local URL, authoritative refund status and precise operation that remained available. Historical visibility alone is not an editing entitlement. No stale-browser root cause is asserted without those steps.

The three access corrections are locally verified. Overall **POST-UAT REFUND & ACCESS BLOCKED** remains the appropriate result; no public charging, deployment or further phase is authorized by this report.
