# AirBharath Workspace — Phase 1 Implementation

Implemented inside the existing Next.js 15 LMS. This is a creator application and review system, not the Workspace course creation product. The prior `LMS_CURRENT_STATE_AUDIT.md` was preserved unchanged.

## A. What Was Built

- Public launch page with all requested product sections, future-capability labels, creator selection, commercial expectations and application CTA.
- Responsive four-step application form with shared field validation, conditional questions, required consents, keyboard focus management, request locking, retained answers during step navigation and failed submissions, and a submission confirmation.
- Isolated PostgreSQL application storage, UUID internal keys, friendly unique references and duplicate/retry handling.
- Authorized admin list, filters, paginated results, complete application details, qualitative review and status updates.
- Existing Mailercloud receipt integration and privacy-limited PostHog events.

### Design tools and skills

Mobbin MCP section and flow searches were attempted. The connected account returned **“Mobbin MCP requires a paid plan”**; no Mobbin references were retrieved or used. The frontend-design skill guided the aviation route-line illustration, numbered journey, launch hierarchy and form layout. The web-design-guidelines skill informed accessibility review; next-best-practices informed route and component review. Codex browser tools were used to check the page and application flow.

The implementation retains AirBharath's existing lavender palette, Outfit headings, existing Jakarta font, light/dark tokens, header/footer and UI primitives. The hero illustration is code-native SVG and HTML, explicitly labeled as a planned experience. No UI dependency or external image asset was installed.

## B. Routes Added

| Route | Purpose |
| --- | --- |
| `/workspace` | Public landing page, application and confirmation |
| `POST /api/workspace/applications` | Validated application creation and matching retry receipt |
| `/admin/workspace-applications` | Admin filtering and paginated application list |
| `/admin/workspace-applications/[id]` | Admin application detail and internal review |
| `GET /api/admin/workspace-applications` | Authorized filtered application summaries |
| `GET /api/admin/workspace-applications/[id]` | Authorized complete application detail |
| `PATCH /api/admin/workspace-applications/[id]` | Authorized review/status update |

The public API does not implement GET, public list/detail access or public status updates. References are receipts, not credentials to read an application.

## C. Database Changes

Added `workspace_applications` (43 columns) and PostgreSQL enum `workspace_application_status`. There is no applicant user foreign key. Only `reviewed_by` references an existing LMS admin/user for attribution, with `ON DELETE SET NULL`.

Migration generated with `pnpm db:generate`:

- `drizzle/0007_lucky_wild_pack.sql`
- `drizzle/meta/0007_snapshot.json`
- Updated `drizzle/meta/_journal.json`

The SQL creates only the new enum/table, its review attribution foreign key, unique constraints and two indexes (status/submission time and email). No existing table or data is rewritten.

**Migration was not executed.** After the target has been explicitly reviewed and authorized, use the existing guarded workflow with the appropriate environment and an already-provided `DATABASE_URL`:

```bash
# Example for an explicitly authorized development target only:
DATABASE_ENV=development ALLOW_DATABASE_MIGRATION=true pnpm db:migrate
```

Production migration still requires explicit human authorization. Do not bypass the guard with schema push or seed commands. The feature requires this migration before accepting real applications.

## D. Application Fields

| Group | Fields |
| --- | --- |
| Identity | `id`, `applicationReference`, internal `submissionKey`, internal `payloadHash` |
| Applicant | `fullName`, `email`, `mobile`, `city`, `country`, `aviationBackground`, `currentRole`, `organisation`, `yearsExperience`, `professionalProfileUrl` |
| Course | `proposedCourseTopic`, `courseDescription`, `targetLearner`, `learnerOutcome` |
| Readiness | `courseReadiness`, `teachingExperienceType`, `teachingExperienceDescription`, `sampleContentUrl` |
| Audience/intent | `audienceStatus`, `audienceChannels`, `audienceSize`, `joiningReason`, `additionalInformation` |
| Status/time | `applicationStatus`, `submittedAt`, `updatedAt` |
| Consent | `consentAccuracy`, `consentContact`, `consentAccuracyAt`, `consentContactAt`, `consentVersion` |
| Internal review | `reviewAssessments`, `internalNotes`, `decisionReason`, `potentialDuplicate`, `reviewedAt`, `reviewedBy`, `statusChangedAt` |
| Receipt | `receiptSentAt` |

