# AirBharath — F.7B LMS-first landing refresh

**WORKSPACE F.7B LMS-FIRST LANDING + HEADER/FOOTER VERIFIED**

Implementation and local UI verification completed. Commercial release remains blocked on separate gates; the owner-requested 365-day policy has been impact-reviewed, not applied.

## A. Branch and starting state

Branch `codex/workspace-1.8-launch`, starting HEAD `edf5d5a`, clean initial worktree. Implementation commit `c1de76a64e882b2439e5b11a66a29fc1f3543b48`. Owner-approved F.7B Option B scope only: homepage, public Workspace entry and shared public shell. No F.8/F.9/frozen Phase 1.9 or production work. Historical F.7A and earlier reports remain unchanged.

## B. Owner-approved product hierarchy

**LMS first; Workspace visible but secondary.** Primary homepage hero Explore Courses → `/courses`; outlined Become a Creator → `/workspace`. Workspace has a dedicated compact introduction after featured courses. The complete Creator explanation stays on `/workspace`, with Check Eligibility → `/workspace/apply`. No equal-weight competing product hero cards, automatic admission or purchase shortcut.

## C. Before and after homepage structure

Eleven prior sections become eight: **static LMS hero → featured published courses → compact Workspace introduction → learner journey → consolidated learning/certificate benefits → factual trust/clarity → learner FAQs → learner-first closing CTA**. Existing catalog/detail/practice/verification/account/company/support/legal destinations remain reachable through the header menu or footer. No unused legacy section is imported into the refreshed homepage.

Measured homepage height: desktop 1440px **11,172 → 5,834px**; mobile 390px **17,657 → 10,131px**. These are document heights, not conversion-rate measurements.

## D. Static course-first hero

The course-learning headline, supporting copy and actual published course visual dominate. Primary Explore Courses and secondary Become a Creator have distinct visual emphasis. Hero has no price, carousel, timer, hidden slide links or unnecessary motion. At 320px the primary CTA is visible in the first viewport. Only the actual hero asset is prioritized; the responsive image uses existing artwork. If optional imagery is missing, a neutral code-native learning outline remains available.

## E. Featured course presentation

A bounded six-row query selects only public presentation fields and published courses, ordered deterministically. Five current local records render with full readable titles, actual images, standard GST-inclusive totals, existing course URLs and a clearly conditional Combo offer. Course imagery is lazy below the hero; native image dimensions/sizes are explicit. No fictional faculty, ratings, reviews or product fallback amounts. Null access duration is preserved rather than defaulted to 365. Empty and unavailable states are distinct; refresh retry has disabled/pending/status feedback. The existing public loading boundary now announces generic loading without fake instructor/progress data.

## F. Homepage Workspace introduction

After featured courses, “Have aviation expertise to share?” explains profile preparation, proposals and approved private text lessons. Explore Creator Workspace links to the public `/workspace` page. A concise course-structure illustration reuses the existing preparation concept without duplicating the entire Creator page. Full release is targeted for 9 November 2026, subject to readiness; publication/selling are explicitly unavailable during Early Access.

## G. Dedicated Workspace page

Eight sections: **Creator hero → Early Access vs planned full release → published eligibility → actual proposal/review/build sequence → current membership plans → linked terms/refund/support → Creator FAQs → final eligibility CTA**. Current policy is read from the existing validated publication service; plan totals use current plan records and the existing integer pricing model. Independent failed reads produce honest policy/price unavailable states. Public props contain no policy/plan version IDs, user data, financial evidence or secrets. Existing privacy-safe Workspace view/application events are preserved in small client components; no new tracker installed.

## H. Shared Header redesign

A stronger existing AirBharath brand, courses-first navigation, explicit LMS Pricing, Workspace selected state, actual Sign In/account state from the existing session client and context-aware primary CTA replace the crowded old shell. A single accessible menu gives search and all additional links at desktop and mobile widths, including authenticated My Learning/My Workspace and Admin Portal only when the actual session role permits that label. Navigation itself never grants access.

