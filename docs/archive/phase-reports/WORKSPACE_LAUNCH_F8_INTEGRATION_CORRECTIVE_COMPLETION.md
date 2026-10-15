# Workspace F.8C — integration corrections and reverification

**WORKSPACE F.8 ALL 13 REQUIREMENTS LOCALLY VERIFIED**

14 October 2026. All five scoped F.8 findings are closed by local evidence. This is a local integration verdict, **not approval for public charging, production deployment or provider operations**. The original F.8 blocked report remains unchanged. Production/commercial gates remain open in section P.

## A. Branch and starting HEAD

Repository: `/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms`; branch `codex/workspace-1.8-launch`. Starting HEAD `df7790fa3c700f4805f9974d88bc7319ec3b120b`; starting worktree was clean and matched the brief. The final commits/HEAD and clean-worktree check are returned with this report. No push/deploy occurred.

## B. Exact authorized scope and five results

| Finding | Correction | Local result |
| --- | --- | --- |
| F8-01 | Controlled shared Admin filters synchronize with parsed server URL state and native history restoration. | **PASS** — actual Back/Forward/reload, reset/search/sort/empty/invalid states and a second list. |
| F8-02 | Shared readiness-qualified full-feature release sentence across public/private Workspace notices. | **PASS** — rendered public, Creator/sidebar, membership/billing and activation. Contractual dates unchanged. |
| F8-03 | Remove generic lifetime Pricing promise; public course cards/details describe actual no-fixed-expiry data without a lifetime guarantee. | **PASS** — active pricing/catalog/details browser checks and actual configured-duration regressions. |
| F8-04 | Private `noindex, nofollow` inherited from authenticated legacy Admin and learner layouts. | **PASS** — actual authenticated HTML and preserved public/private metadata boundaries. |
| F8-05 | Every invoice response explicitly uses `Cache-Control: private, no-store`. | **PASS** — actual denial/missing paths and isolated mocked success/generation/failure paths. |

No membership prices, tax/coupon economics, financial state machines, legal document content/hashes, auth rules, grants, course review/builder rules, learner entitlements, dependencies, schema, ledger, worker configuration or public-payment switches were changed. No Creator publishing/media/sales functionality or duration selector was added.

## C. F8-01 — filter correction and actual history proof

The pre-correction Chrome run reproduced the exact failure: page 2/all statuses had **3 rows**, revoked filter produced no matching grants, and Back restored the page-2 URL/rows while the visible Status stayed **revoked**. [filter-before.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/filter-before.json) records the observed mismatch.

`components/admin/WorkspaceList.tsx` still authorizes and parses/fetches on the server with existing bounded queries/cursors/counts. Only its filter UI is extracted to [WorkspaceListFilters.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/admin/WorkspaceListFilters.tsx). Typed controlled search/status/sort/size/environment values maintain an unsaved draft while props are unchanged. Committed URL-state changes synchronize before rendering; the form is not keyed/remounted. Native GET still omits pagination/cursor fields so submitting filters resets pagination. A Reset filters link uses the existing route's default query state.

Browser diagnostics also exposed native form restoration **after hydration**, when React's value was already all but the actual select DOM was revoked. The observed navigation type was `back_forward`, with `pageshow.persisted=false`; handling BFCache alone would miss it. The effect synchronizes on a back/forward navigation load and on persisted `pageshow`, with listener cleanup. Ordinary typing does not trigger this reset. No permanent diagnostic attributes/logging were added to product code. A final focused browser test also reproduced a same-URL/equivalent-props rerender erasing an unsaved draft after Back. The history effect now depends on parsed primitive values rather than object identity; the actual component preserves both unsaved search and sort in that test. The authenticated fixture route existed only in the owned test copy and was removed, never added to product source.

Fresh actual Chrome assertions passed:

1. Tagged grant list: page 1 **25**, page 2 **3**, correct query/sort/size.
2. Revoked filter clears old page and shows empty results.
3. Back: page 2 URL, **3 rows**, Status **all**, search/sort/size agree.
4. Forward: revoked URL, visible revoked control and empty results agree.
5. Reload preserves revoked state.
6. Reset clears filters; search/status/sort/size submission returns **28 matching rows at size 50**, with no stale controls; another search gives empty results and reload preserves it.
7. The course-drafts list sharing the component passes Back/Forward/reload, with bounded **25-row** initial results.
8. `page=0` retains existing safe Invalid list filters/reset behavior.
9. Focused mobile drawer test preserves **unsaved search and sort**, while URL and **25 server rows** remain unchanged. No client-only query/security filtering occurs.

Evidence: [browser-results.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/browser-results.json), [unsaved-filter-draft.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/unsaved-filter-draft.json), [Back-restored screenshot](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8c/admin-back-restored.png). The fix applies to every list using WorkspaceList, including its bounded account-selector reuse. Separate editor lists' backend/pagination implementations remain unchanged and regressions pass.

## D. F8-02 — readiness-qualified feature messaging

Shared [launch-copy.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/workspace/launch-copy.ts) defines:

> Full AirBharath Workspace is targeted for 9 November 2026, subject to release readiness.

Used by shared private notice, Creator dashboard, public Workspace release/FAQ, homepage Workspace introduction and activation explanation. Actual desktop/mobile pages display the qualification. Short public headings still describe a target; no active full-feature launch promise remains. Existing legal paid-term statements were deliberately preserved.

Membership clock remains **9 November 2026 at 00:00 IST**, equivalent to `2026-11-08T18:30:00.000Z`. Quarterly end remains **9 February 2027 at 00:00 IST**. Actual paid Creator member UI still shows **₹5,899.00**, those start/end dates and immediate Early Access. Simulated authoritative paidAt produces exactly **259,200,000ms** to the refund deadline. The feature target and contractual membership clock are separate. Media, publication and selling remain unavailable.

Rendered coverage: `/workspace`, `/workspace/dashboard`, profile, courses, member, member/billing, sidebar/notice and activation. Admin does not reuse an unconditional feature statement. Terms/Refund Policy versions/content/hashes and fulfillment/capture/refund behavior were not edited.

## E. F8-03 — public course-access copy

Pricing now says: “Enroll in any single certificate program of your choice. Check the course details for its learner access duration.” Public CourseCard and course-detail NULL-duration labels say **No fixed expiry**, not a generalized lifetime guarantee. A missing duration field says **See course details** rather than inventing a duration. The camel/snake data normalization respects an explicitly authoritative NULL field.

Configured per-course durations remain displayed: focused rendered tests cover **30, 180 and 365** days from actual input data. This proves that a configured 365-day course can be displayed accurately; it is not a universal 365-day rule. Existing learner/private operational labels, historical contracts/invoices/receipts and legal documents are outside the active marketing correction and were not rewritten.

Active public source search and actual `/pricing`, `/courses`, `/courses/ai-skills`, homepage and Workspace checks found no generic lifetime or invented 365-day access promise. Certificate policies, prices, coupon/checkout destinations and financial business logic are preserved.

## F. Owner-confirmed future per-course duration policy

**Access duration is decided per course by its publisher: AirBharath for AirBharath courses, and the Creator for future Creator courses. No global 365-day default. Existing enrollments unchanged.**

Future Creators propose their chosen duration within the applicable review/publication workflow. Before a learner pays, that chosen course duration must be disclosed and preserved in the accepted learner entitlement. Creator-course publication/sales remain frozen outside Phase 1.8; no duration selector, publishing permission, checkout/order snapshot or enrollment behavior was implemented here.

The expiry start-clock rule and whether no-fixed-expiry must be offered in that future feature remain future decisions; this continuation does not invent either. Current five published courses have NULL access duration and the eight original enrollments have NULL expiry. Their current no-fixed-expiration access remains intact. **Zero course/enrollment entitlement changes.**

