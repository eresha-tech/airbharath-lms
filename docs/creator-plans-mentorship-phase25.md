# Phase 2.5 — Creator plans and independent mentor pre-registration

Local implementation for founder acceptance. No production deployment, database migration, public activation, live payment, email dispatch or mentorship session was authorized or performed.

## Product paths

| Path | Purpose | Money / access |
| --- | --- | --- |
| `/pricing` | Existing learner course pricing | Existing LMS course checkout only |
| `/workspace/pricing` | Current Creator membership catalogue | Authoritative 3-, 6-, 12-month plans, INR/GST; no price constants duplicated |
| `/workspace/choose-plan?plan=yearly` | Existing-plan intent handoff | No order, reservation or charge; allowlisted HttpOnly one-hour preference |
| `/workspace/apply` → `/workspace/activate` | Existing authenticated eligibility and membership checkout | Existing policies, contact, payment/duplicate-purchase guards |
| `/workspace/member` | Existing paid/granted access and renewal support | Existing members are routed here instead of another purchase |
| `/mentorship` | Independent aviation mentor landing page | Future programme; free pre-registration only |
| `/mentorship/register` | Private adult mentor application/status | Normal account sign-in; no Creator eligibility, membership, payment or bank data |
| `/admin/workspace/mentor-applications` | Authorized screening queue | Does not activate services or change Creator access |

A plan choice is a preference, never authorization, a reserved price or evidence of payment. The current catalogue is read again before the handoff and the existing quote/order path still enforces all eligibility, contact, legal, pricing and duplicate-purchase rules. Invalid/stale/disabled plans cannot start a purchase. Existing grants and historical memberships are unchanged.

**Existing paid renewal is currently unavailable.** This small phase does not invent a new renewal implementation or bypass the existing guard. Membership pages link to plans and renewal support, and existing members cannot use the plan handoff to create another checkout. Coordinate any future paid renewal support separately before promising it commercially.

## Mentor screening and privacy

The application collects name, contact email, optional phone, specialisation, current role, whole years of experience, optional public HTTPS professional-profile URL and a short expertise statement. No documents, bank information, payment, public profile, calendar, booking, meeting, mentor pricing, payouts or mentorship earnings are implemented.

Applicants must use an existing normal AirBharath account. Browser verification uses synthetic signed-in test accounts; no real OTP/SMS is sent. Sign-in supplies account attribution, not proof of professional credentials or ownership of a newly supplied contact email. The application and Admin detail view make that distinction explicit.

Adult/accuracy and specific screening/contact consent are separate required checkboxes. Version `aviation-mentor-preregistration-v1`, both declaration texts, the accepting account and submission time are persisted. This consent excludes general marketing. The canonical Privacy Policy remains linked and unchanged. Review the new notice/contact purpose, retention and withdrawal/correction/deletion procedure with the founder/legal owner before public activation.

One application is stored per account and normalized contact email. Same-body retries return the account's own original receipt; changed payloads cannot overwrite screening history. A conflicting contact on another account returns a generic error and does not reveal that application's identity, status or notes. Requests are serialized per user with a durable 20-attempt/15-minute limit; rate-limit evidence commits even on a limited response. Input, body size, HTTPS URL and same-origin mutation guards apply independently.

The form confirms a successful database submission on screen. **No acknowledgement email is sent or claimed.** Staff may later contact applicants using the consented purpose and separately approved processes. The existing refund/Creator approval mail flows are not repurposed for mentors.

Admin lists paginate 20 and history 25. Filters cover specialisation, review status and name/email prefix. States are Submitted, Under Review, Shortlisted, Not Selected and Contacted. Contacted means staff have actually contacted the applicant; saving that state sends no message. Shortlisted is a screening outcome, not acceptance into an active service.

Each review requires a private note, persisted Admin authorization, optimistic version and replay key. Application identity/consent are immutable to ordinary application operations; status changes require matching append-only decision evidence. Notes are available only in authorized Admin views. Applicant status pages expose no notes or other applicants. New screening routes and mentor login callbacks are excluded from behavioral telemetry; form/detail surfaces opt out of capture.

Retention and lawful deletion require a separately reviewed privileged process; the ordinary application role cannot erase application or decision history. Do not promise a retention duration or erase real records through ad hoc SQL.

## Local setup and acceptance

Use Node 22, declared pnpm 11.15.1, installed dependencies, PostgreSQL 16 and Chrome. Do not load real `.env` files or production/provider credentials. The Phase 2.5 fixture and server use their own guarded paths and **port 3030**. Preserve older phase fixtures/windows.

From the repository root:

```bash
mkdir -p /tmp/airbharath-phase25
git ls-files --cached --others --exclude-standard -z > /tmp/airbharath-phase25/files.manifest
node scripts/phase25-safe-source.cjs browser-source

env -i PATH="$PATH" HOME="$HOME" \
 PHASE25_ISOLATED_VERIFY=true DATABASE_ENV=test \
 ALLOW_DATABASE_MIGRATION=true ALLOW_DESTRUCTIVE_DB_OPERATION=true \
 node scripts/phase25-isolated-postgres.cjs

env -i PATH="$PATH" HOME="$HOME" \
 PHASE25_ISOLATED_VERIFY=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true \
 node tests/postgres/phase25-verification.cjs

env -i PATH="$PATH" HOME="$HOME" PHASE25_LOCAL_TEST=true \
 node scripts/phase25-local-test.cjs
```

The fresh runner refuses to replace a running Phase 2.5 database. Stop only that identity-checked fixture/server before recreating a copy. Keep prior synthetic history while investigating failures. Provider transports are synthetic only in the disposable copy, never shipping modules. Membership payments remain disabled in this public-page acceptance server.

In another terminal, open local signed-in acceptance windows:

```bash
env -i PATH="$PATH" HOME="$HOME" \
 DISPLAY="$DISPLAY" XAUTHORITY="$XAUTHORITY" \
 XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$WAYLAND_DISPLAY" \
 PHASE25_OPEN_BROWSER=true node scripts/phase25-open-browser.cjs
```

Use a normal non-Creator synthetic account for a new mentor form; an account that already submitted sees its receipt/status. Automated browser fixtures are recorded in the audit directory. Do not enter real professional contacts or bank details into these disposable tests.

Founder checks:

1. Compare learner pricing and Creator plans. Confirm the three authoritative totals, durations, availability, GST breakdown and canonical policy/support links.
2. Choose a plan while signed out. Confirm normal login and eligibility are required, selected intent is retained, and an eligible account previews that plan. No payment is made by selecting it.
3. With an active, expired or complimentary member, review the membership/support destination; confirm no duplicate membership checkout or grant conversion occurs.
4. Review the mentorship headline, aviation categories, CTA, future-profile/scheduling/pricing disclosures and no guarantees of acceptance/bookings/earnings.
5. Use a non-Creator account to submit an invalid and a valid application; inspect error focus, preserved draft, consent, receipt and saved status. Retry without another application.
6. As Admin, filter/search, inspect self-declared professional/contact information, add a private note and record each screening status. Confirm no email/profile/service activates.
7. Return as applicant: see current status, no private note, and no other application's information.
8. Check mobile (390px), tablet (820px), desktop and keyboard navigation.

Run `tests/postgres/phase25-browser.cjs` with `PHASE25_BROWSER=true DATABASE_ENV=test ALLOW_DESTRUCTIVE_DB_OPERATION=true` only against the guarded running server. It uses synthetic account sessions and local provider data. Existing OTP/authentication regressions remain in `pnpm validate`; no private SMS provider is exercised.

For repeat validation/build, stop only the Phase 2.5 server first. Refresh the safe manifest above:

```bash
node scripts/phase25-safe-source.cjs validation
(cd /tmp/airbharath-phase25/validation && env -i PATH="$PATH" HOME="$HOME" \
 AWS_EC2_METADATA_DISABLED=true NEXT_TELEMETRY_DISABLED=1 pnpm validate)
node scripts/phase25-safe-source.cjs build-source
env -i PATH="$PATH" HOME="$HOME" PHASE25_BUILD=true node scripts/phase25-build.cjs
```

Do not run Chrome suites and production builds concurrently. The build helper checks the disposable PostgreSQL identity through its Unix socket; production-form compile configuration points to an unavailable local TCP database endpoint, retaining TLS verification and read-only mode. It does not connect to production.

## Required founder/legal decisions before coordinated launch

- Canonical Creator Terms still describe course proposal/final approval and fixed launch language. They conflict with the approved independent self-publishing marketing/implementation. They were **not silently changed**. Approve corrected, versioned legal text and the corresponding acknowledgement treatment separately.
- Historical membership term start and refund policy references are preserved as actual commercial evidence, rather than rewritten to match marketing. Review how those facts should be described in the final canonical documents.
- Final publishing guidelines remain outstanding from prior phases; this task does not invent them.
- Approve mentorship privacy/contact wording, screening ownership/criteria, retention, lawful deletion/correction/withdrawal handling and contact procedures. No response SLA or acceptance guarantee is invented.
- Decide future renewal support before advertising paid renewal as available; current guards remain intact.
- Prior hosting/scheduler, AWS/media, native H.264/AAC, payment/RazorpayX permissions/funding/webhooks, authorized live verification and legal/tax launch gates remain outstanding. This phase does not resolve them through synthetic success.
- Founder local approval, followed only by separately authorized production migration/deployment and the single coordinated launch. No mentorship sessions, booking or public directory should be activated by this phase.

Actual results, screenshots, per-file manifest and preservation proof are in `output/audits/workspace-phase25/REPORT.md` and its JSON/log artifacts.