Radix modal Sheet supplies focus trapping/Escape/restoration; link selection and breakpoint changes close it. Desktop menu also preserves access to search and secondary public routes. At 320px the logo/wordmark and 44px theme/menu controls fit without overlap; account/action links remain inside the menu. Only public and membership/onboarding shells use this Header; Creator/Builder/Admin layouts retain their separation.

## I. Shared Footer redesign

Professional Brand / Learn / Create / Company & Support columns replace unrelated repetitive groups. Learn remains first and preserves program/catalog/practice/verification/My Learning/LMS pricing links. Create includes Workspace, eligibility, manual application and direct Creator Terms/Refund Policy links. Company/support uses existing routes, public business contact and canonical entity/address; it does not claim a registered-office designation. No invented social URLs, newsletter, testimonials or endorsements. Current-year copyright renders on the server. Mobile links stack with readable wrapping and touch targets; dark/light colors use scoped public tokens.

## J. Actual LMS coupon verification

[commercial-readonly-evidence.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/commercial-readonly-evidence.json) and [coupon-route-readonly-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/coupon-route-readonly-verification.json) document the actual local records and real existing `/api/coupons/validate` path. **Published Combo Pass standard ₹3,300; active flat discount ₹1,400; valid payable total ₹1,900.** Non-bundle product receives 400. Validity/usage limits remain enforced; no order, enrollment, redemption or counter update. The code already appears in existing PricingView and is used by Combo detail; this task does not invent or newly distribute a code in landing copy.

New card labels distinguish standard total from “₹1,900 with an eligible coupon” and state validity/usage conditions. Failed/expired/exhausted/invalid coupon projections suppress the promotion. No countdown, guaranteed automatic discount, percentage savings or financial-rule rewrite. Browser blocked the legacy pages’ automatic validation attempt; the two intentional read-only endpoint probes are separately recorded.

## K. Course-access verification and owner 365-day decision

**Actual records differ from the assumed baseline:** all five published courses have `access_days=NULL`; all eight local enrollments for those published courses have no fixed expiry. Existing verify/access code treats null expiry as no fixed expiration, and expired enrollments remain governed by their real status/timestamp. The old homepage’s 365-day labels came from a UI fallback. F.7B removes that fallback and the generic lifetime promise; it does not falsely advertise a 365-day entitlement. Positive configured durations render accurately. Certificate validity is not tied to an invented access deadline.

Owner explicitly requested **365 days including existing enrollments after impact review**. [365-day-impact-review.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/365-day-impact-review.json) records the read-only local review: **eight enrollments affected; zero would expire immediately using enrollment time + 365 days; production impact is unknown**. No course/enrollment field was changed.

The brief forbids protected entitlement/DB changes in F.7B, so the proposed separate narrow correction must review: start clock and effective date, retrospective customer rights/notice, course-duration settings, existing expiry updates with retained audit evidence, renewal/duplicate/bundle semantics and unchanged certificate validity. Production requires separate exact-target authorization and its own impact review. This is an outstanding commercial policy correction—not a completed 365-day implementation or permission to begin another phase.

## L. Workspace pricing, Early Access and legal wording

Current published plan bases/GST calculate exact totals **₹5,899 / ₹9,999 / ₹17,699** for **3 / 6 / 12 months**, inclusive of 18% GST. Standard current catalog values are separate from historical purchases and LMS coupons. Plan cards do not expose Pay Now. “Payments not yet enabled / Workspace payments are awaiting launch verification” remains visible.

Confirmed pre-launch purchasers receive authorized Early Access; their paid term starts **9 November 2026 at 00:00 IST** (`2026-11-08T18:30:00.000Z`). The refund-request window is **72 elapsed hours from authoritative verified payment time**, not term start or launch. Canonical Creator Terms/Refund Policy text, hashes, acceptance and refund workflow are unchanged. Paid access retains verified email/current agreements; scoped Admin-issued grants use existing eligibility/Terms requirements and the secure resolver. Course approval remains separate. No media/publication/selling/earnings controls activated.

