# Workspace pre-registration release inventory

Recorded 10 October 2026. This task freezes development and inventories a release slice. It does not implement or polish the release. No deployment, database access, migration execution, provider request, dependency installation, or environment change occurred.

## A. Current Git State

At inspection, `feat/workspace-registration` pointed to `f47b69520bf1592eb6aa895c7cd766912bccf1fd`. Nothing was staged. The only working changes were the known partial Phase 1.9 work: modified `lib/db/schema.ts` and five untracked `lib/workspace/media/*.ts` files. No commits existed after the verified Phase 1.8V completion on this development branch.

After the WIP checkpoint, the checkout returned to `feat/workspace-registration` at the same verified head, with a clean working tree before this report. This report is committed separately on that development line; its own commit becomes the current HEAD without changing application code. The branch currently tracks `origin/feat/whatsapp-integration`, not the similarly named remote Workspace branch. Do not push based on that upstream configuration without a separate decision.

Local refs observed:

| Ref | Commit | Meaning established by local evidence |
| --- | --- | --- |
| `main`, `origin/main` | `81623e2227d04bc4b5e69825d74b2bdfe6d834ad` | Matching local/default-name candidates; production mapping unconfirmed |
| `feat/workspace-registration` before report | `f47b695` | Verified full Workspace development through Phase 1.8V |
| `origin/feat/workspace-registration` | `da1a9df` | Retained remote-tracking snapshot through payment E2E reporting |
| `origin/feat/whatsapp-integration` | `1c2fced` | Current development branch's upstream snapshot through Phase 1.6V |
| `codex/workspace-phase19-wip` | `a9ea151` | Frozen partial Phase 1.9 checkpoint |

Refs were inspected locally; none were fetched. `origin/HEAD` is absent. Remote-tracking snapshots are not proof of current remote or deployed state.

## B. Phase 1.9 Frozen State

Preserved on `codex/workspace-phase19-wip`, commit `a9ea151`, with the exact message **WIP: Phase 1.9 frozen before preregistration release**.

Every preserved changed file:

- `lib/db/schema.ts`: proposed private media asset table and ownership indexes.
- `lib/workspace/media/model.ts`: partial asset contracts and validation.
- `lib/workspace/media/service.ts`: partial intent, finalization and access service.
- `lib/workspace/media/repository.ts`: partial ownership/locking persistence adapter.
- `lib/workspace/media/provider.ts`: partial private S3 adapter.
- `lib/workspace/media/runtime.ts`: partial runtime configuration wiring.

Checkpoint: six files, 251 insertions and one deletion. No Phase 1.9 migration, HTTP routes, UI, tests or completed verification exists. These files are incomplete and unvalidated; this checkpoint is not a readiness claim. No corrections were made to them during the freeze. Commit hooks were bypassed for preservation so they could not format, fix or otherwise alter frozen code.

## C. Verified Full Workspace Development Head

Verified completion remains `f47b695`; correction `51e9c86` and verification harness `8f569a7` remain ancestors. `WORKSPACE_PHASE18V_VERIFICATION.md` records that earlier verification, not a newly repeated verification in this task.

The WIP branch descends from that completion. No history was reset, squashed, deleted or rewritten. Development migrations 0007–0017 and all verification reports remain intact. No synthetic database history was accessed or changed.

## D. Current Production Baseline

**UNCONFIRMED — release branch creation is blocked.**

Local `main` and `origin/main` agree at `81623e2`. It is also the merge base of `main` and verified Workspace head `f47b695`. Its history includes merged LMS feature work. However:

- `README.md` describes validation-only CI on `main`.
- `.github/workflows/validation.yml` runs tests, type checking and lint for pull requests and pushes to `main`; it does not deploy.
- No tracked deployment configuration or documentation inspected establishes the deployed production branch/commit.
- There is no local `origin/HEAD` mapping, and even a default branch would not prove a production deployment.

Therefore `main@81623e2` is only a candidate, not an identified production baseline. No production service or deployment dashboard was contacted. The actual production migration ledger is also unknown.

## E. Existing Pre-registration Features

