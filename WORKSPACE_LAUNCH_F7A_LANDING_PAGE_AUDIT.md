# AirBharath Workspace — F.7A landing-page audit

**WORKSPACE F.7A LANDING PAGE AUDIT READY FOR OWNER REVIEW**

Recommendation: **Option B — structured landing-page refresh**, preserving the learner-focused AirBharath homepage and adding a visible Workspace path. The current local UI has conflicting advertised LMS prices/access promises, an inaccessible closing sign-in button, a keyboard-unsafe carousel and a tablet-width Workspace discovery gap. Fixes and redesign remain proposals: **F.7B has not started**.

Audit date: 14 October 2026. This verdict concerns audit completeness, not paid-launch readiness.

## A. Starting branch/HEAD and scope

Branch `codex/workspace-1.8-launch`; starting HEAD `fe3060d`; worktree clean before this task. Scope: homepage `/`, focused public `/workspace` conversion review, shared public Header/Footer and safe linked destinations. Private Creator/Admin UX was not redesigned or re-audited as an implementation phase. No product code, copy, CSS, prices, legal text, configuration, financial rules or schema changes were made. Evidence/report commits only. Standing owner commit authorization and this brief authorize scoped audit commits.

## B. Actual public routes and composition

[app/(user)/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/page.tsx) renders 11 landing sections and dynamically reads published LMS courses. [app/(user)/workspace/page.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/workspace/page.tsx) renders [components/workspace/WorkspaceLanding.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/workspace/WorkspaceLanding.tsx) with nine sections. Both inherit [app/(user)/layout.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/(user)/layout.tsx) and its shared [components/Header.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/Header.tsx) / [components/Footer.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/components/Footer.tsx). Root fonts/theme/analytics providers remain in [app/layout.tsx](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/app/layout.tsx). `/workspace` is a separate aviation Creator entry, not the LMS homepage.

Existing relevant destinations: `/workspace/apply`, eligibility result and `/workspace/activate` (guarded), `/workspace/manual-application` (public alternative), `/workspace/creator-terms`, `/workspace/refund-policy`, `/login`; Creator dashboard uses the existing server-side entitlement resolver. No fictional Creator Builder, checkout or settings navigation is proposed.

## C. Existing section-by-section inventory

Counts exclude the shared Header/Footer: **11 homepage sections; nine Workspace sections**. Exact rendered headings and detailed purpose/CTA/layout/mobile/trust/conversion/duplication/missing-information fields are in [section-inventory.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/section-inventory.json). “Why AirBharath LMS” is the trust section’s accessible label, not a visual H2.


### `/` displayed order

| # | Exact heading / section label | Purpose, CTA and audit assessment |
| --- | --- | --- |
| 1 | Practical, Future-Ready Skills with AirBharath LMS | LMS course discovery; understand self-paced technical programs. Explore All Courses → /courses; Student Login → /login; carousel → five existing course routes. Primary learner conversion; no Creator explanation; price conflict in first slide |
| 2 | Why AirBharath LMS | Why the learning platform is credible. None. Supporting trust; specific substantiation is absent |
| 3 | Featured Certificate Programs | Compare the actual published local course catalog. View All Programs → /courses; course details; Explore Combo Pass. Strong learner conversion; no Creator product introduction; conflicts with hardcoded hero |
| 4 | Built for Serious, Self-Paced Skill Building | Understand platform learning features. In-page feature explanation. Reassurance; distinction between LMS capabilities and future Workspace needed |
| 5 | How Learning on AirBharath Works | Understand learner onboarding. Course browsing CTA → /courses. Useful next-step explanation for students, not Creator onboarding |
| 6 | Earn a QR-Verifiable Certificate of Completion | Understand completion credentials and verification. Verify certificate → /verify-certificate. Trust support; duplicates QR claims elsewhere; heading level skips |
| 7 | Built for Professionals, Students & Creators. Learn What’s Next. | Restate audience and platform benefits. Course browsing and Student Sign In. Substantially duplicates hero/feature/trust sections; “Creators” is not Workspace explanation |
| 8 | Upgrade Your Skills. Build Practical Confidence. | Contrast learning before/after. None. Repeats feature benefits and creates commercial ambiguity |
| 9 | Learn From IIM Alumni & Industry Practitioners | Explain instructor credibility. None. Useful if consolidated with verified proof; currently repetitive |
| 10 | Frequently Asked Questions | Answer learner questions. Seven accordions. Supports learner conversion; no Workspace-specific questions |
| 11 | Build Practical, In-Demand Skills with AirBharath LMS | Close the learner journey. Explore All Courses → /courses; Student Sign In → /login. Strong placement, but light-mode sign-in text is white on white; no Creator path |

### `/workspace` displayed order

| # | Exact heading / section label | Purpose, CTA and audit assessment |
| --- | --- | --- |
| 1 | Built for aviation professionals who have something worth teaching. | Identify aviation professionals as prospective creators. Become a Creator → /workspace/apply; See how → #how-workspace-works. Clear audience; future course-business promise dominates, current Early Access tools not explained |
| 2 | You already have the expertise.You shouldn't have to build the technology too. | Explain creator/platform responsibilities. None. Overlaps capabilities and future journey; “today accepting applications” understates implemented preparation tools |
| 3 | From expertise to your own course business. | Describe eventual course business. In-page anchor destination. Future funnel is explained before available private proposal/review/build workflow |
| 4 | One Workspace for your aviation courses. | Present planned platform functionality. None. Overlaps vision/journey; operational vs future information needs stronger hierarchy |
| 5 | Built specifically for aviation expertise. | Help visitors recognize their expertise. None. Good audience recognition; actual eligibility declarations/criteria absent |
| 6 | Become one of the first AirBharath Workspace Creators. | Describe early cohort benefits. Become a Creator → /workspace/apply. Useful qualified offer; early tools described as not yet launched |
| 7 | Simple creator membership. | Explain durations and release schedule. None; named plans/legal documents are plain text. Section seven contains key commercial information, no amounts/legal links/term-start/refund summary |
| 8 | How creator eligibility works | Describe account/eligibility/activation sequence. None. Useful safeguard; verified email, agreements, approved private builder and complimentary grant distinctions omitted |
| 9 | Become aCreator. | Invite normal self-service eligibility or optional manual application. Become a Creator → /workspace/apply; manual → /workspace/manual-application; public support mailto. Working conversion; “Become a Creator” can imply immediate access instead of check eligibility |