## M. Complete F.7A 24-finding disposition

[finding-disposition.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/finding-disposition.json) provides every original ID. All 12 P0/P1 UI defects are resolved. Owner evidence remains required for artwork rights and embedded legacy claims; delivery limitations remain explicit. No approved post-launch deferral of mandatory owner improvements.

| ID | Priority | Disposition |
| --- | --- | --- |
| F7A-01 | P0 | **RESOLVED** — Active coupon verified through real read-only route: standard ₹3,300, discount ₹1,400, eligible total ₹1,900; separate conditional offer label. No coupon algorithm changed. |
| F7A-02 | P0 | **RESOLVED IN UI; POLICY FOLLOW-UP** — Removed generic lifetime promise and false 365-day default. All five real published records have access_days=NULL. Show product-specific duration only when persisted; requested 365-day correction including existing enrollments is reviewed but separately scoped. |
| F7A-03 | P1 | **RESOLVED** — Compact Workspace section follows featured LMS courses; secondary hero Become a Creator links to /workspace. |
| F7A-04 | P1 | **RESOLVED** — Accessible menu at 1024 and all widths; Workspace always reachable; full desktop navigation at 1200+. |
| F7A-05 | P1 | **RESOLVED** — Readable brand, two mobile utilities and distinct 44px menu/theme targets; no control overlap at 320. |
| F7A-06 | P1 | **RESOLVED** — Public scoped contrast tokens; no white-on-white closing sign-in; 34 solid-background normal-text samples >=4.5:1. |
| F7A-07 | P1 | **RESOLVED** — Autoplay/carousel/slides removed. Static course-first hero; no hidden tab targets. |
| F7A-08 | P1 | **RESOLVED** — Current profile/proposal/review/private text building leads; planned media/publication/sales and November readiness explicitly separate. |
| F7A-09 | P1 | **RESOLVED** — Server-read current plans render ₹5,899 / ₹9,999 / ₹17,699 incl. 18% GST; pre-launch paid term start 9 November 00:00 IST explained. |
| F7A-10 | P1 | **RESOLVED** — Direct Creator Terms/Refund Policy/support links; 72-hour window from verified payment time, not launch date. |
| F7A-11 | P1 | **RESOLVED** — Metadata routes return 200 text/plain and XML; middleware permits only exact crawler paths, private routes remain protected. |
| F7A-12 | P1 | **RESOLVED** — Courses-first navigation, explicit LMS Pricing, selected Workspace context and Check Eligibility CTA; no fictitious routes. |
| F7A-13 | P2 | **RESOLVED** — Read published policy version 9: 24 months, required HTTPS profile, current categories; adult declaration and separate course approval explained. No fallback threshold. |
| F7A-14 | P2 | **RESOLVED** — Account/eligibility/applicable access path/profile/proposal/review/approved private text builder sequence, including paid email/legal steps and scoped complimentary grants. |
| F7A-15 | P2 | **RESOLVED** — Nine factual Creator FAQs plus policy/support links; no unrestricted free-membership offer. |
| F7A-16 | P2 | **RESOLVED** — Eight sections per page; duplicated trust/features consolidated. Desktop homepage 11,172 → 5,834px; 390px homepage 17,657 → 10,131px. |
| F7A-17 | P2 | **MITIGATED; OWNER REVIEW** — Unsubstantiated faculty/heritage/outcome text removed from refreshed page/shell copy. Neutral factual descriptions used. Existing artwork may contain legacy embedded promotional claims; owner proof or approved replacement remains required before release. |
| F7A-18 | P2 | **OWNER REVIEW OPEN** — Existing imagery/logo reused under approved design scope; no claim of licensing confirmation, no new bitmap assets. Artwork rights/provenance require owner confirmation. |
| F7A-19 | P2 | **IMPLEMENTED; DELIVERY LIMIT** — One hero priority asset; responsive next/image dimensions/sizes and lazy card images; bounded six-row public query and small public DTO; no carousel preloads. Native image optimizer delivery is still unverified in this local harness. |
| F7A-20 | P2 | **RESOLVED** — Distinct unavailable vs empty catalog; no fictional fallback amount/course; pending refresh retry and generic public loading skeleton. |
| F7A-21 | P2 | **RESOLVED** — Route-specific canonical/Open Graph/Twitter metadata; public sitemap. Origin based on existing invoice/certificate project links; live production configuration not inspected. |
| F7A-22 | P2 | **RESOLVED** — Global skip-to-main, explicit search label, coherent headings and accessible native details; modal focus trap/restoration and readable touch targets. |
| F7A-23 | P3 | **RESOLVED ON REFRESHED SURFACES** — AirBharath brand spelling consistent; legal names, original course titles and historical evidence preserved. |
| F7A-24 | P3 | **RESOLVED** — Restrained editorial composition, scoped color and static visuals; no decorative autoplay, fake interactive cards or new animation dependencies. |