The ten requested qualitative assessment fields are controlled keys in one typed JSONB `reviewAssessments` object rather than ten extra columns or a review table. The API validates both key names and values. This keeps one application/one current review without inventing an audit architecture. Missing assessments display “Not Reviewed” or “Unknown”.

“Other Aviation Professional” is supported as a category; the required role and course description supply further context rather than adding an unspecified mandatory question.

## E. Admin Workflow

Workspace Applications is in the existing admin sidebar (and mobile admin navigation through its shared navigation groups).

Admins can search by name, email, topic or application reference, and filter by status, aviation background, course readiness, experience and audience status. Lists fetch 25 summaries plus one look-ahead row to determine whether another page exists. Stable submission date/ID ordering and server-side filters avoid downloading the entire table. Filters are kept in memory; applicant search terms are not copied into URLs captured by the existing global analytics pageview tracker.

Details are grouped into Applicant, Course Idea, Creator Readiness, Audience, Intent, Consent & Receipt and Internal Review. External professional/sample links open in a new tab with `noopener noreferrer`; no scraping occurs. Applicant text is rendered as React text, not HTML.

The reviewer chooses assessments, status, optional decision reason and notes. Saves require the previously read `updatedAt`; an atomic conditional update returns 409 if another reviewer has changed the record. Conflicting edits remain visible until the reviewer explicitly discards them and reloads. `updatedAt`, `reviewedAt`, `reviewedBy` and (when the status changes) `statusChangedAt` are assigned by the server.

Approval and invitation statuses record a human decision only. Communication about approval, interview, waitlist, decline or activation is handled manually in this phase.

## F. Application Statuses

`submitted`, `under_review`, `more_information_required`, `interview`, `approved`, `waitlisted`, `declined`, `invited_to_activate`.

The public endpoint always creates `submitted`. Existing admins may set any supported state; there is no automatic scoring or provisioning transition. `activated` is intentionally excluded because account/membership activation is outside Phase 1.

## G. Analytics Events

- `workspace_page_view`
- `workspace_apply_clicked`
- `workspace_application_started`
- `workspace_step_1_completed`
- `workspace_step_2_completed`
- `workspace_step_3_completed`
- `workspace_step_4_completed`
- `workspace_application_submitted`

The new wrapper permits only validated enum values for `aviationBackground`, `courseReadiness`, `audienceStatus`, `audienceSize`, plus `stepNumber`. It never forwards names, emails, mobile numbers, URLs, applicant free text, internal notes, application references or submission keys. This explicit allowlist is necessary because the existing global sanitizer does not strip all PII.

Step-completion events occur once per step per mounted form. Submission is tracked after a successful API receipt, not at button click. Client-side events are best effort; browser blocking/closure may lose events. `ph-no-capture` covers the Workspace page and admin interfaces; the form/detail also carry `ph-sensitive` to prevent incidental field content capture. Existing global signed-in identity tracking remains unchanged and outside this feature's event payloads.

## H. Email/Communication Behavior

The existing `sendMailercloudEmail` helper sends a receipt after persistence, using Next.js `after` so email is not a prerequisite for a successful application response. The email includes the applicant's name, reference, Submitted status, no guarantee of acceptance, and the expectation that selected creators will be contacted. Applicant HTML is escaped. No API key means delivery is skipped; successful delivery records `receiptSentAt`.

An idempotent retry does not send another receipt. Email failure does not delete or fail the application. Delivery is best effort without a durable outbox/retry queue; admins can distinguish a recorded send from “Not yet recorded”. Provider acknowledgement does not guarantee inbox delivery. No status emails or external marketing automation were added. Existing LMS email behavior was not changed.

## I. Security & Validation