Historical implementation source: `04cedfd` (`feat(workspace): add applications, approval emails and analytics`). Its preceding foundation commit is `fe8a296`; both are after candidate `main`.

Public application functionality still exists:

- Four-step form covering contact/background, course idea, teaching readiness, audience and declarations.
- Shared client/server validation, field limits, enum validation, URL/contact validation, unexpected-field rejection, mandatory accuracy/contact consent and versioned consent timestamps.
- `POST /api/workspace/applications`: streamed 32 KB JSON limit, origin check, normalization, duplicate hint, durable application reference, submission-key/payload-hash idempotency, conflict handling, non-cached responses and safe failure messages.
- In-memory answers retained after errors; only the opaque submission key is stored in session storage. No application answers are deliberately persisted in browser storage.
- Receipt confirmation and best-effort receipt email after persistence; provider/analytics failure does not undo a saved application.

Admin functionality:

- Paginated list, bounded search, enum filters, detail, assessments, notes, decision reason, status, reviewer/time attribution and stale-write protection.
- Persisted database admin-role checks on API requests and the current admin layout.
- Approved-application email preview, escaped template and personal note, stale-preview hash/version checking, atomic send claim, deliberate send/retry/resend confirmation and recorded delivery result/admin attribution.

Important boundaries: the current `/workspace` CTA leads to `/workspace/apply`, which is now authenticated automated eligibility. The manual form is at `/workspace/manual-application`. Historical `04cedfd` landing embeds `ApplicationForm` directly at `#apply`; that is the relevant pre-registration entry pattern. Current entry routes cannot be copied wholesale.

Application review/status and communication attribution are mutable row fields, not an append-only application history table. They record latest state/timestamps; do not advertise a complete immutable review or email-attempt history. Later `workspace_audit_events` belongs to automated eligibility and is not a prerequisite for this flow.

## F. Pre-registration File Dependencies

Paths below are repository-relative. REQUIRED means necessary for the proposed public submission plus private admin management slice. OPTIONAL-POLISH features can be omitted only by deliberately removing their imports/calls and matching schema dependencies. EXCLUDE code stays on the development/WIP branches.