## N. Accessibility and responsive verification

Real installed Chrome/cached Playwright against the settled isolated build. **1440, 1280, 1024, 768, 390 and 320px** on both pages, plus 390px dark captures: **14 main route/viewport/theme combinations**. Additional desktop dark/light, modal and keyboard checks. All six header geometries have zero overlapping control pairs; both documents have no horizontal overflow. Drawer traps 20 successive Tabs, Escape closes/restores trigger focus, navigation closes it, resize closes it and theme selection works. Homepage keyboard sequence has zero hidden Tab targets.

**34 actual solid-background normal-text contrast samples: minimum 5.72:1**, all ≥4.5:1 across light/dark hero actions, body copy, footer, closing actions, navigation and account links. Explicit search label, skip-to-main, native details and one main landmark remain. Inter and Outfit actual font loads were checked, not inferred merely from CSS names. This is basic browser/DOM/contrast verification, not full screen-reader testing or WCAG certification. [accessibility-seo-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/accessibility-seo-verification.json)

## O. SEO/crawler and private-route safety

Both pages have route-specific title/description, canonical, Open Graph and Twitter summary metadata. `https://lms.airbharath.in` is grounded in existing certificate/invoice public links (`lib/certificate-service.ts`, `lib/certificate-generator.ts`, `lib/invoice-generator.ts`); production configuration/DNS was not contacted and requires final release verification. No fabricated review/rating schema or unapproved new social image.

Robots returns **200 text/plain**, sitemap **200 XML**, neither redirects to login. Sitemap lists 13 explicit existing public pages; no private Creator/Admin/API/activation/application URL. Robots disallows private paths and permits public legal destinations. Middleware exceptions match only `/robots.txt` and `/sitemap.xml`; similarly named subpaths remain protected. Anonymous private Creator/Admin/dashboard requests still redirect to login. Actual anonymous profile-details API returns **401 with Cache-Control: no-store** and no private content. Existing private noindex metadata and server authorization are unchanged. [private-api-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/private-api-verification.json)

## P. Public catalog/performance improvements

Bounded query, reduced public DTO, server-rendered page composition, static hero, one priority asset, responsive/lazy next/image cards and explicit unavailable/empty states are implemented. No new package, private caching, analytics rewrite or financial query mutation. Root font/provider configuration is preserved; no speculative infrastructure change.

Local, unthrottled Browser Performance API indicators:

| Route / width | FCP | Observed LCP | CLS |
| --- | --- | --- | --- |
| / / 1440 | 388 ms | 7744 ms | 0.000000 |
| /workspace / 1440 | 168 ms | 200 ms | 0.000000 |
| / / 390 | 128 ms | 1432 ms | 0.000000 |
| /workspace / 390 | 144 ms | 176 ms | 0.083297 |

These are not production Core Web Vitals/Lighthouse results. Cache/prefetch/resource timings vary; cross-origin sizes may be unavailable. Native Sharp delivery could not be certified in the isolated environment after the prior crash: browser interception delivers exact original existing CDN bytes for visual checks. Code-level optimization is implemented; optimized production delivery/byte savings remain unverified. No invented production performance improvement claimed.