- Shared client/server rules: trims, bounded text lengths, email/mobile checks, HTTP(S) URL validation without embedded credentials, enum and array validation, and both required consents.
- International country text and 7–15 digit mobile numbers are supported; storage removes phone formatting. Email is lowercased for contact matching. Course answers retain entered wording and newlines after trimming/removing non-printing control characters.
- Audience channels and size are required when audience status is Yes. Conditional audience/teaching details are cleared server-side when no longer applicable.
- Public payloads reject unknown fields; status, review, account fields and admin identity cannot be mass-assigned.
- JSON requests are streamed with a 32 KB body limit. Browser writes must match the browser-facing request host and protocol, including Next's internal-host reconstruction case.
- Admin APIs check `getAuthorizedAdminSession` on every handler, revalidating the persisted role rather than trusting a stale admin JWT. Pages remain inside the existing authorized admin layout.
- Database failures return generic errors; no applicant text or raw SQL exceptions are logged by the new endpoints. Responses are `Cache-Control: no-store`.
- Internal submission UUIDs/payload hashes are omitted even from the admin detail response. Public responses expose only the new application's reference and Submitted receipt status.
- No code path creates users, courses, memberships, permissions, payments or creator roles.

### Duplicate/retry decision

A cryptographically random browser submission UUID, protected by a database unique constraint, makes simultaneous/repeated identical POSTs idempotent. A matching complete normalized payload hash plus the same unguessable UUID can recover the receipt; the public endpoint does not look up and disclose references by email/mobile alone. A reused UUID with different answers returns a friendly conflict and lets the applicant start a fresh submission without clearing answers.

Different submission UUIDs are allowed. When the exact normalized email/mobile pair already exists, the new application is marked internally as a potential duplicate. This does not inspect or reject LMS student identities. Duplicate marking is advisory and may miss concurrent separate-key requests; the database constraint still prevents same-key duplicates.

Only the random submission UUID is stored in sessionStorage (with a memory fallback). Application answers remain in React memory. No PII draft is stored in browser storage. Refresh/close prompts warn about unsaved answers; answers are not restored after a full page reload.

## J. Tests Added

Four new Vitest test suites and a fixture module cover:

- Public valid creation, submitted status, timestamps, exact public response, required fields/enums/URLs/consents, privileged-field rejection, duplicate marking, matching and mismatching retry behavior, safe errors, receipt failure independence, JSON/body limits and same-origin checks (including internal host reconstruction).
- Anonymous/student/demoted-admin denial, persisted-role failure, admin filters/pagination/projection, authorized detail access, controlled review save and reviewer attribution, status timestamps, concurrent-write conflicts, invalid/account fields, cross-origin rejection, missing records and generic database errors.
- Shared step/full validation, conditional cleanup, controlled assessment values, reference format/uniqueness and unique-column metadata, payload hashing, safe URLs, and analytics property allowlisting.
- Unconfigured email skip, HTML escaping, and receipt expectations.

Existing tests were retained. The admin route policy's expected route-file count changed from 20 to 22, preserving its authorization check over every admin handler.

### Verification

- `pnpm db:generate`: passed; generated only the new application migration.
- `pnpm validate`: passed — five pure test files, ten Vitest files / **112 tests**, TypeScript and lint. The route/helper suites contain 60 additional tests relative to the prior 52-test baseline.
- `git diff --check`: passed. Generated snapshot comparison confirmed all 20 prior table definitions were unchanged; only `workspace_applications` and its status enum were added.
- Browser: public anonymous page rendered; CTA scrolled to the form; invalid step focused the first field; all four steps were exercised with synthetic values; Previous/Next preserved answers; conditional teaching/audience fields appeared; submitting against the deliberately unreachable local database produced the retry error and retained answers. Both light and dark renderings were visually inspected. Actual CSS viewport widths of 390, 768, 1108 and 1872 px showed no horizontal page overflow; the 390/768 px checks were repeated against the production build. Temporary screenshot artifacts are `/tmp/airbharath-workspace-desktop.jpg` and `/tmp/airbharath-workspace-mobile.jpg`.
- `pnpm build --debug` with private-service configuration disabled: passed (exit 0). Two attempts inside the restricted sandbox stopped at webpack compilation; the same build succeeded outside it. The debug output logged existing `/dashboard` dynamic cookie usage, then completed static generation, optimization and traces successfully. `/workspace` was prerendered; admin and API routes remained dynamic.