## G. F8-04 — private legacy noindex

Added only `robots: { index: false, follow: false }` to the existing authenticated Admin and learner route-group metadata. Session/persisted-role checks, URLs, wrappers and layout composition remain unchanged.

Actual authenticated HTML on **`/admin/coupons` and `/dashboard/courses`** contains **`noindex, nofollow`**. Actual Workspace Admin/Creator private HTML retains the same directives. Public homepage and Workspace remain indexable (no inherited private robots meta); `/robots.txt` returns 200 text/plain and `/sitemap.xml` returns 200 XML without Admin/learner private URLs. No private route became public, and no global noindex was introduced.

Evidence: [legacy-security.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/legacy-security.json) and the hydrated browser results.

## H. F8-05 — invoice cache protection

The only invoice download API is `app/api/invoices/download/[orderId]/route.ts`. A shared header object supplies **`private, no-store`** to unauthorized, forbidden, missing-order, failed-PDF, catch/error, cached-PDF and generated-PDF responses. No additional cache directive is needed to prevent storage; cookies/session already make this a dynamic private route.

Nine focused route cases use isolated mocks:

- Anonymous 401 before any financial query.
- Cross-owner/demoted Admin claim 403 before invoice read/generation.
- Missing order 404.
- Existing owner PDF 200: exact bytes, filename, Content-Type and Content-Length; **no generator call**.
- Persisted Admin existing PDF 200.
- Missing invoice generation 200: mock generator exactly once, unchanged bytes.
- Two failed generation variants 500.
- Unexpected failure 500.

Every case asserts the exact cache header. Actual HTTP probes additionally confirm 401, cross-owner/demoted 403 and a genuinely missing synthetic-ID 404 with private/no-store. **No positive mutation-capable GET was made as an original invoice owner.** No retained invoice was generated, duplicated, repriced, edited or downloaded; existing original invoice/order fingerprints remain unchanged. Positive tests are mocks only, not a claim of a real PDF-generation/provider smoke.

Missing headers were a protection gap; neither F.8 nor F.8C establishes that a privacy leak occurred. Ownership/persisted Admin checks and original response data/tax logic remain unchanged.

## I. Privacy and authorization regressions

Fresh normal-service verification covers ineligible/unpaid denial, current owned email and independently required legal receipts, owner-scoped proposals/builds, paid/grant/refunded/held access and actor role checks. Actual browser student and demoted Admin grant requests return the existing **403/forbidden/no-store** contract; anonymous grant requests also correctly use that route's 403 contract. Invoice anonymous uses its separate 401 contract.

Other users' private build API returns 404/no-store without lesson content. Paid role remains student. Captured-but-unverified timing stays held/null paidAt/null refund deadline and no Creator access; actual held member UI never offers Open Workspace. Refund removes paid editing while history remains readable; an independent grant is resolved separately, not treated as paid revenue.

No client-side state authorizes data. No secret/token/OTP/provider ID was committed. No private content was put into public metadata/analytics. One legacy course page attempted a Razorpay Checkout **SDK GET**, which the browser blocked before delivery; no genuine payment/OTP/email/refund API call occurred. All server outbound private-provider access was blocked. Public CDN GETs were allowed solely for existing image verification.

## J. Updated 13-requirement matrix

All rows are **PASS locally** in the stated evidence scope; **none is commercially or operationally release-approved**. Earlier valid evidence is identified rather than falsely described as freshly rerun.

