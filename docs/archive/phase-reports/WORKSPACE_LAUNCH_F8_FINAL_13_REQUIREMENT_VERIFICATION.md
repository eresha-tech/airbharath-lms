# Workspace F.8 — final 13-requirement integration verification

**WORKSPACE F.8 INTEGRATION VERIFICATION BLOCKED**

Audit completed on 14 October 2026 against the combined F.7B and Sharp-correction source. Mandatory requirements 5, 7 and the commercial-copy portion of 12 remain incomplete. Product code was not changed. Public payments remained disabled. This report does not approve charging, deployment or a subsequent phase.

## A. Starting branch/HEAD and repository integrity

Branch: `codex/workspace-1.8-launch`. Starting HEAD: `cf55205c380676555eed35f67b4031c99fa5b0e9`; starting worktree was clean. Reviewed F.7B report commit `b58f060`, the F.7B implementation and dependency correction `cf55205`, and the final combined source. No dependency, lockfile, schema, migration, legal document, entitlement, production configuration or application implementation changes were made in F.8.

Added eight audit/verification scripts, sanitized JSON evidence, browser screenshots and this report. The complete changed-file inventory is [changed-files.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/changed-files.json). Commit details are recorded in section O and the completion response. No push or deployment occurred.

## B. Full 13-point evidence matrix

`PASS` below means the stated local scope passed. **None of these rows is production/release approved.** Provider simulations are identified explicitly; production evidence is absent. All 13 improvements remain mandatory before paid launch.