## Q. Before/after screenshots

**34 final current-UI screenshots** in `output/playwright/workspace-f7b/`; original F.7A evidence reused as before views, not overwritten. Full PNGs can downscale in the viewer; targeted hero/menu/footers support specific checks. Actually inspected final desktop full pages, mobile hero/drawer, dark Workspace hero and the recorded responsive layouts.

| View | Before | After |
| --- | --- | --- |
| Homepage desktop | [home-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-1440-full.png) | [home-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-full.png) |
| Homepage narrow hero | [home-320-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-320-hero.png) | [home-320-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-320-hero.png) |
| Narrow navigation | [home-320-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-320-menu.png) | [home-320-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-320-menu.png) |
| Workspace desktop | [workspace-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/workspace-1440-full.png) | [workspace-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-full.png) |
| Workspace dark mobile | [workspace-390-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/workspace-390-dark-hero.png) | [workspace-390-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-390-dark-hero.png) |

[browser-evidence.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/browser-evidence.json) includes the complete capture, section, metadata, link and resource evidence. All screenshots are anonymous; no customer session, phone, token or payment ID is recorded. Existing public business contact details remain visible.

## R. Historical data preservation

[database-preservation.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/database-preservation.json) confirms **all 6,872 original rows across 64 non-system tables unchanged**, including both retained D.1 copy schemas and all 31 ledger entries. TCP and `/tmp` socket both target the authorized development DB `localhost:5433/airbharath_lms`, OID 16384/system identifier 7680462735222304705. All migration source hashes and journal timestamps match. Repeatable-read, read-only before/after multiset fingerprints include all columns plus counts. Initial public/drizzle coverage was expanded to all non-system schemas only after proving the initially captured tables still matched; no legitimate baseline delta was discarded.

No fixture, seed, order, capture, enrollment, agreement, email proof, coupon counter, grant, membership, creator or course-history row changed. No migration/reset/ledger manipulation/cleanup. The known F6-04 parser remains unchanged; the isolated process uses verified supported PGPORT/startup options to enforce actual read-only connections. No production/staging access.

## S. Security/financial/business regression

Existing financial APIs, coupon/order algorithms, enrollment/access rules, policy content/hashes, verified email, price/GST, coupon capacity, Admin grants, review/Builder permissions and private layouts are unchanged. Two public-shell main IDs support skip navigation without duplicate main landmarks. Role remains the existing student/admin model; no UI state grants access.

Full regressions retain paid/grant coexistence, refunds/history, email/legal guards, coupons/pricing, Creator/review/Builder and legacy LMS protections. Real browser was anonymous; authenticated behavior is regression-tested, not a new live account journey. No genuine Razorpay/MSG91/Mailercloud call, OTP, email, checkout/refund or deployment. Six automatic legacy linked-page requests were blocked before delivery (five SDK GETs, one coupon POST); two intentionally authorized read-only coupon validation probes are separately recorded. Workspace public switches remain OFF and existing LMS payment code/configuration remains untouched. Temporary app is stopped; user services remain unchanged.

## T. Validation and limitations

**Final full pnpm validate PASS:** 1,118 Vitest tests in 92 files (23 new cases), five pure Node checks, TypeScript and lint. **Final isolated payment-disabled production build PASS. Migration generation no-drift PASS; no migration applied. git diff --check PASS.** No dependencies installed/upgraded and lockfile unchanged.

Temporary failures were corrected and rerun: test JSX in `.ts`/actual Admin layout path, lint on raw retry navigation (now pending router.refresh), browser lookup of a trigger intentionally hidden while modal is open, and temporary build storage exhaustion. Only four stopped task-owned build copies were removed; original repository/data/evidence untouched. An automatic start-review timeout was retried once and approved. Cached original font transport and original-image interception are disclosed. [validation-summary.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/validation-summary.json)

## U. Commits and complete changed-file manifest