Local browser/build processes override dotenv declarations and service credentials; database requests use an unreachable localhost test URL. No real database, migration, AWS, Redis, payment, OTP, Mailercloud or PostHog service was contacted during verification. Public Mobbin searches were attempted as requested. Route tests mock storage/authorization/provider calls; they do not establish real PostgreSQL or provider integration behavior. Admin persistence was verified by mocked route tests rather than a browser session with live admin credentials.

## K. Files Changed

### Created

- `app/(user)/workspace/page.tsx`
- `app/(user)/workspace/workspace.css`
- `app/(admin)/admin/workspace-applications/page.tsx`
- `app/(admin)/admin/workspace-applications/[id]/page.tsx`
- `app/api/workspace/applications/route.ts`
- `app/api/admin/workspace-applications/route.ts`
- `app/api/admin/workspace-applications/[id]/route.ts`
- `components/workspace/WorkspaceLanding.tsx`
- `components/workspace/ApplicationForm.tsx`
- `components/workspace/WorkspaceApplicationsList.tsx`
- `components/workspace/WorkspaceApplicationDetail.tsx`
- `lib/workspace/options.ts`
- `lib/workspace/validation.ts`
- `lib/workspace/http.ts`
- `lib/workspace/reference.ts`
- `lib/workspace/receipt.ts`
- `lib/workspace/analytics.ts`
- `lib/workspace/types.ts`
- `drizzle/0007_lucky_wild_pack.sql`
- `drizzle/meta/0007_snapshot.json`
- `tests/routes/workspace-fixtures.ts`
- `tests/routes/workspace-public.test.ts`
- `tests/routes/workspace-admin.test.ts`
- `tests/routes/workspace-validation.test.ts`
- `tests/routes/workspace-receipt.test.ts`
- `WORKSPACE_PHASE1_IMPLEMENTATION.md`

### Modified

- `lib/db/schema.ts`: isolated application table and status enum.
- `drizzle/meta/_journal.json`: migration registration.
- `middleware.ts`: exact public `/workspace` allowlist entry; existing auth behavior unchanged.
- `components/admin/AdminSidebar.tsx`: Workspace Applications navigation.
- `components/Header.tsx`: Workspace link on wide desktop and mobile navigation.
- `components/Footer.tsx`: Workspace link.
- `tests/admin-route-authorization-policy.test.mjs`: new route inventory count.

No dependency, lockfile, user role, course author, auth service or production configuration changes.

## L. Known Limitations

- Migration must be reviewed/applied to the explicitly authorized target before real persistence works. No database integration test or live email delivery was performed.
- Mobbin reference retrieval requires a paid plan; design did not use unavailable references.
- Receipt delivery has no durable retry queue; status communications remain manual.
- Applicants cannot log in or retrieve stored applications/status by reference. The confirmation is an in-page receipt.
- Answers persist across steps/errors, not full page reloads. Internal admin filters do not survive navigation/reload.
- Duplicate marking is advisory; contact details are not verified. There is no new CAPTCHA or distributed submission-rate limiter; the body limit and idempotency constraint do not prevent deliberate repeated submissions with new keys.
- Assessment value constraints are enforced by the admin API; direct database writes must use the same controlled values. There is a current review, not a full review-history ledger.
- Existing shared email helper has its own provider logging/timeout behavior; it was reused without refactoring unrelated LMS integrations.

## M. Future Workspace Architecture Explicitly NOT Implemented

No creator/instructor role, creator authentication, conversion of LMS students, account activation, creator permissions, `/workspace/dashboard`, course ownership, course builder, course publication/review state architecture, creator learner/revenue dashboards, payouts, wallets, billing, memberships, commission/settlement calculations, quotas, creator certificates, marketplace ranking or AI functionality.

Future course ownership, scoped access, paid activation, course-specific review, pricing/commission policy, sales attribution and settlement must be designed separately. Approval of an application grants none of these capabilities. Phase 2 was not started.
