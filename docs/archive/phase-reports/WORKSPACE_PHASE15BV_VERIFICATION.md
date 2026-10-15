# Workspace Phase 1.5BV verification

Date: 8 October 2026. **Phase 1.6 GO.** This authorizes a development recommendation only; public payment launch remains blocked by the separately deferred provider/commercial gates. Phase 1.6 was not implemented.

One real-database preflight defect was corrected separately in `359d8ee`: activation recovery now requires and enforces provider account/mode scope. Only migration `0013_peaceful_spiral.sql` was applied. No corrective SQL migration was required; 0000–0013 source history is unchanged.

## A. Environment

Authorized development target: `localhost:5433/airbharath_lms`; classification `DATABASE_ENV=development`. Application `/tmp` socket and migration TCP connection both resolved to database OID `16384`, server port `5433`, PostgreSQL system identifier `7680462735222304705`, matching the previously verified local server. Identity was checked before migration. No production/staging/Neon target was accessed.

The verification runner stripped private-service credentials, admitted only the validated local database target, and set migration authorization only for guarded migration executions. `.env` was neither edited nor committed. Global external fetch was blocked in the database harness; provider methods were deterministic in-memory synthetic adapters. No Razorpay calls, checkout, webhook traffic, deployment, or infrastructure change occurred.

Fresh retained fixtures use `SYNTHETIC WS15BV_<run>_<label>` names and `@example.invalid` emails. Completed run: `b5c5649b-801c-484b-ad08-9dbc11667d7e`, 16 synthetic users, one unlimited synthetic Workspace coupon, and a run-specific synthetic provider account. Two incomplete harness runs retain 4 and 15 users respectively; their immutable history was not deleted/reset. Those attempts exposed verifier clock/serialization assumptions, not additional product defects. No trigger/constraint was disabled to construct fixtures or clean them up.

## B. Ledger before

Actual ledger: **13 entries, 0000–0012**. Every hash and timestamp matched the reviewed local journal, including 0011 coupon audit/freshness and the corrected 0012 financial migration. 0013 was genuinely pending.

| Migration | Timestamp | Verified SHA-256 | Before | After |
| --- | ---: | --- | --- | --- |
| `0000_regular_silk_fever` | 1789124954048 | `244506bff67e0e4e102593d277f4959d7b6762345ea6d475764700f55bb8fb47` | applied | applied |
| `0001_careful_warhawk` | 1790099480260 | `24c2bbabe9a8d16a6f027d09a13004dddea01c21113990a5939a642b0237c232` | applied | applied |
| `0002_silky_living_tribunal` | 1790162267688 | `24033fb008c9e085cd515ff9c6321e518a8bb5e8995ef7ce22c19b9a98b7c2ad` | applied | applied |
| `0003_lowly_justice` | 1790183727889 | `5e2ada1b77d981fe1e27d321272f7f08fb2c7243067634b57c8213a0e785cc98` | applied | applied |
| `0004_dear_shocker` | 1790192348972 | `0bf51a3afa92ba842b517fdf2c85af9fd73bc2827c7c374853cbe3a9199bea82` | applied | applied |
| `0005_sharp_grey_gargoyle` | 1790197129493 | `588509617acbb775563f379101f8d5b34534bfbfbe536110682bbb22707f81f8` | applied | applied |
| `0006_great_kate_bishop` | 1790236152530 | `0d6b625cca0a51c04d313a53c9a66ccd647927e9efda2959252cc11b2d95a9eb` | applied | applied |
| `0007_lucky_wild_pack` | 1790924690885 | `f0312d81ee36aed56aa48ece4bd09cdf218a375e39879d55623ef9ec819f11aa` | applied | applied |
| `0008_eager_energizer` | 1790935874838 | `ae6c3b89c04374d642a03f0097e3bc52a3b7c3e1ce6b8f752d7f9625135732ac` | applied | applied |
| `0009_normal_baron_zemo` | 1791274423029 | `6dc0436b50fa865ad5410dd2f95d48be569cd176f812abd47c144ad57ea359e5` | applied | applied |
| `0010_illegal_toxin` | 1791281066952 | `d806715b9b519bb50eaa3f6f60c9be1b02ea98ebed248a856a91ecd56f30c92e` | applied | applied |
| `0011_workspace_coupon_audit_freshness` | 1791284353170 | `92d9e796e3b2136e86f144c4a2ff099d81e6e26c12541999dd95a52e34485ec9` | applied | applied |
| `0012_useful_warhawk` | 1791286852175 | `4e59a99a11347779b12c793df406727148ba7b6ef3f42764952f57f733274d97` | applied | applied |
| `0013_peaceful_spiral` | 1791368221505 | `42b4fcf2ae41c84e5129f68fee5791283b293a8f576c5d694ac2f25825d39d05` | pending | applied |