| # | Owner objective / implementation and provenance | Source and automated regressions | Fresh real PostgreSQL / hydrated browser evidence | Local result and remaining limit |
| --- | --- | --- | --- | --- |
| 1 | Revised GST-inclusive 3/6/12-month catalog; F.1 `857d2f2`, `fc8d8e8`, migration 0026 | `lib/workspace/membership/model.ts`, `service.ts`; pricing-f1, membership-model/service/routes tests | Current totals ₹5,899 / ₹9,999 / ₹17,699; old ₹5,898.82 and new ₹5,899 snapshots coexist unchanged. Five fake-provider paid journeys use normal fulfillment. Coupon applies before GST. | **PASS locally**; genuine payment/production configuration not exercised. |
| 2 | Organized, role-protected Admin Workspace; F.4 `233c386`, `6ce3e7a` and completion | `components/admin/WorkspaceShell.tsx`; `lib/workspace/admin` lists/details/pagination; Admin route/list regressions | 18 operational destinations return 200 for persisted synthetic Admin; student/demoted claims denied. Desktop/mobile shell, focus and separation pass. | **PASS locally**; legacy destination noindex gap in M; operational scale and production role privileges remain unverified. |
| 3 | Private proposal → review → approved text builder; Phases 1.6–1.8 `2cea76d`, `d6086ce`, `6462634` | Creator/review/builder services, repositories and routes; builder-pages/service/repository/boundaries tests | Normal proposal submission locks editing; normal persisted Admin approval opens private builder; module/lesson save and reload persist. Cross-owner reads denied. No publication/media/sales controls. | **PASS locally**; future media/publication remains unavailable. |
| 4 | Separate LMS and Workspace coupon domains; E.1/0024–0025 | Workspace membership/influencer services, Workspace Admin coupon routes, legacy `/api/coupons/validate`; coupon/pricing/privacy regressions | Read-only LMS Combo quote 3300−1400=1900 rupees; other-course rejection 400. Separate Workspace fixed-discount quote; no LMS order/enrollment/redemption writes. | **PASS locally**; no genuine checkout or commercial coupon campaign approved. |
| 5 | Bounded pagination/search/sort/filter restoration; F.4/0029 | `components/admin/WorkspaceList.tsx`, `lib/workspace/admin/pagination.ts`; admin-completion-pagination tests | 17 bounded list kinds; real 25→3 grant pages, reload/query restoration, filter resets page, stable cursor under insert. Browser Back restores URL/data but leaves Status="revoked" when URL means "all". | **BLOCKED** — F8-01. Bounds/cursors pass; control restoration does not. |
| 6 | Private Creator Overview/Profile/Courses/Membership with secondary support; F.3 `1b7618c` | Private Creator layout/shell, dashboard model/service; creator-dashboard/access/layout tests | Actual owned 25-proposal summary; real sidebar destinations, no public header/footer; refund absent from Overview and discoverable through Billing & Support. Desktop, 390 and 320px checks. | **PASS locally**; basic browser accessibility proof, not certification. |
| 7 | Separate Early Access tools from readiness-qualified November target; F.3/F.5/F.7B | `components/workspace/ui/WorkspaceUI.tsx:5`, private dashboard page:24; UI consistency/public landing tests | Public Workspace copy is qualified. Private dashboard/shared notice visibly says “Full AirBharath Workspace launches 9 November 2026.” without readiness qualification. | **BLOCKED** — F8-02. Membership contractual dates must remain unchanged. |
| 8 | Loading/error/empty/retry behavior; F.5 `d9edcf0` | Shared Workspace UI, loading/error routes, editor/consent forms; ui-consistency and relevant route tests | Profile synthetic 503 preserves input; actual retry/save/reload succeeds. Consent 503 rolls back checkbox, shows error, actual retry persists. Filter empty state works; held payment never becomes false success. | **PASS in exercised scope**; source/tests cover additional skeletons; not exhaustive network-fault testing of every API. |
| 9 | Verified-email activation and independent durable agreements; F.2 `ff01b68`, `fd8a916`, `25bdce9` | Email service/repository; Terms and Refund Policy services/repositories; email/terms/refund-policy tests | Normal evaluator, challenge confirmation with isolated fake email provider, two independent receipts; new orders rejected without current owned email/required receipts. Actual autosave/retry; no Record Agreement; reload does not silently re-consent. | **PASS locally**; no genuine SMS/Mailercloud calls or inbox-delivery proof. |
| 10 | Consistent accessible checkbox controls and explicit consent; F.5 | `WorkspaceAgreement`, shared Workspace primitives; UI/consent regressions | Two labeled independent unchecked controls; saved/error status, failed-save rollback, retry and no automatic reload consent. Mobile form has no overflow. | **PASS locally**; no complete assistive-technology audit claimed. |
| 11 | Complete DB inventory and retained-history protection; F.6 `bb81852`, `2f40a27`, `fe3060d`, migration 0030 | F.6 audit/proposal/completion, 0030 SQL; retained-history-truncate-migration tests | 64 tables, 110 noninternal triggers, 31 matching ledger/source entries. 39 retained Workspace tables have enabled TRUNCATE guards; rate counters intentionally excluded. Original-row preservation passes. | **PASS for audit/hardening**; F6-02–07 readiness findings remain open. No retained-table TRUNCATE performed in F.8. |
| 12 | Course-first homepage, dedicated Workspace, public shell, accurate commerce and SEO; F.7A/F.7B `c1de76a`, `0ddf8af`, `b58f060`, Sharp `cf55205` | Public catalog/projection/Header/Footer/metadata/robots/sitemap; public-landing-f7b and image-optimizer tests | Six widths, two themes, 24 links, actual catalog and both CTAs; crawler formats; native images in dev/production pass. Linked Pricing still promises generic lifetime access; artwork contains learner-count claims requiring owner proof. | **BLOCKED for commercial-copy completion** — F8-03. Refreshed shell/layout pass; canonical host and assets await sign-off. |
| 13 | Audited complimentary access independent of paid membership; F.4/0029 | `lib/workspace/access` model/repository, secure resolver and Admin routes; access-grants tests | Eligibility/Terms/persisted Admin required; revoke/clock expiry deny edits; paid+grant sources independent. Two distinct real PostgreSQL backends observed waiting on locks: one grant winner, one duplicate refusal, zero paid orders. | **PASS locally**; grant creates no purchase/revenue/refund evidence. Production operations unverified. |

Evidence files: [integration-service-results.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/integration-service-results.json), [creator-browser-results.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/creator-browser-results.json), [admin-consent-browser.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/admin-consent-browser.json), [grant-two-backend-concurrency.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/grant-two-backend-concurrency.json).

## C. Evidence classification and report traceability