| # | Requirement | Fresh F.8C evidence and automated coverage | Earlier evidence retained / limits |
| --- | --- | --- | --- |
| 1 | Revised membership pricing | Actual three-plan catalog, quote/normal fake-provider fulfillment, frozen originals and full pricing/payment regressions | No genuine provider checkout; historical accepted amounts preserved. |
| 2 | Admin Workspace | Shared grant/draft lists, mobile drawer, actual legacy/Workspace metadata and persisted/demoted role denial | F.8's 18 operational destinations/desktop architecture remain valid; not all 18 rerun here. |
| 3 | Proposal/review/private builder | Normal DB proposal/review/approval/build checks, actual owned approved entry/editor, cross-user denial, builder regressions | F.8 full hydrated submit/Admin-approve/module-lesson journey not repeated; business/editor implementations unchanged. |
| 4 | Separate coupon domains | Actual LMS read-only Combo route and wrong-course rejection; fresh Workspace discount-before-GST and no LMS rows/redemption | No genuine purchase/campaign. |
| 5 | Pagination/search/filter/sort | Exact failed Back condition now passes, Forward/reload/reset/search/sort/empty/invalid/second-list checks; unsaved-draft proof; bounded/cursor DB regressions | Workload scaling is still a production gate, not inferred from small local data. |
| 6 | Private Creator Dashboard | Actual owned aggregate counts/sidebar/profile/courses/member/billing, no public footer/header shell; desktop/390/320 | Basic accessibility smoke only. |
| 7 | Qualified release messaging | Actual public/private/activation canonical sentence and unchanged membership dates | Legal clocks and future features unchanged. |
| 8 | Loading/error/empty/retry | Fresh empty/invalid lists, profile save/reload, held state, invoice failure mocks; full UI/editor regressions | F.8 profile/consent injected 503 and retry proofs remain valid; those two faults not reinjected here. |
| 9 | Member activation/email/legal | Fresh fake email verification/current agreements/checkout denial services; rendered owned-email/two-controls/no Record Agreement/payment OFF | F.8 legal browser autosave/failure/retry/reload evidence retained; no genuine inbox/OTP delivery. |
| 10 | Checkbox consistency | Rendered two independent activation controls and full consent/UI regressions | Earlier actual failure rollback/reload-consent proof unchanged; no certification. |
| 11 | DB inventory/history protection | Fresh exact identity/provenance, 64 tables/110 triggers, 31 ledger entries, all originals preserved; guard/no-drift regressions | F.6 retained-table guards/catalog verified; no retained-table TRUNCATE executed. F6-02–07 remain open. |
| 12 | Landing/public shell/accurate copy | Six-width hydrated home/Workspace, CTAs/catalog/current prices; actual pricing/catalog/detail duration copy; metadata/crawlers; native dev/production images | F.8's 24-finding disposition remains valid except five now-closed findings. Asset substantiation/licensing and canonical host remain separate approvals. |
| 13 | Complimentary access grants | Fresh normal eligibility/Terms/grant/revoke/expiry and paid+grant cases; **two real backends** wait on locks, one winner/one duplicate, no paid order | No grant fabricated revenue/refund rights; production operations remain unverified. |

Normal-service evidence: **34 named checks** with new tagged fixtures and isolated fake financial/email providers. Full default regressions cover existing protected logic. [integration-results.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/integration-results.json) and [grant concurrency](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/grant-two-backend-concurrency.json) provide the fresh results. This table supersedes the local blocked findings for completion purposes without modifying the original F.8 report.

## K. Hydrated desktop/mobile and native images

**18 completed primary browser checks**, plus focused drawer and equivalent-props unsaved-draft proofs and legacy privacy/held checks. Public widths **1440, 1280, 1024, 768, 390, 320**; private Creator **1440 / 390×844 / 320**, Admin drawer **390×844**. No document horizontal overflow in exercised pages. Drawer Tab containment/Escape/focus restoration pass. Private shell has no public header/footer, public shell retains one header/footer. No page/hydration errors or unexpected console errors in the completed run. This is not complete accessibility certification or a production capacity test.

**42 screenshots** retained, including Back-restored Admin, private dashboard, Pricing mobile and fully settled public images. [Creator mobile](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8c/creator-dashboard-mobile.png), [Pricing mobile](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8c/pricing-mobile.png), [390px settled homepage](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8c/home-390-native-settled.png).