| Classification | Files | Dependency / port instruction |
| --- | --- | --- |
| REQUIRED | `app/(user)/workspace/page.tsx`, `app/(user)/workspace/workspace.css`, `components/workspace/WorkspaceLanding.tsx`, `components/workspace/ApplicationForm.tsx` | Use historical embedded application entry; revise current eligibility CTA only during subsequent polish. Preserve existing UI primitives and lucide dependencies. |
| REQUIRED | `app/api/workspace/applications/route.ts` | Submission → validation/reference → applications table. Receipt/analytics calls are ancillary and can be omitted deliberately. |
| REQUIRED | `lib/workspace/validation.ts`, `lib/workspace/options.ts`, `lib/workspace/reference.ts`, `lib/workspace/http.ts` | Input/consent contracts; random reference, payload hash; bounded JSON, origin and no-store helpers. |
| REQUIRED | `lib/db/schema.ts` | Port only application schema and required enums/types into confirmed baseline schema. Never copy the full development schema. |
| REQUIRED | `app/(admin)/admin/workspace-applications/page.tsx`, `app/(admin)/admin/workspace-applications/[id]/page.tsx`, `components/workspace/WorkspaceApplicationsList.tsx`, `components/workspace/WorkspaceApplicationDetail.tsx`, `lib/workspace/types.ts` | Private application management. Detail currently imports optional `ApprovalCommunication`; removal requires deliberate decoupling. |
| REQUIRED | `app/api/admin/workspace-applications/route.ts`, `app/api/admin/workspace-applications/[id]/route.ts` | List/detail/review APIs. Detail selects application email columns and PATCH checks email sending state, so 0008 is a hard dependency if these routes remain unchanged. |
| REQUIRED | `lib/admin-authorization.ts`, existing `lib/auth.ts`, existing `users` schema, `app/(admin)/layout.tsx` | API and page authorization use persisted admin role. Helper is absent on candidate main; deliberately port it and the relevant layout guard. Audit baseline session/auth prerequisites without blindly replacing the whole auth system. |
| REQUIRED | `middleware.ts`, `components/Header.tsx`, `components/Footer.tsx`, `components/admin/AdminSidebar.tsx` | Narrow public `/workspace` entry and private application navigation changes. Omit current creator dashboard detection/links and all later admin Workspace sections. |
| REQUIRED baseline dependencies | `lib/db/index.ts`, existing UI `button.tsx`, `input.tsx`, `textarea.tsx`, `lib/utils.ts`, existing site/admin layouts | Existing DB client and UI infrastructure; inspect confirmed baseline availability. No dependency installation approved/required by this inventory. |
| OPTIONAL-POLISH | `lib/workspace/receipt.ts`, relevant private-delivery changes in `lib/mailercloud.ts` | Best-effort receipt communication. Current submission route imports/calls receipt; keep these files if retaining receipt email. |
| OPTIONAL-POLISH | `components/workspace/ApprovalCommunication.tsx`, `lib/workspace/approval-email.ts`, `app/api/admin/workspace-applications/[id]/approval-email/preview/route.ts`, `app/api/admin/workspace-applications/[id]/approval-email/send/route.ts`, existing `components/ui/dialog.tsx` | Recommended applicant communication bundle. Needs email schema extension, persisted admin guard, bounded provider timeout and safe uncertain-delivery handling. No creator/payment access is granted. |
| OPTIONAL-POLISH | `lib/workspace/analytics.ts`, `lib/workspace/analytics-server.ts` | Explicit enum-only funnel telemetry, authoritative saved/review/email events using opaque hashed application identifiers. Keep telemetry failure isolated. |
| REQUIRED if analytics retained | Pre-registration subset of `lib/workspace/analytics-privacy.ts`, relevant changes in `lib/analytics.ts`, `lib/analytics-server.ts`, `lib/posthog-config.ts`, `components/providers/PostHogProvider.tsx`, `instrumentation-client.ts` | Suppress sensitive capture/identity, canonicalize URLs and remove query data. Current sanitizer imports eligibility/membership models; use a deliberate pre-registration subset, not its current full implementation. |
| OPTIONAL-POLISH | `app/api/telemetry/[...path]/route.ts` | Restricted same-origin PostHog proxy, bounded body/timeout, no forwarded cookies/auth. Needed if keeping the current proxy configuration; otherwise use a consistent reviewed alternative. Not needed for application persistence. |
| REQUIRED release verification | `tests/routes/workspace-public.test.ts`, `workspace-validation.test.ts`, `workspace-admin.test.ts`, `workspace-fixtures.ts` in the same directory; relevant `tests/admin-route-authorization-policy.test.mjs` coverage | Port scoped tests and verify real public/admin behavior on the eventual release branch. |
| OPTIONAL-POLISH verification | `tests/routes/workspace-approval.test.ts`, `workspace-mailer.test.ts`, `workspace-receipt.test.ts`, `workspace-analytics.test.ts`, `posthog.test.ts` in the same directory | Include matching tests for retained communication/analytics. Do not import later eligibility/creator fixtures. |
| REQUIRED migration tooling | `scripts/migrate.mjs`, `scripts/database-safety.mjs`, `drizzle.config.ts`, relevant `package.json` migration command | Candidate main predates guarded runner. Review and port the guard separately; do not copy unrelated foundation/dependency changes wholesale. No execution in this task. |
| OPTIONAL-POLISH documentation/config | `WORKSPACE_PHASE1_IMPLEMENTATION.md`, `WORKSPACE_PHASE11_IMPLEMENTATION.md`, pre-registration portion of `WORKSPACE_ANALYTICS.md`, relevant `.env.example` names | Historical references/configuration names only, never secrets or real `.env` files. Do not port full later implementation reports as release prerequisites. |
| EXCLUDE entry implementations | `app/(user)/workspace/apply/page.tsx`, `manual-application/page.tsx` and `components/workspace/EligibilityShell.tsx` as currently wired | Prefer historical embedded public form. `/apply` is automated eligibility; manual wrapper is unnecessary to that release entry. If a separate public form route is chosen later, author a preregistration-only wrapper. |