| Assertion / prior checkpoint | Independent current evidence | Classification and limit |
| --- | --- | --- |
| E.1 coupon attribution/capacity and 0025 corrective completion | Current source/ledger, full regressions, real separate-domain quote and unchanged originals | Source + automated + local PostgreSQL. No genuine coupon redemption campaign. Earlier blocked migration checkpoints are superseded by actual matching ledger. |
| F.1 catalog; historical prices | Current source, 3 actual plan rows, historical order aggregation, fake-provider fulfillment | Local PostgreSQL authoritative pricing; financial provider is simulated. Initial F.1 migration blockage is superseded by completion/current ledger. |
| F.2 owned email and legal binding | Normal services/challenge verification with private fake email transport; fresh browser consent failures/retries | Source + automated + DB + hydrated browser. OTP/SMS authentication and real email delivery not rerun. Synthetic authenticated sessions used; no production auth bypass added. |
| F.3 Creator and F.4 Admin/grants/pagination | Fresh integrated DB services and actual desktop/mobile route flows | Locally verified with two newly discovered UI gaps; earlier PASS labels do not override them. |
| F.5 consistency/access/privacy | Full tests and profile/consent error/retry, drawer and negative route probes | Covered local scenarios pass; legacy metadata/cache exceptions explicitly recorded. |
| F.6 protection completion | Actual 0030 hashes, ledger, trigger catalog and original-row comparison | Protection exists now. Historical disposable destructive proof belongs to F.6; F.8 did not execute retained-table TRUNCATE. Readiness issues are not waived. |
| F.7A/F.7B and later Sharp change | Final combined source, settled images, six-width browser checks, current dependency resolution | Current native-image proof supersedes F.7B's optimizer-delivery limitation. Copy/assets/domain limitations remain. |
| Historical genuine Test capture | `WORKSPACE_PAYMENT_E2E_CLOUDFLARE_VERIFICATION.md`: genuine capture and user-confirmed Creator dashboard; retained original history | Historical genuine Test-provider evidence, not a fresh F.8 provider test. Versioned capture-time rule is `razorpay_payment_captured_event_v1`. |
| Historical genuine refund | `WORKSPACE_LAUNCH_REFUND_WEBHOOK_VERIFICATION.md`: actual refund/provider fetch; no genuine signed refund.created/processed delivery | Refund existence is not delivery proof. B.2R remains blocked at genuine refund-webhook evidence. Payment-event 202 responses are not refund proof. |
| D.1 notices/C.1 worker behavior | Prior fake transport and durable lease/concurrency checks, current full regressions/source | Simulated/local evidence only; genuine sender/inbox proof, production scheduling and operations remain open. F.2 resolves the former owned-email implementation gap, not delivery proof. |

The code-review skill ran two independent source reviews as separate axes: **Standards: no material scoped findings**; **Spec: unqualified private launch wording**. Those reviews were source reviews, not substitutes for the fresh DB/browser findings below. Neither reviewer changed code.

## D. Integrated eligible and ineligible Creator journeys

The opt-in real-PostgreSQL harness completed **34 named checks**. Successful cohort: 45 newly tagged synthetic users. Four users from an earlier harness Date-parser failure were retained, as were two additional grant-concurrency identities. Total new users: **51**. No original user or historical ownership was changed.

Normal server-side eligibility evaluator approves valid aviation declarations under current settings version 9: minimum 24 months and required professional profile. Email service issues/confirms the challenge using an isolated in-memory email transport; no OTP values are reported. Current Creator Terms and Refund Policy are accepted independently. Normal financial services and an isolated fake Test provider exercise permitted activation and fulfillment. Profile → proposal → submission → persisted Admin review/approval → private module/lesson editor works, including actual saves and reload.

Ineligible and eligible-unpaid users have no Creator editing permission without a separately valid grant. Role remains student; Admin role alone is not Creator entitlement. No fabricated eligibility approval, manually inserted membership or manual paidAt shortcut was used. Browser authentication uses synthetic signed sessions in an isolated local process; this proves route behavior with persisted identities, not genuine phone-provider delivery.

## E. Paid, grant, refunded and held entitlements

Five successful isolated fake-provider quarterly journeys freeze **589900 paise** and use normal fulfillment. Pre-launch paid term starts `2026-11-08T18:30:00.000Z` (9 November 00:00 IST); quarterly end is 9 February 2027 00:00 IST. Refund deadline differs from authoritative **simulated** paidAt by exactly **259,200,000ms**. This is financial-service proof, not genuine capture-timestamp evidence.

A captured payment lacking authoritative capture time remains `held_for_review`, reason `capture_time_unverified`, paidAt/refund deadline null and no Creator access; actual member UI shows Payment under review and no Open Workspace action. Full confirmed fake refund revokes paid editing while preserving history/read access. Independent complimentary grant can still authorize editing and creates no paid membership/order or refund right. Revoke/real-clock expiry deny further editing. Paid and grant sources are resolved independently server-side.

Actual two-backend lock test passed: distinct backend PIDs, both waiting on PostgreSQL locks before release, one successful grant, one duplicate refusal, zero paid orders. Financial/grant/refund/course history is retained.

## F. Admin workflows and the pagination defect

Actual persisted Admin reaches 18 operational destinations: overview, creators, eligibility, legacy applications, course reviews/drafts/builds, memberships, orders, refunds/exceptions/reports, coupons, influencers, notices, events, audit and settings. Financial destinations use Test/noncommercial scope. Student and a session claiming Admin after persisted demotion receive 403/no-store for grant mutation. Actual normal Admin course approval unlocks the builder; no SQL approval shortcut.

