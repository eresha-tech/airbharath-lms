# AirBharath original theme and static hero

Branch: `codex/workspace-1.8-launch`. Starting HEAD: `f29e31b`. Date: 15 October 2026.

## Approved colors and typography

The owner's supplied HSL definitions supersede the earlier historical teal/cyan selection. Restored all **36 light and 35 dark tokens**, plus their `color-scheme` declarations, exactly. The complete approved map is retained in `tests/fixtures/airbharath-brand-theme.json`; source regressions and rendered browser checks compare it directly.

| Token | Light | Dark |
| --- | --- | --- |
| primary / ring / sidebar-primary / chart-1 | `243.6 100% 76.9%` | `243.6 100% 76.9%` |
| primary-foreground | `244.4 47.2% 17.1%` | `244.4 47.2% 17.1%` |
| accent-light / chart-2 | `244.9 100% 90.4%` | `244.9 100% 90.4%` |
| background | `0 0% 100%` | `0 0% 3.9%` |
| foreground | `222.2 84% 4.9%` | `213.3 42.9% 95.1%` |
| card / popover | `0 0% 100%` | `0 0% 7.5%` |
| secondary | `240 25% 98%` | `0 0% 9.8%` |
| muted | `240 25% 96%` | `0 0% 9.8%` |
| muted-foreground | `215.4 16.3% 46.9%` | `217.2 16.2% 60.2%` |
| border / input | `240 5.9% 90%` | `0 0% 16.5%` |
| success | `146.8 69.4% 55.1%` | `146.8 69.4% 55.1%` |
| destructive | `0 84.2% 60.2%` | `0 62.8% 30.6%` |

Remaining sidebar, chart, foreground, accent and radius values also match the supplied map, including original rounding. No alternative HSL palette was introduced.

Removed independent Workspace UI, Creator and Admin token overrides. Public closing-section teal and the application-success icon's unrelated purple were replaced with shared semantic tokens. Tailwind brand aliases now reference those same tokens. Login's presentation-only panel/gradient and the Admin export control use the approved surfaces/text instead of slate overrides.

For readable text, `--brand-ink` references the approved primary foreground in light mode and approved primary in dark mode. Tailwind primary **text** and public links use this alias; primary backgrounds, borders, focus-ring tokens and charts remain the exact supplied lavender. This avoids lavender-on-white's approximately 2.91:1 text contrast without inventing a darker purple. Sampled rendered primary actions achieve **5.81:1** text contrast in both themes. Public keyboard focus uses the approved contrasting ink. These are focused checks, not an accessibility certification.

Inter/Outfit/Plus Jakarta Sans configuration and packages are unchanged. Removed recursive font-variable declarations; compatibility aliases resolve on the body where Next supplies its variables. Computed body/heading fonts resolve to Inter/Outfit. Preserved glass styling with translucent lavender borders, scrollbars, subtle motion timings, reduced motion, KaTeX/Markdown and video-caption rules. Removed the unused former hero progress animation only. Original images/logos remain unchanged.

## Static hero and preserved corrections

Before: catalog carousel, six-second rotation, arrows, play/pause and indicators. After: server-rendered fixed published bundle selection with the original Masterclass artwork and pre-carousel `465ceff` figure/grid composition. Original sizing, positioning and typography retained; image, title and course CTA resolve to the selected record's actual encoded course URL. No invented slug, client timer, carousel component, listeners or controls remain. If no published bundle is available, the honest catalog fallback remains.

Browser checks waited **6.8 seconds**, confirmed unchanged Masterclass artwork/destination and no carousel controls, and followed its working course link. Main Explore Courses and Become a Creator destinations remain intact. No hero price was added. Existing **~~₹3,300~~ ₹1,900**, explicitly conditional on the eligible ₹1,400 coupon, remains in the catalog/detail presentation. Coupon/checkout calculations are untouched.

Preserved mobile Login/My Account, two-section mobile footer and every existing link, wide desktop navigation, improved thumbnail visibility, AirBharath naming, one-click persistent light/dark toggle, system default, and contact-email validation. No toggle dropdown/modal was restored.

## Verification

- **39 focused tests passed**: approved-token/font regressions, static hero/catalog and shared Workspace UI.
- Hydrated installed Chrome checked exact computed tokens in **both themes across 11 destinations**: homepage, pricing, AI course detail, login, public Workspace, learner Dashboard, Creator Dashboard, activation, approved private builder, Admin Dashboard and `/admin/workspace/course-drafts`.
- Public responsive checks passed at **1440, 1024, 768, 390 and 320px**, both themes, with visible account/navigation and no document overflow. Login/Admin/list also passed these widths; authenticated account and Creator shell passed at 320px. Sidebar/surface/action values were sampled from rendered elements. Desktop/mobile screenshots were visually inspected without committing a screenshot collection.
- System default, one-click preference persistence, absence of a theme dialog, and mobile drawer Escape close passed. Static Masterclass navigation retained the qualified offer. Final keyboard-focus/login-panel check passed: 2px solid approved-ink focus outline; the login panel and its gradient resolve to the approved primary foreground. No browser page errors in the completed main run.
- Full `pnpm validate` **passed once**: **1,319 Vitest tests across 109 files**, **42 pure Node checks**, TypeScript and lint (no warnings/errors).
- One isolated payment-disabled production build **passed** (exit 0; compilation, lint/types, prerender and route output completed). No `.env` copy, usable provider credentials or real database target; original cached font families used.
- Migration no drift: local ledger **31 entries, 0000–0030**, every migration hash matches the source journal/files. Source migration/schema diff is empty. No migration generation or execution.
- Authorized local identity verified: `localhost:5433/airbharath_lms`, OID `16384`, system identifier `7680462735222304705`, development. Inspection connection enforced read-only. Existing tagged synthetic identities and temporary in-memory sessions exercised persisted roles and normal access resolvers; no new users, approvals, payments, memberships or grants were created. Browser write/provider requests were blocked. Before/after fingerprints for all **61 public tables** match.
- `git diff --check`: passed. Financial, webhook, entitlement, enrollment, authentication and email-verification implementations are unchanged. Login edits affect CSS classes only.

## Changed files

- `AIRBHARATH_FINAL_BRAND_THEME_AND_HERO_FIX.md`
- `app/(auth)/login/page.tsx`
- `app/(user)/page.tsx`
- `app/(user)/workspace/workspace.css`
- `app/globals.css`
- `components/admin/AdminDashboardClient.tsx`
- `components/admin/workspace-admin.css`
- `components/landing/FeaturedCourseCarousel.tsx`
- `components/landing/HeroBanner.tsx`
- `components/public/public.css`
- `components/workspace/ApplicationForm.tsx`
- `components/workspace/creator/creator.css`
- `components/workspace/ui/workspace-ui.css`
- `tailwind.config.ts`
- `tests/fixtures/airbharath-brand-theme.json`
- `tests/routes/airbharath-brand-theme.test.ts`
- `tests/routes/public-landing-f7b.test.ts`

## Completion and unrelated blockers

Final commit: the scoped commit containing this report (`git log -1 --format=%h -- AIRBHARATH_FINAL_BRAND_THEME_AND_HERO_FIX.md`); its resolved hash and post-commit clean-worktree result are returned in the completion message.

Phone-only Creator onboarding remains deferred behind migration 0027's email-proof order prerequisite. Genuine Razorpay Test refund and signed refund-webhook verification remain mandatory separate launch work. Public Workspace payments remain disabled; no provider calls, production access, deployment, schema changes, worker changes or historical mutations occurred.

Verdict: **AIRBHARATH ORIGINAL THEME & STATIC HERO VERIFIED**.