Dependency graph:

```text
Public /workspace → historical landing → ApplicationForm
  → POST /api/workspace/applications
    → validation + consent options + reference/hash + bounded HTTP
    → workspace_applications
    → optional receipt → private Mailercloud delivery
    → optional explicit telemetry → prereg privacy layer → PostHog

Private application pages → admin layout/session + persisted users.role
  → list/detail/review API → workspace_applications
  → optional preview/send UI/API → email state columns + Mailercloud
```

## G. Database Dependencies

| Classification | Table/type/migration | Scope |
| --- | --- | --- |
| REQUIRED baseline | `users` | Existing admin identities; referenced by reviewer/sender fields. Applicants need no authentication identity or user FK. |
| REQUIRED | `workspace_applications`, `workspace_application_status`; `drizzle/0007_lucky_wild_pack.sql` | Application, consent, review attribution, reference/key uniqueness, status/submitted and email indexes. Reviewer FK to users uses SET NULL. No account creation or later Workspace FK. |
| OPTIONAL-POLISH feature; REQUIRED with unchanged current routes | `workspace_approval_email_status` and eight application communication columns; `drizzle/0008_eager_energizer.sql` | Latest send/attempt metadata and sender/attempted-by user FKs. No new communication table. Current admin/detail/schema wiring depends on it even when no email is sent. |
| REQUIRED for selected migration chain | `drizzle/meta/_journal.json`, relevant `0007_snapshot.json` / `0008_snapshot.json` | Keep metadata consistent with selected schema and established lineage; do not copy journal/snapshots through 0017. |
| EXCLUDE | 0009 eligibility/settings/policy/audit; 0010 plans/coupons; 0011 coupon audit guards; 0012 financial orders/attempts/events/redemptions; 0013 creator profiles/memberships; 0014 profile details/drafts; 0015 submissions/review events; 0016 payment capture-time guards; 0017 projects/modules/lessons | None is a hard dependency of application submission/admin communication. Preserve on development, omit from release. |
| EXCLUDE | Proposed `workspace_course_assets` and media ownership indexes | WIP schema only; no generated migration. |

No production ledger, schema or rows were queried. These dependencies come from actual SQL and source inspection.

## H. Required Release Slice

Public non-charging landing and application with validation, consent, idempotent save/reference confirmation and recoverable errors; private persisted-admin application list/detail/review; their isolated schema and migration metadata; scoped site navigation/middleware; relevant regression coverage and guarded migration workflow.

Keep the existing application's answers/consent separate from accounts, payment and creator ownership. Application approval remains an administrative application decision only. No eligibility evaluator, activation or creator entitlement is required.

## I. Optional Admin/Communication Features

Recommend retaining Phase 1.1 email preview/send/retry/resend and its 0008 schema extension as one coherent bundle. Missing configuration must produce a safe unavailable result. Delivery uncertainty must preserve the Sending/failed evidence and require operator review; do not introduce force-send or auto-clear shortcuts.

Receipt email and private applicant analytics are useful but ancillary. Provider sends and a safe analytics project require separately authorized real-environment smoke tests. No live delivery or analytics readiness is established here. Approval template wording about activation/commercial onboarding needs pre-registration language review during polish.

## J. Explicitly Excluded Full-Workspace Features

Exclude `lib/workspace/eligibility/`, `membership/`, `payments/`, `activation/`, `creator/`, `review/`, `builder/`, `media/`; their corresponding components, tests, admin pages and APIs; automated `/workspace/apply`, eligibility result, activation, member and creator routes; `/api/workspace/journey`, eligibility, quote/orders, Razorpay confirm/webhook, profile-details/course-drafts/build/submit; `/admin/workspace/*` later management pages/APIs. Retain only the distinct `/admin/workspace-applications` application feature and `/api/admin/workspace-applications` APIs.

No Workspace pricing/coupon/payment controls, authorization flags, creator links or usable full Workspace entry points belong in the intended release. Existing LMS payment/course systems are baseline functionality and must remain untouched; this exclusion applies to the later Workspace systems.