Lists are bounded to at most 25 in exercised default queries. Search/sort/filter/count and cursor boundaries work against actual local rows. Browser grant list has 28 matching tagged users: first page 25, next page 3, reload preserves query. Status filter resets pagination and displays the appropriate empty state.

**F8-01 — BLOCKED:** Apply revoked status, then browser Back. URL/data correctly return to page 2/all statuses, but visible Status remains revoked. `WorkspaceList.tsx` uses uncontrolled `defaultValue` controls whose DOM state survives history navigation. Recommend a narrowly scoped filter-state correction (query-keyed form or correctly synchronized controlled controls) and a hydrated Back/Forward regression. Preserve existing server scopes, bounds and cursors. Not implemented in this audit.

## G. Legacy LMS regression and promotional economics

Read-only existing learner services checked all **eight original enrollments**: course access, access summaries and certificate eligibility. All eight retain active no-fixed-expiry access. No certificate issued, enrollment edited or order created. Existing invoice route rejects anonymous (401), synthetic non-owner (403) and demoted Admin (403) before invoice generation. An authorized original invoice download was deliberately not executed because GET can generate a missing invoice; original commercial records remain untouched. Positive invoice generation/download remains a separate regression scope.

Actual read-only Combo validation returns standard **₹3,300**, coupon **₹1,400**, eligible payable **₹1,900**. Wrong-course coupon request returns 400. Expiry/usage/product checks remain server-side. No coupon counter, order, enrollment or redemption changed. Workspace coupon economics remain separate: a fixed 50000-paise discount applied to quarterly base 499915 yields taxable 449915, GST 80985, total 530900 paise. Read-only quote creates no redemption.

## H. LMS access policy clarification

F.8's explicit interpretation supersedes prior F.7B follow-up wording: **retrospective 365-day access changes are not separately authorized**. Five published courses currently have `access_days=NULL`; all eight reviewed enrollments have `expires_at=NULL`. Those accepted rights remain unchanged. No expiry fields were changed. Product-specific configured durations remain authoritative; a UI fallback is not a contract or policy decision.

**F8-03 — incomplete marketing correction:** `components/pricing/PricingView.tsx:84`, linked from the public shell, still advertises generic “lifetime access to all course modules.” Refreshed homepage/Workspace do not contain that blanket promise or invented 365-day promise. Recommend a marketing-only correction on the linked Pricing surface. Do not alter underlying accepted entitlements. Data-derived course-specific no-fixed-expiry labels are a different issue. Any future prospective or retrospective 365-day policy requires separate impact review and owner decision.

## I. Homepage, Workspace and all 24 F.7A dispositions

Final public source is LMS-first: static hero, Explore Courses → `/courses`, Become a Creator → `/workspace`, actual featured catalog, compact Workspace block, dedicated current/future Workspace explanation, shared public header/footer and contextual navigation. Private Creator/Admin shells remain separate. Actual 24 link destinations were exercised. Public prices have conditional coupon qualifications; current Workspace totals include GST. November paid-term dates are distinguished from immediate Early Access.

| F.7A ID | Current independent disposition |
| --- | --- |
| 01 | Local read-only Combo quote confirms standard/discount/payable separation. |
| 02 | Homepage false fallback/generic promise removed; linked Pricing generic lifetime promise remains F8-03. No 365-day entitlement authorization inferred. |
| 03 | Compact Workspace introduction and secondary hero CTA present. |
| 04 | Workspace reachable in actual 1024px drawer. |
| 05 | Actual 320px logo/theme/menu controls do not overlap. |
| 06 | 34 computed solid-background text samples pass; minimum 5.72:1. |
| 07 | Static hero removes autoplay/hidden carousel links. |
| 08 | Public current tools/future readiness separated; private copy still F8-02. |
| 09 | Actual three-plan prices, GST and pre-launch paid-term explanation present. |
| 10 | Terms, Refund Policy and support links work; 72-hour payment-time rule stated. |
| 11 | Robots is 200 text/plain; sitemap is 200 XML with public URLs. |
| 12 | Public Courses/LMS Pricing/Workspace context and eligibility destinations work. |
| 13 | Public policy explanation matches actual settings version 9, not invented thresholds. |
| 14 | Proposal → review → approved private text builder explained and exercised. |
| 15 | Workspace FAQ and scoped complimentary path present; no free-for-all grant promise. |
| 16 | Redundant sections consolidated into the refreshed composition; current screenshots reviewed. Historical page-height reductions are F.7B measurements, not remeasured claims. |
| 17 | Refreshed text avoids unsupported faculty/heritage claims; embedded “1000+ Students Trained” remains a release content blocker. |
| 18 | Asset rights/provenance remain unapproved; repository presence is not proof of licensing. |
| 19 | Bounded public projection/responsive lazy images; fresh native dev/production optimizer proof closes former delivery limitation. Representative production performance still unmeasured. |
| 20 | Source/tests distinguish unavailable/empty and pending retry; no invented catalog fallback. F.8 profile/consent fault probes do not purport to inject every public-catalog failure. |
| 21 | Public metadata exists; intended production canonical host awaits owner confirmation. |
| 22 | Actual skip link, drawer trap/Escape/focus restoration/keyboard/FAQ; source/tests explicit labels/headings. No full accessibility certification. |
| 23 | Consistent AirBharath naming on refreshed surfaces; original legal/course titles preserved. |
| 24 | Static restrained composition; no new animation dependency/autoplay. |

