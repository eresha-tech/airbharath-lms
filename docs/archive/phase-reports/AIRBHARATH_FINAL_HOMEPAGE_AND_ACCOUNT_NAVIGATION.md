# Final homepage, branding and account navigation

**AIRBHARATH HOMEPAGE & ACCOUNT NAVIGATION VERIFIED LOCALLY** — 15 October 2026.

Branch `codex/workspace-1.8-launch`; clean starting HEAD `24873be` (newer than the brief's expected HEAD). Implementation: **`096952b`**. Final report commit is returned separately to the owner.

## Homepage and branding

The hero now presents **Professional Aviation Learning**, the exact motto **ज्ञानं कर्मसु कौशलम्**, and **Knowledge into Skill. Skill into Possibility.** Its supporting description is:

> AirBharath is a professional aviation learning platform where aspiring aviation professionals build career-ready skills and industry experts transform their experience into structured learning experiences.

Both approved Learner/Creator explanations appear, with an explicit private-preparation Early Access limitation. Explore Courses opens `/courses`; Become a Creator enters `/workspace/apply`, which resolves the existing authenticated journey. The static linked Masterclass artwork and real course destination remain; no carousel was added.

The shared header/footer logo displays plain **AirBharath**, without the Learn/Create subtitle. Footer and login descriptors use the aviation positioning; the old login LMS suffix was removed. Original lavender theme tokens, light-mode styling and dark hero `#0A0A0A` remain unchanged. Sanskrit uses system Devanagari fallbacks; Chrome confirmed **Noto Sans Devanagari** glyphs. No font files were added to the product.

## Navigation findings and correction

Three concrete defects were reproduced or demonstrated:

1. A real retained/refunded Creator successfully logged in but landed on `/workspace/apply`: that page's hand-maintained state list omitted refunded and complimentary states, despite the existing resolver returning `/workspace/dashboard`.
2. Deterministic session-cache regressions failed before the correction: an old request could restore a logged-out UI identity or overwrite a newly confirmed login.
3. Login used a 400 ms timeout followed by push/refresh, and re-enabled submission while navigation was still pending. The original browser flow confirmed this enabled state. There was no synchronous guard against repeated form submissions.

Creator entry now follows the central resolver's destination, without duplicating entitlement policy. Authenticated Server Actions confirm the persisted session/profile, invalidate stale route state and issue one replacement redirect. The client publishes confirmed user state, ignores obsolete session responses and subscribes the header to changes. Authentication reads are non-cacheable. The arbitrary timeout and competing push/refresh calls are gone.

Synchronous submission guards and explicit pending states cover login/profile and eligibility continuation. Navigation failure exposes retry without repeating a saved profile/eligibility mutation. Safe same-origin callbacks are validated on client and server; unsafe external, control-character, backslash and encoded authority forms are rejected. Default learner login still opens the Student Dashboard.

Observed OTP-response-to-destination times: **3,321 ms before**, ending at the incorrect application page; **2,568 ms and 1,346 ms after**, ending at the correct read-only dashboard with one verification request and no second navigation click. Development compilation/cache conditions differ; these are observations, not a controlled performance benchmark. The exact intermittent double-click symptom was not consistently forced; the wrong destination, cache races and premature re-enablement were directly verified and corrected.

## My Account and destinations

The public header offers an accessible dropdown with **My Learning**, **Creator Workspace**, **Account Settings**, and **Log Out**. Opening it never navigates. Radix primitives provide keyboard focus, Escape/outside-click dismissal and viewport positioning. Mobile exposes the same destinations in the dropdown and existing navigation drawer. Anonymous visitors see Login.

| Destination/state | Behavior |
|---|---|
| My Learning | Existing `/dashboard`, preserving LMS behavior |
| Account Settings | Existing `/dashboard/settings` |
| Creator Workspace | Existing `/workspace/apply` entry and authoritative resolver |
| Paid Early Access / active grant | Creator dashboard with existing authorized rights |
| Refunded/expired retained history | Existing read-only dashboard or resolver-selected member view |
| Eligible, unpaid | Activation |
| New/expired eligibility | Eligibility form |
| Rejected/cooldown | Existing eligibility-result flow |
| Log Out | Existing cookie-clearing POST, cache invalidation and login navigation |

No account role or entitlement changes are made by these links. One account can open both dashboards without logging out.

## Verification and preservation

- Real hydrated Chrome: desktop, tablet, **390px and 320px**; light/dark screenshots inspected; no material overflow. Static artwork, motto, CTAs and settled menu contrast checked. Keyboard/Escape/outside-click, mobile drawer selection, Settings and secure logout passed.
- Existing paid Early Access, complimentary and refunded accounts successfully switched between real dashboard routes. Refunded content API reports editing disabled; logout removes the cookie and private API access returns 401. Other state branches have focused route/access regressions.
- Normal local mock-phone OTP endpoints were exercised for the retained account. A separate tagged empty student fixture tested registration/profile continuation, delayed/failed responses, duplicate suppression, saved-result navigation retry, activation and learner callback behavior. For this isolated fresh fixture, OTP and eligibility HTTP transport were mocked; the normal profile API and normal server eligibility service persisted real state. This avoided extending the OTP allowlist or modifying the owner's fresh demos. The new eligible fixture remains student and receives 403 from Creator content APIs.
- Fresh original-row fingerprints: **7,797 original rows across 62 tables preserved**. Only the newly tagged synthetic student/profile and eligibility history were added/updated through the test journey; no financial membership was fabricated or original record changed.
- Local TCP/socket identity agrees: `airbharath_lms`, port 5433, OID `16384`, system identifier `7680462735222304705`; development classification. **32 migrations, 0000–0031**, match source hashes/timestamps. No migration, schema, published settings, financial/access rules or shared theme-token drift.
- **59 focused tests passed. Full `pnpm validate`: 1,391 Vitest tests across 116 files, 43 Node checks, TypeScript and lint passed.** Isolated payment-disabled production build and `git diff --check` passed. The build used dummy unreachable database credentials, no provider credentials, cached original fonts and no `.env`.

Screenshots/debugging evidence remains outside the repository in `/tmp/home-account-browser`; no sessions, credentials or screenshots were committed. Only this task's generated build/test scratch directories were removed. The local app is available at `http://localhost:3000` with mock phone OTP; payment/refund/webhook/reconciliation/email/notice/Live switches are **OFF**. No genuine Razorpay/MSG91/Mailercloud operation, production connection or deployment occurred.

## Changed files and remaining work

- `components/landing/HeroBanner.tsx`
- `components/public/PublicUI.tsx`, `components/public/public.css`, `components/public/AccountMenu.tsx`
- `components/Header.tsx`, `components/Footer.tsx`
- `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`
- `lib/auth-navigation.ts`, `lib/user-session-client.ts`, `app/api/auth/me/route.ts`
- `app/(user)/workspace/apply/page.tsx`, `app/(user)/workspace/apply/actions.ts`
- `components/workspace/EligibilityForm.tsx`
- `tests/routes/account-navigation.test.ts`, `tests/routes/homepage-account-brand.test.ts`, `tests/routes/user-session-client.test.ts`
- `tests/routes/public-landing-f7b.test.ts`, `tests/routes/workspace-eligibility-form.test.ts`
- This report.

No unresolved implementation blocker for this scope. **Founder visual review remains pending.** Stop here; do not proceed to another phase or enable providers/public payments.
