# Phase 2.1 local startup and founder acceptance

Use the existing `feat/creator-workspace` working tree. Do not reset it or treat earlier uncommitted work as disposable. Phase 2.1 is an acceptance candidate, not a public release.

## Persistent founder environment

The existing local database has not been upgraded by this task. The guarded upgrade helper now recognizes migration 0036 and preserves historical financial/learner fingerprints. In your existing founder environment, review the migration and run this yourself when ready:

```bash
DATABASE_ENV=development ALLOW_DATABASE_MIGRATION=true node scripts/workspace-media-local-migrate.cjs
pnpm dev --media
```

The helper accepts only the previously pinned local PostgreSQL identity on port 5433 and refuses another database/environment. It does not make an arbitrary `DATABASE_URL` safe. Keep the existing publication and media configuration from Phase 2.0; the default production publication gate remains disabled. Never substitute production credentials to test this phase. Do not test real charges; use the isolated synthetic checkout below.

Routes:

- Existing catalog: `/courses`.
- Reviews: `/courses/<LMS_COURSE_ID_OR_SLUG>#course-reviews`.
- Admin queue: `/admin/learner-reviews`.
- Creator feedback: `/workspace/reviews`.
- Existing learner classroom: `/dashboard/courses/<LMS_COURSE_ID>`.

Use an already eligible learner with real saved completion. A newly enrolled learner must wait 24 hours; there is no application eligibility bypass. The disposable fixture below prepares appropriately aged synthetic enrollments for immediate acceptance.

## Isolated acceptance with synthetic payments

The following commands create a new PostgreSQL 16 cluster and synthetic database under `/tmp`, run versioned migrations and integration checks, and prepare separate synthetic identities. They do not load `.env`, touch the founder database, contact a real payment provider or provision infrastructure. They require the already-installed Node 22, pnpm 11.15.1, PostgreSQL 16 and Chrome/browser runtime used by the existing project tests. No dependency install is needed.

Stop any earlier Phase 2.1 test server with Ctrl+C before starting another on the same ports. Run from the repository root:

```bash
PHASE21_ISOLATED_VERIFY=true PHASE21_KEEP_FIXTURE=true DATABASE_ENV=test ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true node scripts/phase21-isolated-postgres.cjs

git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase21/files.manifest
node scripts/phase21-safe-source.cjs source
PHASE21_LOCAL_TEST=true node scripts/phase21-local-test.cjs
```

Leave the last command running. It binds only `127.0.0.1:3021` plus a loopback PostgreSQL proxy to its verified private Unix socket. It uses a credential-free copy at `/tmp/airbharath-phase21/source`, never the working tree, for test-only Razorpay and invoice adapters. Shipping application code has no synthetic-payment flag or authentication bypass. Test payment signatures and sessions are generated from a temporary seed and never printed. External browser requests are blocked by the session helper; private media/artwork is deliberately unavailable in this fixture. Invoice delivery is disabled in the browser copy; shipping invoice code is covered by validation and frozen tax evidence is checked in PostgreSQL.

In another terminal, open separate interactive synthetic Learner, Admin and Creator windows:

```bash
PHASE21_OPEN_BROWSER=true node scripts/phase21-open-browser.cjs
```

Append `learner`, `admin`, `creator`, `buyer` or `other` to open only one role. Keep the helper running; Ctrl+C closes its windows. Sessions expire after two hours. `buyer` uses a synthetic account without course access for testing checkout; repeat successful purchases require a fresh disposable fixture. These sessions are confined to the synthetic database and do not bypass application role or ownership checks.

The fixture is ephemeral. Recreating it creates a new database and replaces `/tmp/airbharath-phase21/fixture.json`; stop/restart the test server to select it. Retained temporary clusters can be stopped with PostgreSQL's `pg_ctl -D <the-created-root>/data -m fast stop`; inspect the exact created root first. Do not point this command at an existing founder/production cluster.

## Acceptance steps

1. Open `/courses` on desktop and a phone-sized window. Search by a meaningful topic; select category and difficulty; try all four sorts. Check URL persistence, Next/Previous pagination, reset, a no-results query, keyboard focus and no page-wide horizontal overflow. New courses show “No reviews yet”, not a fabricated score. Published Creator cards show their Creator.
2. In the Learner window, open the prepared course's reviews. Submit 1–5 stars and at least 20 characters. Keep name display off. The review becomes pending and does not affect the public rating. Another student and a Creator cannot submit/edit that learner's review or approve it.
3. In the Admin window, open the queue and review. Enter a reason and publish. Refresh the Learner page: average, count and distribution agree; the public author is “Private learner”. Check the versioned audit snapshot. Self/course-owner moderation is denied even for an Admin.
4. Wait at least 60 seconds between learner writes. Edit text/rating and optionally opt into first-name display. The previous rating leaves the public totals while the edit is pending. Publish again and confirm updated totals. Delete as the author and verify immediate public removal. The audit remains private and retained.
5. Sign in as another synthetic learner. Report a published review with a reason. Repeated reporting by the same account creates one report. Admin can inspect reports and hide feedback with a reason. The Creator can read feedback and use the public reporting path, but has no moderation or rating mutation controls.
6. A new/non-enrolled, preview-only, self-review or insufficiently engaged learner must be ineligible. Expired/revoked/suspended/refunded access cannot create/edit feedback; previously earned criticism is not automatically erased. Deletion still works after access loss. Use the PostgreSQL checks for these state transitions instead of altering your founder data by hand.
7. Open the `buyer` window and purchase the published Creator course. The local test Checkout is synthetic: it calls the real order, verification, recovery and entitlement code against the disposable database, with no financial transfer. Access opens the existing LMS classroom. Mark a lesson complete and confirm saved progress survives refresh.
8. The automated browser test additionally simulates a lost verification response, retries confirmation and reloads the page before recovery. It checks one original order, one entitlement and the original approved-price/tax/Creator evidence. Failed, authorized, refunded or mismatched payment evidence never grants access.
9. Unpublish/suspend through the existing approved publishing controls. Withdrawn courses disappear from catalog/new purchases; existing enrolled access is retained after unpublish. Suspension blocks delivery. Restoring to unpublished does not silently republish the course.

## Repeatable verification

Run the actual Chrome workflows against the running isolated server:

```bash
PHASE21_BROWSER_VERIFY=true node tests/postgres/phase21-browser.cjs
```

The workflow mutates only synthetic fixture data. Start with a freshly prepared fixture for a clean rerun; it deliberately respects cooldowns and uniqueness instead of bypassing them. Artifacts go to `output/audits/workspace-phase21/`.

For validation/build in a fresh credential-free copy:

```bash
git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase21/files.manifest
node scripts/phase21-safe-source.cjs validation
node scripts/phase21-safe-source.cjs build
```

Run `pnpm validate` in `/tmp/airbharath-phase21/validation`. Run `pnpm build` in `/tmp/airbharath-phase21/build` with explicit synthetic build-only database/JWT configuration and no private provider credentials. The build must never use a live database target. The implementation report records the commands actually run and their results.

Founder acceptance is still required. Native browser H.264/AAC compression on a capable device remains **NOT VERIFIED** and is not a Phase 2.1 acceptance claim.