## J. Sharp and native image optimization

Current declared pnpm is **11.15.1**; Next **15.5.19**. Root and Next resolve the **same Sharp 0.35.4 module**. The scoped prior correction from 0.34.5 remains intact; no dependency changes in F.8.

Native production browser observed **124 optimizer responses, all 200 AVIF**, with no optimizer interception/bypass. Actual development/Turbopack checks covered 12 settled pages (homepage/Workspace × six widths), all images loaded, **48 optimizer responses, all 200 AVIF**, server remained alive. Explicit logo negotiation returned AVIF/WebP 200, decoded 128×102, 1961/2106 bytes. Actual existing public CDN imagery loaded. Later settled-image checks supersede the initial lazy below-fold observations; unloaded lazy images were not labeled broken.

Build uses cached original font transport in an isolated copy to avoid upstream font dependency, not browser image mocking. Private dev-browser font-path fulfillment supplies those local cached font bytes; **no native image route was fulfilled by a browser workaround**. Some font-name probe booleans in raw accessibility evidence are false; this is not proof of production font delivery or exact typography equivalence. Native image behavior and settled layout were independently verified. Production-private routes fail closed under intentionally mismatched production/development classification; private authenticated journeys used actual Next development mode, without weakening classification.

## K. Responsive and accessibility evidence

Public six widths: **1440, 1280, 1024, 768, 390, 320px**. Fourteen initial viewport/theme cases include both public routes and 390px dark mode; supplementary dark/light and fully settled native screenshots retained. Creator mobile 390×844 and 320px, desktop and private builder/profile inspected; Admin drawer and activation form inspected. **66 screenshots** retained, including public artwork at readable resolution.

No document horizontal overflow in exercised public/Creator/mobile layouts. Public, Creator and Admin drawers trap focus, Escape closes and restores trigger focus; public links close drawer and resizing restores layout. Creator 15 Tab steps and Admin 20 Tab steps remain in dialog. Actual keyboard skip/navigation, FAQ and theme switching work. **34 contrast samples**, minimum **5.72:1**; limited solid-background computation, not certification.

No browser page/hydration errors in completed runs. Public linked course pages record six expected resource errors from deliberately blocked legacy Razorpay SDK/coupon auto-request probes; those requests were intercepted before delivery, not successful private-service calls. Creator/Admin provider and analytics attempts are zero. Production CDN/font/scheduling behavior remains outside local certification.

Screenshots: [desktop Creator](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8/creator/dashboard-desktop.png), [mobile Creator](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8/creator/dashboard-mobile.png), [Admin mobile drawer](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8/admin-drawer-mobile.png), [320px settled homepage](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f8/home-320-native-settled.png).

## L. SEO and canonical-host assumptions

Robots and sitemap return valid public formats; sitemap contains 13 public URLs and excludes private routes. Exact crawler exceptions preserve auth redirects elsewhere. Workspace private Creator/Admin metadata remains noindex. **Legacy `/admin/coupons` and `/dashboard/courses` return authenticated HTML without robots noindex metadata**; their auth is still enforced, and they are absent from the public sitemap. See F8-04.

Source currently derives canonical/OG/Twitter and sitemap origin from `https://lms.airbharath.in`. An owner question was asked for the intended homepage, public Workspace, private LMS/Creator and canonical/sitemap hosts; no answer was received during this audit. All four mappings remain **owner confirmation pending**. No assumption that the apex domain serves this application; no DNS/SSL/deployment change or production-host inspection.

