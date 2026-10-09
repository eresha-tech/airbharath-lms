# Local synthetic Workspace member — 9 October 2026

User approved a separate fulfilled synthetic test account for full creator-flow testing while keeping their held payment unchanged.

## Fixture and safety

Created one clearly labeled `SYNTHETIC WS16V_…_DEMO_MEMBER` account through the existing opt-in fixture strategy on the authorized localhost:5433/airbharath_lms database. Database identity matched system identifier 7680462735222304705. Actual eligibility, membership quote, financial acceptance/reconciliation and activation services were used with an in-process synthetic provider; external HTTP/provider calls were blocked. Synthetic capture evidence is explicitly `test_authoritative`, not genuine Razorpay evidence.

The persisted user remains a student; the enabled creator profile and fulfilled quarterly membership grant early-access Workspace capabilities via the existing resolver. No production entitlement or LMS enrollment was created. Original user and order fingerprints, membership count and creator-profile count were unchanged. The original captured order remains held for `capture_time_unverified`; it was not activated or assigned an invented paidAt.

Synthetic user ID: `6effa646-d229-449b-82b5-057e57a23b14`.

Synthetic membership ID: `8a983cc7-c945-44a6-a6e9-15a31390ad39`.

## Test access

Temporary loopback-only sign-in page: http://localhost:4005/. Clicking Open test Workspace establishes a 30-minute HttpOnly, SameSite=Lax localhost session for the synthetic member, then redirects to http://localhost:3000/workspace/dashboard. This replaces the browser's localhost session; sign out and use normal login to return to the original account.

The helper resides only in `/tmp/workspace-demo-login.cjs`, binds 127.0.0.1, checks Host and same-origin POST, and expires automatically 30 minutes after startup. No token or signing key is printed or committed. There is no permanent product login endpoint, OTP bypass, SMS/provider request, or production authentication change. The existing app still checks persisted ownership/roles and membership.

The normal local app had restarted without DATABASE_ENV classification and correctly denied creator capability. It was restarted with process-only DATABASE_ENV=development. No environment file, payment flag, migration authorization, trigger, constraint or role guard was edited. A future ordinary restart must retain the development classification to view this development fixture.

## Verification

Actual authenticated HTTP 200 verified dashboard (Early Access Active), creator profile, owned course list and new draft page. Temporary sign-in landing page, same-origin POST rejection (403), redirect (303), HttpOnly/SameSite/30-minute cookie attributes passed. No additional course/draft/profile-content writes were made by smoke testing.

No product source changed, so full validation/build were not rerun for this fixture-only action. git diff --check passed. No reset, seed, migration, ledger change, provider payment, genuine webhook resolution, deployment or Phase 1.7 implementation occurred. Immutable synthetic history is retained.

This report is the only repository change. Local fixture evidence is in `/tmp/workspace-demo-fixture.json`; temporary execution helpers are not committed.