## C. Migration 0013

Reviewed ownership references, unique-index ordering, locks, immutable-history/deferred guards, financial-order guard extension and Kolkata term calculation before applying. No readiness defect found. Referenced composite unique indexes precede their foreign keys. `pnpm db:migrate` applied only 0013 through the repository guard with temporary `ALLOW_DATABASE_MIGRATION=true`.

The new schema adds creator profiles/memberships and financial fulfillment evidence; no legacy table was changed. Applied migration text was not edited after execution, and all prior hashes remain exact. No schema push, reset, seed script, or database-ledger manipulation occurred.

## D. Ledger after/no-op

Actual ledger: **14 entries, 0000–0013**, exact hashes/timestamps shown above. The second guarded migration invocation exited successfully and left the complete ordered ledger identical to the first post-migration snapshot. Final verification after all SQL/app smoke still reported the same 14 rows.

## E. Creator profile schema

Actual catalogs show five columns: ID, user ID, status, created time, first-activated time. Primary key, unique user index, composite ID/owner unique index, restrictive users FK, status/activation-time checks, immutable identity trigger and initially deferred membership-completion trigger are installed. First real fulfillment persisted enabled identity, correct owner, equal creation/first-activation timestamps, and unchanged student role. Repeat fulfillment reused the same profile.

## F. Membership schema

Actual catalogs show 12 membership columns: ID, user/profile/order/plan links, duration, paid time, starts/ends, access-granted/fulfilled/created times. Composite profile/owner and order/owner FKs, restrictive user/plan FKs, unique order index, user/end index, term check, immutable term/overlap trigger and deferred completion are installed.

Across profile/membership/financial-order tables, actual inspection returned 71 columns, 11 FKs, 16 indexes, seven user triggers, and four initially deferred constraints (three new plus existing financial completion). Financial orders include nullable `fulfilled_at`, extended fulfilled activation state, immutable completion-marker handling and fulfillment shape checks. The catalog definitions are retained in the real regression result, not inferred from Drizzle text alone.

## G. Profile immutability

Real prohibited owner reassignment, created-time rewrite, first-activated-time rewrite and deletion each failed with SQLSTATE **23514**. Legitimately fulfilled profiles could be suspended/terminated; attempts to re-enable suspended identity or revive terminated identity also failed **23514**. Identity and first activation were preserved.

## H. Membership immutability

Real direct updates to user, profile, originating order, plan version, duration, paid/start/end/access/fulfillment/creation timestamps and deletion all failed **23514**. A second membership insert for an already fulfilled order failed **23514** at the safe-issuance guard before a duplicate could reach the unique index. The actual unique membership/order index is installed. Rewriting the financial order's known fulfillment time also failed **23514**.

## I. Calendar-term DB parity

Nine direct PostgreSQL calendar calculations exactly matched application milliseconds, covering 3/6/12 months, the 9 November baseline, month-end clamping, leap-year February, leap-day yearly clamp, 30-day destinations, Kolkata date rollover, local wall time and milliseconds. Actual persisted quarterly, half-yearly and yearly service-issued terms matched the helper and database guard. No day-based durations or end-of-day adjustment.

## J. Launch boundaries