## M. Security/privacy and narrow corrective recommendations

Actual normal route/service tests deny anonymous, ineligible, unpaid, cross-owner and demoted Admin access as appropriate. Wrong-owner private course/build returns 404; tested Workspace mutation failures return no-store. Browser state does not authorize access. No OTP/challenge/cookie/secret/provider identifier exposed in committed evidence; fake mail transport remains private. Shared paid/grant resolver preserved. Legal receipts bind current identity/version independently; no new publication/media route exists. No genuine provider/analytics calls or public financial writes.

| Finding | Actual evidence / effect | Recommended separate correction |
| --- | --- | --- |
| F8-01, mandatory #5 | Browser Back URL/3 records restore, Status control remains revoked rather than all. | Synchronize filter controls with parsed URL; hydrated Back/Forward regression, keep scopes/cursors intact. |
| F8-02, mandatory #7 | Shared constant and dashboard rendered unconditional November launch statement. | Readiness-qualified shared announcement, reuse on dashboard. Do not change contractual term start/end or refund rules. |
| F8-03, mandatory #12 commercial copy | Linked PricingView retains generic lifetime promise despite approved generic-claim removal. | Scoped public marketing copy correction; preserve original learner rights and data-derived durations. |
| F8-04, private metadata | Actual synthetic authorized legacy Admin coupon and learner courses HTML have no noindex. No wrong-user content served. | Add inherited private noindex metadata, test legacy and Workspace destinations; preserve public metadata and auth. |
| F8-05, legacy cache review | Invoice 401/403 responses have no explicit Cache-Control; source cached PDF path also lacks explicit private/no-store. | Separate narrow cache/privacy correction and authorized positive invoice regression. Missing negative cache header is not evidence that another user's invoice was served. |

No finding was silently fixed. These recommendations require a scoped owner-approved continuation. No financial, legal, auth, entitlement or schema control was weakened to pass verification.

## N. Local database identity and preservation

Authorized target only: **localhost:5433/airbharath_lms**, `DATABASE_ENV=development`. Independent TCP and `/tmp` Unix-socket identities match: database OID **16384**, PostgreSQL system identifier **7680462735222304705**, port **5433**. Read-only baseline and comparison run with PostgreSQL read-only enabled. All 31 ledger entries match each journal timestamp and SQL SHA256, range **0000–0030**.

Fresh baseline measured **64 tables, 6,872 rows, 110 noninternal triggers** before synthetic writes. Final measured **7,296 rows**. Every original row's JSON fingerprint/multiplicity remains present unchanged in its original table; all original tables remain. **424 additional rows**, including 51 tagged synthetic users, are retained development evidence. Mutable synthetic profile/review/grant/refund histories used normal services. No original records were edited; no fixture cleanup/reset/trigger disabling occurred.

Columns, constraints, function definitions, triggers and ledger compared unchanged. The fresh baseline did **not** separately inventory index definitions; do not interpret the schema comparison as every possible structural-object comparison. Migration source hashes and isolated no-drift check independently pass. Baseline stored privately mode 0600, exclusive creation, SHA256 `8c1ba1f26696457c1aa466580bc4856f2949838d73b31c6226810e73591b6f0e`; it was never replaced after writes.

Evidence: [before](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/database-before.json), [after, every table result](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f8/database-after.json). No migration, ledger manipulation, TRUNCATE, collation maintenance, schema push, cleanup or production/staging access.

## O. Tests, build, audit changes and commits

Final **pnpm validate PASS**: **1,118 Vitest tests / 92 files**, **33 Node tests**, TypeScript and lint. Eight new CJS audit harnesses pass syntax checks. The first final-validation attempt was sandbox-limited at the native optimizer test; the authorized rerun with local process/socket capability completed successfully. Existing Next lint deprecation notice remains; no lint warnings/errors.

Isolated payment-disabled **production build PASS** on the exact final product source/package lock; cached original font transport and unreachable synthetic DB configuration, no private provider credentials. Actual production serve/browser optimizer checks also pass. **Migration no-drift PASS**: 63 SQL/snapshot/journal source files unchanged; isolated generation reports No schema changes; no migration applied. `git diff --check` passes before commits.

34 integrated DB checks; 15 unique Creator browser checks (resume evidence contains repeated verification records); 24 Admin/consent checks plus an explicitly recorded failed requirement; real two-backend race; read-only original learner/coupon/invoice-negative checks; 14 initial public cases/24 links and 12 settled development image cases. Extra opt-in audits are not counted as the default Vitest/Node test totals. The browser harnesses are retained one-off audit scripts, not turnkey CI fixtures: they depend on an isolated local app, regenerated synthetic sessions and temporary runtime/font setup. Those credentials were removed after verification; reruns require fresh authorized setup.

