# Phase 2.3 — Creator Analytics and Dashboard

Status: founder-approved local implementation and UI/UX. Phase 2.2P remains intact. Public activation is part of the later coordinated Creator Workspace launch; this phase does not deploy or enable live payments.

## What is available

- **Workspace → Overview:** current published/draft course counts, distinct enrolled learners, lifetime verified sales, collected revenue, recorded Creator earnings, weighted published rating, recent aggregate activity and useful next actions. Existing membership status and early-access dates remain visible.
- **Workspace → Analytics:** Overview, Sales, Students & engagement, Course performance. URL filters support 7/30/90 days, this month and validated custom India calendar dates up to 366 days, plus the Creator’s own courses.
- **My Courses → View analytics:** each saved course, including a draft, has a dedicated performance view. Published courses show sales/enrollment trends, current saved progress, published ratings, active moderation concerns and links to course management and shared reviews.
- **Admin → Analytics & Reports → Creator Marketplace:** the same aggregate definitions, with Creator/course selection, Creator rankings and links to existing settlement exceptions. Academy reports remain in the existing Admin application.

The dashboard is a summary. Detailed financial activity stays in Earnings & Payouts. Analytics contains no bank-account, payout-execution or payment-provider workflow.

## Definitions and data limits

The maintained definitions are `metricDefinitions` in `lib/workspace/creator-analytics/model.ts`. They also render in **How these numbers are counted** on Analytics. This is the source to update when a definition changes.

Sales require immutable sale-ledger evidence in the configured collection merchant/mode. A purchase is counted once; refunds/disputes are separate signed ledger activity. Revenue, tax, discounts and attribution come from the original purchase/ledger, rather than a current course price or a mutable instructor relationship. Period earnings include ledger adjustments recorded during that period, which may relate to earlier sales. Dashboard money totals are lifetime; selected reporting dates are separate from monthly payout settlement dates.

Learner totals deduplicate direct and current bundle access. Progress is a current saved-record snapshot. Retired lesson progress is retained, but current completion uses current non-retired, non-preview lessons, including unreleased required lessons. Expired/revoked access remains in enrollment history and does not qualify as active access. Active learners require current access and a saved progress update during the reporting period. A completion mark is not watch time, attention or viewing duration.

The LMS does not reliably persist complimentary enrollment provenance, original bundle composition, first lesson-start timestamps or a full activity-event history. Unknown origins are shown as unknown, not treated as free. Current bundle mappings are used without allocating unsupported bundle revenue to child courses. Missing financial configuration shows Unavailable; missing fee evidence shows Being checked and provisional earnings. Empty periods do not receive invented growth percentages. Published reviews alone contribute to ratings.

## Local founder acceptance

Use only the dedicated synthetic fixture. Do not load a real `.env`, point the scripts at `DATABASE_URL`, or use real bank/payment details. Existing dependencies, Node 22, declared pnpm 11.15.1, PostgreSQL 16 and Chrome are prerequisites. No install or lockfile regeneration is required.

Stop a previous Phase 2.3 review server before recreating its source copy. The original Phase 2.2P testing port is 3024; the separate Phase 2.3 port is **3026**.

From the repository root:

```bash
mkdir -p /tmp/airbharath-phase23
git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase23/files.manifest
node scripts/phase23-safe-source.cjs browser-source
```

Create a fresh disposable cluster using the existing financial foundation and the full migration chain. This refuses to replace a running Phase 2.3 fixture:

```bash
env -i PATH="$PATH" HOME="$HOME" \
  PHASE23_ISOLATED_VERIFY=true DATABASE_ENV=test \
  ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true \
  node scripts/phase23-isolated-postgres.cjs

env -i PATH="$PATH" HOME="$HOME" \
  PHASE23_ISOLATED_VERIFY=true DATABASE_ENV=test \
  ALLOW_DESTRUCTIVE_DB_OPERATION=true WORKSPACE_PUBLICATION_ENABLED=true \
  node tests/postgres/phase23-analytics.cjs
```

In a separate terminal, start the guarded synthetic server:

```bash
env -i PATH="$PATH" HOME="$HOME" PHASE23_LOCAL_TEST=true \
  node scripts/phase23-local-test.cjs
```

From a desktop terminal with an available display, open the synthetic Creator, new Creator and Admin windows after the automated browser checks. The test signs local-only synthetic sessions; no real OTP, credentials or API key is needed:

```bash
env -i PATH="$PATH" HOME="$HOME" \
  DISPLAY="$DISPLAY" XAUTHORITY="$XAUTHORITY" \
  XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$WAYLAND_DISPLAY" \
  PHASE23_BROWSER=true PHASE23_HEADFUL=true \
  PHASE23_ACCEPTANCE_WINDOWS=true \
  node tests/postgres/phase23-browser.cjs
```

For automated headless verification, omit `PHASE23_HEADFUL` and `PHASE23_ACCEPTANCE_WINDOWS`. The browser tests temporarily change only the disposable source copy to exercise expiry, missing configuration and the error boundary, then restore it. Screenshots hide Next.js development overlays; application error states are still asserted and captured.

Review these journeys personally:

1. **New Creator:** zero counts, no false completion/rating/growth, create-course guidance, no assumption that payout setup is needed to publish.
2. **Established Creator:** compare dashboard lifetime totals with period-specific Sales. Distinguish gross collected, recorded earnings, refunds/disputes and payout balances. Follow the existing Earnings & Payouts link.
3. **Course comparison:** change range, custom dates and course; reload/share the URL. Open all course rankings and pagination. Open a draft’s Analytics from My Courses and confirm the course-management link works for a draft.
4. **Learning:** inspect Started, Active and Completed definitions. Check lesson completion and current-curriculum distribution. No video-watch or learner-intent claim should appear. Recommendations require actual sample evidence.
5. **Feedback:** course ratings reflect published feedback. Creator reviews open Learner feedback; Admin reviews open Learner review moderation. Resolved moderation cases do not appear as active warnings.
6. **Partial/unavailable:** fee evidence is provisional, configuration failure is Unavailable, invalid dates have a reset action, and data errors offer retry without fake totals.
7. **Access and privacy:** expired membership retains permitted analytics; a different Creator cannot load another course’s analytics. Screens contain aggregate activity, not student contact details or raw financial records.
8. **Mobile/keyboard:** use the mobile menu, readable chart scale/date labels, scrollable data tables, native Enter/Space disclosure controls and URL-backed filters.
9. **Admin:** open Creator Marketplace within existing Analytics, filter a Creator/course, inspect aggregate results and navigate to the existing finance exceptions queue.

Press Ctrl+C in the acceptance terminal to close its synthetic windows, then in the server terminal to stop that dedicated server. The isolated database is retained for inspection; stop only its identity-checked PostgreSQL fixture when finished. Never use a generic production database command or reset.

## Verification and migration

The detailed run report, actual screenshots, JSON checks and preservation manifest are in `output/audits/workspace-phase23/REPORT.md`. Financial and learner evidence was compared against independent PostgreSQL queries. The new additive migration is **0040_creator_analytics_paid_origin**: one partial index for recorded paid-order provenance, justified by an isolated query plan with 10,000 unrelated pending orders. Historical SQL/snapshots through 0039 are unchanged. The exact-source preflight pins include the new 41-entry chain; strict drift detection and production opt-in remain enforced.

No production migration or preflight was run. This phase does not verify or change live RazorpayX activation, funding, bank credit, delivery of public webhooks or the production scheduler. Those Phase 2.2P external requirements still apply.

The founder approved Phase 2.3 local functionality and UI/UX before Phase 2.4. No Phase 2.4, storage billing, deployment, push or merge is included.

## Graph refinement for founder review

Graphs use the repository's ledger and enrollment queries; they do not generate sample sales, growth or learner activity. The separate localhost acceptance server is deliberately backed by synthetic records, so the numbers in those testing windows are test data. No production data was accessed to verify this phase.

The refined daily graphs share the same implementation across Creator and Admin analytics. They add labelled rupee/count scales, a clear zero baseline, distinct solid/dashed series, subtle revenue shading and a selected-day readout. Hover or tap the plot, or use the labelled day slider with Home, End and arrow keys, to inspect exact daily amounts. The expandable daily table remains available. Enrollment axes use whole counts, single-day results use visible points, negative earnings stay below zero, and empty/unconfigured periods retain their existing honest states. Axes may abbreviate large amounts; the selected-day readout and table retain exact currency amounts. No smoothing, forecast or sample growth is introduced.

Founder check: refresh Analytics in the existing localhost windows, inspect Sales and Students & engagement, move the day selector, compare with Read daily values, then try a phone-sized window and dark mode. Current-day data can be incomplete. Graph dates describe reporting activity, not settlement dates.