## K. Migration Strategy Recommendation

**Conditional recommendation, not authorization to migrate.** Candidate main's tracked journal ends at `0006_great_kate_bishop`. SQL files 0000–0006 have no diff between candidate main and verified full Workspace head. Historical `04cedfd` journal extends that prefix only through 0007/0008. Thus the historical pre-registration migration pair is a plausible reusable additive chain if the actual production baseline and its independently authorized ledger verification establish the same lineage.

Do not equate tracked journal head with the deployed ledger. First confirm the deployed source revision; later, under explicit production DB authorization, inspect ledger hashes/ordering and schema drift. If lineage matches, review/reuse only 0007 plus 0008 if communication/current route wiring is retained. If production has diverged or migration numbers are occupied, generate a new additive migration from that confirmed baseline's schema/snapshot for only the application/enums/communication fields. Do not manipulate the ledger, push schema or reset anything.

Historical commit `04cedfd` includes 57 files and global mail/analytics/proxy/navigation changes and audit reports. Its prerequisite `fe8a296` also contains broad foundation/auth/validation/dependency changes absent on candidate main. Blind cherry-picking either is inappropriate without a complete dependency review. Prefer a deliberate scoped port, with separately reviewed persisted-admin and migration guard prerequisites. No lockfile or package changes were made or authorized here.

## L. Proposed Release Branch

**Not created.** The production mapping is unconfirmed, satisfying the brief's stop condition. Once confirmed, create a dedicated branch such as `codex/workspace-preregistration-release` directly from the exact production commit, not from `f47b695`, its report successor, or `a9ea151`. Port only the inventory slice after baseline/prerequisite review. No release code has been staged.

## M. Risks / Ambiguities

1. Blocking user decision: identify the actual deployed production branch and source commit. Candidate main alone is insufficient evidence.
2. Deployed migration lineage is unknown; no production access is authorized in this task.
3. Main predates persisted-admin and other foundation hardening. Determine narrow prerequisites before porting; do not silently include unrelated broad changes.
4. Public submission has body/field limits, an origin check and idempotency, but no rate limiter, CAPTCHA or honeypot in the inspected route. Missing Origin is accepted, so origin checking is not bot protection. Existing eligibility limiter belongs to excluded infrastructure. Public abuse protection needs an explicit release hardening decision using existing infrastructure, not a claim that it already exists.
5. Latest application/status/email metadata is not append-only history. Email Sending can remain after an uncertain provider outcome; document operator handling before using real sends.
6. Current landing/confirmation/template copy needs later polish: eligibility CTAs, future activation language and the confirmation heading “You're in” could overstate admission. Final public CTA and clear not-yet-public language remain undecided; no copy was changed now.
7. Current shared schema, header/sidebar and analytics sanitizer contain later Workspace dependencies. Copying their full files would violate the release scope.
8. Retention/access policy, actual private mail/analytics configuration and controlled delivery smoke remain unverified. Consent is application/contact consent, not blanket marketing consent.
9. Frozen Phase 1.9 is incomplete and unvalidated; never use its WIP head for this release.

## N. Recommended Next Step

Ask the user to confirm the exact production branch/commit currently deployed (and whether local `main@81623e2` is that baseline). Stop release creation/port/polish until that fact is established. Then create the branch from the confirmed production commit and deliberately port the scoped application feature, decide the communication bundle, review minimal migration lineage and hardening, and perform release-specific validation. Deployment and production migration require separate authorization.

Validation performed in this freeze/inventory task: local Git status/history/ref/merge-base inspection, scoped source/SQL/metadata inspection, and `git diff --check`. No application code was changed on the verified development line. `pnpm validate`, TypeScript, lint, build and runtime/database tests were not rerun: this task does not complete the frozen implementation or claim an implemented release. Prior Phase 1.8V results remain historical evidence only.

Task changes are the six-file WIP preservation checkpoint listed in section B and this inventory report. No Phase 1.9 continuation, release polish, migration or deployment occurred. Stop here pending production-baseline confirmation.