Harness-only corrections: raw date normalization after existing postgres type-parser behavior; label matching and scoped grant-table counts (separate bounded account selector); analytics matcher excludes local development JS chunk filenames; resume consumes retained successful builder journey rather than creating duplicate history. Failed harness fixture history was retained. No product defect correction or weakened business assertion.

Audit/evidence commit: `49082d9` (`test(workspace): record F8 independent integration evidence`). The report commit is listed in the final response; this report avoids embedding its own self-referential commit hash. `git log` identifies the report commit. The full changed-file inventory reports every script, JSON and screenshot. Temporary owned dev/build copies were removed, the verification server on 4058 stopped, synthetic session secret/tokens removed. User dev process was not stopped. No enablement flag persisted or .env committed; public payments remain OFF.

## P. F6-02–F6-07 production-readiness disposition

| ID / priority | Actual evidence and impact | Before paid release / preflight distinction | Separate authorization and next task |
| --- | --- | --- | --- |
| F6-02, high DB maintenance | Local recorded collation 2.39, runtime 2.43, independently reconfirmed. F.6 identified 45 candidate affected indexes / 34 unique. Ordering/unique comparison can differ. | Resolve authorized local rehearsal; production must be measured separately, not presumed mismatched. A mismatch needs backup, appropriate rebuild/uniqueness checks before version refresh. | Explicit DB maintenance/target approval. Never merely refresh version to suppress warning. |
| F6-03, migration compatibility | Five validated semantic FKs have legacy names differing from Drizzle expectations; they are not missing FKs. | Production read-only schema preflight and compatibility plan before applying a migration chain; no automatic rename here. | Separately approve versioned compatibility correction if needed; never edit applied ledger/history. |
| F6-04, **P1 mandatory safety** | `lib/db/index.ts` broad URL substring check for 5433 selects fixed `/tmp` routing and discards intended URL/user/options; fallback/pooling/timeouts need review. | **Must correct before paid release; cannot waive.** Local harness explicit verified target does not fix runtime target selection. | Exact parsed target/fail-closed configuration, shared pool/timeout design and regressions in a separate authorized task. Do not expose fallback credential values. |
| F6-05, measured scaling | F.6 flagged 72 possible FK-prefix candidates and eight small-data EXPLAINs. F.8 proves bounded UI queries, not production capacity. | Representative workload/plan/latency measurements before release capacity sign-off; selective indexes/search/count improvements only from evidence. | Production read-only measurement approval; separately approve indexes/migrations if supported. |
| F6-06, retention/REVIEW | Unmanaged public.otps has six expired historical rows; two retained D.1 clock-test notice tables hold 29 rows. Histories remain unchanged. | Written retention/privacy/backup/archival ownership needed for operational readiness; deleting these records is not an F.8 launch shortcut. | Owner-approved policy and separately scoped safe archival/maintenance. No deletion authorized now. |
| F6-07, invoice growth | F.6 identified approximately 1 MiB of base64 PDF storage in one invoice; original row preserved. | Establish projected volume, DB backup/storage budget and evidence-preserving storage strategy before volume assumptions are accepted. | Measure/storage design first; any migration/archival separately authorized. No invoice cleanup. |

F6-03 pairs: `certificates_issued_by_fkey` / `certificates_issued_by_users_id_fk`; `course_sections_course_id_fkey` / `course_sections_course_id_courses_id_fk`; `courses_certificate_activated_by_fkey` / `courses_certificate_activated_by_users_id_fk`; `modules_section_id_fkey` / `modules_section_id_course_sections_id_fk`; `video_captions_video_id_fkey` / `video_captions_video_id_videos_id_fk`. Validate actual target before adopting any compatibility migration.

## Q. Genuine-provider and operational evidence gaps