Pre-launch payment persisted start `2026-11-08T18:30:00.000Z`; exact-launch and post-launch fixtures persisted start equal to paid time. Late fulfillment never replaced paid time. Helper checks exercised launch −1/0/+1 ms; persisted resolver checks returned active exactly at start, active 1 ms before end, expired exactly at end and afterward. Real-app deterministic clock smoke also confirmed exact exclusive expiry.

## K. Same-order concurrency

**PASS: two independent PostgreSQL/service connections.** A third connection held the persisted user lock; both service connections started fulfillment before release, and PostgreSQL `pg_stat_activity` showed **two real Lock waiters**. After release, outcomes were one `fulfilled` and one `already_fulfilled`, with identical membership ID, one profile and one membership. This was not sequential Promise execution or a process mutex.

## L. Profile creation concurrency

The same race began with no profile. Both real service paths could have attempted creation; persisted-owner locking serialized them, producing exactly one correctly owned identity and convergent results without a unique-constraint leak. The actual unique user index remains a database backstop.

## M. Overlap protection

Current V1 deliberately allows only one captured/unresolved initial order per user. With an existing nonexpired paid membership, a new financial service request failed controlled `conflict`; a direct otherwise valid second initial order failed **23505** at the existing unresolved-user unique index. The original membership and monetary truth stayed unchanged. Retrying the existing order returned its existing membership. A duplicate direct membership was rejected before any second term.

**Coverage boundary:** a second committed captured/pending initial order for a user who already has a fulfilled profile is not representable under the existing financial invariant. It was not manufactured by weakening that index or immutable history. Consequently the later service `membership_overlap` branch and pre-issuance suspended-profile branch remain covered by unit regressions; real PostgreSQL verifies the stronger earlier initial-order protection, existing-profile idempotency and suspension/access denial. The actual overlap guard and user locking are installed and inspected. This limitation does not authorize renewal or alter initial-purchase scope.

## N. Suspended/terminated behavior

Legitimate synthetic profiles were first safely paid/fulfilled, then suspended or terminated. Persisted journeys returned creator unavailable with both capabilities false. Fulfillment retry stayed idempotent, did not replace/re-enable identity, did not create a second membership, and preserved captured financial truth. Direct revival attempts failed **23514**. The unavailable member page matched both states. No suspension was manually overridden.

## O. Atomic fulfillment rollback/retry

A real SQL division-by-zero (**22012**) was forced through the active PostgreSQL transaction after profile insertion and before membership issuance. Transaction rollback left no orphan profile or membership; captured/pending financial order, winner, paid time, refund deadline and redeemed coupon were byte/value-identical to pre-activation snapshots. Retry produced exactly one safe fulfillment.

Real deferred profile insertion without matching membership failed at commit (**23514**). Marking an order fulfilled without membership and inserting a membership without final order completion also failed at commit (**23514**), rolling all temporary rows back.

## P. Financial/activation separation

A valid committed captured/pending order existed with no membership before activation. Its already-redeemed coupon was not mutated by fulfillment. Failed activation did not reverse capture/redemption. Invalid refund deadline, mismatched winning payment owner/order/account/mode/amount/currency/winner, and attempts to unfinalize a redeemed coupon were rejected by real financial/history protections (**23514**) before invalid financial evidence could become a committed activation candidate.

These malformed committed fixtures were not produced by bypassing constraints. The actual service refused unpaid and held/null-timing fixtures without identity/membership/access; wrong-owner fulfillment was denied.

## Q. Activation recovery

Preflight found 20 old candidates from another synthetic account under the previous broad Test Mode selector. Correction `359d8ee` requires trusted account/mode scope, filters candidate account/provider/noncommercial context, and rechecks scope under the owner lock. Missing/wrong mode scope fails closed; wrong-account database selection and worker invocation returned zero attempts. No provider credentials or API call is needed for an explicit synthetic context.

Real `runWorkspaceActivationRecovery(25, syntheticContext)` selected three fresh captured/pending/known-date candidates and fulfilled all three: attempted 3, fulfilled 3, held 0, failed 0. Second run attempted **0** with identical terms/history. Held, unpaid and already fulfilled rows were excluded. Other accounts' full order snapshots remained unchanged. Limit 26 was refused. A production runtime was explicitly refused even on the development database, and production journeys granted neither capability from test evidence.