Implementation: `c1de76a64e882b2439e5b11a66a29fc1f3543b48`. Evidence commit: `0ddf8af97b2cf235b66e5612158c81b0292319a6`. This report is committed separately; final report commit returned to owner. [changed-file-manifest.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/changed-file-manifest.json) lists every changed file. No push/merge/rebase/deployment.

- [WORKSPACE_LAUNCH_F7B_LMS_FIRST_LANDING_REFRESH.md](WORKSPACE_LAUNCH_F7B_LMS_FIRST_LANDING_REFRESH.md)
- [app/(user)/layout.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/layout.tsx)
- [app/(user)/loading.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/loading.tsx)
- [app/(user)/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/page.tsx)
- [app/(user)/workspace/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/page.tsx)
- [app/(workspace)/workspace/(membership)/layout.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(workspace)/workspace/(membership)/layout.tsx)
- [app/robots.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/robots.ts)
- [app/sitemap.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/sitemap.ts)
- [components/Footer.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/Footer.tsx)
- [components/Header.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/Header.tsx)
- [components/SearchInput.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/SearchInput.tsx)
- [components/landing/CoursesSection.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/landing/CoursesSection.tsx)
- [components/landing/FinalCTA.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/landing/FinalCTA.tsx)
- [components/landing/HeroBanner.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/landing/HeroBanner.tsx)
- [components/landing/LearningSections.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/landing/LearningSections.tsx)
- [components/landing/TransformationMatrix.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/landing/TransformationMatrix.tsx)
- [components/public/PublicRetry.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/public/PublicRetry.tsx)
- [components/public/PublicUI.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/public/PublicUI.tsx)
- [components/public/public.css](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/public/public.css)
- [components/workspace/WorkspaceLanding.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspaceLanding.tsx)
- [components/workspace/WorkspacePublicEntry.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspacePublicEntry.tsx)
- [lib/public/catalog-model.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/public/catalog-model.ts)
- [lib/public/catalog.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/public/catalog.ts)
- [lib/public/metadata.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/public/metadata.ts)
- [lib/public/workspace.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/lib/public/workspace.ts)
- [middleware.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/middleware.ts)
- [output/audits/workspace-f7b/365-day-impact-review.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/365-day-impact-review.json)
- [output/audits/workspace-f7b/accessibility-seo-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/accessibility-seo-verification.json)
- [output/audits/workspace-f7b/browser-evidence.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/browser-evidence.json)
- [output/audits/workspace-f7b/changed-file-manifest.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/changed-file-manifest.json)
- [output/audits/workspace-f7b/commercial-readonly-evidence.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/commercial-readonly-evidence.json)
- [output/audits/workspace-f7b/coupon-route-readonly-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/coupon-route-readonly-verification.json)
- [output/audits/workspace-f7b/database-preservation.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/database-preservation.json)
- [output/audits/workspace-f7b/finding-disposition.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/finding-disposition.json)
- [output/audits/workspace-f7b/private-api-verification.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/private-api-verification.json)
- [output/audits/workspace-f7b/validation-summary.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7b/validation-summary.json)
- [output/playwright/workspace-f7b/home-1024-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1024-hero.png)
- [output/playwright/workspace-f7b/home-1024-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1024-menu.png)
- [output/playwright/workspace-f7b/home-1280-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1280-hero.png)
- [output/playwright/workspace-f7b/home-1440-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-dark-hero.png)
- [output/playwright/workspace-f7b/home-1440-footer.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-footer.png)
- [output/playwright/workspace-f7b/home-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-full.png)
- [output/playwright/workspace-f7b/home-1440-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-hero.png)
- [output/playwright/workspace-f7b/home-1440-light-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-1440-light-hero.png)
- [output/playwright/workspace-f7b/home-320-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-320-full.png)
- [output/playwright/workspace-f7b/home-320-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-320-hero.png)
- [output/playwright/workspace-f7b/home-320-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-320-menu.png)
- [output/playwright/workspace-f7b/home-390-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-390-dark-hero.png)
- [output/playwright/workspace-f7b/home-390-footer.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-390-footer.png)
- [output/playwright/workspace-f7b/home-390-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-390-full.png)
- [output/playwright/workspace-f7b/home-390-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-390-hero.png)
- [output/playwright/workspace-f7b/home-390-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-390-menu.png)
- [output/playwright/workspace-f7b/home-768-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-768-hero.png)
- [output/playwright/workspace-f7b/home-768-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-768-menu.png)
- [output/playwright/workspace-f7b/home-faq-expanded.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/home-faq-expanded.png)
- [output/playwright/workspace-f7b/workspace-1024-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1024-hero.png)
- [output/playwright/workspace-f7b/workspace-1280-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1280-hero.png)
- [output/playwright/workspace-f7b/workspace-1440-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-dark-hero.png)
- [output/playwright/workspace-f7b/workspace-1440-footer.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-footer.png)
- [output/playwright/workspace-f7b/workspace-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-full.png)
- [output/playwright/workspace-f7b/workspace-1440-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-hero.png)
- [output/playwright/workspace-f7b/workspace-1440-light-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-1440-light-hero.png)
- [output/playwright/workspace-f7b/workspace-320-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-320-full.png)
- [output/playwright/workspace-f7b/workspace-320-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-320-hero.png)
- [output/playwright/workspace-f7b/workspace-390-dark-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-390-dark-hero.png)
- [output/playwright/workspace-f7b/workspace-390-footer.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-390-footer.png)
- [output/playwright/workspace-f7b/workspace-390-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-390-full.png)
- [output/playwright/workspace-f7b/workspace-390-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-390-hero.png)
- [output/playwright/workspace-f7b/workspace-768-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-768-hero.png)
- [output/playwright/workspace-f7b/workspace-apply-login.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7b/workspace-apply-login.png)
- [tests/routes/public-landing-f7b.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/public-landing-f7b.test.ts)
- [tests/routes/workspace-membership-ui.test.ts](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/tests/routes/workspace-membership-ui.test.ts)