Native development/Turbopack and isolated production serve each pass **12 settled public pages**, **48 optimizer responses**, all 200 AVIF; all images complete with positive natural dimensions and server remains alive. Explicit AVIF/WebP logo requests return 200, 128×102, **1961/2106 bytes**. Main browser run additionally observed 49 native image responses. **No image interception/bypass.** Root/Next resolve the existing same Sharp **0.35.4** module; dependencies unchanged.

Cached original font transport was used in the isolated copies; browser fulfillment is limited to local cached font bytes. This is not external production font-delivery certification. Initial temporary Proxy-font interop and harness selector/anonymous-status assumptions were corrected; assertions on actual URL/control/data were not weakened. Interrupted app/build runs were resumed; completed results and exit statuses are the ones reported.

## L. Commercial invariants and legacy LMS

Actual read-only LMS quote remains **₹3,300 − ₹1,400 = ₹1,900** for the eligible Combo coupon; non-bundle request returns **400**. No order/enrollment/coupon-counter/redemption mutation. Workspace catalog remains **₹5,899 / ₹9,999 / ₹17,699**, GST-inclusive. Workspace coupon fixed 50000-paise discount on quarterly base 499915 gives taxable 449915, GST 80985, total 530900 paise; domains remain separate.

Read-only access-summary/course-access/certificate-eligibility services rechecked all **eight original enrollments**, all retain active no-fixed-expiry access. No certificate issued. Five published course durations and eight original enrollment expiries remain NULL; original LMS orders/coupons/invoice/enrollments are preserved byte-for-fingerprint. No production service or genuine checkout used.

## M. Exact database identity and preservation

Authorized target only: **localhost:5433/airbharath_lms**, `DATABASE_ENV=development`; TCP and `/tmp` socket independently match OID **16384**, system identifier **7680462735222304705**, port **5433**. Fresh read-only baseline: **64 tables, 7,296 rows, 110 noninternal triggers**. All **31 ledger/journal timestamps and SQL SHA256 hashes** match, range **0000–0030**. The known F6-04 substring heuristic was not used as an identity/security boundary; isolated runtime TCP/socket/startup-mode preflight was performed explicitly.

Final measured rows **7,687**. **Every one of the 7,296 pre-task original rows remains unchanged**, including prior immutable synthetic financial/review/email/grant evidence. **391 new rows**, including **46 new tagged users** (45 normal-service cohort + one separate concurrency identity), are retained development evidence. Browser profile save touched only the new F.8C identity. No retained invoice or learner entitlement mutated.

Ledger, columns, constraints, function definitions and noninternal triggers compare unchanged. Like F.8, this fresh row/catalog baseline does not independently compare every index definition; migration-source no-drift separately passes. Baseline was exclusively created mode 0600, never replaced; SHA256 **dc9025b575ec718d0aede04dfe54de15381b0e64a5231f25fb6f496e819bcdc1**. No migration/schema push/reset/cleanup/TRUNCATE/reindex/collation maintenance/production or staging connection.

[Before](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/database-before.json) · [After, every table](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/database-after.json).

## N. Final validation and cleanup

Full **pnpm validate PASS**: **1,136 Vitest tests / 94 files**, **33 Node checks**, TypeScript and lint. Includes 18 new focused invoice/copy/metadata tests. Two existing exact-copy expectations now assert the approved shared sentence; all surrounding safety/financial assertions remain. First full run exposed the remaining old public-string expectation, then the required final rerun passed.

**Payment-disabled isolated production build PASS**, exact corrected product-source files match the build copy. **Migration no-drift PASS**: 63 SQL/snapshot/journal files unchanged; isolated generation reports No schema changes, no migration applied. Existing native image Node regression passes, plus actual dev/production browser proof above. Syntax checks for all three new audit/browser CJS scripts and **git diff --check PASS**. Default test counts do not include opt-in DB/browser checks. These opt-in browser scripts require an owned isolated app, tagged fixtures and regenerated private test sessions; the focused equivalent-props script additionally requires its temporary test-copy-only component fixture. They are retained audit regressions, not turnkey CI authentication fixtures.