| Gate | Known evidence | Still required; no F.8 approval |
| --- | --- | --- |
| Razorpay capture | Historical genuine Test capture E2E; current fake-provider integrated safeguards/tests | Fresh authorized provider configuration/release smoke; Live credentials/account/webhook separation and readiness checks. No Live call here. |
| Refund webhooks | Historical full refund confirmed through provider; local ingestion/reconciliation regressions | Genuine signed refund.created/refund.processed delivery, account/HMAC/evidence/retry/uncertainty proof. Historical payment events do not satisfy this. |
| Mailercloud/refund notices | Local durable leases, attempts, fake transport; verified recipient binding in F.2 | Approved sender, authorized inbox delivery, provider dedup/uncertain response, retries and operations. |
| MSG91 | Existing phone authentication source/tests | Authorized real OTP delivery, provider/environment readiness without logging OTP. |
| Workers/CRON | Current bounded worker/source/local concurrency evidence | Actual production schedule, credentials, retries, reconciliation, notice leases, monitoring and incident ownership. |
| Production secrets/runtime privileges | Fail-closed source safeguards; synthetic local sessions | Separated Test/Live configuration, least-privilege runtime role, target parsing fix, credential readiness. No secret inspection/call claimed. |
| DB/deployment | Local provenance/no-drift/preservation | Target-specific migration authorization, backup/restore/rehearsal, constraints and safe deployment/rollback preflight. |
| Domain/SSL | Public canonical source and local metadata | Owner mapping, authorized deployed-host/DNS/SSL verification. |
| Commercial release | Versioned legal implementation and access rules preserved | Final Creator Terms/Refund Policy/commercial approval, assets/proof approval and final release smoke. |

No external private provider request succeeded in F.8. Public CDN GETs were permitted for image proof. No tunnel was created or provider webhook changed. Historical temporary Test webhook had been disabled by owner; no dependence on its random hostname in source/report.

## R. Asset and credibility approvals

Inspected logo and all five published course artworks, including original resolution and rendered cards. Entrepreneurship, MS Office, Digital Marketing/Content and Combo art embed **“1000+ Students Trained”**. Combo is visible in the hero. No substantiation was supplied; synthetic local row counts are not commercial proof. This is a **release content-sign-off blocker**. It is not a claim that the assertion is false.

No rendered IIM/IIT faculty affiliation assertion found on refreshed homepage/Workspace surfaces; unused legacy components remain source-only. Asset ownership/licensing still requires owner confirmation. Repository presence is not a license. No image generated/replaced. Owner must provide factual/rights evidence or separately approve replacement/removal of unsupported claims.

## S. Release-gate matrix

| Gate | Current state |
| --- | --- |
| All 13 local requirements | **BLOCKED** by #5, #7 and linked commercial copy in #12. No mandatory improvement reclassified as post-launch. |
| Integrated financial/legal/paid+grant boundaries | Exercised local cases PASS, fake providers only. |
| Original DB and migration preservation | PASS; no migration/cleanup. |
| Tests/build/native images | PASS, exact current combined source. |
| Legacy privacy metadata/cache completion | Narrow corrections/review pending; authorization negatives pass. |
| Database-target safety F6-04 and target preflight | Open, mandatory before paid release. |
| Genuine provider/worker/production readiness | Open; historical capture is not full production readiness. |
| Domain/assets/legal/commercial approvals | Pending owner decisions. |
| Public Workspace charging | **OFF throughout and after cleanup; not authorized.** |

## T. Recommended F.9 task order — proposal only

1. Owner-approved narrow F.8 corrective continuation: filter Back/Forward state, qualified shared launch copy, linked generic marketing claim and legacy private metadata/cache review. Rerun failed hydrated checks and full regressions; no entitlement/schema expansion.
2. Confirm all four host mappings and provide artwork learner-count/licensing evidence or approve replacements; final commercial/legal sign-off.
3. Separately correct F6-04 exact database-target parsing/pools/timeouts. Plan F6-03 target compatibility preflight, authorized local F6-02 maintenance/rehearsal and backup/least-privilege checks. Measure F6-05 and agree F6-06/07 policy/storage dispositions.
4. Separately authorize genuine **Test Mode** refund-webhook and email/SMS delivery evidence with safe recipients/targets. Complete retry, dedup and uncertainty handling proof; no Live charging shortcut.
5. Production workers/scheduler/monitoring/backup/restore/migration/deployment readiness under exact separate authorization. Verify actual production configuration and domain/SSL.
6. Final release smoke and explicit owner charging/deployment approval only after all mandatory improvements and commercial/provider gates pass.

No F.9 task was begun; Phase 1.9 remains frozen.

## U. Verdict

**WORKSPACE F.8 INTEGRATION VERIFICATION BLOCKED**

The independent audit is complete. Local integration, original-data preservation, validation, production build and native images passed. The mandatory Admin filter restoration, qualified private launch message and linked generic commercial promise remain unresolved. Private legacy metadata/cache and public embedded claims have explicit dispositions. The recommended next action is the narrow corrective continuation, followed by separately authorized production/provider readiness. No public charging, deployment, genuine provider test or subsequent phase is authorized by this report.