## V. Remaining owner asset/claim approvals

Existing logo and program artwork were reused as allowed; **provenance/license ownership is not established by source presence**. Owner must confirm rights. Some legacy artwork embeds promotional claims such as learner-count/faculty statements; these were not invented by this task, but require proof or approved replacement before commercial release. Refreshed textual faculty/heritage/outcome assertions were removed instead of fabricated. No new institutional endorsements, testimonials, learner figures, partnerships, social URLs or replacement bitmap assets generated. Existing Lucide ISC notices remain. The owner-requested 365-day retrospective policy still needs its separately scoped protected correction; current local impact is documented.

## W. Remaining readiness and production launch gates

All 13 owner-agreed improvements remain mandatory before paid launch; none is waived as approved post-launch work. This completes the authorized landing/shell implementation and verification scope, not an aggregate commercial release certification. No next phase started.

Preserved open F6-02–F6-07: collation upgrade plan; legacy FK naming/compatibility; unsafe URL/pool/timeout correction before production-sensitive workflows; scaling/index/count review; retention/three REVIEW tables without deletion approval; invoice PDF storage growth. Also: genuine B.2R refund webhook evidence, separately authorized genuine email/sender/delivery proof, production configuration/credentials/migration authorization/canonical origin, worker/scheduler/durable notice operations, commercial/asset/claim/policy sign-off, operational documentation and final production release smoke—including actual optimized image delivery. Production impact of the requested 365-day change is unknown. Public Workspace charging remains OFF.

## X. Final recommendation

**WORKSPACE F.7B LMS-FIRST LANDING + HEADER/FOOTER VERIFIED** for the authorized UI implementation and local verification scope. LMS-first structure, static CTAs, actual catalog, compact Workspace introduction, dedicated Creator landing, responsive shell, policy/pricing copy, SEO, keyboard/contrast, protected routes, original-row preservation and final regression/build checks pass.

**Commercial/production launch remains BLOCKED** on the independently listed policy, asset/claim, production and operational gates. No 365-day entitlement correction was applied; no licensing/substantiation or genuine provider evidence manufactured. Stop here: no F.8/F.9/Phase 1.9, production migration or public charging.