The homepage has product features/how-it-works/trust/FAQ/final CTA, but no body explanation of Workspace, Creator eligibility, Creator membership or Early Access. Workspace has creator value/domains/future journey but no clear current preparation workflow, public amounts or dedicated FAQ. Header/footer defects are separately registered; these omissions are not assumed sections.

## D. Visual and brand audit

Retain the restrained aviation concept illustration on Workspace, professional large headings, existing purple palette, rounded controls, whitespace and consistent Lucide line icons. Workspace’s darker purple action color is clearer than the light global primary. The homepage communicates general digital certificate learning more strongly than aviation Creator preparation. Its repeated benefit/trust panels and tall carousel slow scanning; mobile card titles truncate some program names. A dedicated Creator block is preferable to replacing the entire homepage identity.

Original logo/course images loaded for visual inspection. The tiny abstract logo alone offers little aviation recognition; confirm the approved AirBharath lockup before changing it. Spelling varies between AirBharath, Air Bharath and Airbharath. Current font-family CSS identifies Inter body, Outfit headings and the existing Jakarta family. Inter and Outfit FontFace loads were confirmed after correcting an audit-harness path matcher; earlier fallback-font captures were superseded. Font transport and image delivery are isolated-harness adaptations described below, not production optimization verification.

[asset-provenance.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/asset-provenance.json) records existing CDN/local assets. No artwork ownership/licensing trail was located in the repository. Owner must confirm reuse rights and brand identity; no replacement assets were generated. Lucide has an installed ISC license. Faculty/heritage assertions require substantiation, not invented testimonials, partnerships, regulatory endorsement or sales achievements.

## E. Messaging and target-audience clarity

The learner hero is clear about self-paced AI/digital/workplace programs. The Creator hero correctly identifies aviation professionals, but leads with eventual pricing/selling/business capabilities and qualifies them later in small copy. Explicit future labels and the no-guaranteed-learners/revenue/DGCA disclaimers are useful and must survive. The implemented private preparation tools are understated by “Creator tools are in development.”

Proposed priority: current profile preparation → course proposal → Admin review/revision → approved private text builder. Media uploads, publication, creator-course selling/earnings and marketplace are future capabilities, not operational Early Access promises. Full release is **targeted for 9 November 2026, subject to its release readiness**. Paid Early Access target 14 October is still subject to verification; public payments remain off. Do not infer readiness merely from this audit date.

## F. Creator conversion funnel

[link-cta-map.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/link-cta-map.json) separates browser observations from source review. Actual anonymous journey: `/` → `/workspace` → Become a Creator → `/workspace/apply` → `/login?callbackUrl=%2Fworkspace%2Fapply`. Login destination preserved intent; no OTP or form was submitted. Optional manual application resolves normally and is not a shortcut to access.

Source-reviewed paid path: normal phone authentication → server-side eligibility → eligible result → activation with owner-bound verified email, current legal acceptance and membership quote/order → payment-disabled gate. Only separately enabled verified financial capture and normal fulfillment can establish paid membership; existing secure access resolver governs the Creator Dashboard. No authenticated or financial step was executed in this audit.

Source-reviewed complimentary path: existing eligibility/current Creator Terms plus a persisted Admin-issued access grant → the same secure resolver → Creator access. Successful Razorpay payment is not the only possible access source. Do not require paid refund-policy acceptance or a synthetic financial order just to explain complimentary access.

Friction: Workspace absent from homepage body and 1024px header; Get Started/Pricing lead back to LMS; application CTA does not explain the next eligibility step; membership costs and release boundaries are too late; verified-email/agreement and proposal approval steps are omitted from the public explanation. Preserve the actual guards rather than reducing necessary steps.

## G. Pricing, Early Access and legal consistency

**LMS commercial defects:** locally rendered hero bundle ₹1,900 against struck-through ₹3,300; same-page published card and `/pricing` show ₹3,300 incl. GST without an offer condition connecting the two. TransformationMatrix explicitly promises lifetime course access while all five catalog cards show 365 Days Access. These are contradictory advertised statements, not verified live charging behavior. Owner must confirm intended offer/access policy; F.7B should align marketing to existing authoritative data without modifying financial rules.

**Workspace current catalog supplied by the brief:** 3 months ₹5,899; 6 months ₹9,999; 12 months ₹17,699, all inclusive of 18% GST. Landing currently names durations/GST but no amounts. Recommend a read-only public comparison on Workspace, rather than all three prices in the homepage hero. It must read current catalog values and must never reprice historical orders.

Explain immediate authorized Early Access versus a pre-launch paid term starting **9 November 2026 at 00:00 Asia/Kolkata** (`2026-11-08T18:30:00.000Z`). Existing 72-hour refund-request window runs from authoritative `paidAt`, not the November membership start. Link the existing public Creator Terms and Refund Policy directly; both returned 200 and retained “Workspace payments are not publicly enabled.” Keep support discoverable. Canonical legal documents govern; proposed explanatory copy does not amend rights. No payment to apply remains explicit.

## H. Hydrated desktop/tablet/mobile evidence

Installed Google Chrome with cached Playwright; anonymous, en-IN/Asia-Kolkata, local isolated payment-disabled production build, no throttling. Light captures cover both routes at 1440×1000, 1024×1000, 768×1000, 390×844 and 320×844; dark first-view captures at 390×844. Twelve route/viewport/theme combinations and 30 current-UI screenshots. Main/source and supplementary checks are in [browser-evidence.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/browser-evidence.json) and [accessibility-seo-details.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/accessibility-seo-details.json).

| Width | Homepage height | Workspace height | Result |
| --- | --- | --- | --- |
| 1440 | 11172 px | 6747 px | No document horizontal overflow |
| 1024 | 11422 px | 7047 px | No document horizontal overflow |
| 768 | 13607 px | 9615 px | No document horizontal overflow |
| 390 | 17657 px | 12987 px | No document horizontal overflow |
| 320 | 18754 px | 14179 px | No document horizontal overflow |


