# AirBharath post-UAT UI and onboarding corrections

Branch: `codex/workspace-1.8-launch`. Starting HEAD: `465ceff`. Date: 15 October 2026.

**UI corrections verified locally. Phone-only Creator onboarding deferred by explicit owner decision because it requires a separately authorized migration. This is not a public-payment release approval.**

## UI changes

| Requirement | Result |
| --- | --- |
| Original colors | Restored the original deep teal light palette and cyan dark palette from `f024a4c` (`9b8e104^`); light accent-light provenance also exists before `1c50630`. Public surfaces now share these semantic tokens instead of a separate purple palette. |
| Homepage carousel | Real published catalog records; approximately six-second rotation, matching image/title/CTA destinations, previous/next, pause/play, hover/focus and reduced-motion handling. Inactive slides are inert and hidden from accessibility navigation. Shared grid sizing prevents rotation height shifts. Empty/single-course states have no rotation controls. Hero composition retained. |
| Mobile account | Login/My Account remains visible outside the drawer at 320px and 390px. Student destination remains `/dashboard`; persisted Admin destination remains `/admin`. |
| Mobile footer | Branding/contact followed by grouped Learn/Create/Company & Support links. All existing links retained; desktop layout retained. |
| All-in-One offer | Authoritative standard ₹3,300 is struck through beside ₹1,900 only when the existing eligible ₹1,400 coupon projection is available. Qualification and checkout validation are explicit on homepage and detail page. Invalid/expired/exhausted offers fall back to standard pricing. No coupon counters, pricing algorithms or checkout calculations changed; the previously confirmed ₹5,309.09 Test payment/refund evidence is untouched. |
| Course thumbnails | Removed the image's 10% opacity/blend suppression; replaced it with a graduated surface overlay, retaining strongest text protection behind copy and exposing more image detail toward the edge. Original optimized images retained, including AI Skills. |
| Branding | Active generic public/login/learner copy, account navigation, metadata and video watermark now use AirBharath. Legal documents, issued records, intentional credential/product titles, URLs and internal identifiers retained. |
| Theme | System remains the default without a stored choice. One click switches light/dark and persists it. Header and account settings reuse the same control; dropdown and three-card chooser removed. |
| Desktop navigation | Primary navigation/account are visible on wide screens; hamburger reserved for constrained widths/mobile. |

## Onboarding decision and exact blocker

The approved future policy is phone OTP authentication plus a syntactically valid, correctable contact email, with independent Creator Terms/Refund Policy acceptance and all eligibility/payment/access safeguards.

That policy is **not yet active**. Migration `0027_workspace_verified_creator_email.sql:94–104` installs `workspace_email_order_required`, a BEFORE INSERT trigger requiring an active current email proof for every new Workspace membership order. No later migration replaces it. Hiding the email step or removing only the TypeScript guard would leave new checkout failing.

The owner explicitly chose **“Finish UI; document onboarding blocker.”** No migration was generated or applied. Mandatory activation email OTP and `createWorkspacePaymentService`'s new-order verified-email guard remain intact until a coordinated correction is authorized. Existing optional-capable email verification APIs and all historical proofs remain intact. No verification timestamp was fabricated.

Safe independent improvement: `/api/auth/update-profile` now validates email syntax, trims/normalizes contact data, rejects invalid/non-string input, retains the signed-in account/role, and redacts internal errors. The existing onboarding/account-settings form allows corrections; updating a contact does not prove ownership. Existing database contact-change proof revocation and immutable notification bindings are untouched.

Next authorized onboarding task must coordinate a reviewed versioned replacement for **only the order email-proof prerequisite**, matching server-side new-order/contact-context checks and activation contact UI. Preserve proof history, contact-change revocation, refund-notice recipient bindings, legal receipts and independent entitlement rules. Verify real PostgreSQL new orders without email proof, invalid/missing contacts, legal acceptance, idempotency and authorization before rollout. Do not weaken or disable triggers as a shortcut.

## Notification privacy review

- **Workspace refund notices:** `resolveNoticeRecipient` requires current ownership verification, and durable notice bindings/history remain immutable. An unverified or corrected address cannot silently receive refund details. Keep this delivery guard when phone-only checkout is implemented; use authenticated Billing & Support for status and offer separate optional ownership verification for sensitive email delivery. Reassess existing blocked obligations through approved delivery/recovery rules rather than rewriting history or assuming a new proof repairs an old binding.
- **Legacy LMS enrollment/invoice-related mail and certificate mail:** `invoice-generator.ts` and `certificate-service.ts` send to stored contacts without the Workspace ownership-proof guard. A mistyped/unowned address can receive a learner's name, purchased course or credential reference. This is a pre-existing risk; these financial/certificate flows were not broadened or modified here. Proposed safe alternative: authenticated account downloads/status and ownership-verified delivery for sensitive details, or minimal generic notices without those details, under a separate approved scope.
- **Legacy manual Workspace receipts and approval mail:** existing application email is used for application name/reference/status and, for approval, an Admin-reviewed optional note. These addresses are not authenticated by phone OTP. Do not include sensitive financial information or auth/session tokens in these templates; prefer authenticated status and optional email ownership verification for richer messages. No delivery occurred in this task.
- Email syntax validation is not ownership verification. Phone and six-digit optional email OTP contracts, durable evidence and recipient histories remain unchanged. No OTP, token, cookie or provider secret is included in this report.