The earlier verifier attempt used capture times ahead of the real worker's wall clock; recovery correctly held them. The completed run used past pre-launch times for real-clock recovery and deterministic future clocks only for launch/expiry tests. Prior failed-run immutable fixtures were retained untouched.

## R. Journey/access resolver

Actual persisted database journeys covered eligibility-only, unpaid, held capture, known-date pending activation, fulfilled early access, active, exact expiry, suspended and terminated identities. Only enabled, fulfilled, early/active membership granted both capabilities in development. Identity and membership rows remained after expiry; student role was unchanged. Wrong owner could not fulfill. Production test/noncommercial evidence never granted access. Local HTTP smoke with stale admin/capability JWT claims for an eligibility-only student still returned both capabilities false.

## S. User member page/routing

Authenticated local Next.js requests against the real authorized database exercised `/workspace/member`, journey API, apply/result/activate routing, early access, active, expired, pending, held and suspended/terminated states. HTML showed correct plan/term/status; early access showed the 9 November start. Querying another user ID did not change the authenticated owner's projection. Member paths had no payment/grant/editor action and no provider/payment IDs or coupon code.

Early/active/expired/pending/review routed to member status; eligibility-only retained the disabled plan preview. No redirect loop. Anonymous member requests redirected to login and anonymous journey returned 401. A temporary read-failure seam rendered bounded member unavailability and journey 503 without private error detail.

The app ran only on loopback port 4040 from an isolated source copy with no ignored `.env` files, no provider keys, a synthetic local signing key and cached fonts. A disclosed clock helper was injected **only in that disposable copy** for membership page/journey domain time; JWT verification retained real time. Active/expired page smoke is therefore deterministic-clock real-app/database verification, not a claim that the current pre-launch wall clock is active or expired. The temporary app was stopped. No hydrated-browser or screenshot audit is claimed.

## T. Admin authorization

Persisted synthetic admin could read creator/status/plan/term/originating-order/fulfillment history. The page had no Make Creator, Mark Paid, Grant Membership or Reactivate Creator action. Student and anonymous access were denied. Demoting the synthetic admin while retaining its valid admin JWT caused creator-page login redirection and admin financial API 403 based on persisted role. Role was restored afterward and the final audit confirmed restoration.

## U. Privacy

Real member/admin HTML contained `ph-no-capture`; fixture provider/payment IDs and coupon code were absent. Member rendering exposes no financial amount. Only the internal originating-order reference appears where required for admin inspection. Journey returns state/capabilities/minimized eligibility receipt, not payment or membership records. Existing behavioral privacy regression tests passed.

PostHog credentials/configuration were removed from the isolated app. No analytics events were added or emitted by the verifier. No live PostHog/browser telemetry audit is claimed. Real failure and JWT tests did not print cookies/tokens/connection strings or source credentials.

## V. Legacy isolation

Before/after fingerprints matched for courses, course authors, enrollments, legacy orders, legacy coupons, progress, certificates and preexisting user roles. Fresh explicitly marked synthetic users were excluded only from the existing-role fingerprint; their normal creator roles remained students. Repeat final audit after authenticated smoke and restored admin demotion still matched.

Legacy manual Workspace page and authorized application-list endpoint both returned 200. No enrollment, author, legacy order/coupon, certificate/progress or learner-role mutation resulted from fulfillment.

## W. Held Razorpay fixture safety

Six previously retained genuine sandbox fixture orders were inspected, including **three captured orders**. Full before/after snapshots matched after SQL and app smoke. All three captured orders remain held/review with paid time/refund deadline null, no membership, no creator profile and false creator capability. Their timestamps were not injected or repaired; they were not activated or cleaned up. No Razorpay request was made.

## X. Public-payment gate

The normal `.env` enablement flags were checked as not true; no authorization flag was persisted. The isolated normal-config plan page displayed **Payment activation coming next**. A client request claiming paid/creator fields returned disabled **503** before any provider operation. No public checkout, admin grant, refund, renewal, drafts, creator editing or deployment was introduced.