Screenshots actually inspected include desktop heroes/footer, Workspace full-page/tablet, narrow mobile hero/menu/catalog, dark mobile, tablet navigation and keyboard focus. Full-page PNGs may be downscaled by the viewer; targeted captures corroborate specific defects. Representative evidence:

- [home-1440-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-1440-hero.png) and [workspace-1440-full.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/workspace-1440-full.png).
- [home-1024-workspace-navigation-gap.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-1024-workspace-navigation-gap.png) and [workspace-768-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/workspace-768-hero.png).
- [home-390-hero.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-390-hero.png), [home-320-menu.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-320-menu.png) and [home-320-course-catalog.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-320-course-catalog.png).
- [home-1440-footer.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-1440-footer.png) and [home-hidden-slide-keyboard-focus.png](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/playwright/workspace-f7a/home-hidden-slide-keyboard-focus.png).

Menu opens, Escape closes and selecting Workspace closes it at 768/390/320. Stacking is readable with no overall horizontal overflow. At 320, logo/theme targets overlap despite no document overflow. At 1024, neither Workspace header link nor hamburger exists. Long pages and repeated card content are meaningful scanning problems, not a measured conversion decline.

## I. Navigation and safe interactions

Twenty-two initial safe destination checks plus two public Workspace legal routes: root, Workspace, courses, pricing, FAQ, about, contact, login, practice, five course details, certificate verification, dashboard, privacy, generic terms, apply, manual application, robots and sitemap. Ordinary public pages resolve; dashboard redirects anonymous users to login and apply preserves callback. **No broken primary application link was found.** FAQ expands with answer and aria-expanded; Workspace skip link focuses its H1; contact/support mailto was inspected without sending a message.

Crawler endpoints require the supplementary correction: initial 307 to login, followed 200 **HTML**, not valid robots/sitemap. The initial status-only followed checks were insufficient and are explicitly reconciled in the link map. Header “Pricing” is LMS pricing, not Creator membership.

Six automatic requests from legacy linked-page rendering were blocked before delivery: five Razorpay Checkout SDK GETs and one coupon-validation POST. No financial button was clicked, provider request completed, coupon validated, OTP sent, email sent or authenticated state created. Both primary landing routes contain zero Razorpay script tags. Browser console network errors correspond to these deliberate blocks; page-error and HTTP-error arrays for the completed primary audit are empty. This is not a claim that attempted legacy requests never occurred.

## J. SEO and performance

Homepage title: “AirBharath LMS - Premium Aviation & Technical Learning”; Workspace title describes the Founding Creator Program. Descriptions exist. No canonical, Open Graph/Twitter metadata or JSON-LD observed. Missing robots/sitemap implementations and middleware public allowlist produce login redirects. Recommended public metadata routes must narrowly preserve private route guards. Route-specific titles/descriptions should accurately reflect both products; no fabricated review/rating schema. [Next.js metadata reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) supports the available metadata mechanisms.

Source review: homepage is force-dynamic, fetches all fields of published courses without a homepage limit, then sends them to client rendering. Five carousel image preloads compete; raw logo is 5334×4268 displayed about 40×32, without explicit intrinsic dimensions. Hero native images lack explicit dimensions/lazy loading. Three font families/shared client providers merit profiling, but PostHog-specific bundle cost was not measured. Existing alt text is descriptive on product images; decorative SVGs are hidden from assistive technology.

Local Browser Performance API measurements are indicators, not production Core Web Vitals or a Lighthouse score:

| Route / width | FCP | Observed LCP | CLS |
| --- | --- | --- | --- |
| / / 1440 | 228 ms | 3448 ms | 0.000426 |
| /workspace / 1440 | 340 ms | 340 ms | 0.000000 |
| / / 390 | 140 ms | 468 ms | 0.000000 |
| /workspace / 390 | 152 ms | 292 ms | 0.000004 |


Measurements include warm caches/prefetch, original-image interception and cached font transport. Cross-origin resource sizes may be zero without timing permission and cannot be treated as actual zero bytes. JS/resource counts include shared chunks and linked-route prefetch, not exclusively the current page. No production performance regression/search ranking claimed. Lighthouse/axe were not installed; dependency installation was not authorized. Real optimizer/CWV verification remains separate before release. Prioritize one hero asset and minimal public course DTO before speculative caching; private data must remain private.

## K. Accessibility

Actual checks: one header/main/footer and one H1 per primary route; menu expanded state, Escape/link closure, visible FAQ focus, FAQ expansion, Workspace skip focus, real Tab navigation, normal-motion carousel focus, computed light-mode solid-background contrast and mobile target geometry.

Solid-background samples: closing Student Sign In 1.0:1, closing Explore All Courses 2.913:1 and desktop Explore Courses 2.654:1, all normal-sized text below 4.5:1. These support concrete contrast findings under [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). The hero label color pair is additionally pale, but its ancestor gradient was not comprehensively sampled.