## Verification

- Focused safe test run: **208 tests passed** across public catalog/UI, contact updates, local phone OTP, email, refund-notice recipient safety, activation boundaries, grants and refunds. After adding empty/single/inert-slide regressions, the final two changed suites passed **34 tests** (25 public/UI + 9 contact).
- Full `pnpm validate`: **1,314 Vitest tests passed**, pure Node checks passed, TypeScript passed and lint passed. No full-suite repetition. Three remaining generic metadata/return-link labels were corrected afterward; final TypeScript and scoped lint cover those final strings.
- Hydrated installed Chrome via cached Playwright: 1440px desktop plus 390px/320px mobile; real published records; rotation/hover/manual pause, stable slide height, matching links, reduced motion, persisted one-click theme, visible navigation/account, accessible drawer Escape close, two-section footer and no horizontal overflow. Existing allowlisted Student demo completed the normal local mock-phone login; My Account resolved to `/dashboard` at both mobile widths. No SMS sent. Bundle homepage/detail promotion and AI thumbnail checked. No page errors in completed main browser run.
- Final system-theme/keyboard checks: **passed**. System default follows device changes until a manual choice; keyboard focus pauses rotation, inactive slides are inert, constrained/wide navigation responds correctly, and zero page errors were observed. The interrupted local PostgreSQL/app processes were restarted using the existing cluster and guarded provider-disabled launcher; no database initialization, migration or seed occurred.
- Final isolated payment-disabled production build: **passed** (exit 0; compile, lint/types, prerender and route output completed). Original cached font families used; no `.env` or usable provider credentials; unreachable synthetic database. An earlier build attempt exited unsuccessfully before the interrupted session; the following command reported a sandbox quota error, and temporary logs were unavailable after interruption. The fresh final build is recorded separately below.
- `git diff --check`: passed. No migration/dependency/lockfile or Workspace financial/webhook/entitlement implementation changes.
- No production access, migration, deployment, genuine provider request, financial fixture insertion or historical deletion. Normal phone login used an existing dedicated local demo. Workspace public payment flags remain off in the local launcher and build. Genuine Razorpay Test refund and signed-webhook verification remains a separate mandatory public-launch gate.

## Changed files

- `AIRBHARATH_POST_UAT_CORRECTIONS.md`
- `app/(auth)/login/page.tsx`
- `app/(dashboard)/dashboard/jobs/page.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(user)/about/page.tsx`
- `app/(user)/contact/page.tsx`
- `app/(user)/courses/[slugOrId]/page.tsx`
- `app/(user)/courses/page.tsx`
- `app/(user)/faq/page.tsx`
- `app/(user)/layout.tsx`
- `app/(user)/my-courses/page.tsx`
- `app/(user)/page.tsx`
- `app/(user)/practice/page.tsx`
- `app/(user)/pricing/page.tsx`
- `app/api/auth/update-profile/route.ts`
- `app/globals.css`
- `app/layout.tsx`
- `app/not-found.tsx`
- `app/verify-certificate/[id]/page.tsx`
- `components/DarkModeToggle.tsx`
- `components/Footer.tsx`
- `components/Header.tsx`
- `components/contact/ContactView.tsx`
- `components/dashboard/CertificatesView.tsx`
- `components/dashboard/SettingsView.tsx`
- `components/dashboard/SidebarNav.tsx`
- `components/faq/FAQView.tsx`
- `components/landing/CoursesSection.tsx`
- `components/landing/FeaturedCourseCarousel.tsx`
- `components/landing/HeroBanner.tsx`
- `components/landing/LearningSections.tsx`
- `components/public/public.css`
- `components/video-player/HlsPlayer.tsx`
- `lib/app-version.ts`
- `tests/routes/post-uat-profile-contact.test.ts`
- `tests/routes/public-landing-f7b.test.ts`

## Completion

Commit: this report is included in the scoped UI/contact correction commit; obtain its hash with `git log -1 --format=%h -- AIRBHARATH_POST_UAT_CORRECTIONS.md`.

The final response records the commit hash and post-commit clean-worktree check. Phone-only Creator checkout remains blocked/deferred; no claim of complete onboarding or public launch readiness.