## Y. Tests/validation

Completed successfully:

- Checked-in opt-in real PostgreSQL regression: **51 named checks**, including actual deferred failures, rollback/retry, scoped worker and observed two-connection lock race.
- Authenticated loopback real-app smoke: **15 named checks**, including membership states/routing, stale JWT claims, admin demotion, privacy, legacy flow and bounded failure.
- Final database audit: unchanged legacy fingerprints, restored admin, six retained sandbox orders/three held captures, 14-row ledger, wrong-account skip and wrong-mode refusal.
- Full `pnpm validate`: **479 Vitest tests across 38 files plus five Node test files**, TypeScript and lint; no ESLint warnings/errors. Existing Next.js lint deprecation notice remains unchanged.
- Production `pnpm build`: successful isolated sanitized build with unreachable synthetic database target, cached Google fonts, 59 static pages and both status routes; no deployment or provider access. The production build used repository source without the disposable clock seam.
- Syntax checks for all three checked-in PostgreSQL/HTTP verification scripts and `git diff --check` passed.

Regressions are opt-in (`WORKSPACE_ACTIVATION_PG_VERIFY=true`) and guard development classification plus the exact local target. They are not run by ordinary validation and do not migrate or reset. They retain clearly identified immutable fixtures. HTTP/final scripts consume the completed local fixture result file.

## Z. Defects/corrections

**One implementation defect:** missing provider-account scope in activation recovery. It was recorded in this report before editing, reproduced by the real candidate preflight, corrected minimally, covered by checked-in unit regression and rerun successfully on real PostgreSQL. Separate corrective commit: **359d8ee**. No corrective migration and no applied-history edit.

Verifier-only adjustments: early query clock was 123 ms before fulfillment; synthetic recovery capture times were initially ahead of real wall time; raw PostgreSQL timestamp comparison needed a separate connection from Drizzle's parser configuration. Corrected harness assertions/connections, retained partial-run fixtures, and reran to completion. These were not product/schema fixes.

Files changed in this phase:

- `lib/workspace/activation/service.ts`: require/recheck worker context.
- `lib/workspace/activation/repository.ts`: account/mode/provider/policy candidate filter.
- `lib/workspace/activation/runtime.ts`: trusted context argument/configuration boundary.
- `tests/routes/workspace-activation.test.ts`: wrong-account/missing-context regression and stronger mode refusal expectations.
- `tests/routes/workspace-activation-boundaries.test.ts`: distinguish provider enum filtering from provider HTTP construction.
- `tests/postgres/workspace-activation-verification.cjs`: real database/catalog/trigger/race/rollback/recovery regression.
- `tests/postgres/workspace-activation-http-verification.cjs`: real authenticated local-app regression.
- `tests/postgres/workspace-activation-final-verification.cjs`: final immutable fixture/legacy/ledger/context audit.
- `WORKSPACE_PHASE15BV_VERIFICATION.md`: results, coverage boundaries and recommendation.

## AA. Remaining launch gates

Genuine webhook delivery/capture-time provenance/replay/restart proof, final versioned Creator Terms/Refund Policy/commercial acceptance, operational ambiguous-order resolution, separately authorized production migration/configuration and worker scheduling remain **public-payment release gates**. They do not automatically block Phase 1.6 development under this brief. Production entitlement activation from test/noncommercial evidence remains disabled. No Phase 1.6 implementation, Razorpay call, held-real-capture activation, public payment, refund, renewal or deployment occurred.

## AB. Recommendation

**Phase 1.6 GO.** Real PostgreSQL fulfillment/access behavior is verified, including the corrected recovery scope, calendar parity, atomic financial/activation separation and observed two-connection concurrency. The stricter initial-order constraint was preserved; unreachable second-initial-order/pre-issuance profile scenarios are explicitly bounded above rather than manufactured through unsafe fixture bypass.

Public payment launch remains blocked by the independent manual launch gates. Stop after this verification; Phase 1.6 is not implemented.