Tab reaches Explore Program inside an aria-hidden inactive slide. With focus retained, normal-motion carousel changes the active course after six seconds; no Pause/Stop/Resume button. Existing mouse-hover pause and reduced-motion disabling are positives. Prefer a static featured course or implement complete keyboard/focus/pause behavior consistent with [W3C carousel guidance](https://www.w3.org/WAI/tutorials/carousels/).

Search has no explicit label/aria-label, relying on placeholder fallback. Certificate section skips H2→H4; homepage lacks a skip link comparable to Workspace. No real form submission/error announcement, full screen-reader run, zoom study or comprehensive dark contrast audit was performed. Basic checks do not constitute accessibility certification. Review checklist: [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md).

## L. Prioritized issue register

**24 findings: P0 2; P1 10; P2 10; P3 2.** Each is a proposed correction, not implemented. Severity describes user impact, not permission to defer mandatory owner requirements. All chosen release-critical corrections and owner-approved landing improvements must be completed/verified before paid launch. Options vary design scope, not acceptance of misinformation or inaccessible controls.

[prioritized-issues.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/prioritized-issues.json) is the machine-readable register.

| ID | Priority | Finding | Complexity |
| --- | --- | --- | --- |
| F7A-01 | P0 | Conflicting unqualified LMS bundle price | Medium |
| F7A-02 | P0 | Lifetime course promise conflicts with 365-day access | Small |
| F7A-03 | P1 | Homepage has no Workspace product introduction | Medium |
| F7A-04 | P1 | Workspace navigation disappears at 1024px | Small |
| F7A-05 | P1 | Narrow header logo and theme hitboxes overlap | Small |
| F7A-06 | P1 | Primary CTA and navigation contrast defects | Small |
| F7A-07 | P1 | Carousel exposes inactive links and keeps rotating during keyboard focus | Medium |
| F7A-08 | P1 | Early Access capability hierarchy is outdated | Medium |
| F7A-09 | P1 | Membership costs and paid-term start are undiscoverable pre-application | Medium |
| F7A-10 | P1 | Workspace policy names are not links and refund summary is absent | Small |
| F7A-11 | P1 | Crawler endpoints redirect to login HTML | Medium |
| F7A-12 | P1 | Shared Workspace header steers visitors back to LMS purchases | Small |
| F7A-13 | P2 | Public eligibility explanation omits concrete requirements | Medium |
| F7A-14 | P2 | Current private course-building workflow is unclear | Medium |
| F7A-15 | P2 | No Workspace FAQ or complimentary-path explanation | Small |
| F7A-16 | P2 | Repeated sections inflate page length | Medium |
| F7A-17 | P2 | Credibility claims need owner evidence | Content-dependent |
| F7A-18 | P2 | Visual asset provenance is undocumented | Content-dependent |
| F7A-19 | P2 | Resource and server/client boundaries merit measured optimization | Medium |
| F7A-20 | P2 | Source fallback conflates unavailable data with empty catalog | Small |
| F7A-21 | P2 | Canonical/social metadata is absent | Small–Medium |
| F7A-22 | P2 | Semantics and explicit search labeling need refinement | Small |
| F7A-23 | P3 | AirBharath naming varies | Small |
| F7A-24 | P3 | Decoration and passive hover treatments compete with content | Small |


### F7A-01 — Conflicting unqualified LMS bundle price (P0)

Location: `components/landing/HeroBanner.tsx:32; CoursesSection / local published catalog`. Current behavior: Hero advertises ₹1,900 (₹3,300 struck through); same page and /pricing display ₹3,300 incl. GST. Evidence: browser-evidence.json / sections 1,3; home-320-course-catalog.png. Why it matters: Visitors cannot know which offer applies.

Proposed: Owner confirms intended offer; display authoritative current course/offer data consistently, with explicit conditions if a real discount exists. Complexity: Medium. Dependencies: Owner offer decision; existing LMS price/offer source. Risk/constraint: Do not change financial prices, validate coupons or conflate Workspace catalog; live checkout was not tested.


### F7A-02 — Lifetime course promise conflicts with 365-day access (P0)

Location: `components/landing/TransformationMatrix.tsx:22`. Current behavior: Explicit lifetime course access vs 365 Days Access badges on all five local cards. Evidence: browser-evidence.json / sections 3,8; home-320-course-catalog.png. Why it matters: Commercial entitlement expectations conflict.

Proposed: Confirm intended access policy; replace contradictory marketing with accurate existing entitlement wording. Complexity: Small. Dependencies: Owner confirms course access policy. Risk/constraint: No entitlement-rule change; distinguish account/dashboard access from paid course duration.


### F7A-03 — Homepage has no Workspace product introduction (P1)

Location: `app/(user)/page.tsx:1; eleven landing sections`. Current behavior: Creator product appears in shared navigation/footer, not homepage body. Evidence: section-inventory.json; home-1440-full.png. Why it matters: Aviation experts cannot quickly discover the new offer.

Proposed: Add concise dedicated Workspace block while retaining learner-first homepage. Complexity: Medium. Dependencies: Owner approves two-audience hierarchy. Risk/constraint: Do not turn entire website Creator-only or promise public sales.


### F7A-04 — Workspace navigation disappears at 1024px (P1)

Location: `components/Header.tsx:101–102,228`. Current behavior: Desktop nav starts at lg, Workspace starts at xl, menu ends at lg. Evidence: home-1024-workspace-navigation-gap.png; browser-evidence.json headerControls. Why it matters: Direct creator discovery is lost at desktop/tablet width.

Proposed: Keep Workspace accessible across all breakpoints; fit or use compact navigation. Complexity: Small. Dependencies: Shared-header regression coverage. Risk/constraint: Preserve all LMS/account links; no authentication changes.


### F7A-05 — Narrow header logo and theme hitboxes overlap (P1)

Location: `components/Header.tsx:84,165; narrow shell`. Current behavior: 320px actual-loaded logo and theme control overlap horizontally. Evidence: accessibility-seo-details.json header320Overlap; home-320-hero.png. Why it matters: Ambiguous targets and crowded brand presentation.

Proposed: Reflow mobile header; reduce competing top-row actions and reserve logo width. Complexity: Small. Dependencies: 320/390 screenshot and pointer/keyboard checks. Risk/constraint: No fragile hidden controls; preserve theme/account access.


### F7A-06 — Primary CTA and navigation contrast defects (P1)

Location: `components/landing/FinalCTA.tsx:50; components/Header.tsx`. Current behavior: Light-mode Student Sign In is white on white; other sampled purple text is too pale. Evidence: accessibility-seo-details.json contrast; home-1440-footer.png. Why it matters: Sign-in action becomes visually unreadable.

Proposed: Use accessible shared button/text tokens; verify light/dark contrast. Complexity: Small. Dependencies: Design token approval and shared-button checks. Risk/constraint: Fix scoped usage; avoid global color changes without full regression.


### F7A-07 — Carousel exposes inactive links and keeps rotating during keyboard focus (P1)

Location: `components/landing/HeroBanner.tsx:116,246`. Current behavior: Tab enters aria-hidden inactive slide; focused course rotates after six seconds; no pause control. Evidence: accessibility-seo-details.json keyboard/carousel; home-hidden-slide-keyboard-focus.png. Why it matters: Keyboard and assistive-technology navigation diverge.

Proposed: Prefer static featured course or accessible carousel: inactive inert/tab suppression, focus pause, explicit pause/resume and stable labels. Complexity: Medium. Dependencies: Owner static-vs-carousel choice; keyboard regression. Risk/constraint: Existing hover/reduced-motion behavior is positive; do not remove usable course navigation.


### F7A-08 — Early Access capability hierarchy is outdated (P1)

Location: `components/workspace/WorkspaceLanding.tsx:87,102,123,128`. Current behavior: Broad planned course business leads; creator tools described as in development; actual preparation scope and dates buried. Evidence: workspace-1440-full.png; section-inventory.json. Why it matters: Visitors cannot distinguish available private tools from future media/publication/sales.

Proposed: Lead with profile/proposal/review/approved private text builder; mark future release as targeted 9 November subject to readiness; keep payments disabled notice. Complexity: Medium. Dependencies: Owner-approved release copy; actual launch status. Risk/constraint: No media/publication controls or claim that paid launch has been enabled.


### F7A-09 — Membership costs and paid-term start are undiscoverable pre-application (P1)

Location: `components/workspace/WorkspaceLanding.tsx:128`. Current behavior: Durations/GST mentioned without public amounts; no clear pre-launch term-start summary. Evidence: browser-evidence.json Workspace section 7. Why it matters: Commercial expectations require sign-in and eligibility first.

Proposed: Public read-only summary: 3/6/12 months ₹5,899/₹9,999/₹17,699 incl. GST; immediate authorized Early Access vs paid term beginning 9 November for pre-launch memberships. Complexity: Medium. Dependencies: Use authoritative current catalog; owner presentation decision. Risk/constraint: No historical repricing or public checkout; honor complimentary access as a separate entitlement source.


### F7A-10 — Workspace policy names are not links and refund summary is absent (P1)

Location: `components/workspace/WorkspaceLanding.tsx:129; components/Footer.tsx`. Current behavior: Creator Terms/Refund Policy named as plain text; footer generic terms only; no 72-hour explanation. Evidence: accessibility-seo-details.json legal; browser-evidence.json Workspace section 7 links=[]. Why it matters: Important rights are difficult to find before activation.

Proposed: Link existing public Workspace legal routes and concise canonical-policy-aligned 72-hour request-window/support summary. Complexity: Small. Dependencies: Canonical policy review; owner approves summary. Risk/constraint: Window is from authoritative paidAt, not launch; do not edit legal text or obscure rights.


### F7A-11 — Crawler endpoints redirect to login HTML (P1)

Location: `middleware.ts:32–52; missing app robots/sitemap definitions`. Current behavior: /robots.txt and /sitemap.xml return 307 /login, then 200 HTML. Evidence: accessibility-seo-details.json robots. Why it matters: Crawler control and sitemap discovery are not valid at these endpoints.

Proposed: Provide public metadata routes and narrowly permit them in middleware while protecting all private routes. Complexity: Medium. Dependencies: Owner F.7B approval; public URL inventory; authorization regressions. Risk/constraint: Do not broaden middleware bypass to private Creator/Admin routes; no claim that pages are completely unindexable.


### F7A-12 — Shared Workspace header steers visitors back to LMS purchases (P1)

Location: `components/Header.tsx; Workspace page`. Current behavior: Get Started → /courses and Pricing → /pricing, even on Workspace. Evidence: browser-evidence.json links/headerControls; workspace-1440-hero.png. Why it matters: Generic labels compete with creator application/membership journey.

Proposed: Make product context explicit: Learner courses/pricing, Workspace and Check eligibility; retain established destinations. Complexity: Small. Dependencies: Owner navigation labels/priority. Risk/constraint: No new nonexistent routes; do not expose payment CTA.


### F7A-13 — Public eligibility explanation omits concrete requirements (P2)

Location: `components/workspace/WorkspaceLanding.tsx:119,132; existing eligibility configuration`. Current behavior: Aviation category list and short eligibility check, but no declaration/experience/profile/declarations summary. Evidence: section-inventory.json; source-reviewed eligibility defaults. Why it matters: Applicants cannot self-assess readiness.

Proposed: Show concise current published criteria and HTTPS professional-profile expectation; derive any configurable thresholds from authoritative policy. Complexity: Medium. Dependencies: Published eligibility policy/read-only DTO if needed. Risk/constraint: 18+ and ≥24 months are source defaults, not a newly fetched live policy; do not hardcode unverified values.


### F7A-14 — Current private course-building workflow is unclear (P2)

Location: `components/workspace/WorkspaceLanding.tsx:36,107,132`. Current behavior: Future publish/sell sequence precedes private proposal → review → approved text builder; paid email/legal steps omitted. Evidence: section-inventory.json; source-reviewed guarded activation. Why it matters: Users may expect automatic course approval or immediate sale.

Proposed: Explain normal account → eligibility → paid verified-email/agreement/membership path → profile/proposal → review → approved private builder. Complexity: Medium. Dependencies: Existing workflow/copy review. Risk/constraint: No skipped guards or shortened approval path; eligibility does not create access.


### F7A-15 — No Workspace FAQ or complimentary-path explanation (P2)

Location: `components/workspace/WorkspaceLanding.tsx; existing grant resolver`. Current behavior: Only learner FAQ on homepage; grant access not explained publicly. Evidence: section-inventory.json; source-reviewed secure grant path. Why it matters: Repeated questions and payment-only access assumption.

Proposed: Concise Workspace FAQ: who applies, payment-disabled state, review, private tools, target launch, refunds/support; explain owner-issued complimentary access where appropriate. Complexity: Small. Dependencies: Owner FAQ wording; legal/access review. Risk/constraint: Complimentary access uses existing eligibility/current Terms and persisted Admin grant, no invented self-grant or paid-refund obligation.


### F7A-16 — Repeated sections inflate page length (P2)

Location: `eleven home sections; nine Workspace sections`. Current behavior: Features/heritage/faculty/outcomes recur; very long stacked mobile pages. Evidence: browser-evidence.json document heights; full screenshots. Why it matters: Core next steps require excessive scanning.

Proposed: Consolidate repeated benefits and proof; move release/commercial information earlier; keep important disclosures. Complexity: Medium. Dependencies: Option B hierarchy approval. Risk/constraint: Do not remove required disclosure or all learner context; no measured conversion-rate claim.


### F7A-17 — Credibility claims need owner evidence (P2)

Location: `TrustStrip; ExpertGuidanceSection; Workspace founding cohort`. Current behavior: Repeated IIM alumni and 30+ year heritage without linked person-level substantiation. Evidence: section-inventory.json; source copy. Why it matters: Visitors have limited verifiable context for assertions.

Proposed: Use verified faculty biographies, accurate organizational timeline and existing certificate demonstration. Complexity: Content-dependent. Dependencies: Owner-provided evidence and permissions. Risk/constraint: Claims are unverified by audit, not declared false; no fabricated institutional endorsements/testimonials.


### F7A-18 — Visual asset provenance is undocumented (P2)

Location: `public CDN logo/course images; public icons`. Current behavior: Existing source usage is visible, licensing trail not located. Evidence: asset-provenance.json; browser-evidence.json images. Why it matters: Reuse in redesign needs rights and brand assurance.

Proposed: Owner confirms logo/course/certificate artwork rights and approved brand lockup; retain licensed Lucide notices. Complexity: Content-dependent. Dependencies: Asset-owner confirmation. Risk/constraint: No new imagery generated or downloaded into repo; source presence alone is not rights proof.


### F7A-19 — Resource and server/client boundaries merit measured optimization (P2)

Location: `HeroBanner.tsx:316; Header.tsx:90; app/(user)/page.tsx:21; app/layout.tsx`. Current behavior: Five hero images preload; raw huge logo; three font families; full published course records fetched dynamically and sent to client. Evidence: browser-evidence.json images/meta/performance; source review. Why it matters: Avoidable payload/load work may grow with catalog.

Proposed: One prioritized hero image, appropriately sized licensed logo, lazy inactive/below-fold assets, explicit dimensions, minimal public course fields; profile before further caching/font/client changes. Complexity: Medium. Dependencies: Real optimizer test environment, F6-04 correction where relevant. Risk/constraint: Local timings are not production CWV or a proven regression; never cache private data or rewrite analytics during F7B.


### F7A-20 — Source fallback conflates unavailable data with empty catalog (P2)

Location: `app/(user)/page.tsx catch; CoursesSection.tsx:110`. Current behavior: DB error becomes [] then No courses found / try category, even when no filters render. Evidence: Source review only; happy path browser contains five courses. Why it matters: Unavailable service can look like no product inventory.

Proposed: Separate public-data unavailable and genuine-empty states; clear retry/browse/support path. Complexity: Small. Dependencies: Scoped error-state contract/tests. Risk/constraint: No fault injected into local DB; do not fabricate product availability.


### F7A-21 — Canonical/social metadata is absent (P2)

Location: `app/layout.tsx; app/(user)/layout.tsx; app/(user)/workspace/page.tsx`. Current behavior: Title/descriptions present; no canonical, OG/Twitter or structured data observed. Evidence: browser-evidence.json meta/structuredData. Why it matters: Sharing and preferred public URL identity lack explicit definition.

Proposed: Route-specific accurate metadata/canonical/social preview; structured data only for substantiated existing entity/course data. Complexity: Small–Medium. Dependencies: Owner canonical domain and approved preview asset. Risk/constraint: No SEO improvement claimed; no fabricated review/rating schema or private route indexability.


### F7A-22 — Semantics and explicit search labeling need refinement (P2)

Location: `SearchInput.tsx:23; CertificateShowcase.tsx; homepage shell`. Current behavior: Search relies on placeholder without label/aria-label; certificate H2→H4 jumps; homepage lacks Workspace-style skip link. Evidence: accessibility-seo-details.json keyboard; browser-evidence.json searchInputs/headings. Why it matters: More predictable screen-reader and keyboard orientation.

Proposed: Add persistent programmatic search label, proper heading levels, skip-to-main and consistent focus targets. Complexity: Small. Dependencies: Assistive-technology/keyboard follow-up. Risk/constraint: Placeholder may be used as a fallback accessible name; no formal inaccessible-name certification claimed.


### F7A-23 — AirBharath naming varies (P3)

Location: `HeroBanner and course copy; shared shell`. Current behavior: AirBharath / Air Bharath / Airbharath and LMS/Workspace labels vary. Evidence: browser-evidence.json sections; source copy. Why it matters: Weakens consistent brand recognition.

Proposed: Apply owner-approved AirBharath brand naming and distinct LMS/Workspace product labels. Complexity: Small. Dependencies: Brand-lockup approval. Risk/constraint: Preserve legal names and historical immutable financial/legal evidence.


### F7A-24 — Decoration and passive hover treatments compete with content (P3)

Location: `landing card grids and hero decorations`. Current behavior: Repeated ornamental icons, hover effects and generous spacers. Evidence: home/workspace full screenshots; source styles. Why it matters: Minor polish opportunity after hierarchy defined.

Proposed: Restrain nonessential decoration/animation; make interactive affordances correspond to actions. Complexity: Small. Dependencies: Chosen design option. Risk/constraint: Keep reduced-motion support and avoid broad shared primitive redesign.

## M. Proposed information architecture

[proposed-page-outline.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/proposed-page-outline.json) specifies proposed title, intended takeaway, short copy, visual treatment, real CTA, reuse/new material and paid-launch necessity for every section. These are specifications only; no finished redesigned screen exists.

Homepage recommended order: **dual-audience introduction → real learner catalog → dedicated Workspace introduction → learner how-it-works → consolidated learning/certificate benefits → substantiated people/heritage proof → learner/Creator orientation FAQ → two-path final CTA/footer**. Keep legacy course/practice/support/account navigation.

Workspace recommended order: **current private preparation hero → Early Access vs planned full release → authoritative eligibility summary → real proposal/review/build workflow → public membership/GST/term-start summary → linked terms/refund/support → Creator FAQ → normal application CTA**. Paid/complimentary access differences remain accurate. Explicit release/commercial disclosure moves ahead of repeated future-vision content.

## N. Proposed content and CTA direction

Suggested homepage bridge: “Aviation professionals: prepare your next course.” Supporting copy: “Build your profile, propose a course and prepare approved private text lessons in AirBharath Workspace.” CTA: “Explore Workspace” → `/workspace`. Maintain “Explore courses” → `/courses` for learners.

Suggested Workspace hero: “Prepare your aviation course in AirBharath Workspace.” Supporting copy: “Prepare your profile, submit a proposal for review, and build approved private text lessons. Applications are open; payments await launch verification.” CTA: “Check eligibility” → existing `/workspace/apply`. Explain normal account login before that redirect.

Release panel: “Early Access: private profiles, proposals, review/revisions and approved text course building. Full Workspace targeted for 9 November 2026: media, publication and selling, subject to release readiness.” No publish/sell/upload actions. Preserve own-audience/no-revenue-guarantee and regulatory disclaimers.

Membership summary uses the current three GST-inclusive prices and accurate term start. Public legal links and plain-language 72-hour refund-window explanation stay reasonably discoverable. “Payments not yet enabled / Workspace payments are awaiting launch verification” remains visible while the real gate is off. Complimentary access is Admin-issued under existing rules; no public grant shortcut. All proposed wording requires owner review; canonical legal text and thresholds are not rewritten.

## O. Three practical options

| Option | Benefits | Indicative effort including verification | Dependencies / risks |
| --- | --- | --- | --- |
| A — Focused improvements | Fix price/access inconsistencies, breakpoints, contrast/carousel, crawler routes, current-scope/legal/pricing visibility; retain most current structure | 2–3 engineering days; low–medium complexity | Faster structural change, but long repetitive pages remain. Owner truth/copy/assets decisions still required. All critical and necessary corrections included. |
| B — Structured refresh (recommended) | Consolidate sections, add homepage Workspace block, separate current/planned tools, improve proof/CTA hierarchy using existing brand | 4–6 engineering days; medium complexity | Shared Header/Footer and source-data presentation need regression; approved copy and asset rights needed. Preserves larger LMS identity. |
| C — Larger visual redesign | New broad public visual system and custom approved art/proof materials across both pages | 7–10 engineering days plus content/licensing lead time; high complexity | More shared-shell/visual regressions and owner design iteration; no evidence that broader replacement is necessary. |

Estimates are planning ranges, not commitments or authorization. They assume timely owner decisions, existing data services and no schema/financial/authentication changes. Commercial/operational gates remain outside these design estimates. No option treats Admin restructuring, pagination, landing improvement or database audit as approved post-launch work.

## P. Recommendation and exact owner decisions

Recommend **B**: defects are partly structural and repeated content hides Workspace’s actual offer. A would repair controls but retain substantial scanning friction; C adds unnecessary surface area before readiness is established. B can reuse the current aviation concept, typography and catalog while producing a concise product path.

Owner review questions, to authorize F.7B only after reviewing this report:

1. Approve Option B and a learner-focused homepage with a distinct, visible Workspace introduction?
2. Approve the proposed eight-section order for each page, current Early Access/future-release distinction, public GST-inclusive membership summary and direct policy/support links?
3. Confirm the intended LMS bundle offer (hero ₹1,900 vs current local catalog ₹3,300) and course access duration (lifetime claim vs 365 days). Changes must align marketing with the authoritative existing policy/offer, not alter financial rules.
4. Confirm approved AirBharath brand lockup and rights to existing logo/course/certificate artwork; supply substantiation for faculty/heritage claims or approve factual replacements.
5. Prefer a static featured-course hero or an accessible paused-by-default carousel? Approve route metadata/crawler corrections with private-route regressions.

The F.7A brief explicitly requires owner review/approval before F.7B. No implementation is waiting half-finished; the concrete findings/specification/evidence are ready to review.

## Q. Evidence limits and isolated harness

No production/staging environment, authenticated Creator session or commercial conversion data was inspected. Account/paid/grant workflow descriptions are source review, not new end-to-end proof. Public navigation was anonymous and guarded; no OTP/session/cookie credentials were recorded. Public business support details in screenshots are existing public content, not customer email data.

A tracked-source copy in an isolated `/tmp` directory was built with public payments/provider credentials absent. Original cached Latin Inter/Outfit/Jakarta bytes substituted only for Google font transport; actual font responses were routed to those bytes without changing application source. A local native Sharp image-processing crash required browser-only interception of optimized image requests to the exact existing CDN image bytes. Images are real existing art, not placeholders. Native image-optimizer production behavior and optimized delivery/byte savings remain unverified. The crash is a local harness limitation, not a proven deployed defect.

Necessary public-course SELECTs used only the owner-authorized `localhost:5433/airbharath_lms` development target. TCP and `/tmp` socket verified the same database OID 16384, system identifier 7680462735222304705, port 5433 and ledger 31 entries (0000–0030). The shared F6-04 URL heuristic discards some literal-5433 URL options; the isolated process used PGPORT 5433 and supported startup parameters, independently verified `default_transaction_read_only=on` on the actual driver connection. No source/env correction or migration authorization was added. Read-only enforcement is evidence of no task DB writes; this is not a fresh whole-database preservation fingerprint audit.

No Lighthouse, production CWV, formal accessibility certification, genuine provider delivery, asset-ownership certification or paid journey proof is claimed. Only audit files/current-UI screenshots are committed.

## R. Source, backend, database and configuration preservation

Tracked application pages/layouts/components/CSS, API/business/financial/legal/access code, migration SQL/journal/snapshots, dependency manifests/lockfile and all pre-existing tracked reports remain byte-for-byte unchanged relative to starting HEAD. Ignored `.env` files were never edited by this task; no secret values are reported. No new schema, migration, DB fixture, mutation, reset, cleanup or history edit. No background worker, deployment, charging or completed genuine Razorpay/MSG91/Mailercloud call. No analytics tracker installed; existing privacy/analytics behavior is preserved.

Public-payment flags were false in the temporary app; no authorization flags persisted. Only the task-owned isolated port-4057 app is stopped at completion. User-owned services/tunnels are not changed. Source preservation and cleanup outcome are in [verification-summary.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/verification-summary.json).

## S. Validation, changed files and commits

Full `pnpm validate` rerun with unreachable synthetic DB, provider credentials absent and payments disabled: **1,095 Vitest tests / 91 files + five pure Node checks PASS; TypeScript PASS; lint PASS**. No new tests or dependencies were needed for audit artifacts. `next lint` prints its existing deprecation notice; no lint errors/warnings.

Payment-disabled isolated `pnpm build` from a verbatim tracked-source copy: PASS, including build-time type/lint checks. Cached-font transport was used because original Google font transport was not available in the restricted environment. The original repository build directory/source/env was not changed by this isolated compile. No second repository build was necessary for unchanged product code. JSON parsing, artifact/screenshot inventory, tracked-source preservation and `git diff --check`: PASS.

Audit evidence commit: `ee5797feaa6b2daf739a1d24546268704c209cfd`. This report is committed separately; report commit/final HEAD returned to owner to avoid a self-referential hash. Every changed path is listed in [verification-summary.json](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/output/audits/workspace-f7a/verification-summary.json); all are this report, eight scoped JSON audit artifacts and 30 scoped current-UI PNG screenshots.

### Complete changed-file inventory

- `WORKSPACE_LAUNCH_F7A_LANDING_PAGE_AUDIT.md`
- `output/audits/workspace-f7a/accessibility-seo-details.json`
- `output/audits/workspace-f7a/asset-provenance.json`
- `output/audits/workspace-f7a/browser-evidence.json`
- `output/audits/workspace-f7a/link-cta-map.json`
- `output/audits/workspace-f7a/prioritized-issues.json`
- `output/audits/workspace-f7a/proposed-page-outline.json`
- `output/audits/workspace-f7a/section-inventory.json`
- `output/audits/workspace-f7a/verification-summary.json`
- `output/playwright/workspace-f7a/home-1024-hero.png`
- `output/playwright/workspace-f7a/home-1024-workspace-navigation-gap.png`
- `output/playwright/workspace-f7a/home-1440-footer.png`
- `output/playwright/workspace-f7a/home-1440-full.png`
- `output/playwright/workspace-f7a/home-1440-hero.png`
- `output/playwright/workspace-f7a/home-320-course-catalog.png`
- `output/playwright/workspace-f7a/home-320-full.png`
- `output/playwright/workspace-f7a/home-320-hero.png`
- `output/playwright/workspace-f7a/home-320-menu.png`
- `output/playwright/workspace-f7a/home-390-dark-hero.png`
- `output/playwright/workspace-f7a/home-390-footer.png`
- `output/playwright/workspace-f7a/home-390-full.png`
- `output/playwright/workspace-f7a/home-390-hero.png`
- `output/playwright/workspace-f7a/home-390-menu.png`
- `output/playwright/workspace-f7a/home-768-hero.png`
- `output/playwright/workspace-f7a/home-768-menu.png`
- `output/playwright/workspace-f7a/home-faq-expanded.png`
- `output/playwright/workspace-f7a/home-hidden-slide-keyboard-focus.png`
- `output/playwright/workspace-f7a/workspace-1024-hero.png`
- `output/playwright/workspace-f7a/workspace-1440-footer.png`
- `output/playwright/workspace-f7a/workspace-1440-full.png`
- `output/playwright/workspace-f7a/workspace-1440-hero.png`
- `output/playwright/workspace-f7a/workspace-320-full.png`
- `output/playwright/workspace-f7a/workspace-320-hero.png`
- `output/playwright/workspace-f7a/workspace-390-dark-hero.png`
- `output/playwright/workspace-f7a/workspace-390-footer.png`
- `output/playwright/workspace-f7a/workspace-390-full.png`
- `output/playwright/workspace-f7a/workspace-390-hero.png`
- `output/playwright/workspace-f7a/workspace-768-hero.png`
- `output/playwright/workspace-f7a/workspace-apply-login.png`

## T. Remaining F.6 production-readiness risks

Historical [WORKSPACE_LAUNCH_F6_DATABASE_AUDIT_COMPLETION.md](/home/rishisingh1034/Desktop/eresha-repo/airbharath-lms/WORKSPACE_LAUNCH_F6_DATABASE_AUDIT_COMPLETION.md) remains unchanged. F6-01 retained-history guard correction passed locally. **F6-02** collation 2.39→2.43 requires approved backup/rebuild/validation; **F6-03** five legacy FK naming differences require compatibility review; **F6-04** shared DB connection parsing/pool/timeouts must be reviewed/corrected before production-sensitive workflows rely on it; **F6-05** query/index/count scaling concerns; **F6-06** retention policy/three REVIEW tables without deletion approval; **F6-07** invoice PDF base64 storage growth. None is waived or silently fixed here.

## U. Outstanding pre-launch requirements

All 13 agreed Workspace improvements remain mandatory before paid Phase 1.8 launch. This audit completes F.7A only; owner-approved **F.7B implementation and hydrated verification remain required**. It does not finish the landing-page improvement requirement. No Admin/landing/database work is reclassified as approved post-launch. Frozen Phase 1.9 and later publication/sales work remain excluded.

Other preserved release gates: F6-02–F6-07 review/corrections; genuine refund webhook evidence still blocked in B.2R; separately authorized genuine transactional email/sender/delivery verification (F.2 implementation remains intact); production configuration/credentials/migrations with explicit authorization; worker/scheduler/durable notice operations; commercial/release sign-off; operational documentation and final release smoke. Production readiness is not inferred from local audit/build success. Public payments remain OFF.

## V. Decision

**WORKSPACE F.7A LANDING PAGE AUDIT READY FOR OWNER REVIEW.** The two routes, every existing section, hydrated desktop/tablet/mobile appearance, navigation, messaging, commercial consistency, SEO, performance indicators and accessibility have been audited with scoped evidence. A prioritized register, proposed structure and three practical options are ready. Limitations are explicit. Source/configuration/database unchanged; no deployment or completed genuine provider operation.

**F.7B and public paid launch remain unapproved/unverified. Stop after this audit.**