Owned dev/production apps on **4058/4068 stopped**, ports closed, owned temporary copies removed, synthetic session key/tokens and private original-order probe file removed. User processes were not stopped. Immutable new history retained. No enablement flags persisted; public payments remained **OFF** throughout and after cleanup. No genuine provider or production activity occurred.

## O. Commits and complete changed-file inventory

Scoped implementation/tests/audit scripts commit: `1979512` (`fix(workspace): close F8 integration and privacy findings`). Completion evidence/report are committed separately; the report commit and final HEAD are returned to the owner. The report avoids embedding its own self-referential hash. [changed-files.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8c/changed-files.json) lists every changed product file, test, audit script, JSON and screenshot. No .env/dependency/migration changes or financial/legal/auth business-rule changes are included.

Product changes: shared Admin filter component/wrapper, shared launch-copy constant and five notice/presentation consumers, Pricing/CourseCard/course-detail copy, two private-layout metadata declarations and invoice response headers. Tests: focused invoice/copy/metadata regressions plus two existing exact wording updates. Audit: new opt-in preservation and hydrated regression scripts, sanitized evidence and this report. Original F.8 report's SHA256 is recorded unchanged in build-source provenance.

## P. Remaining separate launch gates

- **Assets/claims:** licensing/provenance and embedded “1000+ Students Trained” still need owner proof or separately approved removal/replacement. No artwork edit/generation in F.8C; local synthetic rows are not commercial proof.
- **Domain:** owner confirmation of homepage/public Workspace/private app/canonical-sitemap host remains pending; source uses existing LMS origin. No production DNS/SSL verification or infrastructure change.
- **F6-02:** local collation 2.39→2.43 maintenance needs separate exact-target backup/rebuild/validation authorization; do not only suppress warning.
- **F6-03:** five legacy validated FK-name compatibility differences require target preflight/versioned compatibility planning, not ledger rewriting.
- **F6-04:** unsafe DB URL substring targeting and shared pooling/timeouts remain **mandatory safety corrections before paid release**; F.8C explicit local preflight does not fix runtime source.
- **F6-05:** representative workload/query/index scaling assessment; bounded local UI is not capacity approval.
- **F6-06:** retention/privacy/archival decisions and three REVIEW tables; no deletion authorized.
- **F6-07:** invoice PDF storage growth policy/measurement; no historical invoice/storage mutation.
- **Providers:** genuine Razorpay Test refund.created/refund.processed signed delivery evidence, genuine authorized Mailercloud sender/delivery/dedup uncertainty proof, MSG91 readiness. Historical genuine Test capture proof is not a fresh provider test here.
- **Operations:** worker/CRON/reconciliation/notice delivery readiness, least-privilege runtime roles, approved production secrets/target/migrations, backup/restore/rehearsal, legal/commercial approval and final release smoke.

Recommended **first F.9 task: separately authorized F6-04 exact database-target parsing/fail-closed pooling and timeout correction**, with focused target-resolution regressions before production-sensitive preflight. Asset/domain owner decisions can proceed separately. Then authorized DB compatibility/maintenance/readiness and genuine Test-provider evidence, followed by production operational/release gates. **No F.9 task started.**

## Q. Final assessment

**WORKSPACE F.8 ALL 13 REQUIREMENTS LOCALLY VERIFIED**

All five scoped corrections pass the formerly failed conditions, protected business rules remain sound in current regressions/local evidence, full tests/build pass and every pre-task row/migration is preserved. Earlier valid evidence and its limits are stated explicitly. This verdict closes local integration findings only. **Public charging remains disabled and unapproved.** No production/provider operation, deployment, Phase 1.9 or subsequent phase was begun. Stop after this completion.
